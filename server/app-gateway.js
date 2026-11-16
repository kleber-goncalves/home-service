import {
    createHash,
    createHmac,
    randomBytes,
    randomInt,
    timingSafeEqual,
} from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";
import { argon2id } from "hash-wasm";

const COOKIE_NAME = "__Host-conecta_local_session";
const COOKIE_IDLE_SECONDS = 30 * 60;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HEX_32_PATTERN = /^[a-f0-9]{32}$/;
const HEX_64_PATTERN = /^[a-f0-9]{64}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const MAX_REQUEST_BYTES = 20 * 1024;
const MAX_PAYLOAD_BYTES = 16 * 1024;
const MAX_RESPONSE_BYTES = 32 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const SIGNATURE_VERSION = "v1";
const CANONICAL_DOMAIN = "CONECTA_LOCAL_APP_GATEWAY";
const PASSWORD_ALGORITHM = "argon2id$v=19$m=19456,t=2,p=1";

const BROWSER_ACTIONS = new Set([
    "public.catalog",
    "public.services",
    "auth.register",
    "auth.verify",
    "auth.login",
    "auth.me",
    "auth.logout",
    "profile.update",
    "service.listMine",
    "service.create",
    "service.setStatus",
]);

const RESPONSE_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
};

function jsonResponse(body, status = 200, cookie = null) {
    const headers = new Headers(RESPONSE_HEADERS);
    if (cookie) headers.append("Set-Cookie", cookie);
    return new Response(JSON.stringify(body), { status, headers });
}

function fail(requestId, code, message, status, cookie = null) {
    return jsonResponse({
        ok: false,
        requestId: requestId || null,
        data: null,
        error: { code, message },
    }, status, cookie);
}

function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function getAppsScriptUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const url = new URL(value);
        const validPath = /^\/macros\/s\/[^/]+\/exec$/.test(url.pathname);
        if (
            url.protocol !== "https:"
            || url.hostname !== "script.google.com"
            || !validPath
            || url.username
            || url.password
            || url.search
            || url.hash
        ) return null;
        return url.toString();
    } catch {
        return null;
    }
}

function parseAllowedOrigin(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const url = new URL(value);
        if (
            url.protocol !== "https:"
            || url.username
            || url.password
            || url.pathname !== "/"
            || url.search
            || url.hash
            || url.origin !== value.replace(/\/$/, "")
        ) return null;
        return url.origin;
    } catch {
        return null;
    }
}

function isSameOriginRequest(request, allowedOrigin) {
    const origin = request.headers.get("origin");
    if (!origin || origin === "null" || origin !== allowedOrigin) return false;

    try {
        const parsed = new URL(origin);
        if (parsed.origin !== origin || parsed.protocol !== "https:") return false;
    } catch {
        return false;
    }

    const fetchSite = request.headers.get("sec-fetch-site");
    return !fetchSite || fetchSite.toLowerCase() === "same-origin";
}

function parseSessionCookie(cookieHeader) {
    if (typeof cookieHeader !== "string" || !cookieHeader) return null;
    const prefix = COOKIE_NAME + "=";
    const matches = cookieHeader.split(";")
        .map((part) => part.trim())
        .filter((part) => part.startsWith(prefix));
    if (matches.length !== 1) return null;
    const token = matches[0].slice(prefix.length);
    return SESSION_TOKEN_PATTERN.test(token) ? token : null;
}

function buildSessionCookie(token) {
    return COOKIE_NAME + "=" + token
        + "; Path=/; Max-Age=" + COOKIE_IDLE_SECONDS
        + "; HttpOnly; Secure; SameSite=Strict";
}

function clearSessionCookie() {
    return COOKIE_NAME
        + "=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
        + "; HttpOnly; Secure; SameSite=Strict";
}

function deriveCsrfToken(sessionToken, secret) {
    const csrfKey = createHmac("sha256", Buffer.from(secret, "utf8"))
        .update("CONECTA_LOCAL_CSRF_KEY_V1", "utf8")
        .digest();
    return createHmac("sha256", csrfKey)
        .update(["CONECTA_LOCAL_CSRF_V1", sessionToken].join("\n"), "utf8")
        .digest("hex");
}

