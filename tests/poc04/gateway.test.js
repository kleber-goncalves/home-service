import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import {
    createPoc04SessionHandler,
    parsePoc04SessionCookie,
} from "../../server/poc04-session-gateway.js";

const ORIGIN = "https://home-service-poc04-preview.vercel.app";
const SCRIPT_URL = "https://script.google.com/macros/s/POC04_TEST_DEPLOYMENT/exec";
const HMAC_SECRET = "e".repeat(64);
const NOW = Date.UTC(2026, 10, 14, 15, 0, 0);
const SESSION_COOKIE = "__Host-conecta_poc04_session";

function environment(overrides = {}) {
    return {
        VERCEL_ENV: "preview",
        POC04_ENABLED: "true",
        POC04_ALLOWED_ORIGIN: ORIGIN,
        POC04_APPS_SCRIPT_WEB_APP_URL: SCRIPT_URL,
        POC04_APPS_SCRIPT_HMAC_SECRET: HMAC_SECRET,
        ...overrides,
    };
}

function request(action, options = {}) {
    const headers = new Headers({
        Origin: ORIGIN,
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
        ...(options.headers || {}),
    });

    const body = JSON.stringify({
        action,
        requestId: options.requestId || "poc04-request-0001",
        payload: options.payload || {},
    });

    return new Request("https://home-service-poc04-preview.vercel.app/api/poc04/session", {
        method: options.method || "POST",
        headers,
        body: options.method === "GET" ? undefined : body,
    });
}

function upstream(body, options = {}) {
    return {
        ok: options.ok ?? true,
        status: options.status ?? 200,
        redirected: options.redirected ?? true,
        url: options.url ?? "https://script.googleusercontent.com/macros/echo?test=poc04",
        async text() {
            return typeof body === "string" ? body : JSON.stringify(body);
        },
    };
}

function responseEnvelope(action, requestId, data) {
    return {
        ok: true,
        action,
        requestId,
        data,
    };
}

function setCookie(response) {
    if (typeof response.headers.getSetCookie === "function") {
        return response.headers.getSetCookie()[0] || "";
    }
    return response.headers.get("set-cookie") || "";
}

function makeHandler(options = {}) {
    let randomIndex = 1;
    const randomBytesImpl = options.randomBytesImpl || ((size) => {
        const value = randomIndex;
        randomIndex += 1;
        return Buffer.alloc(size, value);
    });

    return createPoc04SessionHandler({
        env: environment(options.env),
        now: options.now || (() => NOW),
        randomBytesImpl,
        timeoutMs: 100,
        fetchImpl: options.fetchImpl || (async (_url, fetchOptions) => {
            const form = new URLSearchParams(fetchOptions.body);
            const action = form.get("action");
            const requestId = form.get("requestId");
            const expiresAt = new Date(NOW + 8 * 60 * 60 * 1000).toISOString();

            if (action === "poc.session.issue") {
                return upstream(responseEnvelope(action, requestId, {
                    created: true,
                    expiresAt,
                }));
            }

            if (action === "poc.session.csrf") {
                return upstream(responseEnvelope(action, requestId, {
                    csrfReady: true,
                    expiresAt,
                }));
            }

            if (action === "poc.session.validate") {
                return upstream(responseEnvelope(action, requestId, {
                    valid: true,
                    expiresAt,
                }));
            }

            return upstream(responseEnvelope(action, requestId, { revoked: true }));
        }),
    });
}

test("emite cookie somente após confirmação e mantém o token fora do JSON", async () => {
    const handler = makeHandler();
    const response = await handler(request("poc.session.issue"));
    const body = await response.json();
    const cookie = setCookie(response);
    const sessionToken = Buffer.alloc(32, 1).toString("base64url");

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.data.created, true);
    assert.equal(body.data.csrfToken, Buffer.alloc(32, 2).toString("base64url"));
    assert.equal(body.data.expiresAt, new Date(NOW + 8 * 60 * 60 * 1000).toISOString());
    assert.equal(JSON.stringify(body).includes(sessionToken), false);
    assert.ok(cookie.startsWith(SESSION_COOKIE + "=" + sessionToken));
    assert.match(cookie, /Path=\//);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Max-Age=1800/);
    assert.doesNotMatch(cookie, /Domain=/i);
});

