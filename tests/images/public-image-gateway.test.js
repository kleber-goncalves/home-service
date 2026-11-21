import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

import { createPublicImageHandler } from "../../server/public-image-gateway.js";

const ORIGIN = "https://conecta-local-preview.vercel.app";
const SCRIPT_URL = "https://script.google.com/macros/s/PUBLIC_IMAGE_TEST_DEPLOYMENT/exec";
const SECRET = "d".repeat(64);
const IMAGE_ID = "00000000-0000-4000-8000-000000000001";
const DRIVE_FILE_ID = "drive-file-id-123456";
const ACCESS_TOKEN = "test-oauth-token-that-must-not-reach-the-browser";
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

function buildRequest(options = {}) {
    const headers = new Headers({
        "Sec-Fetch-Site": options.fetchSite ?? "same-origin",
        ...(options.origin ? { Origin: options.origin } : {}),
        ...(options.referer ? { Referer: options.referer } : {}),
    });
    return new Request(
        ORIGIN + "/api/public-images/" + (options.imageId ?? IMAGE_ID),
        { method: options.method ?? "GET", headers },
    );
}

function createHarness(fetchImpl) {
    return createPublicImageHandler({
        env: {
            VERCEL_ENV: "preview",
            CONECTA_LOCAL_ALLOWED_ORIGIN: ORIGIN,
            CONECTA_LOCAL_APPS_SCRIPT_URL: SCRIPT_URL,
            CONECTA_LOCAL_HMAC_SECRET: SECRET,
        },
        fetchImpl,
        now: () => Date.UTC(2026, 10, 21, 12, 0, 0),
        randomBytesImpl: (size) => Buffer.alloc(size, 0x11),
        timeoutMs: 10_000,
    });
}

function appsScriptResponse(form, data = {}) {
    const response = new Response(JSON.stringify({
        ok: true,
        action: form.get("action"),
        requestId: form.get("requestId"),
        data: {
            fileId: DRIVE_FILE_ID,
            mimeType: "image/jpeg",
            sizeBytes: JPEG_BYTES.length,
            accessToken: ACCESS_TOKEN,
            ...data,
        },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    Object.defineProperties(response, {
        redirected: { value: true },
        url: { value: "https://script.googleusercontent.com/macros/echo?test=1" },
    });
    return response;
}

function appsScriptErrorResponse(form, code = "IMAGE_NOT_FOUND") {
    const response = new Response(JSON.stringify({
        ok: false,
        action: form.get("action"),
        requestId: form.get("requestId"),
        error: { code, message: "Private upstream detail" },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    Object.defineProperties(response, {
        redirected: { value: true },
        url: { value: "https://script.googleusercontent.com/macros/echo?test=1" },
    });
    return response;
}

test("entrega imagem somente após resolução assinada e leitura autenticada no Drive", async () => {
    const calls = [];
    const handler = createHarness(async (url, options) => {
        calls.push({ url, options });
        if (url === SCRIPT_URL) {
            const form = new URLSearchParams(options.body);
            assert.equal(form.get("action"), "public.image.resolve");
            assert.deepEqual(JSON.parse(form.get("payload")), { imageId: IMAGE_ID });
            assert.equal(options.method, "POST");
            return appsScriptResponse(form);
        }

        assert.equal(url, "https://www.googleapis.com/drive/v3/files/" + DRIVE_FILE_ID + "?alt=media");
        assert.equal(options.method, "GET");
        assert.equal(options.headers.Authorization, "Bearer " + ACCESS_TOKEN);
        const response = new Response(JPEG_BYTES, {
            status: 200,
            headers: {
                "Content-Type": "image/jpeg",
                "Content-Length": String(JPEG_BYTES.length),
            },
        });
        Object.defineProperty(response, "url", { value: url });
        return response;
    });

    const response = await handler(buildRequest());
    const body = Buffer.from(await response.arrayBuffer());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(body, JPEG_BYTES);
    assert.equal(calls.length, 2);
    assert.equal(JSON.stringify({ headers: Object.fromEntries(response.headers) }).includes(ACCESS_TOKEN), false);
});

test("imagem que não pertence mais a serviço publicado não é baixada", async () => {
    let driveCalled = false;
    const handler = createHarness(async (url, options) => {
        const form = new URLSearchParams(options.body);
        if (url === SCRIPT_URL) return appsScriptErrorResponse(form);
        driveCalled = true;
        throw new Error("Drive não deveria ser chamado");
    });

    const response = await handler(buildRequest());
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error.code, "IMAGE_NOT_FOUND");
    assert.equal(driveCalled, false);
    assert.equal(JSON.stringify(body).includes(ACCESS_TOKEN), false);
});

test("gateway rejeita origem externa antes de consultar o Apps Script", async () => {
    let upstreamCalled = false;
    const handler = createHarness(async () => {
        upstreamCalled = true;
        throw new Error("Upstream não deveria ser chamado");
    });

    const response = await handler(buildRequest({ origin: "https://attacker.example" }));
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "ORIGIN_REJECTED");
    assert.equal(upstreamCalled, false);
});

test("gateway rejeita incorporação cross-site", async () => {
    let upstreamCalled = false;
    const handler = createHarness(async () => {
        upstreamCalled = true;
        throw new Error("Upstream não deveria ser chamado");
    });

    const response = await handler(buildRequest({ fetchSite: "cross-site" }));
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "ORIGIN_REJECTED");
    assert.equal(upstreamCalled, false);
});

test("gateway não entrega resposta com MIME diferente do cadastro", async () => {
    const handler = createHarness(async (url, options) => {
        if (url === SCRIPT_URL) return appsScriptResponse(new URLSearchParams(options.body));
        const response = new Response("<html>not an image</html>", {
            status: 200,
            headers: { "Content-Type": "text/html", "Content-Length": "27" },
        });
        Object.defineProperty(response, "url", { value: url });
        return response;
    });

    const response = await handler(buildRequest());
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.error.code, "IMAGE_TYPE_MISMATCH");
});

test("gateway valida tamanho e limites máximos da imagem antes de entregar", async () => {
    let driveCalled = false;
    const handler = createHarness(async (url, options) => {
        if (url === SCRIPT_URL) {
            return appsScriptResponse(new URLSearchParams(options.body), {
                sizeBytes: 5_000_001,
            });
        }
        driveCalled = true;
        throw new Error("Drive não deveria ser chamado");
    });

    const response = await handler(buildRequest());
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.error.code, "IMAGE_METADATA_INVALID");
    assert.equal(driveCalled, false);
});

test("gateway rejeita acesso fora do Preview e métodos que não sejam GET", async () => {
    const disabled = createPublicImageHandler({
        env: { VERCEL_ENV: "production" },
        fetchImpl: async () => { throw new Error("não deveria chamar upstream"); },
    });
    const disabledResponse = await disabled(buildRequest());

    const handler = createHarness(async () => { throw new Error("não deveria chamar upstream"); });
    const methodResponse = await handler(buildRequest({ method: "POST" }));
    const invalidIdResponse = await handler(buildRequest({ imageId: "not-an-image-id" }));

    assert.equal(disabledResponse.status, 404);
    assert.equal(methodResponse.status, 405);
    assert.equal(invalidIdResponse.status, 404);
});