function csrfMatches(request, sessionToken, secret) {
    const supplied = request.headers.get("x-csrf-token") || "";
    const expected = deriveCsrfToken(sessionToken, secret);
    if (!HEX_64_PATTERN.test(supplied)) return false;
    const suppliedBytes = Buffer.from(supplied, "hex");
    const expectedBytes = Buffer.from(expected, "hex");
    return suppliedBytes.length === expectedBytes.length
        && timingSafeEqual(suppliedBytes, expectedBytes);
}

function normalizeAndValidatePassword(password) {
    if (typeof password !== "string") throw Object.assign(new Error("Informe uma senha."), { code: "PASSWORD_INVALID" });

    for (let index = 0; index < password.length; index += 1) {
        const unit = password.charCodeAt(index);
        if (unit >= 0xd800 && unit <= 0xdbff) {
            const next = password.charCodeAt(index + 1);
            if (!(next >= 0xdc00 && next <= 0xdfff)) {
                throw Object.assign(new Error("A senha contém Unicode inválido."), { code: "PASSWORD_INVALID" });
            }
            index += 1;
        } else if (unit >= 0xdc00 && unit <= 0xdfff) {
            throw Object.assign(new Error("A senha contém Unicode inválido."), { code: "PASSWORD_INVALID" });
        }
    }

    const normalized = password.normalize("NFC");
    const codePoints = [...normalized].length;
    const byteLength = Buffer.byteLength(normalized, "utf8");

    if (codePoints < 15 || codePoints > 128 || byteLength > 512) {
        throw Object.assign(new Error("Use uma senha de 15 a 128 caracteres."), { code: "PASSWORD_POLICY_REJECTED" });
    }

    for (const character of normalized) {
        const point = character.codePointAt(0);
        if (point <= 0x1f || (point >= 0x7f && point <= 0x9f)) {
            throw Object.assign(new Error("A senha não pode conter caracteres de controle."), { code: "PASSWORD_POLICY_REJECTED" });
        }
    }

    return normalized;
}

async function derivePasswordHash(password, saltHex) {
    const normalized = normalizeAndValidatePassword(password);
    if (!HEX_32_PATTERN.test(saltHex)) throw new Error("Salt de senha inválido.");

    const derived = await argon2id({
        password: Buffer.from(normalized, "utf8"),
        salt: Buffer.from(saltHex, "hex"),
        parallelism: 1,
        iterations: 2,
        memorySize: 19456,
        hashLength: 32,
        outputType: "binary",
    });

    return Buffer.from(derived);
}