test("assina a ação, timestamp, nonce, requestId e payload do Apps Script", async () => {
    let captured;
    const handler = makeHandler({
        fetchImpl: async (url, options) => {
            captured = { url, options };
            const form = new URLSearchParams(options.body);
            return upstream(responseEnvelope(
                form.get("action"),
                form.get("requestId"),
                {
                    created: true,
                    expiresAt: new Date(NOW + 8 * 60 * 60 * 1000).toISOString(),
                },
            ));
        },
    });

    const response = await handler(request("poc.session.issue"));
    const form = new URLSearchParams(captured.options.body);
    const payload = form.get("payload");
    const canonical = [
        "CONECTA_LOCAL_POC04_SESSION",
        "v1",
        "POST",
        form.get("timestamp"),
        form.get("nonce"),
        form.get("action"),
        form.get("requestId"),
        createHash("sha256").update(payload, "utf8").digest("hex"),
    ].join("\n");
    const expectedSignature = createHmac("sha256", Buffer.from(HMAC_SECRET, "utf8"))
        .update(canonical, "utf8")
        .digest("hex");

    assert.equal(response.status, 200);
    assert.equal(captured.url, SCRIPT_URL);
    assert.equal(captured.options.method, "POST");
    assert.equal(captured.options.redirect, "follow");
    assert.match(captured.options.headers["Content-Type"], /application\/x-www-form-urlencoded/i);
    assert.equal(form.get("signatureVersion"), "v1");
    assert.match(form.get("nonce"), /^[a-f0-9]{64}$/);
    assert.equal(form.get("signature"), expectedSignature);
    assert.deepEqual(Object.keys(JSON.parse(payload)).sort(), ["csrfToken", "sessionToken"]);
    assert.equal(payload.includes(HMAC_SECRET), false);
});

test("valida cookie automaticamente recebido e encaminha token somente server-side", async () => {
    const sessionToken = Buffer.alloc(32, 9).toString("base64url");
    const csrfToken = Buffer.alloc(32, 7).toString("base64url");
    let forwardedPayload;

    const handler = makeHandler({
        fetchImpl: async (_url, options) => {
            const form = new URLSearchParams(options.body);
            forwardedPayload = JSON.parse(form.get("payload"));
            return upstream(responseEnvelope(
                "poc.session.validate",
                form.get("requestId"),
                { valid: true, expiresAt: new Date(NOW + 7 * 60 * 60 * 1000).toISOString() },
            ));
        },
    });

    const response = await handler(request("poc.session.validate", {
        headers: {
            Cookie: SESSION_COOKIE + "=" + sessionToken,
            "X-CSRF-Token": csrfToken,
        },
    }));
    const body = await response.json();
    const cookie = setCookie(response);

    assert.equal(response.status, 200);
    assert.equal(body.data.valid, true);
    assert.deepEqual(forwardedPayload, { sessionToken, csrfToken });
    assert.ok(cookie.startsWith(SESSION_COOKIE + "=" + sessionToken));
    assert.match(cookie, /Max-Age=1800/);
    assert.equal(JSON.stringify(body).includes(sessionToken), false);
});

test("poc.session.csrf permite recuperar token CSRF sem expor a sessão", async () => {
    const sessionToken = Buffer.alloc(32, 5).toString("base64url");
    let forwardedPayload;

    const handler = makeHandler({
        fetchImpl: async (_url, options) => {
            const form = new URLSearchParams(options.body);
            forwardedPayload = JSON.parse(form.get("payload"));
            return upstream(responseEnvelope(
                "poc.session.csrf",
                form.get("requestId"),
                { csrfReady: true, expiresAt: new Date(NOW + 8 * 60 * 60 * 1000).toISOString() },
            ));
        },
    });

    const response = await handler(request("poc.session.csrf", {
        headers: { Cookie: SESSION_COOKIE + "=" + sessionToken },
    }));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.csrfReady, true);
    assert.equal(body.data.csrfToken, Buffer.alloc(32, 1).toString("base64url"));
    assert.equal(forwardedPayload.sessionToken, sessionToken);
    assert.notEqual(forwardedPayload.csrfToken, sessionToken);
});

