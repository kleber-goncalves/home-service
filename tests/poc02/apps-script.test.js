import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const SECRET = "c".repeat(64);
const NOW = Date.UTC(2026, 10, 11, 12, 0, 0);
const SOURCE = readFileSync(new URL("../../apps-script/poc-02/Code.gs", import.meta.url), "utf8");

function toAppsScriptBytes(buffer) {
    return Array.from(buffer, (byte) => (byte > 127 ? byte - 256 : byte));
}

function createAppsScriptHarness({
    secret = SECRET,
    now = NOW,
    lockAvailable = true,
    prefilledNonces = 0,
    propertiesUnavailable = false,
} = {}) {
    const propertyMap = new Map();

    if (secret !== null) {
        propertyMap.set("POC02_HMAC_SECRET", secret);
    }

    for (let index = 0; index < prefilledNonces; index += 1) {
        const nonce = String(index + 1).padStart(64, "0");
        propertyMap.set(`POC02_NONCE_V1_${nonce}`, String(now + 60_000));
    }

    const properties = {
        getProperty(key) {
            return propertyMap.has(key) ? propertyMap.get(key) : null;
        },
        getProperties() {
            return Object.fromEntries(propertyMap.entries());
        },
        setProperty(key, value) {
            propertyMap.set(key, String(value));
            return this;
        },
        deleteProperty(key) {
            propertyMap.delete(key);
            return this;
        },
    };

    const lock = {
        tryLock() {
            return lockAvailable;
        },
        releaseLock() {},
    };

    const fakeUtilities = {
        Charset: { UTF_8: "utf8" },
        DigestAlgorithm: { SHA_256: "sha256" },
        newBlob(value) {
            return {
                getBytes() {
                    return toAppsScriptBytes(Buffer.from(value, "utf8"));
                },
            };
        },
        computeDigest(algorithm, value, charset) {
            return toAppsScriptBytes(createHash(algorithm).update(value, charset || "utf8").digest());
        },
        computeHmacSha256Signature(value, key, charset) {
            return toAppsScriptBytes(
                createHmac("sha256", Buffer.from(key, charset || "utf8"))
                    .update(value, charset || "utf8")
                    .digest(),
            );
        },
    };

    const contentService = {
        MimeType: {
            JSON: "application/json",
            TEXT: "text/plain",
        },
        createTextOutput(content) {
            return {
                content,
                mimeType: null,
                setMimeType(mimeType) {
                    this.mimeType = mimeType;
                    return this;
                },
            };
        },
    };

    const FakeDate = class extends Date {
        constructor(...args) {
            super(...(args.length === 0 ? [now] : args));
        }

        static now() {
            return now;
        }
    };

    const context = {
        Utilities: fakeUtilities,
        PropertiesService: {
            getScriptProperties() {
                if (propertiesUnavailable) {
                    throw new Error("Properties service unavailable");
                }
                return properties;
            },
        },
        LockService: {
            getScriptLock() {
                return lock;
            },
        },
        ContentService: contentService,
        Date: FakeDate,
    };

    runInNewContext(SOURCE, context);

    return {
        doGet: context.doGet,
        doPost: context.doPost,
        propertyMap,
    };
}

function buildSignedParameters({
    secret = SECRET,
    timestamp = NOW,
    nonce = "b".repeat(64),
    action = "poc.echo",
    requestId = "request-12345678",
    payloadText = JSON.stringify({ message: "Olá, mundo 👋" }),
} = {}) {
    const timestampText = String(timestamp);
    const payloadSha256 = createHash("sha256").update(payloadText, "utf8").digest("hex");
    const canonicalMessage = [
        "CONECTA_LOCAL_GATEWAY",
        "v1",
        "POST",
        timestampText,
        nonce,
        action,
        requestId,
        payloadSha256,
    ].join("\n");
    const signature = createHmac("sha256", Buffer.from(secret, "utf8"))
        .update(canonicalMessage, "utf8")
        .digest("hex");

    return {
        signatureVersion: "v1",
        timestamp: timestampText,
        nonce,
        signature,
        action,
        requestId,
        payload: payloadText,
    };
}

function readOutput(output) {
    return JSON.parse(output.content);
}

