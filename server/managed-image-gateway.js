import {
    createHash,
    createHmac,
    randomBytes,
    timingSafeEqual,
} from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";
import { callAppsScript } from "./app-gateway.js";

const COOKIE_NAME = "__Host-conecta_local_session";
const COOKIE_IDLE_SECONDS = 30 * 60;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HEX_64_PATTERN = /^[a-f0-9]{64}$/;
const IMAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5_000_000;
const REQUEST_TIMEOUT_MS = 15_000;

function responseError(status, code, message, cookie = null) {
    const headers = new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
    });
    if (cookie) headers.append("Set-Cookie", cookie);
    return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
        status,
        headers,
    });
}

function parseAllowedOrigin(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || url.username || url.password
            || url.pathname !== "/" || url.search || url.hash
            || url.origin !== value.replace(/\/$/, "")) return null;
        return url.origin;
    } catch {
        return null;
    }
}

function isAllowedReferer(value, allowedOrigin) {
    if (typeof value !== "string" || !value) return false;
    try {
        const url = new URL(value);
        return url.protocol === "https:"
            && !url.username
            && !url.password
            && url.origin === allowedOrigin;
    } catch {
        return false;
    }
}

function isSameOriginRequest(request, allowedOrigin) {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    const referer = request.headers.get("referer");

    if (fetchSite !== null && fetchSite.toLowerCase() !== "same-origin") return false;
    if (referer !== null && !isAllowedReferer(referer, allowedOrigin)) return false;

    if (origin !== null) {
        if (origin === "null" || origin !== allowedOrigin) return false;
        try {
            const parsed = new URL(origin);
            if (parsed.origin !== origin || parsed.protocol !== "https:") return false;
        } catch {
            return false;
        }
        return true;
    }

    // GET same-origin pode não enviar Origin. Nesse caso, exigimos os dois
    // sinais de navegador: Fetch Metadata e Referer da origem autorizada.
    return fetchSite !== null
        && fetchSite.toLowerCase() === "same-origin"
        && isAllowedReferer(referer, allowedOrigin);
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

function csrfMatches(request, sessionToken, secret) {
    const supplied = request.headers.get("x-csrf-token") || "";
    if (!HEX_64_PATTERN.test(supplied)) return false;
    const csrfKey = createHmac("sha256", Buffer.from(secret, "utf8"))
        .update("CONECTA_LOCAL_CSRF_KEY_V1", "utf8")
        .digest();
    const expected = createHmac("sha256", csrfKey)
        .update(["CONECTA_LOCAL_CSRF_V1", sessionToken].join("\n"), "utf8")
        .digest("hex");
    const suppliedBytes = Buffer.from(supplied, "hex");
    const expectedBytes = Buffer.from(expected, "hex");
    return suppliedBytes.length === expectedBytes.length
        && timingSafeEqual(suppliedBytes, expectedBytes);
}

function isAllowedDriveResponseUrl(value) {
    try {
        const hostname = new URL(value).hostname.toLowerCase();
        return hostname === "www.googleapis.com"
            || hostname === "content.googleapis.com"
            || hostname === "drive.google.com"
            || hostname === "drive.usercontent.google.com"
            || hostname === "googleusercontent.com"
            || hostname.endsWith(".googleusercontent.com");
    } catch {
        return false;
    }
}

function getImageId(request) {
    try {
        const values = new URL(request.url).searchParams.getAll("id");
        return values.length === 1 && IMAGE_ID_PATTERN.test(values[0]) ? values[0] : null;
    } catch {
        return null;
    }
}

async function readImageBody(response, expectedSize) {
    const reader = response.body?.getReader();
    if (!reader) throw Object.assign(new Error("IMAGE_BODY_EMPTY"), { code: "IMAGE_BODY_EMPTY" });

    const chunks = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!(value instanceof Uint8Array)) {
                throw Object.assign(new Error("IMAGE_BODY_INVALID"), { code: "IMAGE_BODY_INVALID" });
            }
            total += value.byteLength;
            if (total > MAX_IMAGE_BYTES || total > expectedSize) {
                try { await reader.cancel(); } catch { /* stream already closed */ }
                throw Object.assign(new Error("IMAGE_SIZE_MISMATCH"), { code: "IMAGE_SIZE_MISMATCH" });
            }
            chunks.push(Buffer.from(value));
        }
    } finally {
        try { reader.releaseLock(); } catch { /* reader already released */ }
    }

    if (total !== expectedSize) {
        throw Object.assign(new Error("IMAGE_SIZE_MISMATCH"), { code: "IMAGE_SIZE_MISMATCH" });
    }
    return Buffer.concat(chunks, total);
}

