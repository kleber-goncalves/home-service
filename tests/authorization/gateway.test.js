import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";

import { createAppHandler } from "../../server/app-gateway.js";

const ORIGIN = "https://conecta-local-preview.vercel.app";
const SCRIPT_URL = "https://script.google.com/macros/s/AUTHORIZATION_TEST_DEPLOYMENT/exec";
const SECRET = "b".repeat(64);
const SESSION_TOKEN = Buffer.alloc(32, 7).toString("base64url");
const COOKIE_NAME = "__Host-conecta_local_session";

function csrfToken(sessionToken = SESSION_TOKEN) {
    const csrfKey = createHmac("sha256", Buffer.from(SECRET, "utf8"))
        .update("CONECTA_LOCAL_CSRF_KEY_V1", "utf8")
        .digest();

    return createHmac("sha256", csrfKey)
        .update(["CONECTA_LOCAL_CSRF_V1", sessionToken].join("\n"), "utf8")
        .digest("hex");
}

function buildRequest(action, payload, options = {}) {
    const headers = new Headers({
        Origin: ORIGIN,
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
        Cookie: COOKIE_NAME + "=" + SESSION_TOKEN,
        "X-CSRF-Token": csrfToken(),
        ...(options.headers || {}),
    });

    return new Request(ORIGIN + "/api/app", {
        method: options.method || "POST",
        headers,
        body: options.method === "GET" ? undefined : JSON.stringify({
            action,
            requestId: options.requestId || "authz-request-0001",
            payload,
        }),
    });
}

function createHarness(fetchImpl, options = {}) {
    return createAppHandler({
        env: {
            VERCEL_ENV: "preview",
            CONECTA_LOCAL_ALLOWED_ORIGIN: ORIGIN,
            CONECTA_LOCAL_APPS_SCRIPT_URL: SCRIPT_URL,
            CONECTA_LOCAL_HMAC_SECRET: SECRET,
        },
        fetchImpl,
        now: () => Date.UTC(2026, 10, 20, 12, 0, 0),
        ...options,
    });
}

function upstreamResponse(form) {
    const action = form.get("action");
    const requestId = form.get("requestId");
    return {
        ok: true,
        status: 200,
        redirected: true,
        url: "https://script.googleusercontent.com/macros/echo?authorization-test=1",
        async text() {
            return JSON.stringify({
                ok: true,
                action,
                requestId,
                data: { accepted: true },
            });
        },
    };
}

test("gateway deriva tokenHash do cookie e remove IDs de proprietário enviados em service.setStatus", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = {
            action: form.get("action"),
            payload: JSON.parse(form.get("payload")),
        };
        return upstreamResponse(form);
    });

    const response = await handler(buildRequest("service.setStatus", {
        serviceId: "service-owned-by-another-user",
        status: "paused",
        tokenHash: "9".repeat(64),
        id_usuario: "user-b",
        id_profissional: "profile-b",
        ownerId: "user-b",
        papel: "admin",
    }));

    assert.equal(response.status, 200);
    assert.equal(forwarded.action, "service.setStatus");
    assert.deepEqual(forwarded.payload, {
        serviceId: "service-owned-by-another-user",
        status: "paused",
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
});

