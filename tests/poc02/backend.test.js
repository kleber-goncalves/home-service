import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import { createBackendHandler } from "../../api/backend.js";

const SCRIPT_URL = "https://script.google.com/macros/s/POC_DEPLOYMENT_ID/exec";
const FINAL_URL = "https://script.googleusercontent.com/macros/echo?temporary=test";
const HMAC_SECRET = "d".repeat(64);
const FIXED_NOW = Date.UTC(2026, 10, 11, 12, 0, 0);

function makeRequest(body, options = {}) {
    const method = options.method || "POST";
    const headers = new Headers(options.headers || {});

    if (body !== undefined && !headers.has("content-type") && method !== "GET") {
        headers.set("content-type", "application/json");
    }

    return new Request("https://conecta-local.test/api/backend", {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? undefined : body,
    });
}

function makeInput(overrides = {}) {
    return {
        action: "poc.echo",
        requestId: "request-12345678",
        payload: { message: "Mensagem sintética com UTF-8: ação, café e 👋." },
        ...overrides,
    };
}

function makeUpstream(body, options = {}) {
    const status = options.status ?? 200;

    return {
        ok: status >= 200 && status < 300,
        status,
        redirected: options.redirected ?? true,
        url: options.url ?? FINAL_URL,
        async text() {
            return body;
        },
    };
}

function makeHandler(options = {}) {
    return createBackendHandler({
        env: {
            APPS_SCRIPT_WEB_APP_URL: SCRIPT_URL,
            APPS_SCRIPT_HMAC_SECRET: HMAC_SECRET,
        },
        fetchImpl: options.fetchImpl || (async () => makeUpstream(JSON.stringify({
            ok: true,
            action: "poc.echo",
            requestId: "request-12345678",
            data: { authenticated: true, received: true },
        }))),
        now: options.now || (() => FIXED_NOW),
        randomBytesImpl: options.randomBytesImpl || (() => Buffer.alloc(32, 0xab)),
        timeoutMs: 50,
        ...options,
    });
}

async function readJson(response) {
    return response.json();
}

test("recusa configuração HMAC ausente sem chamar o Apps Script", async () => {
    let called = false;
    const handler = createBackendHandler({
        env: { APPS_SCRIPT_WEB_APP_URL: SCRIPT_URL },
        fetchImpl: async () => {
            called = true;
            return makeUpstream("{}");
        },
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput())));
    const body = await readJson(response);

    assert.equal(response.status, 503);
    assert.equal(body.error.code, "INTEGRATION_AUTH_NOT_CONFIGURED");
    assert.equal(called, false);
});

test("recusa segredo HMAC com formato inválido", async () => {
    const handler = createBackendHandler({
        env: {
            APPS_SCRIPT_WEB_APP_URL: SCRIPT_URL,
            APPS_SCRIPT_HMAC_SECRET: "segredo-fraco",
        },
        fetchImpl: async () => makeUpstream("{}"),
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput())));

    assert.equal(response.status, 503);
    assert.equal((await readJson(response)).error.code, "INTEGRATION_AUTH_NOT_CONFIGURED");
});

test("assina timestamp, nonce, ação, requestId e hash exato do payload UTF-8", async () => {
    let receivedUrl;
    let receivedOptions;
    const handler = makeHandler({
        fetchImpl: async (url, options) => {
            receivedUrl = url;
            receivedOptions = options;

            return makeUpstream(JSON.stringify({
                ok: true,
                action: "poc.echo",
                requestId: "request-12345678",
                data: { authenticated: true, received: true },
            }));
        },
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput())));
    const body = await readJson(response);
    const form = new URLSearchParams(receivedOptions.body);

    assert.equal(response.status, 200);
    assert.equal(receivedUrl, SCRIPT_URL);
    assert.equal(receivedOptions.method, "POST");
    assert.equal(receivedOptions.redirect, "follow");
    assert.match(receivedOptions.headers["Content-Type"], /application\/x-www-form-urlencoded/i);
    assert.equal(form.get("signatureVersion"), "v1");
    assert.equal(form.get("timestamp"), String(FIXED_NOW));
    assert.match(form.get("nonce"), /^[a-f0-9]{64}$/);
    assert.match(form.get("signature"), /^[a-f0-9]{64}$/);
    assert.equal(form.get("action"), "poc.echo");
    assert.equal(form.get("requestId"), "request-12345678");
    assert.equal(JSON.parse(form.get("payload")).message, "Mensagem sintética com UTF-8: ação, café e 👋.");
    assert.equal(form.has("secret"), false);
    assert.equal(receivedOptions.body.includes(HMAC_SECRET), false);

    const payloadSha256 = createHash("sha256")
        .update(form.get("payload"), "utf8")
        .digest("hex");
    const canonicalMessage = [
        "CONECTA_LOCAL_GATEWAY",
        "v1",
        "POST",
        form.get("timestamp"),
        form.get("nonce"),
        form.get("action"),
        form.get("requestId"),
        payloadSha256,
    ].join("\n");
    const expectedSignature = createHmac("sha256", Buffer.from(HMAC_SECRET, "utf8"))
        .update(canonicalMessage, "utf8")
        .digest("hex");

    assert.equal(form.get("signature"), expectedSignature);
    assert.equal(body.ok, true);
    assert.equal(body.data.authenticated, true);
    assert.equal(body.transport.redirected, true);
});

test("gera nonces diferentes em chamadas distintas", async () => {
    const nonces = [];
    let counter = 1;
    const handler = makeHandler({
        randomBytesImpl: () => Buffer.alloc(32, counter++),
        fetchImpl: async (_url, options) => {
            const form = new URLSearchParams(options.body);
            nonces.push(form.get("nonce"));
            return makeUpstream(JSON.stringify({
                ok: true,
                action: "poc.echo",
                requestId: "request-12345678",
                data: {},
            }));
        },
    });

    await handler(makeRequest(JSON.stringify(makeInput())));
    await handler(makeRequest(JSON.stringify(makeInput({ requestId: "request-abcdefgh" }))));

    assert.equal(nonces.length, 2);
    assert.notEqual(nonces[0], nonces[1]);
});

test("mapeia recusa de replay do Apps Script para falha upstream", async () => {
    const handler = makeHandler({
        fetchImpl: async () => makeUpstream(JSON.stringify({
            ok: false,
            action: "poc.echo",
            requestId: "request-12345678",
            error: { code: "REPLAY_DETECTED" },
        })),
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput())));
    const body = await readJson(response);

    assert.equal(response.status, 502);
    assert.equal(body.error.code, "UPSTREAM_REPLAY_REJECTED");
});

test("mapeia indisponibilidade do registro de nonce para HTTP 503", async () => {
    const handler = makeHandler({
        fetchImpl: async () => makeUpstream(JSON.stringify({
            ok: false,
            action: "poc.echo",
            requestId: "request-12345678",
            error: { code: "NONCE_STORE_UNAVAILABLE" },
        })),
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput())));
    const body = await readJson(response);

    assert.equal(response.status, 503);
    assert.equal(body.error.code, "UPSTREAM_NONCE_STORE_UNAVAILABLE");
});

test("falha fechado quando não consegue gerar nonce criptográfico", async () => {
    let called = false;
    const handler = makeHandler({
        randomBytesImpl: () => {
            throw new Error("CSPRNG unavailable");
        },
        fetchImpl: async () => {
            called = true;
            return makeUpstream("{}");
        },
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput())));
    const body = await readJson(response);

    assert.equal(response.status, 500);
    assert.equal(body.error.code, "GATEWAY_RANDOM_UNAVAILABLE");
    assert.equal(called, false);
});
