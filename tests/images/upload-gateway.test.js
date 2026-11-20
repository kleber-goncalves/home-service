import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";

import { createImageUploadHandler } from "../../server/image-upload-gateway.js";

const ORIGIN = "https://conecta-local-preview.vercel.app";
const SCRIPT_URL = "https://script.google.com/macros/s/IMAGE_UPLOAD_TEST_DEPLOYMENT/exec";
const SECRET = "c".repeat(64);
const SESSION_TOKEN = Buffer.alloc(32, 7).toString("base64url");
const COOKIE_NAME = "__Host-conecta_local_session";
const UPLOAD_ID = "00000000-0000-4000-8000-000000000001";
const REQUEST_ID = "image-chunk-request-0001";

function csrfToken(sessionToken = SESSION_TOKEN) {
    const csrfKey = createHmac("sha256", Buffer.from(SECRET, "utf8"))
        .update("CONECTA_LOCAL_CSRF_KEY_V1", "utf8")
        .digest();

    return createHmac("sha256", csrfKey)
        .update(["CONECTA_LOCAL_CSRF_V1", sessionToken].join("\n"), "utf8")
        .digest("hex");
}

function buildRequest(options = {}) {
    const chunk = options.chunk ?? Buffer.alloc(1024, 0x5a);
    const headers = new Headers({
        Origin: options.origin ?? ORIGIN,
        "Sec-Fetch-Site": options.fetchSite ?? "same-origin",
        "Content-Type": options.contentType ?? "application/octet-stream",
        Cookie: options.cookie ?? COOKIE_NAME + "=" + SESSION_TOKEN,
        "X-CSRF-Token": options.csrf ?? csrfToken(),
        "X-Image-Request-Id": options.requestId ?? REQUEST_ID,
        "X-Image-Upload-Id": options.uploadId ?? UPLOAD_ID,
        "X-Image-Start-Offset": options.startOffset ?? "0",
        "X-Image-Total-Size": options.totalSize ?? "1024",
        ...(options.headers || {}),
    });

    return new Request(ORIGIN + "/api/images", {
        method: options.method ?? "POST",
        headers,
        body: options.method === "GET" ? undefined : chunk,
    });
}

function createHarness(fetchImpl) {
    return createImageUploadHandler({
        env: {
            VERCEL_ENV: "preview",
            CONECTA_LOCAL_ALLOWED_ORIGIN: ORIGIN,
            CONECTA_LOCAL_APPS_SCRIPT_URL: SCRIPT_URL,
            CONECTA_LOCAL_HMAC_SECRET: SECRET,
        },
        fetchImpl,
        now: () => Date.UTC(2026, 10, 20, 12, 0, 0),
        randomBytesImpl: (size) => Buffer.alloc(size, 9),
        timeoutMs: 10_000,
    });
}

function upstreamResponse(form, output = null) {
    const action = form.get("action");
    const requestId = form.get("requestId");
    return {
        ok: true,
        status: 200,
        redirected: true,
        url: "https://script.googleusercontent.com/macros/echo?image-upload-test=1",
        async text() {
            return JSON.stringify(output || {
                ok: true,
                action,
                requestId,
                data: { completed: false, nextOffset: 1024, totalSize: 1024 },
            });
        },
    };
}

test("gateway de imagem encaminha somente um bloco binário com sessão derivada e HMAC", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        const serializedPayload = form.get("payload");
        const payload = JSON.parse(serializedPayload);
        const timestamp = form.get("timestamp");
        const nonce = form.get("nonce");
        const canonical = [
            "CONECTA_LOCAL_APP_GATEWAY",
            "v1",
            "POST",
            timestamp,
            nonce,
            form.get("action"),
            form.get("requestId"),
            createHash("sha256").update(serializedPayload, "utf8").digest("hex"),
        ].join("\n");
        const expectedSignature = createHmac("sha256", Buffer.from(SECRET, "utf8"))
            .update(canonical, "utf8")
            .digest("hex");

        forwarded = {
            action: form.get("action"),
            requestId: form.get("requestId"),
            payload,
            signatureValid: form.get("signature") === expectedSignature,
            contentType: options.headers["Content-Type"],
        };
        return upstreamResponse(form);
    });

    const response = await handler(buildRequest());
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(forwarded.action, "image.upload.chunk");
    assert.equal(forwarded.requestId, REQUEST_ID);
    assert.equal(forwarded.signatureValid, true);
    assert.equal(forwarded.contentType, "application/x-www-form-urlencoded;charset=UTF-8");
    assert.deepEqual(forwarded.payload, {
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
        uploadId: UPLOAD_ID,
        startOffset: 0,
        totalSize: 1024,
        chunkBase64: Buffer.alloc(1024, 0x5a).toString("base64"),
    });
    assert.match(response.headers.get("set-cookie") || "", /HttpOnly/);
});