test("gateway encaminha somente os campos editáveis do perfil e deriva a sessão", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = JSON.parse(form.get("payload"));
        return upstreamResponse(form);
    });

    const response = await handler(buildRequest("profile.update", {
        nome_completo: "Profissional A Atualizado",
        nome_publico: "Equipe A",
        apresentacao: "Perfil fictício atualizado para o teste de autorização.",
        id_cidade_principal: "city-synthetic",
        whatsapp: "34999990001",
        email: "email-forjado@example.test",
        telefone_alternativo: "5534999990000",
        tokenHash: "9".repeat(64),
        id_usuario: "user-b",
        id_profissional: "profile-b",
        papel: "admin",
        status: "suspended",
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(forwarded, {
        nome_completo: "Profissional A Atualizado",
        nome_publico: "Equipe A",
        apresentacao: "Perfil fictício atualizado para o teste de autorização.",
        id_cidade_principal: "city-synthetic",
        whatsapp: "34999990001",
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
});

test("gateway não expõe session.create nem operações internas na allowlist do navegador", async () => {
    let fetchCalled = false;
    const handler = createHarness(async () => {
        fetchCalled = true;
        throw new Error("O upstream não deveria ser chamado.");
    });

    const response = await handler(buildRequest("session.create", {
        idUsuario: "user-b",
        tokenHash: "8".repeat(64),
    }));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "ACTION_NOT_ALLOWED");
    assert.equal(fetchCalled, false);
});

test("gateway não encaminha identidade enviada pelo cliente em service.listMine", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = JSON.parse(form.get("payload"));
        return upstreamResponse(form);
    });

    const response = await handler(buildRequest("service.listMine", {
        id_usuario: "user-b",
        id_profissional: "profile-b",
        papel: "admin",
        tokenHash: "9".repeat(64),
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(forwarded, {
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
});


test("gateway permite service.update, mas encaminha apenas os campos editáveis e a sessão derivada", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = {
            action: form.get("action"),
            payload: JSON.parse(form.get("payload")),
        };
        return upstreamResponse(form);
    });

    const response = await handler(buildRequest("service.update", {
        serviceId: "service-a",
        categoryId: "category-a",
        title: "Serviço atualizado",
        description: "Descrição atualizada no teste do gateway.",
        cityIds: ["city-a", "city-b"],
        tokenHash: "9".repeat(64),
        id_usuario: "user-b",
        id_profissional: "profile-b",
        papel: "admin",
        status: "removed",
        ownerId: "user-b",
    }));

    assert.equal(response.status, 200);
    assert.equal(forwarded.action, "service.update");
    assert.deepEqual(forwarded.payload, {
        serviceId: "service-a",
        categoryId: "category-a",
        title: "Serviço atualizado",
        description: "Descrição atualizada no teste do gateway.",
        cityIds: ["city-a", "city-b"],
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
});


test("gateway encaminha cityIds e remove identidade e estado forjados em service.create", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = { action: form.get("action"), payload: JSON.parse(form.get("payload")) };
        return upstreamResponse(form);
    });
    const response = await handler(buildRequest("service.create", {
        categoryId: "category-a",
        title: "Serviço em dois municípios",
        description: "Descrição fictícia suficiente para validar o gateway.",
        cityIds: ["city-a", "city-b"],
        tokenHash: "9".repeat(64),
        id_usuario: "user-b",
        id_profissional: "profile-b",
        papel: "admin",
        status: "removed",
        ownerId: "user-b",
    }));
    assert.equal(response.status, 200);
    assert.equal(forwarded.action, "service.create");
    assert.deepEqual(forwarded.payload, {
        categoryId: "category-a",
        title: "Serviço em dois municípios",
        description: "Descrição fictícia suficiente para validar o gateway.",
        cityIds: ["city-a", "city-b"],
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
});

test("gateway permite service.remove e não encaminha identidade ou estado enviados pelo navegador", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = {
            action: form.get("action"),
            payload: JSON.parse(form.get("payload")),
        };
        return upstreamResponse(form);
    });

    const response = await handler(buildRequest("service.remove", {
        serviceId: "service-a",
        tokenHash: "9".repeat(64),
        id_usuario: "user-b",
        id_profissional: "profile-b",
        papel: "admin",
        status: "published",
    }));

    assert.equal(response.status, 200);
    assert.equal(forwarded.action, "service.remove");
    assert.deepEqual(forwarded.payload, {
        serviceId: "service-a",
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
});


test("gateway permite início de upload, mas deriva a sessão e encaminha somente metadados permitidos", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = {
            action: form.get("action"),
            payload: JSON.parse(form.get("payload")),
        };
        return upstreamResponse(form);
    });

    const response = await handler(buildRequest("image.upload.start", {
        serviceId: "service-a",
        fileSize: 2048,
        mimeType: "image/png",
        tokenHash: "9".repeat(64),
        id_usuario: "user-b",
        id_profissional: "profile-b",
        papel: "admin",
        folderId: "attacker-controlled-folder",
        sessionUri: "https://attacker.example/upload",
    }));

    assert.equal(response.status, 200);
    assert.equal(forwarded.action, "image.upload.start");
    assert.deepEqual(forwarded.payload, {
        serviceId: "service-a",
        fileSize: 2048,
        mimeType: "image/png",
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
});