export function createManagedImageHandler({
    env = process.env,
    fetchImpl = (...args) => fetch(...args),
    now = () => Date.now(),
    randomBytesImpl = (size) => randomBytes(size),
    timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
    return async function managedImageHandler(request) {
        if (request.method !== "GET") {
            return responseError(405, "METHOD_NOT_ALLOWED", "Esta rota aceita somente GET.");
        }
        if (env.VERCEL_ENV !== "preview") {
            return responseError(404, "APP_DEMO_DISABLED", "A edição de imagens está habilitada somente em Preview.");
        }

        const allowedOrigin = parseAllowedOrigin(env.CONECTA_LOCAL_ALLOWED_ORIGIN);
        if (!allowedOrigin) {
            return responseError(503, "APP_ORIGIN_NOT_CONFIGURED", "A origem permitida não está configurada.");
        }
        if (!isSameOriginRequest(request, allowedOrigin)) {
            return responseError(403, "ORIGIN_REJECTED", "A origem desta requisição não está autorizada.");
        }

        const imageId = getImageId(request);
        if (!imageId) return responseError(404, "IMAGE_NOT_FOUND", "Imagem não encontrada.");

        const sessionToken = parseSessionCookie(request.headers.get("cookie"));
        if (!sessionToken) {
            return responseError(401, "SESSION_INVALID", "Entre novamente para continuar.");
        }

        const secret = env.CONECTA_LOCAL_HMAC_SECRET;
        const appsScriptUrl = env.CONECTA_LOCAL_APPS_SCRIPT_URL;
        if (typeof secret !== "string" || !HEX_64_PATTERN.test(secret)
            || typeof appsScriptUrl !== "string"
            || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(appsScriptUrl)) {
            return responseError(503, "APP_INTEGRATION_NOT_CONFIGURED", "A integração com o armazenamento ainda não está configurada.");
        }
        if (!csrfMatches(request, sessionToken, secret)) {
            return responseError(403, "CSRF_REJECTED", "A validação da requisição falhou.");
        }

        const requestIdBytes = randomBytesImpl(16);
        if (!Buffer.isBuffer(requestIdBytes) || requestIdBytes.length !== 16) {
            return responseError(500, "REQUEST_SIGNING_FAILED", "Não foi possível preparar a consulta da imagem.");
        }
        const requestId = requestIdBytes.toString("hex");
        let output;
        try {
            output = await callAppsScript({
                action: "image.resolve.mine",
                requestId,
                payload: {
                    imageId,
                    tokenHash: createHash("sha256").update(sessionToken, "utf8").digest("hex"),
                },
                appsScriptUrl,
                secret,
                fetchImpl,
                now,
                randomBytesImpl,
                timeoutMs,
            });
        } catch {
            return responseError(502, "IMAGE_LOOKUP_FAILED", "Não foi possível validar a disponibilidade desta imagem.");
        }

        if (!output?.ok) {
            const code = output?.error?.code || "IMAGE_LOOKUP_FAILED";
            return code === "IMAGE_NOT_FOUND" || code === "SESSION_INVALID" || code === "SESSION_EXPIRED"
                ? responseError(code === "IMAGE_NOT_FOUND" ? 404 : 401, code,
                    code === "IMAGE_NOT_FOUND" ? "Imagem não encontrada ou indisponível."
                        : "Sua sessão expirou. Entre novamente.")
                : responseError(502, "IMAGE_LOOKUP_FAILED", "Não foi possível validar a disponibilidade desta imagem.");
        }

        const access = output.data;
        const fileId = access?.fileId;
        const mimeType = String(access?.mimeType || "").toLowerCase();
        const sizeBytes = Number(access?.sizeBytes);
        const accessToken = access?.accessToken;
        if (!DRIVE_FILE_ID_PATTERN.test(String(fileId || ""))
            || !IMAGE_TYPES.has(mimeType)
            || !Number.isSafeInteger(sizeBytes) || sizeBytes < 12 || sizeBytes > MAX_IMAGE_BYTES
            || typeof accessToken !== "string" || accessToken.length < 32 || accessToken.length > 4096) {
            return responseError(502, "IMAGE_METADATA_INVALID", "Os dados desta imagem não puderam ser validados.");
        }

        let driveResponse;
        const driveUrl = "https://www.googleapis.com/drive/v3/files/"
            + encodeURIComponent(fileId) + "?alt=media";
        try {
            driveResponse = await fetchImpl(driveUrl, {
                method: "GET",
                headers: { Authorization: "Bearer " + accessToken },
                redirect: "follow",
                signal: AbortSignal.timeout(timeoutMs),
            });
        } catch {
            return responseError(502, "IMAGE_SOURCE_UNAVAILABLE", "Não foi possível carregar a imagem do armazenamento.");
        }

        if (!driveResponse.ok || (driveResponse.url && !isAllowedDriveResponseUrl(driveResponse.url))) {
            return responseError(driveResponse.status === 404 ? 404 : 502,
                driveResponse.status === 404 ? "IMAGE_NOT_FOUND" : "IMAGE_SOURCE_REJECTED",
                driveResponse.status === 404 ? "Imagem não encontrada ou indisponível."
                    : "A origem do arquivo de imagem não foi validada.");
        }

        const receivedType = String(driveResponse.headers.get("content-type") || "")
            .split(";")[0].trim().toLowerCase();
        if (receivedType !== mimeType) {
            return responseError(502, "IMAGE_TYPE_MISMATCH", "O tipo de conteúdo recebido não corresponde à imagem cadastrada.");
        }

        const contentLength = driveResponse.headers.get("content-length");
        if (contentLength !== null
            && (!/^\d+$/.test(contentLength)
                || Number(contentLength) !== sizeBytes
                || Number(contentLength) > MAX_IMAGE_BYTES)) {
            return responseError(502, "IMAGE_SIZE_MISMATCH", "O tamanho recebido não corresponde à imagem cadastrada.");
        }

        let bytes;
        try {
            bytes = await readImageBody(driveResponse, sizeBytes);
        } catch (error) {
            return responseError(502, error?.code || "IMAGE_BODY_INVALID",
                "Não foi possível validar o conteúdo desta imagem.");
        }

        const headers = new Headers({
            "Content-Type": mimeType,
            "Content-Length": String(bytes.length),
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
            "Cross-Origin-Resource-Policy": "same-origin",
            "Referrer-Policy": "same-origin",
            "Content-Disposition": "inline",
        });
        headers.append("Set-Cookie", buildSessionCookie(sessionToken));
        return new Response(bytes, { status: 200, headers });
    };
}
