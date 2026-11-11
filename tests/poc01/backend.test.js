import assert from "node:assert/strict";
import test from "node:test";
import { createBackendHandler } from "../../api/backend.js";

const SCRIPT_URL = "https://script.google.com/macros/s/POC_DEPLOYMENT_ID/exec";
const FINAL_URL = "https://script.googleusercontent.com/macros/echo?temporary=test";

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
        payload: { message: "Mensagem sintética de teste." },
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
        env: { APPS_SCRIPT_WEB_APP_URL: SCRIPT_URL },
        fetchImpl: options.fetchImpl || (async () => makeUpstream(JSON.stringify({
            ok: true,
            action: "poc.echo",
            requestId: "request-12345678",
            data: { received: true },
        }))),
        now: options.now || (() => 1_000),
        timeoutMs: 50,
        ...options,
    });
}

async function readJson(response) {
    return response.json();
}

test("recusa métodos diferentes de POST sem chamar o Apps Script", async () => {
    let called = false;
    const handler = makeHandler({
        fetchImpl: async () => {
            called = true;
            return makeUpstream("{}");
        },
    });

    const response = await handler(makeRequest(undefined, { method: "GET" }));
    const body = await readJson(response);

    assert.equal(response.status, 405);
    assert.equal(body.error.code, "METHOD_NOT_ALLOWED");
    assert.equal(called, false);
});

test("exige Content-Type application/json", async () => {
    const handler = makeHandler();
    const response = await handler(makeRequest("{}", {
        headers: { "content-type": "text/plain" },
    }));

    assert.equal(response.status, 415);
    assert.equal((await readJson(response)).error.code, "UNSUPPORTED_MEDIA_TYPE");
});

test("trata JSON inválido enviado pelo navegador", async () => {
    const handler = makeHandler();
    const response = await handler(makeRequest("{"));

    assert.equal(response.status, 400);
    assert.equal((await readJson(response)).error.code, "INVALID_JSON");
});

test("não encaminha ações fora da allowlist", async () => {
    let called = false;
    const handler = makeHandler({
        fetchImpl: async () => {
            called = true;
            return makeUpstream("{}");
        },
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput({
        action: "sheets.read",
    }))));

    assert.equal(response.status, 400);
    assert.equal((await readJson(response)).error.code, "ACTION_NOT_ALLOWED");
    assert.equal(called, false);
});

test("retorna 503 quando a URL do Apps Script não foi configurada", async () => {
    const handler = createBackendHandler({ env: {}, fetchImpl: async () => makeUpstream("{}") });
    const response = await handler(makeRequest(JSON.stringify(makeInput())));

    assert.equal(response.status, 503);
    assert.equal((await readJson(response)).error.code, "INTEGRATION_NOT_CONFIGURED");
});

test("envia POST form-urlencoded, segue o redirecionamento e devolve os dados", async () => {
    let receivedUrl;
    let receivedOptions;
    const handler = makeHandler({
        now: (() => {
            let value = 1_000;
            return () => {
                value += 12;
                return value;
            };
        })(),
        fetchImpl: async (url, options) => {
            receivedUrl = url;
            receivedOptions = options;

            return makeUpstream(JSON.stringify({
                ok: true,
                action: "poc.echo",
                requestId: "request-12345678",
                data: { received: true, payload: { message: "Mensagem sintética de teste." } },
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
    assert.equal(form.get("action"), "poc.echo");
    assert.equal(form.get("requestId"), "request-12345678");
    assert.deepEqual(JSON.parse(form.get("payload")), { message: "Mensagem sintética de teste." });
    assert.equal(body.ok, true);
    assert.equal(body.data.received, true);
    assert.equal(body.transport.redirected, true);
    assert.equal(body.transport.redirectHost, "script.googleusercontent.com");
    assert.equal(body.transport.durationMs, 12);
});

test("mapeia uma falha lógica retornada pelo Apps Script para HTTP 422", async () => {
    const handler = makeHandler({
        fetchImpl: async () => makeUpstream(JSON.stringify({
            ok: false,
            action: "poc.simulate_error",
            requestId: "request-12345678",
            error: { code: "POC_SIMULATED_ERROR" },
        })),
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput({
        action: "poc.simulate_error",
    }))));
    const body = await readJson(response);

    assert.equal(response.status, 422);
    assert.equal(body.error.code, "APPS_SCRIPT_REJECTED");
    assert.equal(body.transport.redirected, true);
});

test("trata resposta não JSON do Apps Script como falha upstream", async () => {
    const handler = makeHandler({
        fetchImpl: async () => makeUpstream("Isto não é JSON."),
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput({
        action: "poc.invalid_response",
    }))));
    const body = await readJson(response);

    assert.equal(response.status, 502);
    assert.equal(body.error.code, "UPSTREAM_INVALID_JSON");
    assert.equal(body.transport.redirected, true);
});

test("não considera a resposta válida quando o redirecionamento não foi confirmado", async () => {
    const handler = makeHandler({
        fetchImpl: async () => makeUpstream(JSON.stringify({
            ok: true,
            action: "poc.echo",
            requestId: "request-12345678",
            data: {},
        }), {
            redirected: false,
            url: SCRIPT_URL,
        }),
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput())));
    const body = await readJson(response);

    assert.equal(response.status, 502);
    assert.equal(body.error.code, "UPSTREAM_REDIRECT_NOT_CONFIRMED");
});

test("não aceita um destino final fora do host esperado do Content Service", async () => {
    const handler = makeHandler({
        fetchImpl: async () => makeUpstream("{}", {
            url: "https://example.com/unexpected",
        }),
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput())));
    const body = await readJson(response);

    assert.equal(response.status, 502);
    assert.equal(body.error.code, "UPSTREAM_REDIRECT_NOT_CONFIRMED");
});

test("mapeia timeout da chamada ao Apps Script para HTTP 504", async () => {
    const handler = makeHandler({
        fetchImpl: async () => {
            const error = new Error("Tempo esgotado.");
            error.name = "TimeoutError";
            throw error;
        },
    });

    const response = await handler(makeRequest(JSON.stringify(makeInput())));
    const body = await readJson(response);

    assert.equal(response.status, 504);
    assert.equal(body.error.code, "UPSTREAM_TIMEOUT");
});
