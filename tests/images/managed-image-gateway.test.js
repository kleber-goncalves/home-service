import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { Buffer } from "node:buffer";
import test from "node:test";

import { createManagedImageHandler } from "../../server/managed-image-gateway.js";

const ORIGIN = "https://conecta-local-preview.vercel.app";
const SCRIPT_URL = "https://script.google.com/macros/s/MANAGED_IMAGE_TEST_DEPLOYMENT/exec";
const SECRET = "e".repeat(64);
const SESSION_TOKEN = "A".repeat(43);
const IMAGE_ID = "00000000-0000-4000-8000-000000000021";
const DRIVE_FILE_ID = "synthetic-drive-file-123";
const ACCESS_TOKEN = "managed-image-oauth-token-that-must-not-reach-the-browser";
const IMAGE_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

function deriveCsrfToken(token = SESSION_TOKEN) {
    const csrfKey = createHmac("sha256", Buffer.from(SECRET, "utf8"))
        .update("CONECTA_LOCAL_CSRF_KEY_V1", "utf8")
        .digest();
    return createHmac("sha256", csrfKey)
        .update(["CONECTA_LOCAL_CSRF_V1", token].join("\n"), "utf8")
        .digest("hex");
}

function buildRequest(options = {}) {
    const headers = new Headers({
        ...(options.origin === null ? {} : { Origin: options.origin ?? ORIGIN }),
        ...(options.fetchSite === null ? {} : { "Sec-Fetch-Site": options.fetchSite ?? "same-origin" }),
        ...(options.referer !== undefined ? { Referer: options.referer } : {}),
        ...(options.cookie !== undefined ? { Cookie: options.cookie } : { Cookie: "__Host-conecta_local_session=" + SESSION_TOKEN }),
        ...(options.csrf !== undefined ? { "X-CSRF-Token": options.csrf } : { "X-CSRF-Token": deriveCsrfToken() }),
    });
    return new Request(
        ORIGIN + "/api/managed-images?id=" + encodeURIComponent(options.imageId ?? IMAGE_ID),
        { method: options.method ?? "GET", headers },
    );
}

function createUpstreamResponse(payload, responseUrl) {
    const response = new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
    Object.defineProperties(response, {
        redirected: { value: true },
        url: { value: responseUrl },
    });
    return response;
}

function createHarness(fetchImpl) {
    return createManagedImageHandler({
        env: {
            VERCEL_ENV: "preview",
            CONECTA_LOCAL_ALLOWED_ORIGIN: ORIGIN,
            CONECTA_LOCAL_APPS_SCRIPT_URL: SCRIPT_URL,
            CONECTA_LOCAL_HMAC_SECRET: SECRET,
        },
        fetchImpl,
        now: () => Date.UTC(2026, 10, 27, 12, 0, 0),
        randomBytesImpl: (size) => Buffer.alloc(size, 0x22),
        timeoutMs: 10_000,
    });
}

test("entrega imagem privada somente após sessão, CSRF e propriedade validados no Apps Script", async () => {
    const calls = [];
    const handler = createHarness(async (url, options) => {
        calls.push({ url, options });
        if (url === SCRIPT_URL) {
            const form = new URLSearchParams(options.body);
            const payload = JSON.parse(form.get("payload"));
            assert.equal(form.get("action"), "image.resolve.mine");
            assert.deepEqual(payload, {
                imageId: IMAGE_ID,
                tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
            });
            assert.equal(options.method, "POST");
            return createUpstreamResponse({
                ok: true,
                action: "image.resolve.mine",
                requestId: form.get("requestId"),
                data: {
                    fileId: DRIVE_FILE_ID,
                    mimeType: "image/png",
                    sizeBytes: IMAGE_BYTES.length,
                    accessToken: ACCESS_TOKEN,
                },
            }, "https://script.googleusercontent.com/macros/echo?managed-image=1");
        }

        assert.equal(url, "https://www.googleapis.com/drive/v3/files/" + DRIVE_FILE_ID + "?alt=media");
        assert.equal(options.method, "GET");
        assert.equal(options.headers.Authorization, "Bearer " + ACCESS_TOKEN);
        const response = new Response(IMAGE_BYTES, {
            status: 200,
            headers: { "Content-Type": "image/png", "Content-Length": String(IMAGE_BYTES.length) },
        });
        Object.defineProperty(response, "url", { value: url });
        return response;
    });

    const response = await handler(buildRequest());
    const bytes = Buffer.from(await response.arrayBuffer());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(response.headers.get("content-disposition"), "inline");
    assert.match(response.headers.get("set-cookie") || "", /HttpOnly/);
    assert.deepEqual(bytes, IMAGE_BYTES);
    assert.equal(calls.length, 2);
    assert.equal(JSON.stringify(Object.fromEntries(response.headers)).includes(ACCESS_TOKEN), false);
});

test("gateway rejeita sessão ausente e CSRF inválido antes de consultar o Apps Script", async () => {
    let upstreamCalled = false;
    const handler = createHarness(async () => {
        upstreamCalled = true;
        throw new Error("O upstream não deveria ser chamado.");
    });

    const missingSession = await handler(buildRequest({ cookie: "" }));
    const invalidCsrf = await handler(buildRequest({ csrf: "0".repeat(64) }));

    assert.equal(missingSession.status, 401);
    assert.equal((await missingSession.json()).error.code, "SESSION_INVALID");
    assert.equal(invalidCsrf.status, 403);
    assert.equal((await invalidCsrf.json()).error.code, "CSRF_REJECTED");
    assert.equal(upstreamCalled, false);
});

