import {
    createHash,
    createHmac,
    randomBytes,
    timingSafeEqual,
} from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";

const COOKIE_NAME = "__Host-conecta_local_session";
const COOKIE_IDLE_SECONDS = 30 * 60;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HEX_64_PATTERN = /^[a-f0-9]{64}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const UPLOAD_ID_PATTERN = /^[0-9a-f-]{36}$/i;
const CHUNK_BYTES = 1024 * 1024;
const MAX_FILE_BYTES = 5_000_000;
const MAX_RESPONSE_BYTES = 32 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const SIGNATURE_VERSION = "v1";
const CANONICAL_DOMAIN = "CONECTA_LOCAL_APP_GATEWAY";

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

async function readChunkBody(request) {
    const reader = request.body?.getReader();
    if (!reader) return Buffer.alloc(0);

    const chunks = [];
    let totalBytes = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!(value instanceof Uint8Array)) {
                throw Object.assign(new Error("Invalid request stream."), { code: "INVALID_REQUEST_BODY" });
            }
            totalBytes += value.byteLength;
            if (totalBytes > CHUNK_BYTES) {
                try { await reader.cancel(); } catch { /* body is already over the limit */ }
                throw Object.assign(new Error("Request chunk exceeds the upload limit."), { code: "REQUEST_TOO_LARGE" });
            }
            chunks.push(Buffer.from(value));
        }
    } finally {
        try { reader.releaseLock(); } catch { /* reader may have been cancelled */ }
    }

    return Buffer.concat(chunks, totalBytes);
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

function getAppsScriptUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const url = new URL(value);
        if (
            url.protocol !== "https:"
            || url.hostname !== "script.google.com"
            || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)
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

function mapAppsScriptError(output) {
    const code = output?.error?.code || "APP_OPERATION_FAILED";
    const known = {
        SESSION_INVALID: [401, "Entre novamente para continuar."],
        SESSION_EXPIRED: [401, "Sua sessão expirou. Entre novamente."],
        ROLE_FORBIDDEN: [403, "Sua conta não possui permissão para esta operação."],
        SERVICE_NOT_FOUND: [404, "Serviço não encontrado."],
        IMAGE_UPLOAD_NOT_FOUND: [404, "A sessão de envio não foi encontrada."],
        IMAGE_UPLOAD_STATE_INVALID: [409, "A sessão de envio não pode ser recuperada. Inicie novamente."],
        IMAGE_UPLOAD_OFFSET_MISMATCH: [409, "O progresso mudou. Consulte o estado do envio antes de continuar."],
        IMAGE_UPLOAD_BUSY: [409, "O envio ainda está sendo processado."],
        IMAGE_NOT_FOUND: [404, "Imagem não encontrada."],
        INVALID_INPUT: [400, "Revise os dados enviados."],
        IMAGE_SIZE_INVALID: [400, "A imagem deve ter até 5 MB."],
        IMAGE_MIME_INVALID: [415, "Use uma imagem JPG, PNG ou WebP."],
        IMAGE_CONTENT_INVALID: [415, "O conteúdo do arquivo não corresponde ao formato informado."],
        IMAGE_CHUNK_INVALID: [400, "O bloco enviado é inválido."],
        IMAGE_UPLOAD_IN_PROGRESS: [409, "Já existe um envio em andamento para este serviço."],
        IMAGE_UPLOAD_EXPIRED: [409, "A sessão de envio expirou. Inicie novamente."],
        IMAGE_LIMIT_REACHED: [409, "O serviço já atingiu o limite de cinco imagens."],
        SERVICE_STATE_LOCKED: [409, "Este serviço não permite alteração de imagens."],
        DRIVE_FOLDER_NOT_CONFIGURED: [503, "A pasta privada do Drive ainda não foi configurada."],
        DRIVE_FOLDER_NOT_PRIVATE: [503, "A pasta do Drive precisa estar privada."],
        DRIVE_AUTH_UNAVAILABLE: [503, "A autorização do Google Drive não está disponível."],
        DRIVE_UPLOAD_START_FAILED: [502, "Não foi possível iniciar o envio no Google Drive."],
        DRIVE_STATUS_UNAVAILABLE: [502, "Não foi possível consultar o progresso no Google Drive."],
        DRIVE_STATUS_INVALID: [502, "O Google Drive retornou um progresso inválido."],
        DRIVE_FILE_METADATA_INVALID: [502, "O Google Drive retornou metadados inválidos."],
        DRIVE_CHUNK_TRANSPORT_FAILED: [502, "A comunicação com o Google Drive foi interrompida."],
        DRIVE_CHUNK_OFFSET_UNKNOWN: [502, "O Google Drive não confirmou o bloco enviado."],
        DRIVE_CHUNK_REJECTED: [502, "O Google Drive recusou o bloco enviado."],
        DRIVE_FILE_VALIDATION_FAILED: [502, "O arquivo recebido não passou pela validação final."],
        IMAGE_METADATA_SAVE_FAILED: [502, "Não foi possível registrar os metadados da imagem."],
        IMAGE_PERMISSION_SYNC_FAILED: [502, "Não foi possível atualizar a permissão da imagem."],
        PROFILE_UNAVAILABLE: [409, "O perfil profissional não está disponível."],
        STORE_SCHEMA_INVALID: [503, "A aba IMAGENS não corresponde ao esquema esperado."],
    };
    const [status, message] = known[code] || [502, "Não foi possível concluir o envio da imagem."];
    return { code, status, message };
}