test("Apps Script aceita uma assinatura HMAC válida e preserva payload UTF-8", () => {
    const harness = createAppsScriptHarness();
    const response = harness.doPost({ parameter: buildSignedParameters() });
    const body = readOutput(response);

    assert.equal(body.ok, true);
    assert.equal(body.data.authenticated, true);
    assert.equal(body.data.received, true);
    assert.equal(body.data.payload.message, "Olá, mundo 👋");
    assert.equal(response.mimeType, "application/json");
});

test("Apps Script recusa chamada direta sem assinatura", () => {
    const harness = createAppsScriptHarness();
    const response = harness.doPost({
        parameter: {
            action: "poc.echo",
            requestId: "request-12345678",
            payload: JSON.stringify({ message: "chamada direta" }),
        },
    });

    assert.equal(readOutput(response).error.code, "AUTHENTICATION_FAILED");
});

test("Apps Script recusa payload adulterado após a assinatura", () => {
    const harness = createAppsScriptHarness();
    const parameters = buildSignedParameters();
    parameters.payload = JSON.stringify({ message: "conteúdo alterado" });

    const response = harness.doPost({ parameter: parameters });

    assert.equal(readOutput(response).error.code, "AUTHENTICATION_FAILED");
});

test("Apps Script recusa assinatura inválida", () => {
    const harness = createAppsScriptHarness();
    const parameters = buildSignedParameters();
    parameters.signature = "0".repeat(64);

    const response = harness.doPost({ parameter: parameters });

    assert.equal(readOutput(response).error.code, "AUTHENTICATION_FAILED");
});

test("Apps Script recusa timestamp expirado", () => {
    const harness = createAppsScriptHarness({ now: NOW + 300_001 });
    const parameters = buildSignedParameters({ timestamp: NOW });

    const response = harness.doPost({ parameter: parameters });

    assert.equal(readOutput(response).error.code, "REQUEST_EXPIRED");
});

test("Apps Script recusa timestamp excessivamente no futuro", () => {
    const harness = createAppsScriptHarness();
    const parameters = buildSignedParameters({ timestamp: NOW + 300_001 });

    const response = harness.doPost({ parameter: parameters });

    assert.equal(readOutput(response).error.code, "REQUEST_EXPIRED");
});

test("Apps Script recusa o segundo uso do mesmo nonce", () => {
    const harness = createAppsScriptHarness();
    const parameters = buildSignedParameters();

    const first = readOutput(harness.doPost({ parameter: parameters }));
    const second = readOutput(harness.doPost({ parameter: parameters }));

    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
    assert.equal(second.error.code, "REPLAY_DETECTED");
});

test("Apps Script falha fechado quando o lock não pode ser adquirido", () => {
    const harness = createAppsScriptHarness({ lockAvailable: false });
    const response = harness.doPost({ parameter: buildSignedParameters() });

    assert.equal(readOutput(response).error.code, "NONCE_STORE_UNAVAILABLE");
});

test("Apps Script falha fechado quando Properties Service está indisponível", () => {
    const harness = createAppsScriptHarness({ propertiesUnavailable: true });
    const response = harness.doPost({ parameter: buildSignedParameters() });

    assert.equal(readOutput(response).error.code, "NONCE_STORE_UNAVAILABLE");
});

test("Apps Script falha fechado quando o registro de nonces atinge a capacidade", () => {
    const harness = createAppsScriptHarness({ prefilledNonces: 2500 });
    const response = harness.doPost({ parameter: buildSignedParameters() });

    assert.equal(readOutput(response).error.code, "NONCE_STORE_UNAVAILABLE");
});

test("Apps Script recusa ação fora da allowlist mesmo quando assinada", () => {
    const harness = createAppsScriptHarness();
    const parameters = buildSignedParameters({ action: "sheets.read" });
    const response = harness.doPost({ parameter: parameters });

    assert.equal(readOutput(response).error.code, "ACTION_NOT_ALLOWED");
});

test("Apps Script falha fechado quando o segredo não foi configurado", () => {
    const harness = createAppsScriptHarness({ secret: null });
    const response = harness.doPost({ parameter: buildSignedParameters() });

    assert.equal(readOutput(response).error.code, "AUTH_CONFIG_ERROR");
});

test("GET direto não expõe informações do serviço", () => {
    const harness = createAppsScriptHarness();
    const body = readOutput(harness.doGet());

    assert.equal(body.ok, false);
    assert.equal(body.error.code, "METHOD_NOT_ALLOWED");
    assert.equal(body.data, null);
});