test("gateway rejeita origem externa, consulta duplicada e execução fora do Preview", async () => {
    let upstreamCalled = false;
    const handler = createHarness(async () => {
        upstreamCalled = true;
        throw new Error("O upstream não deveria ser chamado.");
    });
    const external = await handler(buildRequest({ origin: "https://attacker.example" }));
    const duplicate = await handler(new Request(ORIGIN + "/api/managed-images?id=" + IMAGE_ID + "&id=" + IMAGE_ID, {
        headers: {
            Origin: ORIGIN,
            "Sec-Fetch-Site": "same-origin",
            Cookie: "__Host-conecta_local_session=" + SESSION_TOKEN,
            "X-CSRF-Token": deriveCsrfToken(),
        },
    }));
    const disabled = createManagedImageHandler({
        env: { VERCEL_ENV: "production" },
        fetchImpl: async () => { throw new Error("não deveria chamar"); },
    });
    const production = await disabled(buildRequest());

    assert.equal(external.status, 403);
    assert.equal(duplicate.status, 404);
    assert.equal(production.status, 404);
    assert.equal(upstreamCalled, false);
});

test("gateway aceita GET same-origin sem Origin quando Fetch Metadata e Referer são válidos", async () => {
    let upstreamCalled = false;
    const handler = createHarness(async () => {
        upstreamCalled = true;
        throw new Error("Falha simulada depois da validação de origem.");
    });

    const response = await handler(buildRequest({
        origin: null,
        fetchSite: "same-origin",
        referer: ORIGIN + "/?auth=demo",
    }));

    assert.equal(upstreamCalled, true);
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error.code, "IMAGE_LOOKUP_FAILED");
});

test("gateway rejeita fallback sem Origin quando os sinais same-origin estão ausentes ou inconsistentes", async () => {
    let upstreamCalled = false;
    const handler = createHarness(async () => {
        upstreamCalled = true;
        throw new Error("O upstream não deveria ser chamado.");
    });
    const invalidRequests = [
        { origin: null, fetchSite: "same-origin" },
        { origin: null, fetchSite: null, referer: ORIGIN + "/" },
        { origin: null, fetchSite: "cross-site", referer: ORIGIN + "/" },
        { origin: null, fetchSite: "same-origin", referer: "https://attacker.example/" },
        { origin: "null", fetchSite: "same-origin", referer: ORIGIN + "/" },
        { origin: ORIGIN, fetchSite: "cross-site", referer: ORIGIN + "/" },
        { origin: ORIGIN, fetchSite: "same-origin", referer: "https://attacker.example/" },
    ];

    for (const options of invalidRequests) {
        const response = await handler(buildRequest(options));
        assert.equal(response.status, 403);
        assert.equal((await response.json()).error.code, "ORIGIN_REJECTED");
    }
    assert.equal(upstreamCalled, false);
});

test("imagem fora da conta do profissional não é baixada do Drive", async () => {
    let driveCalled = false;
    const handler = createHarness(async (url, options) => {
        const form = new URLSearchParams(options.body);
        return createUpstreamResponse({
            ok: false,
            action: "image.resolve.mine",
            requestId: form.get("requestId"),
            error: { code: "IMAGE_NOT_FOUND", message: "internal detail" },
        }, "https://script.googleusercontent.com/macros/echo?managed-image=2");
    });

    const response = await handler(buildRequest());
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.equal(body.error.code, "IMAGE_NOT_FOUND");
    assert.equal(driveCalled, false);
    assert.equal(JSON.stringify(body).includes(ACCESS_TOKEN), false);
});

test("gateway rejeita MIME e tamanho inconsistentes do arquivo privado", async () => {
    const mimeHandler = createHarness(async (url, options) => {
        if (url === SCRIPT_URL) {
            const form = new URLSearchParams(options.body);
            return createUpstreamResponse({
                ok: true,
                action: "image.resolve.mine",
                requestId: form.get("requestId"),
                data: { fileId: DRIVE_FILE_ID, mimeType: "image/png", sizeBytes: IMAGE_BYTES.length, accessToken: ACCESS_TOKEN },
            }, "https://script.googleusercontent.com/macros/echo?managed-image=3");
        }
        const response = new Response(IMAGE_BYTES, {
            headers: { "Content-Type": "text/plain", "Content-Length": String(IMAGE_BYTES.length) },
        });
        Object.defineProperty(response, "url", { value: url });
        return response;
    });
    const mimeResponse = await mimeHandler(buildRequest());

    const lengthHandler = createHarness(async (url, options) => {
        if (url === SCRIPT_URL) {
            const form = new URLSearchParams(options.body);
            return createUpstreamResponse({
                ok: true,
                action: "image.resolve.mine",
                requestId: form.get("requestId"),
                data: { fileId: DRIVE_FILE_ID, mimeType: "image/png", sizeBytes: IMAGE_BYTES.length, accessToken: ACCESS_TOKEN },
            }, "https://script.googleusercontent.com/macros/echo?managed-image=4");
        }
        const response = new Response(IMAGE_BYTES.subarray(0, 8), {
            headers: { "Content-Type": "image/png", "Content-Length": "8" },
        });
        Object.defineProperty(response, "url", { value: url });
        return response;
    });
    const lengthResponse = await lengthHandler(buildRequest());

    assert.equal(mimeResponse.status, 502);
    assert.equal((await mimeResponse.json()).error.code, "IMAGE_TYPE_MISMATCH");
    assert.equal(lengthResponse.status, 502);
    assert.equal((await lengthResponse.json()).error.code, "IMAGE_SIZE_MISMATCH");
});
