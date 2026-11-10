const MAX_REQUEST_BYTES = 12 * 1024;
const MAX_PAYLOAD_BYTES = 8 * 1024;
const MAX_UPSTREAM_RESPONSE_BYTES = 32 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;

const ALLOWED_ACTIONS = new Set([
    "poc.echo",
    "poc.simulate_error",
    "poc.invalid_response",
]);

const RESPONSE_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...RESPONSE_HEADERS, ...extraHeaders },
    });
}

function fail(requestId, code, message, status, extra = {}) {
    return jsonResponse({
        ok: false,
        requestId: requestId || null,
        data: null,
        error: { code, message },
        ...extra,
    }, status);
}

function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function getScriptUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
        return { ok: false, reason: "missing" };
    }

    try {
        const url = new URL(value);
        const validPath = /^\/macros\/s\/[^/]+\/exec$/.test(url.pathname);
        const validOrigin = url.protocol === "https:" && url.hostname === "script.google.com";
        const hasNoCredentials = !url.username && !url.password;
        const hasNoExtraLocation = !url.search && !url.hash;

        if (!validOrigin || !validPath || !hasNoCredentials || !hasNoExtraLocation) {
            return { ok: false, reason: "invalid" };
        }

        return { ok: true, url: url.toString() };
    } catch {
        return { ok: false, reason: "invalid" };
    }
}

function getRedirectHost(response) {
    try {
        return new URL(response.url).hostname;
    } catch {
        return "";
    }
}

export function createBackendHandler({
    env = process.env,
    fetchImpl = (...args) => fetch(...args),
    now = () => Date.now(),
    timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
    return async function backendHandler(request) {
        if (request.method !== "POST") {
            return fail(null, "METHOD_NOT_ALLOWED", "Este endpoint aceita somente requisições POST.", 405, {
                allowedMethods: ["POST"],
            });
        }

        const contentType = request.headers.get("content-type") || "";
        if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
            return fail(null, "UNSUPPORTED_MEDIA_TYPE", "Envie o corpo no formato application/json.", 415);
        }

        const declaredLength = Number(request.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
            return fail(null, "REQUEST_TOO_LARGE", "O corpo da requisição excede o limite permitido para esta prova de conceito.", 413);
        }

        let rawBody;
        try {
            rawBody = await request.text();
        } catch {
            return fail(null, "INVALID_REQUEST_BODY", "Não foi possível ler o corpo da requisição.", 400);
        }

        const requestBytes = new TextEncoder().encode(rawBody).byteLength;
        if (requestBytes > MAX_REQUEST_BYTES) {
            return fail(null, "REQUEST_TOO_LARGE", "O corpo da requisição excede o limite permitido para esta prova de conceito.", 413);
        }

        let input;
        try {
            input = JSON.parse(rawBody);
        } catch {
            return fail(null, "INVALID_JSON", "O corpo enviado não contém JSON válido.", 400);
        }

        if (!isPlainObject(input)) {
            return fail(null, "INVALID_REQUEST", "O corpo deve ser um objeto JSON.", 400);
        }

        const allowedKeys = new Set(["action", "requestId", "payload"]);
        if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
            return fail(null, "INVALID_REQUEST", "A requisição contém campos não permitidos.", 400);
        }

        const { action, requestId, payload } = input;

        if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) {
            return fail(null, "INVALID_REQUEST_ID", "O identificador da requisição é inválido.", 400);
        }

        if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
            return fail(requestId, "ACTION_NOT_ALLOWED", "A ação solicitada não está liberada nesta prova de conceito.", 400);
        }

        if (!isPlainObject(payload)) {
            return fail(requestId, "INVALID_PAYLOAD", "O campo payload deve ser um objeto JSON.", 400);
        }

        const serializedPayload = JSON.stringify(payload);
        if (new TextEncoder().encode(serializedPayload).byteLength > MAX_PAYLOAD_BYTES) {
            return fail(requestId, "PAYLOAD_TOO_LARGE", "Os dados enviados excedem o limite desta prova de conceito.", 413);
        }

        const scriptUrl = getScriptUrl(env.APPS_SCRIPT_WEB_APP_URL);
        if (!scriptUrl.ok) {
            return fail(
                requestId,
                scriptUrl.reason === "missing" ? "INTEGRATION_NOT_CONFIGURED" : "INTEGRATION_CONFIG_INVALID",
                scriptUrl.reason === "missing"
                    ? "A URL do Web App Apps Script ainda não foi configurada no ambiente server-side."
                    : "A configuração do Web App Apps Script é inválida.",
                503,
            );
        }

        const startedAt = now();
        const formBody = new URLSearchParams({
            action,
            requestId,
            payload: serializedPayload,
        });

        let upstream;
        try {
            upstream = await fetchImpl(scriptUrl.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                },
                body: formBody.toString(),
                redirect: "follow",
                signal: AbortSignal.timeout(timeoutMs),
            });
        } catch (error) {
            const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError";

            console.error("[POC-01] Falha na chamada ao Apps Script.", {
                requestId,
                errorName: error?.name || "UnknownError",
            });

            return fail(
                requestId,
                isTimeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
                isTimeout
                    ? "O Apps Script não respondeu dentro do tempo limite."
                    : "Não foi possível alcançar o Apps Script.",
                isTimeout ? 504 : 502,
            );
        }

        const redirectHost = getRedirectHost(upstream);
        const transport = {
            redirected: Boolean(upstream.redirected),
            redirectHost: redirectHost === "script.googleusercontent.com" ? redirectHost : null,
            upstreamStatus: Number(upstream.status) || null,
            durationMs: Math.max(0, now() - startedAt),
        };

        if (!upstream.redirected || redirectHost !== "script.googleusercontent.com") {
            return fail(
                requestId,
                "UPSTREAM_REDIRECT_NOT_CONFIRMED",
                "A resposta não confirmou o redirecionamento esperado do Content Service.",
                502,
                { transport },
            );
        }

        if (!upstream.ok) {
            return fail(requestId, "UPSTREAM_HTTP_ERROR", "O Apps Script respondeu com uma falha HTTP.", 502, { transport });
        }

        let responseText;
        try {
            responseText = await upstream.text();
        } catch {
            return fail(requestId, "UPSTREAM_BODY_UNREADABLE", "Não foi possível ler a resposta do Apps Script.", 502, { transport });
        }

        if (new TextEncoder().encode(responseText).byteLength > MAX_UPSTREAM_RESPONSE_BYTES) {
            return fail(requestId, "UPSTREAM_RESPONSE_TOO_LARGE", "A resposta do Apps Script excede o limite desta prova de conceito.", 502, { transport });
        }

        let output;
        try {
            output = JSON.parse(responseText);
        } catch {
            return fail(requestId, "UPSTREAM_INVALID_JSON", "O Apps Script respondeu, mas o conteúdo recebido não é JSON válido.", 502, { transport });
        }

        if (
            !isPlainObject(output)
            || typeof output.ok !== "boolean"
            || output.requestId !== requestId
            || output.action !== action
        ) {
            return fail(requestId, "UPSTREAM_INVALID_ENVELOPE", "A resposta do Apps Script não corresponde ao contrato esperado.", 502, { transport });
        }

        if (!output.ok) {
            return fail(requestId, "APPS_SCRIPT_REJECTED", "O Apps Script retornou uma falha lógica controlada.", 422, { transport });
        }

        return jsonResponse({
            ok: true,
            requestId,
            data: output.data ?? null,
            error: null,
            transport,
        });
    };
}

const backendHandler = createBackendHandler();

export default {
    async fetch(request) {
        return backendHandler(request);
    },
};