export function createImageUploadHandler({
    env = process.env,
    fetchImpl = (...args) => fetch(...args),
    now = () => Date.now(),
    randomBytesImpl = (size) => randomBytes(size),
    timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
    return async function imageUploadHandler(request) {
        if (request.method !== "POST") {
            return fail(null, "METHOD_NOT_ALLOWED", "Esta rota aceita somente POST.", 405);
        }
        if (env.VERCEL_ENV !== "preview") {
            return fail(null, "APP_DEMO_DISABLED", "O envio de imagens está habilitado somente em Preview.", 404);
        }

        const allowedOrigin = parseAllowedOrigin(env.CONECTA_LOCAL_ALLOWED_ORIGIN);
        if (!allowedOrigin) {
            return fail(null, "APP_ORIGIN_NOT_CONFIGURED", "A origem permitida não está configurada.", 503);
        }
        if (!isSameOriginRequest(request, allowedOrigin)) {
            return fail(null, "ORIGIN_REJECTED", "A origem desta requisição não está autorizada.", 403);
        }

        const mediaType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        if (mediaType !== "application/octet-stream") {
            return fail(null, "UNSUPPORTED_MEDIA_TYPE", "Envie somente um bloco binário de imagem.", 415);
        }

        const requestId = request.headers.get("x-image-request-id") || "";
        if (!REQUEST_ID_PATTERN.test(requestId)) {
            return fail(null, "INVALID_REQUEST_ID", "O identificador da requisição é inválido.", 400);
        }
        const uploadId = request.headers.get("x-image-upload-id") || "";
        if (!UPLOAD_ID_PATTERN.test(uploadId)) {
            return fail(requestId, "IMAGE_UPLOAD_NOT_FOUND", "A sessão de envio não foi encontrada.", 404);
        }

        const startText = request.headers.get("x-image-start-offset") || "";
        const totalText = request.headers.get("x-image-total-size") || "";
        if (!/^(0|[1-9]\d*)$/.test(startText) || !/^(0|[1-9]\d*)$/.test(totalText)) {
            return fail(requestId, "IMAGE_CHUNK_INVALID", "O intervalo do bloco é inválido.", 400);
        }
        const startOffset = Number(startText);
        const totalSize = Number(totalText);
        if (
            !Number.isSafeInteger(startOffset)
            || !Number.isSafeInteger(totalSize)
            || totalSize < 12
            || totalSize > MAX_FILE_BYTES
            || startOffset < 0
            || startOffset >= totalSize
        ) {
            return fail(requestId, "IMAGE_CHUNK_INVALID", "O intervalo do bloco está fora do arquivo.", 400);
        }

        const declaredLength = request.headers.get("content-length");
        if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > CHUNK_BYTES)) {
            return fail(requestId, "REQUEST_TOO_LARGE", "Cada bloco deve ter no máximo 1 MiB.", 413);
        }

        const sessionToken = parseSessionCookie(request.headers.get("cookie"));
        if (!sessionToken) {
            return fail(requestId, "SESSION_INVALID", "Entre novamente para continuar.", 401);
        }

        const secret = env.CONECTA_LOCAL_HMAC_SECRET;
        const appsScriptUrl = getAppsScriptUrl(env.CONECTA_LOCAL_APPS_SCRIPT_URL);
        if (typeof secret !== "string" || !HEX_64_PATTERN.test(secret) || !appsScriptUrl) {
            return fail(requestId, "APP_INTEGRATION_NOT_CONFIGURED", "A integração com o Apps Script ainda não está configurada.", 503);
        }
        if (!csrfMatches(request, sessionToken, secret)) {
            return fail(requestId, "CSRF_REJECTED", "A validação da requisição falhou.", 403);
        }

        let chunk;
        try {
            chunk = await readChunkBody(request);
        } catch (error) {
            if (error?.code === "REQUEST_TOO_LARGE") {
                return fail(requestId, "REQUEST_TOO_LARGE", "Cada bloco deve ter no máximo 1 MiB.", 413);
            }
            return fail(requestId, "INVALID_REQUEST_BODY", "Não foi possível ler o bloco enviado.", 400);
        }

        const expectedLength = Math.min(CHUNK_BYTES, totalSize - startOffset);
        if (chunk.length !== expectedLength || chunk.length > CHUNK_BYTES) {
            return fail(requestId, "IMAGE_CHUNK_INVALID", "O bloco deve ter 1 MiB, exceto o último bloco do arquivo.", 400);
        }

        const payload = {
            tokenHash: createHash("sha256").update(sessionToken, "utf8").digest("hex"),
            uploadId,
            startOffset,
            totalSize,
            chunkBase64: chunk.toString("base64"),
        };

        const timestamp = String(now());
        const nonceBytes = randomBytesImpl(32);
        if (!Buffer.isBuffer(nonceBytes) || nonceBytes.length !== 32) {
            return fail(requestId, "REQUEST_SIGNING_FAILED", "Não foi possível preparar a chamada interna.", 500);
        }
        const nonce = nonceBytes.toString("hex");
        const action = "image.upload.chunk";
        const serializedPayload = JSON.stringify(payload);
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
            const code = error?.name === "TimeoutError" || error?.name === "AbortError"
                ? "UPSTREAM_TIMEOUT"
                : "UPSTREAM_UNAVAILABLE";
            return fail(requestId, code, "Não foi possível confirmar o bloco com o Apps Script. Consulte o progresso antes de reenviar.", 502);
        }

        let host = "";
        try { host = new URL(response.url).hostname; } catch { /* invalid upstream URL */ }
        if (!response.redirected || host !== "script.googleusercontent.com") {
            return fail(requestId, "UPSTREAM_REDIRECT_NOT_CONFIRMED", "O redirecionamento do Apps Script não foi confirmado.", 502);
        }
        if (!response.ok) {
            return fail(requestId, "UPSTREAM_HTTP_ERROR", "O Apps Script retornou uma falha HTTP.", 502);
        }

        let responseText;
        try { responseText = await response.text(); } catch {
            return fail(requestId, "UPSTREAM_INVALID_RESPONSE", "Não foi possível ler a resposta do Apps Script.", 502);
        }
        if (Buffer.byteLength(responseText, "utf8") > MAX_RESPONSE_BYTES) {
            return fail(requestId, "UPSTREAM_RESPONSE_TOO_LARGE", "A resposta do Apps Script excedeu o limite.", 502);
        }

        let output;
        try { output = JSON.parse(responseText); } catch {
            return fail(requestId, "UPSTREAM_INVALID_JSON", "A resposta do Apps Script não é JSON válido.", 502);
        }
        if (
            !output
            || typeof output.ok !== "boolean"
            || output.action !== action
            || output.requestId !== requestId
        ) {
            return fail(requestId, "UPSTREAM_INVALID_ENVELOPE", "A resposta do Apps Script não corresponde à requisição.", 502);
        }
        if (!output.ok) {
            const mapped = mapAppsScriptError(output);
            const clearCookie = ["SESSION_INVALID", "SESSION_EXPIRED"].includes(mapped.code)
                ? COOKIE_NAME + "=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict"
                : null;
            return fail(requestId, mapped.code, mapped.message, mapped.status, clearCookie);
        }

        return jsonResponse({
            ok: true,
            requestId,
            data: output.data ?? null,
            error: null,
        }, 200, buildSessionCookie(sessionToken));
    };
}