test("gateway permite remoção de imagem somente com ID e sessão derivados", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = {
            action: form.get("action"),
            payload: JSON.parse(form.get("payload")),
        };
        return upstreamResponse(form);
    });

    const response = await handler(buildRequest("image.remove", {
        imageId: "image-a",
        tokenHash: "9".repeat(64),
        id_usuario: "user-b",
        ownerId: "user-b",
        papel: "admin",
    }));

    assert.equal(response.status, 200);
    assert.equal(forwarded.action, "image.remove");
    assert.deepEqual(forwarded.payload, {
        imageId: "image-a",
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
});


test("gateway permite iniciar foto de perfil com metadados mínimos e sessão derivada do cookie", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = {
            action: form.get("action"),
            payload: JSON.parse(form.get("payload")),
        };
        return upstreamResponse(form);
    });

    const response = await handler(buildRequest("profile.photo.upload.start", {
        fileSize: 2048,
        mimeType: "image/png",
        tokenHash: "9".repeat(64),
        id_usuario: "user-b",
        id_profissional: "profile-b",
        papel: "admin",
        serviceId: "attacker-service",
        folderId: "attacker-folder",
        sessionUri: "https://attacker.example/upload",
    }));

    assert.equal(response.status, 200);
    assert.equal(forwarded.action, "profile.photo.upload.start");
    assert.deepEqual(forwarded.payload, {
        fileSize: 2048,
        mimeType: "image/png",
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
});

test("gateway encaminha somente uploadId e sessão para status/cancel da foto de perfil", async () => {
    for (const action of ["profile.photo.upload.status", "profile.photo.upload.cancel"]) {
        let forwarded;
        const handler = createHarness(async (_url, options) => {
            const form = new URLSearchParams(options.body);
            forwarded = {
                action: form.get("action"),
                payload: JSON.parse(form.get("payload")),
            };
            return upstreamResponse(form);
        });

        const response = await handler(buildRequest(action, {
            uploadId: "00000000-0000-4000-8000-000000000001",
            tokenHash: "9".repeat(64),
            id_usuario: "user-b",
            id_profissional: "profile-b",
            papel: "admin",
        }));

        assert.equal(response.status, 200, action);
        assert.equal(forwarded.action, action);
        assert.deepEqual(forwarded.payload, {
            uploadId: "00000000-0000-4000-8000-000000000001",
            tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
        });
    }
});


test("gateway reautentica a conta, não encaminha a senha ao Apps Script e só então inicia a troca de e-mail", async () => {
    const forwarded = [];
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        const action = form.get("action");
        const payload = JSON.parse(form.get("payload"));
        forwarded.push({ action, payload });

        const data = action === "auth.reauth.lookup"
            ? {
                idUsuario: "user-synthetic",
                status: "active",
                algoritmo: "argon2id$v=19$m=19456,t=2,p=1",
                salt: "a".repeat(32),
                hash: "b".repeat(64),
            }
            : action === "auth.reauth.success"
                ? { reauthenticated: true }
                : {
                    requested: true,
                    pendingEmail: "new-address@example.test",
                    expiresAt: "2026-11-20T12:10:00.000Z",
                };

        return {
            ok: true,
            status: 200,
            redirected: true,
            url: "https://script.googleusercontent.com/macros/echo?authorization-test=1",
            async text() {
                return JSON.stringify({ ok: true, action, requestId: form.get("requestId"), data });
            },
        };
    }, {
        derivePasswordHashImpl: async (password, salt) => {
            assert.equal(password, "synthetic-current-password");
            assert.equal(salt, "a".repeat(32));
            return Buffer.from("b".repeat(64), "hex");
        },
        randomIntImpl: () => 123456,
    });

    const response = await handler(buildRequest("auth.email.change.start", {
        currentPassword: "synthetic-current-password",
        newEmail: " New-Address@Example.Test ",
        id_usuario: "attacker-user",
        tokenHash: "9".repeat(64),
        email_destino: "attacker@example.test",
        verificationCode: "999999",
    }));
    const body = await response.json();
    const expectedTokenHash = createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex");

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.data.pendingEmail, "new-address@example.test");
    assert.equal(body.data.verificationCode, "123456");
    assert.deepEqual(forwarded.map((item) => item.action), [
        "auth.reauth.lookup",
        "auth.reauth.success",
        "email.change.start",
    ]);
    assert.deepEqual(forwarded[0].payload, { tokenHash: expectedTokenHash });
    assert.deepEqual(forwarded[1].payload, { tokenHash: expectedTokenHash });
    assert.deepEqual(forwarded[2].payload, {
        tokenHash: expectedTokenHash,
        newEmail: " New-Address@Example.Test ",
        verificationCode: "123456",
    });
    assert.equal(JSON.stringify(forwarded).includes("synthetic-current-password"), false);
    assert.equal(JSON.stringify(forwarded).includes("attacker-user"), false);
    assert.ok((response.headers.get("set-cookie") || "").startsWith(COOKIE_NAME + "=" + SESSION_TOKEN));
    assert.match(response.headers.get("set-cookie") || "", /HttpOnly/);
});