test("expira o cookie somente após confirmação de revogação", async () => {
    const sessionToken = Buffer.alloc(32, 8).toString("base64url");
    const csrfToken = Buffer.alloc(32, 6).toString("base64url");
    const handler = makeHandler();

    const response = await handler(request("poc.session.revoke", {
        headers: {
            Cookie: SESSION_COOKIE + "=" + sessionToken,
            "X-CSRF-Token": csrfToken,
        },
    }));
    const body = await response.json();
    const cookie = setCookie(response);

    assert.equal(response.status, 200);
    assert.equal(body.data.revoked, true);
    assert.match(cookie, /Max-Age=0/);
    assert.match(cookie, /Expires=Thu, 01 Jan 1970/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
});

test("não limpa o cookie quando o Apps Script não confirma o logout", async () => {
    const handler = makeHandler({
        fetchImpl: async (_url, options) => {
            const form = new URLSearchParams(options.body);
            return upstream({
                ok: false,
                action: form.get("action"),
                requestId: form.get("requestId"),
                error: { code: "POC04_STORE_UNAVAILABLE" },
            });
        },
    });

    const response = await handler(request("poc.session.revoke", {
        headers: {
            Cookie: SESSION_COOKIE + "=" + Buffer.alloc(32, 3).toString("base64url"),
            "X-CSRF-Token": Buffer.alloc(32, 4).toString("base64url"),
        },
    }));

    assert.equal(response.status, 503);
    assert.equal(setCookie(response), "");
});

test("sessão expirada no Apps Script gera 401 e limpa cookie do navegador", async () => {
    const handler = makeHandler({
        fetchImpl: async (_url, options) => {
            const form = new URLSearchParams(options.body);
            return upstream({
                ok: false,
                action: form.get("action"),
                requestId: form.get("requestId"),
                error: { code: "POC04_SESSION_EXPIRED" },
            });
        },
    });

    const response = await handler(request("poc.session.validate", {
        headers: {
            Cookie: SESSION_COOKIE + "=" + Buffer.alloc(32, 2).toString("base64url"),
            "X-CSRF-Token": Buffer.alloc(32, 3).toString("base64url"),
        },
    }));

    assert.equal(response.status, 401);
    assert.match(setCookie(response), /Max-Age=0/);
});

test("recusa Origin ausente, outra origem e Sec-Fetch-Site cross-site", async (t) => {
    const cases = [
        ["Origin ausente", { Origin: null }],
        ["outra origem", { Origin: "https://evil.example" }],
        ["cross-site", { "Sec-Fetch-Site": "cross-site" }],
    ];

    for (const [label, headers] of cases) {
        await t.test(label, async () => {
            let called = false;
            const handler = makeHandler({
                fetchImpl: async () => {
                    called = true;
                    return upstream({});
                },
            });
            const response = await handler(request("poc.session.issue", { headers }));

            assert.equal(response.status, 403);
            assert.equal((await response.json()).error.code, "ORIGIN_REJECTED");
            assert.equal(called, false);
        });
    }
});

test("recusa ambientes diferentes de Preview e POC04 desabilitada", async (t) => {
    for (const [label, env] of [
        ["produção", { VERCEL_ENV: "production" }],
        ["flag desabilitada", { POC04_ENABLED: "false" }],
    ]) {
        await t.test(label, async () => {
            const handler = makeHandler({ env });
            const response = await handler(request("poc.session.issue"));
            assert.equal(response.status, 404);
            assert.equal((await response.json()).error.code, "POC04_DISABLED");
        });
    }
});

test("recusa emissão quando o Apps Script não confirma a criação", async () => {
    const handler = makeHandler({
        fetchImpl: async (_url, options) => {
            const form = new URLSearchParams(options.body);
            return upstream(responseEnvelope(
                form.get("action"),
                form.get("requestId"),
                { created: false, expiresAt: new Date(NOW + 8 * 60 * 60 * 1000).toISOString() },
            ));
        },
    });

    const response = await handler(request("poc.session.issue"));
    assert.equal(response.status, 502);
    assert.equal(setCookie(response), "");
});

test("parser de cookie rejeita duplicidade e formato inválido", () => {
    const token = Buffer.alloc(32, 1).toString("base64url");

    assert.deepEqual(parsePoc04SessionCookie("theme=dark; " + SESSION_COOKIE + "=" + token), {
        status: "valid",
        token,
    });
    assert.equal(parsePoc04SessionCookie("").status, "missing");
    assert.equal(parsePoc04SessionCookie(SESSION_COOKIE + "=short").status, "invalid");
    assert.equal(parsePoc04SessionCookie(
        SESSION_COOKIE + "=" + token + "; " + SESSION_COOKIE + "=" + token,
    ).status, "ambiguous");
});

test("requisição sem cookie ou CSRF válido falha antes de chamar o Apps Script", async (t) => {
    for (const [label, headers] of [
        ["sem cookie", { "X-CSRF-Token": Buffer.alloc(32, 2).toString("base64url") }],
        ["sem token CSRF", { Cookie: SESSION_COOKIE + "=" + Buffer.alloc(32, 1).toString("base64url") }],
    ]) {
        await t.test(label, async () => {
            let called = false;
            const handler = makeHandler({
                fetchImpl: async () => {
                    called = true;
                    return upstream({});
                },
            });
            const response = await handler(request("poc.session.validate", { headers }));

            assert.ok(response.status === 401 || response.status === 403);
            assert.equal(called, false);
        });
    }
});

test("CSPRNG indisponível falha fechado sem chamar o Apps Script", async () => {
    let called = false;
    const handler = makeHandler({
        randomBytesImpl: () => {
            throw new Error("CSPRNG unavailable");
        },
        fetchImpl: async () => {
            called = true;
            return upstream({});
        },
    });

    const response = await handler(request("poc.session.issue"));

    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "POC04_RANDOM_UNAVAILABLE");
    assert.equal(called, false);
});
