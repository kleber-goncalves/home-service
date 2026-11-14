import {
    createHash,
    createHmac,
    randomBytes,
} from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";

const SESSION_COOKIE_NAME = "__Host-conecta_poc04_session";
const COOKIE_MAX_AGE_SECONDS = 30 * 60;
const ABSOLUTE_SESSION_MS = 8 * 60 * 60 * 1000;
const MAX_REQUEST_BYTES = 8 * 1024;
const MAX_PAYLOAD_BYTES = 4 * 1024;
const MAX_UPSTREAM_RESPONSE_BYTES = 8 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HEX_PATTERN = /^[a-f0-9]{64}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const SIGNATURE_VERSION = "v1";
const CANONICAL_DOMAIN = "CONECTA_LOCAL_POC04_SESSION";

const ALLOWED_ACTIONS = new Set([
    "poc.session.issue",
    "poc.session.csrf",
    "poc.session.validate",
    "poc.session.revoke",
]);

const RESPONSE_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
};

function jsonResponse(body, status = 200, setCookie = null) {
    const headers = new Headers(RESPONSE_HEADERS);
    if (setCookie) {
        headers.append("Set-Cookie", setCookie);
    }

    return new Response(JSON.stringify(body), { status, headers });
}

function fail(requestId, code, message, status, setCookie = null) {
    return jsonResponse({
        ok: false,
        requestId: requestId || null,
        data: null,
        error: { code, message },
    }, status, setCookie);
}

function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, expectedKeys) {
    if (!isPlainObject(value)) {
        return false;
    }

    const actual = Object.keys(value).sort();
    const expected = [...expectedKeys].sort();

    return actual.length === expected.length
        && actual.every((key, index) => key === expected[index]);
}

function parseAllowedOrigin(value) {
    if (typeof value !== "string" || value.length === 0) {
        return null;
    }

    try {
        const parsed = new URL(value);
        if (
            parsed.protocol !== "https:"
            || parsed.username
            || parsed.password
            || parsed.pathname !== "/"
            || parsed.search
            || parsed.hash
            || parsed.origin !== value.replace(/\/$/, "")
        ) {
            return null;
        }

        return parsed.origin;
    } catch {
        return null;
    }
}

function isAllowedBrowserRequest(request, allowedOrigin) {
    const requestOrigin = request.headers.get("origin");
    if (!requestOrigin || requestOrigin === "null") {
        return false;
    }

    try {
        const parsed = new URL(requestOrigin);
        if (
            parsed.origin !== requestOrigin
            || parsed.pathname !== "/"
            || parsed.search
            || parsed.hash
            || parsed.username
            || parsed.password
        ) {
            return false;
        }
    } catch {
        return false;
    }

    if (requestOrigin !== allowedOrigin) {
        return false;
    }

    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && fetchSite.toLowerCase() !== "same-origin") {
        return false;
    }

    return true;
}

export function parsePoc04SessionCookie(cookieHeader) {
    if (typeof cookieHeader !== "string" || cookieHeader.length === 0) {
        return { status: "missing", token: null };
    }

    const prefix = SESSION_COOKIE_NAME + "=";
    const matches = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part.startsWith(prefix));

    if (matches.length === 0) {
        return { status: "missing", token: null };
    }

    if (matches.length !== 1) {
        return { status: "ambiguous", token: null };
    }

    const token = matches[0].slice(prefix.length);
    if (!TOKEN_PATTERN.test(token)) {
        return { status: "invalid", token: null };
    }

    return { status: "valid", token };
}

function buildSessionCookie(token, maxAgeSeconds) {
    return SESSION_COOKIE_NAME + "=" + token
        + "; Path=/; Max-Age=" + maxAgeSeconds
        + "; HttpOnly; Secure; SameSite=Strict";
}

function clearSessionCookie() {
    return SESSION_COOKIE_NAME
        + "=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
        + "; HttpOnly; Secure; SameSite=Strict";
}

function cookieMaxAge(expiresAt, now) {
    const remainingMs = expiresAt - now;
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
        return 0;
    }

    return Math.min(
        COOKIE_MAX_AGE_SECONDS,
        Math.floor(remainingMs / 1000),
    );
}

