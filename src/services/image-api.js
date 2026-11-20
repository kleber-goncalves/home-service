import { appRequest } from "./app-api.js";

const CHUNK_BYTES = 1024 * 1024;
const MAX_FILE_BYTES = 5_000_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function createRequestId() {
    if (!globalThis.crypto?.randomUUID) {
        throw new Error("Este navegador não oferece um gerador seguro para o envio.");
    }
    return globalThis.crypto.randomUUID();
}

function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

async function cancelAfterReconciliation(uploadId, csrfToken) {
    let status = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
            status = await reconcileUpload(uploadId, csrfToken);
            break;
        } catch (error) {
            if (error.code !== "IMAGE_UPLOAD_BUSY") throw error;
            await wait(500);
        }
    }

    if (!status) {
        throw new Error("O bloco ainda está sendo processado. Atualize a lista antes de tentar novamente.");
    }
    if (status.completed && status.image) return status.image;

    await appRequest("image.upload.cancel", { uploadId }, csrfToken);
    const error = new Error("Envio cancelado.");
    error.name = "AbortError";
    throw error;
}

async function cancelQuietly(uploadId, csrfToken) {
    try {
        await appRequest("image.upload.cancel", { uploadId }, csrfToken);
    } catch {
        // O envio pode já ter sido finalizado ou ainda estar sendo reconciliado.
    }
}

export async function uploadServiceImage({
    serviceId,
    file,
    csrfToken,
    onProgress = () => {},
    onUploadStarted = () => {},
    signal,
}) {
    if (typeof File === "undefined" || !(file instanceof File)) throw new Error("Selecione um arquivo de imagem.");
    if (!ALLOWED_TYPES.has(file.type)) throw new Error("Use uma imagem JPG, PNG ou WebP.");
    if (file.size < 12 || file.size > MAX_FILE_BYTES) throw new Error("Cada imagem deve ter até 5 MB.");

    const session = await appRequest("image.upload.start", {
        serviceId,
        fileSize: file.size,
        mimeType: file.type,
    }, csrfToken);

    const uploadId = session.uploadId;
    onUploadStarted(uploadId);
    let offset = Number(session.nextOffset || 0);
    let noProgressRetries = 0;

    onProgress(0);

    try {
        while (offset < file.size) {
            if (signal?.aborted) {
                return await cancelAfterReconciliation(uploadId, csrfToken);
            }

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
                    signal,
                });
                result = await parseJsonResponse(response);
            } catch (error) {
                if (signal?.aborted || error?.name === "AbortError") {
                    return await cancelAfterReconciliation(uploadId, csrfToken);
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
    } catch (error) {
        if (error?.name !== "AbortError") await cancelQuietly(uploadId, csrfToken);
        throw error;
    }
}

export async function removeServiceImage(imageId, csrfToken) {
    return appRequest("image.remove", { imageId }, csrfToken);
}