function passwordsMatch(candidate, storedHex) {
    if (!HEX_64_PATTERN.test(storedHex)) return false;
    const stored = Buffer.from(storedHex, "hex");
    return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function mapAppsScriptError(output) {
    const code = output?.error?.code || "APP_OPERATION_FAILED";
    const known = {
        EMAIL_ALREADY_EXISTS: [409, "Este e-mail já possui cadastro."],
        INVALID_CREDENTIALS: [401, "E-mail ou senha inválidos."],
        ACCOUNT_PENDING: [403, "Confirme seu e-mail antes de entrar."],
        ACCOUNT_UNAVAILABLE: [403, "Esta conta não está disponível."],
        VERIFICATION_FAILED: [400, "O código de confirmação não confere."],
        VERIFICATION_EXPIRED: [400, "O código de confirmação expirou."],
        INVALID_INPUT: [400, output?.error?.message || "Revise os campos informados."],
        INVALID_EMAIL: [400, "O e-mail informado é inválido."],
        INVALID_PHONE: [400, "Informe um WhatsApp válido."],
        PASSWORD_RECORD_INVALID: [400, "Não foi possível preparar a senha."],
        CATEGORY_INVALID: [400, "Selecione uma categoria válida."],
        CITY_INVALID: [400, "Selecione uma cidade válida."],
        SERVICE_NOT_FOUND: [404, "Serviço não encontrado."],
        PROFILE_UNAVAILABLE: [409, "O perfil profissional não está disponível."],
        SESSION_INVALID: [401, "Entre novamente para continuar."],
        SESSION_EXPIRED: [401, "Sua sessão expirou. Entre novamente."],
        STORE_NOT_CONFIGURED: [503, "A planilha ainda não foi conectada ao Apps Script."],
        STORE_UNAVAILABLE: [503, "O armazenamento está temporariamente indisponível."],
        STORE_SCHEMA_INVALID: [503, "A estrutura da planilha não corresponde ao modelo esperado."],
        STORE_BUSY: [503, "A planilha está ocupada. Tente novamente."],
        APP_OPERATION_FAILED: [502, "Não foi possível concluir a operação no armazenamento."],
    };
    const [status, fallback] = known[code] || [400, "Não foi possível concluir a operação."];
    return { code, status, message: code === "INVALID_INPUT" ? output?.error?.message || fallback : fallback };
}

export function createAppHandler({
    env = process.env,
    fetchImpl = (...args) => fetch(...args),
    now = () => Date.now(),
    randomBytesImpl = (size) => randomBytes(size),
    randomIntImpl = (min, max) => randomInt(min, max),
    timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
    return async function appHandler(request) {
        if (request.method !== "POST") {
            return fail(null, "METHOD_NOT_ALLOWED", "Esta rota aceita somente POST.", 405);
        }

        const allowedOrigin = parseAllowedOrigin(env.CONECTA_LOCAL_ALLOWED_ORIGIN);
        if (!allowedOrigin) {
            return fail(null, "APP_ORIGIN_NOT_CONFIGURED", "A origem permitida não está configurada.", 503);
        }
        if (!isSameOriginRequest(request, allowedOrigin)) {
            return fail(null, "ORIGIN_REJECTED", "A origem desta requisição não está autorizada.", 403);
        }

        const contentType = request.headers.get("content-type") || "";
        if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
            return fail(null, "UNSUPPORTED_MEDIA_TYPE", "Envie JSON para esta rota.", 415);
        }

        let rawBody;
        try {
            rawBody = await request.text();
        } catch {
            return fail(null, "INVALID_REQUEST_BODY", "Não foi possível ler a requisição.", 400);
        }

        if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
            return fail(null, "REQUEST_TOO_LARGE", "A requisição excede o limite permitido.", 413);
        }

        let input;
        try {
            input = JSON.parse(rawBody);
        } catch {
            return fail(null, "INVALID_JSON", "O corpo não contém JSON válido.", 400);
        }

        if (!isPlainObject(input) || Object.keys(input).some((key) => !["action", "requestId", "payload"].includes(key))) {
            return fail(null, "INVALID_REQUEST", "A requisição contém campos não permitidos.", 400);
        }

        const { action, requestId, payload } = input;
        if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
            return fail(null, "INVALID_REQUEST_ID", "O identificador da requisição é inválido.", 400);
        }
        if (typeof action !== "string" || !BROWSER_ACTIONS.has(action)) {
            return fail(requestId, "ACTION_NOT_ALLOWED", "A operação solicitada não está disponível.", 400);
        }
        if (!isPlainObject(payload) || Buffer.byteLength(JSON.stringify(payload), "utf8") > MAX_PAYLOAD_BYTES) {
            return fail(requestId, "INVALID_PAYLOAD", "Os dados enviados são inválidos ou excedem o limite.", 400);
        }

        const appsScriptUrl = getAppsScriptUrl(env.CONECTA_LOCAL_APPS_SCRIPT_URL);
        const secret = env.CONECTA_LOCAL_HMAC_SECRET;
        if (!appsScriptUrl || typeof secret !== "string" || !HEX_64_PATTERN.test(secret)) {
            return fail(requestId, "APP_INTEGRATION_NOT_CONFIGURED", "A integração com a planilha ainda não foi configurada.", 503);
        }

        const sessionToken = parseSessionCookie(request.headers.get("cookie"));
        const protectedActions = new Set(["auth.me", "auth.logout", "profile.update", "service.listMine", "service.create", "service.setStatus"]);
        if (protectedActions.has(action) && !sessionToken) {
            return fail(requestId, "SESSION_INVALID", "Entre novamente para continuar.", 401, clearSessionCookie());
        }
        if (protectedActions.has(action) && action !== "auth.me" && !csrfMatches(request, sessionToken, secret)) {
            return fail(requestId, "CSRF_REJECTED", "A validação da requisição falhou.", 403);
        }

        let output;
        let cookieToSet = null;

        try {
            if (action === "auth.register") {
                const normalizedPassword = normalizeAndValidatePassword(payload.password);
                const salt = randomBytesImpl(16);
                if (!Buffer.isBuffer(salt) || salt.length !== 16) throw new Error("Não foi possível gerar o salt.");
                const saltHex = salt.toString("hex");
                const hash = await derivePasswordHash(normalizedPassword, saltHex);
                const verificationCode = String(randomIntImpl(100000, 1000000));
                output = await callAppsScript({
                    action,
                    requestId,
                    payload: {
                        email: payload.email,
                        senha_hash: hash.toString("hex"),
                        senha_salt: saltHex,
                        senha_algoritmo: PASSWORD_ALGORITHM,
                        nome_completo: payload.fullName,
                        nome_publico: payload.publicName,
                        apresentacao: payload.presentation,
                        id_cidade_principal: payload.cityId,
                        whatsapp: payload.whatsapp,
                        verificationCode,
                    },
                    appsScriptUrl,
                    secret,
                    fetchImpl,
                    now,
                    randomBytesImpl,
                    timeoutMs,
                });
                if (output.ok) output.data = { ...output.data, verificationCode };
            } else if (action === "auth.login") {
                const lookup = await callAppsScript({
                    action: "auth.lookup",
                    requestId,
                    payload: { email: payload.email },
                    appsScriptUrl,
                    secret,
                    fetchImpl,
                    now,
                    randomBytesImpl,
                    timeoutMs,
                });
                if (!lookup.ok) output = lookup;
                else {
                    const credentials = lookup.data;
                    if (
                        credentials?.algoritmo !== PASSWORD_ALGORITHM
                        || !HEX_32_PATTERN.test(credentials?.salt || "")
                        || !HEX_64_PATTERN.test(credentials?.hash || "")
                    ) {
                        output = { ok: false, error: { code: "INVALID_CREDENTIALS" } };
                    } else {
                        let candidate;
                        try {
                            candidate = await derivePasswordHash(payload.password, credentials.salt);
                        } catch {
                            candidate = Buffer.alloc(0);
                        }

                        if (!passwordsMatch(candidate, credentials.hash)) {
                            output = { ok: false, error: { code: "INVALID_CREDENTIALS" } };
                        } else {
                            const tokenBytes = randomBytesImpl(32);
                            if (!Buffer.isBuffer(tokenBytes) || tokenBytes.length !== 32) throw new Error("Não foi possível iniciar a sessão.");
                            const token = tokenBytes.toString("base64url");
                            const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
                            output = await callAppsScript({
                                action: "session.create",
                                requestId,
                                payload: { idUsuario: credentials.idUsuario, tokenHash },
                                appsScriptUrl,
                                secret,
                                fetchImpl,
                                now,
                                randomBytesImpl,
                                timeoutMs,
                            });
                            if (output.ok) {
                                cookieToSet = buildSessionCookie(token);
                                output.data = {
                                    ...output.data,
                                    csrfToken: deriveCsrfToken(token, secret),
                                };
                            }
                        }
                    }
                }
            } else {
                let forwardedPayload = { ...payload };
                if (protectedActions.has(action)) {
                    const tokenHash = createHash("sha256").update(sessionToken, "utf8").digest("hex");
                    if (action === "auth.me" || action === "auth.logout") {
                        forwardedPayload = { tokenHash };
                    } else {
                        forwardedPayload.tokenHash = tokenHash;
                    }
                }

                const appsAction = action === "auth.me" ? "session.me" : action === "auth.logout" ? "session.logout" : action;

                output = await callAppsScript({
                    action: appsAction,
                    requestId,
                    payload: forwardedPayload,
                    appsScriptUrl,
                    secret,
                    fetchImpl,
                    now,
                    randomBytesImpl,
                    timeoutMs,
                });

                if (output.ok && action === "auth.me") {
                    output.data = { ...output.data, csrfToken: deriveCsrfToken(sessionToken, secret) };
                }
                if (action === "auth.logout") cookieToSet = clearSessionCookie();
            }
        } catch (error) {
            const code = error?.code || "APP_REQUEST_FAILED";
            const message = code === "PASSWORD_POLICY_REJECTED" || code === "PASSWORD_INVALID"
                ? error.message
                : "Não foi possível concluir a operação.";
            return fail(requestId, code, message, code.startsWith("PASSWORD_") ? 400 : 502);
        }

        if (!output?.ok) {
            const mapped = mapAppsScriptError(output);
            const clear = ["SESSION_INVALID", "SESSION_EXPIRED"].includes(mapped.code) ? clearSessionCookie() : null;
            return fail(requestId, mapped.code, mapped.message, mapped.status, clear);
        }

        return jsonResponse({
            ok: true,
            requestId,
            data: output.data ?? null,
            error: null,
        }, 200, cookieToSet);
    };
}

