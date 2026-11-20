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

function createHarness(fetchImpl) {
    return createAppHandler({
        env: {
            VERCEL_ENV: "preview",
            CONECTA_LOCAL_ALLOWED_ORIGIN: ORIGIN,
            CONECTA_LOCAL_APPS_SCRIPT_URL: SCRIPT_URL,
            CONECTA_LOCAL_HMAC_SECRET: SECRET,
        },
        fetchImpl,
        now: () => Date.UTC(2026, 10, 20, 12, 0, 0),
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
        nome_publico: "Equipe A",
        apresentacao: "Perfil fictício atualizado para o teste de autorização.",
        id_cidade_principal: "city-synthetic",
        whatsapp: "34999990001",
        tokenHash: "9".repeat(64),
        id_usuario: "user-b",
        id_profissional: "profile-b",
        papel: "admin",
        status: "suspended",
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(forwarded, {
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