test("gateway não cria solicitação de troca de e-mail quando a senha atual está incorreta", async () => {
    const actions = [];
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        const action = form.get("action");
        actions.push(action);
        const data = {
            idUsuario: "user-synthetic",
            status: "active",
            algoritmo: "argon2id$v=19$m=19456,t=2,p=1",
            salt: "a".repeat(32),
            hash: "b".repeat(64),
        };
        return {
            ok: true,
            status: 200,
            redirected: true,
            url: "https://script.googleusercontent.com/macros/echo?authorization-test=1",
            async text() {
                return JSON.stringify({ ok: true, action, requestId: form.get("requestId"), data });
            },
        };
    }, {
        derivePasswordHashImpl: async () => Buffer.alloc(32, 0xCC),
        randomIntImpl: () => 123456,
    });

    const response = await handler(buildRequest("auth.email.change.start", {
        currentPassword: "wrong-password-value",
        newEmail: "new-address@example.test",
    }));
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error.code, "INVALID_CURRENT_PASSWORD");
    assert.deepEqual(actions, ["auth.reauth.lookup"]);
    assert.equal(response.headers.get("set-cookie"), null);
});

test("gateway encaminha somente código e sessão na confirmação e remove cookie após revogação", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = {
            action: form.get("action"),
            payload: JSON.parse(form.get("payload")),
        };
        return {
            ok: true,
            status: 200,
            redirected: true,
            url: "https://script.googleusercontent.com/macros/echo?authorization-test=1",
            async text() {
                return JSON.stringify({
                    ok: true,
                    action: form.get("action"),
                    requestId: form.get("requestId"),
                    data: { changed: true, email: "new-address@example.test", requiresLogin: true },
                });
            },
        };
    });

    const response = await handler(buildRequest("auth.email.change.confirm", {
        code: "123456",
        email: "attacker@example.test",
        id_usuario: "attacker-user",
        tokenHash: "9".repeat(64),
        papel: "admin",
    }));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.changed, true);
    assert.equal(forwarded.action, "email.change.confirm");
    assert.deepEqual(forwarded.payload, {
        code: "123456",
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
    assert.match(response.headers.get("set-cookie") || "", /Max-Age=0/);
    assert.match(response.headers.get("set-cookie") || "", /HttpOnly/);
});

test("gateway exige CSRF para as ações de alteração de e-mail", async () => {
    let fetchCalled = false;
    const handler = createHarness(async () => {
        fetchCalled = true;
        throw new Error("O upstream não deveria ser chamado.");
    });

    const response = await handler(buildRequest("auth.email.change.confirm", {
        code: "123456",
    }, { headers: { "X-CSRF-Token": "0".repeat(64) } }));
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "CSRF_REJECTED");
    assert.equal(fetchCalled, false);
});

test("gateway permite remover foto de perfil apenas com imageId e sessão derivada", async () => {
    let forwarded;
    const handler = createHarness(async (_url, options) => {
        const form = new URLSearchParams(options.body);
        forwarded = {
            action: form.get("action"),
            payload: JSON.parse(form.get("payload")),
        };
        return upstreamResponse(form);
    });

    const response = await handler(buildRequest("profile.photo.remove", {
        imageId: "00000000-0000-4000-8000-000000000001",
        tokenHash: "9".repeat(64),
        id_usuario: "user-b",
        id_profissional: "profile-b",
        papel: "admin",
        ownerId: "user-b",
    }));

    assert.equal(response.status, 200);
    assert.equal(forwarded.action, "profile.photo.remove");
    assert.deepEqual(forwarded.payload, {
        imageId: "00000000-0000-4000-8000-000000000001",
        tokenHash: createHash("sha256").update(SESSION_TOKEN, "utf8").digest("hex"),
    });
});