function getRedirectHost(value) {
    try {
        return new URL(value).hostname;
    } catch {
        return null;
    }
}

function getAppsScriptUrl(value) {
    if (typeof value !== "string" || value.length === 0) {
        return null;
    }

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
        ) {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}

function buildCanonicalMessage({ timestamp, nonce, action, requestId, payloadSha256 }) {
    return [
        CANONICAL_DOMAIN,
        SIGNATURE_VERSION,
        "POST",
        timestamp,
        nonce,
        action,
        requestId,
        payloadSha256,
    ].join("\n");
}

function makeSignature(secret, canonicalMessage) {
    return createHmac("sha256", Buffer.from(secret, "utf8"))
        .update(canonicalMessage, "utf8")
        .digest("hex");
}

function mapUpstreamError(output, requestId) {
    const upstreamCode = output?.error?.code;
    const known = {
        POC04_AUTHENTICATION_FAILED: {
            code: "POC04_UPSTREAM_AUTH_FAILED",
            message: "A autenticação interna da prova foi recusada.",
            status: 502,
        },
        POC04_REQUEST_EXPIRED: {
            code: "POC04_UPSTREAM_REQUEST_EXPIRED",
            message: "A chamada interna expirou.",
            status: 502,
        },
        POC04_REPLAY_DETECTED: {
            code: "POC04_UPSTREAM_REPLAY_REJECTED",
            message: "A chamada interna repetida foi recusada.",
            status: 502,
        },
        POC04_NONCE_STORE_UNAVAILABLE: {
            code: "POC04_UPSTREAM_NONCE_UNAVAILABLE",
            message: "O controle de uso único está indisponível.",
            status: 503,
        },
        POC04_ACTION_NOT_ALLOWED: {
            code: "POC04_UPSTREAM_ACTION_REJECTED",
            message: "A ação de teste não foi autorizada pelo Apps Script.",
            status: 403,
        },
        POC04_SESSION_INVALID: {
            code: "SESSION_INVALID",
            message: "A sessão de demonstração não é válida.",
            status: 401,
            clearCookie: true,
        },
        POC04_SESSION_EXPIRED: {
            code: "SESSION_EXPIRED",
            message: "A sessão de demonstração expirou.",
            status: 401,
            clearCookie: true,
        },
        POC04_ACCOUNT_UNAVAILABLE: {
            code: "SESSION_INVALID",
            message: "A sessão de demonstração não é válida.",
            status: 401,
            clearCookie: true,
        },
        POC04_CSRF_INVALID: {
            code: "CSRF_REJECTED",
            message: "A validação de origem da operação falhou.",
            status: 403,
        },
        POC04_STORE_UNAVAILABLE: {
            code: "POC04_STORE_UNAVAILABLE",
            message: "O armazenamento temporário da prova está indisponível.",
            status: 503,
        },
        POC04_STORE_NOT_INITIALIZED: {
            code: "POC04_STORE_NOT_INITIALIZED",
            message: "O armazenamento temporário da prova ainda não foi inicializado.",
            status: 503,
        },
    };

    const mapped = known[upstreamCode] || {
        code: "POC04_UPSTREAM_REJECTED",
        message: "O Apps Script recusou a operação de sessão.",
        status: 502,
    };

    return {
        response: fail(
            requestId,
            mapped.code,
            mapped.message,
            mapped.status,
            mapped.clearCookie ? clearSessionCookie() : null,
        ),
        clearCookie: Boolean(mapped.clearCookie),
    };
}

