import { randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";
import { callAppsScript } from "./app-gateway.js";

const IMAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5_000_000;
const REQUEST_TIMEOUT_MS = 15_000;

function responseError(status, code, message) {
    return new Response(JSON.stringify({
        ok: false,
        error: { code, message },
    }), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "same-origin",
        },
    });
}

function parseAllowedOrigin(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || url.username || url.password
            || url.pathname !== "/" || url.search || url.hash) return null;
        return url.origin;
    } catch {
        return null;
    }
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

function validImageIdFromPath(pathname) {
    const match = pathname.match(/^\/api\/public-images\/([^/]+)\/?$/);
    if (!match) return null;
    let imageId;
    try { imageId = decodeURIComponent(match[1]); } catch { return null; }
    return IMAGE_ID_PATTERN.test(imageId) ? imageId : null;
}

export function createPublicImageHandler({
    env = process.env,
    fetchImpl = (...args) => fetch(...args),
    now = () => Date.now(),
    randomBytesImpl = (size) => randomBytes(size),
    timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
    return async function publicImageHandler(request) {
        if (request.method !== "GET") {
            return responseError(405, "METHOD_NOT_ALLOWED", "Esta rota aceita somente GET.");
        }
        if (env.VERCEL_ENV !== "preview") {
            return responseError(404, "APP_DEMO_DISABLED", "A entrega de imagens está habilitada somente em Preview.");
        }

        const allowedOrigin = parseAllowedOrigin(env.CONECTA_LOCAL_ALLOWED_ORIGIN);
        if (!allowedOrigin) {
            return responseError(503, "APP_ORIGIN_NOT_CONFIGURED", "A origem permitida não está configurada.");
        }

        const origin = request.headers.get("origin");
        if (origin && origin !== allowedOrigin) {
            return responseError(403, "ORIGIN_REJECTED", "A origem desta requisição não está autorizada.");
        }
        const referer = request.headers.get("referer");
        if (referer) {
            try {
                if (new URL(referer).origin !== allowedOrigin) {
                    return responseError(403, "ORIGIN_REJECTED", "A origem desta requisição não está autorizada.");
                }
            } catch {
                return responseError(403, "ORIGIN_REJECTED", "A origem desta requisição não está autorizada.");
            }
        }
        const fetchSite = request.headers.get("sec-fetch-site");
        if (fetchSite && !["same-origin", "none"].includes(fetchSite.toLowerCase())) {
            return responseError(403, "ORIGIN_REJECTED", "A origem desta requisição não está autorizada.");
        }

        const imageId = validImageIdFromPath(new URL(request.url).pathname);
        if (!imageId) {
            return responseError(404, "IMAGE_NOT_FOUND", "Imagem não encontrada.");
        }

        const appsScriptUrl = env.CONECTA_LOCAL_APPS_SCRIPT_URL;
        const secret = env.CONECTA_LOCAL_HMAC_SECRET;
        if (typeof appsScriptUrl !== "string" || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(appsScriptUrl)
            || typeof secret !== "string" || !/^[a-f0-9]{64}$/.test(secret)) {
            return responseError(503, "APP_INTEGRATION_NOT_CONFIGURED", "A integração com o armazenamento ainda não está configurada.");
        }

        const requestIdBytes = randomBytesImpl(16);
        if (!Buffer.isBuffer(requestIdBytes) || requestIdBytes.length !== 16) {
            return responseError(500, "REQUEST_SIGNING_FAILED", "Não foi possível preparar a consulta da imagem.");
        }
        const requestId = requestIdBytes.toString("hex");

        let output;
        try {
            output = await callAppsScript({
                action: "public.image.resolve",
                requestId,
                payload: { imageId },
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
            if (code === "IMAGE_NOT_FOUND") {
                return responseError(404, "IMAGE_NOT_FOUND", "Imagem não encontrada ou indisponível.");
            }
            return responseError(502, "IMAGE_LOOKUP_FAILED", "Não foi possível validar a disponibilidade desta imagem.");
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

        const driveUrl = "https://www.googleapis.com/drive/v3/files/"
            + encodeURIComponent(fileId) + "?alt=media";
        let driveResponse;
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

        if (!driveResponse.ok) {
            return responseError(driveResponse.status === 404 ? 404 : 502,
                driveResponse.status === 404 ? "IMAGE_NOT_FOUND" : "IMAGE_SOURCE_UNAVAILABLE",
                driveResponse.status === 404 ? "Imagem não encontrada ou indisponível." : "Não foi possível carregar a imagem do armazenamento.");
        }
        if (driveResponse.url && !isAllowedDriveResponseUrl(driveResponse.url)) {
            return responseError(502, "IMAGE_SOURCE_REJECTED", "A origem do arquivo de imagem não foi validada.");
        }

        const receivedType = String(driveResponse.headers.get("content-type") || "")
            .split(";")[0].trim().toLowerCase();
        if (receivedType !== mimeType) {
            return responseError(502, "IMAGE_TYPE_MISMATCH", "O tipo de conteúdo recebido não corresponde à imagem cadastrada.");
        }

        const contentLengthHeader = driveResponse.headers.get("content-length");
        if (contentLengthHeader !== null) {
            if (!/^\d+$/.test(contentLengthHeader)
                || Number(contentLengthHeader) !== sizeBytes
                || Number(contentLengthHeader) > MAX_IMAGE_BYTES) {
                return responseError(502, "IMAGE_SIZE_MISMATCH", "O tamanho recebido não corresponde à imagem cadastrada.");
            }
        }
        if (!driveResponse.body) {
            return responseError(502, "IMAGE_BODY_EMPTY", "O armazenamento não retornou o conteúdo da imagem.");
        }

        const headers = new Headers({
            "Content-Type": mimeType,
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
            "Cross-Origin-Resource-Policy": "same-origin",
            "Referrer-Policy": "same-origin",
            "Content-Disposition": "inline",
        });
        if (contentLengthHeader !== null) headers.set("Content-Length", contentLengthHeader);

        return new Response(driveResponse.body, { status: 200, headers });
    };
}