test("gateway de imagem recusa execução fora do Preview", async () => {
    const handler = createImageUploadHandler({
        env: { VERCEL_ENV: "production" },
        fetchImpl: async () => { throw new Error("upstream não deveria ser chamado"); },
    });
    const response = await handler(buildRequest());
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error.code, "APP_DEMO_DISABLED");
});

test("gateway de imagem rejeita origem diferente", async () => {
    let fetchCalled = false;
    const handler = createHarness(async () => {
        fetchCalled = true;
        throw new Error("upstream não deveria ser chamado");
    });
    const response = await handler(buildRequest({ origin: "https://attacker.example" }));
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "ORIGIN_REJECTED");
    assert.equal(fetchCalled, false);
});

test("gateway de imagem rejeita CSRF ausente ou inválido", async () => {
    let fetchCalled = false;
    const handler = createHarness(async () => {
        fetchCalled = true;
        throw new Error("upstream não deveria ser chamado");
    });
    const response = await handler(buildRequest({ csrf: "0".repeat(64) }));
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "CSRF_REJECTED");
    assert.equal(fetchCalled, false);
});

test("gateway de imagem rejeita requisição sem cookie de sessão", async () => {
    let fetchCalled = false;
    const handler = createHarness(async () => {
        fetchCalled = true;
        throw new Error("upstream não deveria ser chamado");
    });
    const response = await handler(buildRequest({ cookie: "" }));
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error.code, "SESSION_INVALID");
    assert.equal(fetchCalled, false);
});

test("gateway de imagem aceita somente application/octet-stream", async () => {
    let fetchCalled = false;
    const handler = createHarness(async () => {
        fetchCalled = true;
        throw new Error("upstream não deveria ser chamado");
    });
    const response = await handler(buildRequest({ contentType: "application/json" }));
    const body = await response.json();

    assert.equal(response.status, 415);
    assert.equal(body.error.code, "UNSUPPORTED_MEDIA_TYPE");
    assert.equal(fetchCalled, false);
});

test("gateway de imagem rejeita blocos maiores que 1 MiB", async () => {
    let fetchCalled = false;
    const handler = createHarness(async () => {
        fetchCalled = true;
        throw new Error("upstream não deveria ser chamado");
    });
    const response = await handler(buildRequest({
        chunk: Buffer.alloc(1024 * 1024 + 1, 0x5a),
        totalSize: String(1024 * 1024 + 1),
    }));
    const body = await response.json();

    assert.equal(response.status, 413);
    assert.equal(body.error.code, "REQUEST_TOO_LARGE");
    assert.equal(fetchCalled, false);
});

test("gateway de imagem rejeita bloco incompatível com o intervalo declarado", async () => {
    let fetchCalled = false;
    const handler = createHarness(async () => {
        fetchCalled = true;
        throw new Error("upstream não deveria ser chamado");
    });
    const response = await handler(buildRequest({
        chunk: Buffer.alloc(512, 0x5a),
        totalSize: "1024",
    }));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "IMAGE_CHUNK_INVALID");
    assert.equal(fetchCalled, false);
});

test("gateway de imagem mapeia sessão expirada no Apps Script sem expor detalhes upstream", async () => {
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        return upstreamResponse(form, {
            ok: false,
            action: "image.upload.chunk",
            requestId: form.get("requestId"),
            error: { code: "SESSION_EXPIRED", message: "internal detail" },
        });
    });

    const response = await handler(buildRequest());
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error.code, "SESSION_EXPIRED");
    assert.equal(body.error.message, "Sua sessão expirou. Entre novamente.");
});