export function createPoc04SessionHandler({
    env = process.env,
    fetchImpl = (...args) => fetch(...args),
    now = () => Date.now(),
    randomBytesImpl = (size) => randomBytes(size),
    timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
    return async function poc04SessionHandler(request) {
        if (request.method !== "POST") {
            return fail(null, "METHOD_NOT_ALLOWED", "Esta rota aceita somente POST.", 405);
        }

        if (env.VERCEL_ENV !== "preview" || env.POC04_ENABLED !== "true") {
            return fail(null, "POC04_DISABLED", "A prova de sessão não está habilitada neste ambiente.", 404);
        }

        const allowedOrigin = parseAllowedOrigin(env.POC04_ALLOWED_ORIGIN);
        if (!allowedOrigin) {
            return fail(null, "POC04_ORIGIN_NOT_CONFIGURED", "A origem permitida da prova não está configurada.", 503);
        }

        if (!isAllowedBrowserRequest(request, allowedOrigin)) {
            return fail(null, "ORIGIN_REJECTED", "A origem da requisição não está autorizada.", 403);
        }

        const contentType = request.headers.get("content-type") || "";
        if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
            return fail(null, "UNSUPPORTED_MEDIA_TYPE", "Envie JSON para esta rota.", 415);
        }

        const declaredLength = Number(request.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
            return fail(null, "REQUEST_TOO_LARGE", "O corpo excede o limite da prova.", 413);
        }

        let rawBody;
        try {
            rawBody = await request.text();
        } catch {
            return fail(null, "INVALID_REQUEST_BODY", "Não foi possível ler a requisição.", 400);
        }

        if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
            return fail(null, "REQUEST_TOO_LARGE", "O corpo excede o limite da prova.", 413);
        }

        let input;
        try {
            input = JSON.parse(rawBody);
        } catch {
            return fail(null, "INVALID_JSON", "O corpo não contém JSON válido.", 400);
        }

        if (!hasExactKeys(input, ["action", "requestId", "payload"])) {
            return fail(null, "INVALID_REQUEST", "A estrutura da requisição é inválida.", 400);
        }

        const { action, requestId, payload } = input;

        if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
            return fail(null, "INVALID_REQUEST_ID", "O identificador da requisição é inválido.", 400);
        }

        if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
            return fail(requestId, "ACTION_NOT_ALLOWED", "A ação não está liberada na POC-04.", 400);
        }

        if (!isPlainObject(payload) || Object.keys(payload).length !== 0) {
            return fail(requestId, "INVALID_PAYLOAD", "Esta operação não aceita dados arbitrários do navegador.", 400);
        }

        const scriptUrl = getAppsScriptUrl(env.POC04_APPS_SCRIPT_WEB_APP_URL);
        if (!scriptUrl) {
            return fail(requestId, "POC04_UPSTREAM_NOT_CONFIGURED", "O Web App isolado da POC-04 não está configurado.", 503);
        }

        const secret = env.POC04_APPS_SCRIPT_HMAC_SECRET;
        if (typeof secret !== "string" || !HEX_PATTERN.test(secret)) {
            return fail(requestId, "POC04_HMAC_NOT_CONFIGURED", "A assinatura interna da POC-04 não está configurada.", 503);
        }

        const cookie = parsePoc04SessionCookie(request.headers.get("cookie") || "");

        if (action === "poc.session.issue" && cookie.status !== "missing") {
            return fail(requestId, "SESSION_ALREADY_PRESENT", "Já existe um cookie de sessão nesta origem.", 409);
        }

        if (action !== "poc.session.issue" && cookie.status !== "valid") {
            return fail(
                requestId,
                "SESSION_INVALID",
                "A sessão de demonstração não está disponível.",
                401,
                clearSessionCookie(),
            );
        }

        let csrfToken = null;
        if (action === "poc.session.validate" || action === "poc.session.revoke") {
            csrfToken = request.headers.get("x-csrf-token") || "";
            if (!TOKEN_PATTERN.test(csrfToken)) {
                return fail(requestId, "CSRF_REJECTED", "O token CSRF não foi informado corretamente.", 403);
            }
        }

        const timestampNumber = now();
        if (!Number.isSafeInteger(timestampNumber) || timestampNumber <= 0) {
            return fail(requestId, "POC04_CLOCK_UNAVAILABLE", "O relógio do gateway não está disponível.", 500);
        }

        let upstreamPayload;
        let generatedSessionToken = null;

        try {
            if (action === "poc.session.issue") {
                const sessionBytes = randomBytesImpl(32);
                const csrfBytes = randomBytesImpl(32);

                if (
                    !Buffer.isBuffer(sessionBytes)
                    || sessionBytes.length !== 32
                    || !Buffer.isBuffer(csrfBytes)
                    || csrfBytes.length !== 32
                ) {
                    throw new Error("CSPRNG_INVALID_OUTPUT");
                }

                generatedSessionToken = sessionBytes.toString("base64url");
                csrfToken = csrfBytes.toString("base64url");
                upstreamPayload = {
                    sessionToken: generatedSessionToken,
                    csrfToken,
                };
            } else if (action === "poc.session.csrf") {
                const csrfBytes = randomBytesImpl(32);
                if (!Buffer.isBuffer(csrfBytes) || csrfBytes.length !== 32) {
                    throw new Error("CSPRNG_INVALID_OUTPUT");
                }

                csrfToken = csrfBytes.toString("base64url");
                upstreamPayload = {
                    sessionToken: cookie.token,
                    csrfToken,
                };
            } else {
                upstreamPayload = {
                    sessionToken: cookie.token,
                    csrfToken,
                };
            }
        } catch {
            return fail(requestId, "POC04_RANDOM_UNAVAILABLE", "Não foi possível gerar material aleatório para a prova.", 503);
        }

        if (
            !TOKEN_PATTERN.test(upstreamPayload.sessionToken)
            || !TOKEN_PATTERN.test(upstreamPayload.csrfToken)
        ) {
            return fail(requestId, "POC04_RANDOM_UNAVAILABLE", "O material aleatório gerado não passou na validação.", 503);
        }

        const serializedPayload = JSON.stringify(upstreamPayload);
        if (new TextEncoder().encode(serializedPayload).byteLength > MAX_PAYLOAD_BYTES) {
            return fail(requestId, "POC04_PAYLOAD_TOO_LARGE", "O payload interno excede o limite da prova.", 500);
        }

        const timestamp = String(timestampNumber);
        let nonceBytes;

        try {
            nonceBytes = randomBytesImpl(32);
        } catch {
            return fail(requestId, "POC04_RANDOM_UNAVAILABLE", "Não foi possível gerar o nonce da chamada.", 503);
        }

        if (!Buffer.isBuffer(nonceBytes) || nonceBytes.length !== 32) {
            return fail(requestId, "POC04_RANDOM_UNAVAILABLE", "O nonce gerado não passou na validação.", 503);
        }

        const nonce = nonceBytes.toString("hex");
        const payloadSha256 = createHash("sha256")
            .update(serializedPayload, "utf8")
            .digest("hex");
        const canonicalMessage = buildCanonicalMessage({
            timestamp,
            nonce,
            action,
            requestId,
            payloadSha256,
        });
        const signature = makeSignature(secret, canonicalMessage);

        const formBody = new URLSearchParams({
            signatureVersion: SIGNATURE_VERSION,
            timestamp,
            nonce,
            signature,
            action,
            requestId,
            payload: serializedPayload,
        });

        let upstream;
        try {
            upstream = await fetchImpl(scriptUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                },
                body: formBody.toString(),
                redirect: "follow",
                signal: AbortSignal.timeout(timeoutMs),
            });
        } catch (error) {
            console.error("[POC-04] Falha no Apps Script.", {
                requestId,
                errorName: error?.name || "UnknownError",
            });

            return fail(
                requestId,
                error?.name === "TimeoutError" || error?.name === "AbortError"
                    ? "POC04_UPSTREAM_TIMEOUT"
                    : "POC04_UPSTREAM_UNAVAILABLE",
                "Não foi possível concluir a operação no Apps Script.",
                error?.name === "TimeoutError" || error?.name === "AbortError" ? 504 : 502,
            );
        }

        const redirectHost = getRedirectHost(upstream.url);

        if (
            !upstream.redirected
            || redirectHost !== "script.googleusercontent.com"
            || !upstream.ok
        ) {
            return fail(requestId, "POC04_UPSTREAM_TRANSPORT_ERROR", "A resposta do Apps Script não passou na validação de transporte.", 502);
        }

        let responseText;
        try {
            responseText = await upstream.text();
        } catch {
            return fail(requestId, "POC04_UPSTREAM_BODY_ERROR", "Não foi possível ler a resposta do Apps Script.", 502);
        }

        if (new TextEncoder().encode(responseText).byteLength > MAX_UPSTREAM_RESPONSE_BYTES) {
            return fail(requestId, "POC04_UPSTREAM_TOO_LARGE", "A resposta do Apps Script excede o limite da prova.", 502);
        }

        let output;
        try {
            output = JSON.parse(responseText);
        } catch {
            return fail(requestId, "POC04_UPSTREAM_INVALID_JSON", "O Apps Script não devolveu JSON válido.", 502);
        }

        if (
            !isPlainObject(output)
            || typeof output.ok !== "boolean"
            || output.action !== action
            || output.requestId !== requestId
        ) {
            return fail(requestId, "POC04_UPSTREAM_INVALID_ENVELOPE", "A resposta do Apps Script não corresponde à requisição.", 502);
        }

        if (!output.ok) {
            return mapUpstreamError(output, requestId).response;
        }

        const data = output.data;
        if (!isPlainObject(data)) {
            return fail(requestId, "POC04_UPSTREAM_INVALID_DATA", "Os dados da resposta do Apps Script são inválidos.", 502);
        }

        if (action === "poc.session.issue" || action === "poc.session.csrf") {
            const expectedKeys = action === "poc.session.issue"
                ? ["created", "expiresAt"]
                : ["csrfReady", "expiresAt"];

            if (
                !hasExactKeys(data, expectedKeys)
                || (action === "poc.session.issue" ? data.created !== true : data.csrfReady !== true)
                || typeof data.expiresAt !== "string"
            ) {
                return fail(requestId, "POC04_UPSTREAM_INVALID_DATA", "O Apps Script não confirmou a operação de sessão.", 502);
            }

            const expiresAt = Date.parse(data.expiresAt);
            const currentTime = now();
            if (
                !Number.isFinite(expiresAt)
                || expiresAt <= currentTime
                || expiresAt > currentTime + ABSOLUTE_SESSION_MS + 30_000
            ) {
                return fail(requestId, "POC04_UPSTREAM_INVALID_EXPIRY", "A validade retornada pelo Apps Script é inválida.", 502);
            }

            const maxAge = cookieMaxAge(expiresAt, currentTime);
            if (maxAge <= 0) {
                return fail(requestId, "POC04_UPSTREAM_INVALID_EXPIRY", "A sessão não possui validade restante.", 502);
            }

            const cookieHeader = buildSessionCookie(
                action === "poc.session.issue" ? generatedSessionToken : cookie.token,
                maxAge,
            );

            return jsonResponse({
                ok: true,
                requestId,
                data: {
                    ...(action === "poc.session.issue" ? { created: true } : { csrfReady: true }),
                    csrfToken,
                    expiresAt: data.expiresAt,
                },
                error: null,
            }, 200, cookieHeader);
        }

        if (action === "poc.session.validate") {
            if (!hasExactKeys(data, ["valid", "expiresAt"]) || data.valid !== true || typeof data.expiresAt !== "string") {
                return fail(requestId, "POC04_UPSTREAM_INVALID_DATA", "O Apps Script não confirmou a sessão.", 502);
            }

            const expiresAt = Date.parse(data.expiresAt);
            const currentTime = now();
            if (!Number.isFinite(expiresAt) || expiresAt <= currentTime) {
                return fail(requestId, "POC04_UPSTREAM_INVALID_EXPIRY", "A validade retornada pelo Apps Script é inválida.", 502);
            }

            const maxAge = cookieMaxAge(expiresAt, currentTime);
            if (maxAge <= 0) {
                return fail(requestId, "POC04_UPSTREAM_INVALID_EXPIRY", "A sessão não possui validade restante.", 502);
            }

            return jsonResponse({
                ok: true,
                requestId,
                data: { valid: true, expiresAt: data.expiresAt },
                error: null,
            }, 200, buildSessionCookie(cookie.token, maxAge));
        }

        if (action === "poc.session.revoke") {
            if (!hasExactKeys(data, ["revoked"]) || data.revoked !== true) {
                return fail(requestId, "POC04_UPSTREAM_INVALID_DATA", "O Apps Script não confirmou a revogação.", 502);
            }

            return jsonResponse({
                ok: true,
                requestId,
                data: { revoked: true },
                error: null,
            }, 200, clearSessionCookie());
        }

        return fail(requestId, "POC04_ACTION_NOT_HANDLED", "A ação não possui um tratador nesta prova.", 400);
    };
}

const poc04SessionHandler = createPoc04SessionHandler();

export default {
    async fetch(request) {
        return poc04SessionHandler(request);
    },
};