async function callAppsScript({
    action,
    requestId,
    payload,
    appsScriptUrl,
    secret,
    fetchImpl,
    now,
    randomBytesImpl,
    timeoutMs,
}) {
    const serializedPayload = JSON.stringify(payload);
    const timestamp = String(now());
    const nonceBytes = randomBytesImpl(32);
    if (!Buffer.isBuffer(nonceBytes) || nonceBytes.length !== 32) throw new Error("Não foi possível preparar a chamada.");
    const nonce = nonceBytes.toString("hex");
    const payloadHash = createHash("sha256").update(serializedPayload, "utf8").digest("hex");
    const canonical = [
        CANONICAL_DOMAIN,
        SIGNATURE_VERSION,
        "POST",
        timestamp,
        nonce,
        action,
        requestId,
        payloadHash,
    ].join("\n");
    const signature = createHmac("sha256", Buffer.from(secret, "utf8"))
        .update(canonical, "utf8")
        .digest("hex");

    const form = new URLSearchParams({
        signatureVersion: SIGNATURE_VERSION,
        timestamp,
        nonce,
        signature,
        action,
        requestId,
        payload: serializedPayload,
    });

    let response;
    try {
        response = await fetchImpl(appsScriptUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: form.toString(),
            redirect: "follow",
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (error) {
        throw Object.assign(new Error("Falha de comunicação com o Apps Script."), {
            code: error?.name === "TimeoutError" || error?.name === "AbortError" ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
        });
    }

    let host = "";
    try { host = new URL(response.url).hostname; } catch { /* invalid response URL */ }
    if (!response.redirected || host !== "script.googleusercontent.com") {
        throw Object.assign(new Error("O redirecionamento do Apps Script não foi confirmado."), { code: "UPSTREAM_REDIRECT_NOT_CONFIRMED" });
    }
    if (!response.ok) throw Object.assign(new Error("O Apps Script retornou uma falha HTTP."), { code: "UPSTREAM_HTTP_ERROR" });

    const responseText = await response.text();
    if (Buffer.byteLength(responseText, "utf8") > MAX_RESPONSE_BYTES) {
        throw Object.assign(new Error("A resposta excedeu o limite."), { code: "UPSTREAM_RESPONSE_TOO_LARGE" });
    }

    let output;
    try { output = JSON.parse(responseText); } catch {
        throw Object.assign(new Error("A resposta do Apps Script não é JSON."), { code: "UPSTREAM_INVALID_JSON" });
    }

    if (
        !isPlainObject(output)
        || typeof output.ok !== "boolean"
        || output.requestId !== requestId
        || output.action !== action
    ) {
        throw Object.assign(new Error("A resposta do Apps Script não corresponde ao contrato."), { code: "UPSTREAM_INVALID_ENVELOPE" });
    }

    return output;
}
