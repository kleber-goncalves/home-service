import { appRequest } from "@/services/app-api";

const CHUNK_BYTES = 1024 * 1024;
const MAX_FILE_BYTES = 5_000_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function createRequestId() {
    if (!globalThis.crypto?.randomUUID) {
        throw new Error("Este navegador não oferece um gerador seguro para o envio.");
    }
    return globalThis.crypto.randomUUID();
}

async function parseJsonResponse(response) {
    try {
        return await response.json();
    } catch {
        throw new Error("O servidor retornou uma resposta inválida durante o envio.");
    }
}

function createUploadError(result, response) {
    const error = new Error(result?.error?.message || "Não foi possível enviar esta imagem.");
    error.code = result?.error?.code || "IMAGE_UPLOAD_FAILED";
    error.status = response?.status || 0;
    return error;
}

async function reconcileUpload(uploadId, csrfToken) {
    return appRequest("image.upload.status", { uploadId }, csrfToken);
}

export async function uploadServiceImage({
    serviceId,
    file,
    csrfToken,
    onProgress = () => {},
}) {
    if (!(file instanceof File)) throw new Error("Selecione um arquivo de imagem.");
    if (!ALLOWED_TYPES.has(file.type)) throw new Error("Use uma imagem JPG, PNG ou WebP.");
    if (file.size < 12 || file.size > MAX_FILE_BYTES) throw new Error("Cada imagem deve ter até 5 MB.");

    const session = await appRequest("image.upload.start", {
        serviceId,
        fileSize: file.size,
        mimeType: file.type,
    }, csrfToken);

    const uploadId = session.uploadId;
    let offset = Number(session.nextOffset || 0);
    let noProgressRetries = 0;

    onProgress(0);

    while (offset < file.size) {
        const end = Math.min(offset + CHUNK_BYTES, file.size);
        const chunk = file.slice(offset, end);
        let response;
        let result;

        try {
            response = await fetch("/api/images", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/octet-stream",
                    "X-CSRF-Token": csrfToken,
                    "X-Image-Request-Id": createRequestId(),
                    "X-Image-Upload-Id": uploadId,
                    "X-Image-Start-Offset": String(offset),
                    "X-Image-Total-Size": String(file.size),
                },
                body: chunk,
            });
            result = await parseJsonResponse(response);
        } catch (error) {
            if (error?.name === "AbortError") {
                throw error;
            }
            const status = await reconcileUpload(uploadId, csrfToken);
            if (status?.completed && status.image) {
                onProgress(100);
                return status.image;
            }
            const nextOffset = Number(status?.nextOffset);
            if (!Number.isSafeInteger(nextOffset) || nextOffset < offset || nextOffset > file.size) {
                throw error;
            }
            if (nextOffset === offset) {
                noProgressRetries += 1;
                if (noProgressRetries > 1) throw error;
            } else {
                noProgressRetries = 0;
            }
            offset = nextOffset;
            onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
            continue;
        }

        if (!response.ok || !result?.ok) {
            const uploadError = createUploadError(result, response);
            if (response.status >= 500) {
                const status = await reconcileUpload(uploadId, csrfToken);
                if (status?.completed && status.image) {
                    onProgress(100);
                    return status.image;
                }
                const nextOffset = Number(status?.nextOffset);
                if (Number.isSafeInteger(nextOffset) && nextOffset > offset && nextOffset <= file.size) {
                    offset = nextOffset;
                    noProgressRetries = 0;
                    onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
                    continue;
                }
            }
            throw uploadError;
        }

        if (result.data?.completed && result.data.image) {
            onProgress(100);
            return result.data.image;
        }

        const nextOffset = Number(result.data?.nextOffset);
        if (!Number.isSafeInteger(nextOffset) || nextOffset <= offset || nextOffset > file.size) {
            throw new Error("O Google Drive retornou um progresso de envio inválido.");
        }
        offset = nextOffset;
        noProgressRetries = 0;
        onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
    }

    const finalStatus = await reconcileUpload(uploadId, csrfToken);
    if (!finalStatus?.completed || !finalStatus.image) {
        throw new Error("O Drive ainda não confirmou a conclusão do arquivo.");
    }
    onProgress(100);
    return finalStatus.image;
}

export async function removeServiceImage(imageId, csrfToken) {
    return appRequest("image.remove", { imageId }, csrfToken);
}
