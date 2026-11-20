import { useEffect, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appRequest } from "@/services/app-api";
import { removeServiceImage, uploadServiceImage } from "@/services/image-api";

const MAX_ACTIVE_IMAGES = 5;
const MAX_FILE_BYTES = 5_000_000;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatFileSize(bytes) {
    return (Number(bytes || 0) / (1024 * 1024)).toFixed(2) + " MB";
}

export default function ServiceImageManager({ service, csrfToken, onServicesChange }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [removingId, setRemovingId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("");

    const images = Array.isArray(service.images) ? service.images.filter((image) => image.status === "active") : [];
    const remainingSlots = Math.max(0, MAX_ACTIVE_IMAGES - images.length);
    const canUpload = !["suspended", "removed"].includes(service.status) && remainingSlots > 0;

    useEffect(() => {
        const urls = selectedFiles.map((file) => URL.createObjectURL(file));
        setPreviewUrls(urls);
        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [selectedFiles]);

    function selectFiles(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        const accepted = [];
        const errors = [];

        files.forEach((file) => {
            if (!ACCEPTED_TYPES.has(file.type)) {
                errors.push(file.name + ": formato não permitido.");
            } else if (file.size < 12 || file.size > MAX_FILE_BYTES) {
                errors.push(file.name + ": o tamanho deve ser de até 5 MB.");
            } else {
                accepted.push(file);
            }
        });

        const limited = accepted.slice(0, remainingSlots);
        if (accepted.length > remainingSlots) {
            errors.push("Você pode selecionar somente mais " + remainingSlots + " imagem(ns) para este serviço.");
        }
        setSelectedFiles(limited);
        setProgress(0);
        setMessage(errors.join(" "));
    }

    function removeSelectedFile(index) {
        setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
        setProgress(0);
    }

    async function refreshImages() {
        const result = await appRequest("service.listMine", {}, csrfToken);
        onServicesChange(result.services || []);
    }

    async function uploadSelectedFiles() {
        if (!selectedFiles.length || uploading) return;
        if (selectedFiles.length > remainingSlots) {
            setMessage("Este serviço ainda comporta " + remainingSlots + " imagem(ns).");
            return;
        }

        setUploading(true);
        setMessage("");
        setProgress(0);
        try {
            for (let index = 0; index < selectedFiles.length; index += 1) {
                const file = selectedFiles[index];
                await uploadServiceImage({
                    serviceId: service.id,
                    file,
                    csrfToken,
                    onProgress: (fileProgress) => {
                        const totalProgress = ((index + fileProgress / 100) / selectedFiles.length) * 100;
                        setProgress(Math.round(totalProgress));
                    },
                });
            }
            setSelectedFiles([]);
            await refreshImages();
            setMessage("As imagens foram enviadas e os registros foram confirmados.");
        } catch (error) {
            setMessage(error.message || "Não foi possível concluir o envio das imagens.");
            try {
                await refreshImages();
            } catch {
                // Preserve a mensagem principal do envio.
            }
        } finally {
            setUploading(false);
        }
    }

    async function removeImage(image) {
        const confirmed = window.confirm("Remover esta imagem do serviço? O arquivo será restringido no Drive e o registro será preservado.");
        if (!confirmed || removingId) return;

        setRemovingId(image.id);
        setMessage("");
        try {
            await removeServiceImage(image.id, csrfToken);
            await refreshImages();
            setMessage("Imagem removida e acesso restringido.");
        } catch (error) {
            setMessage(error.message || "Não foi possível remover a imagem.");
        } finally {
            setRemovingId(null);
        }
    }

    return (
        <details className="demo-service-images">
            <summary>
                <span><ImagePlus size={15} aria-hidden="true" /> Imagens do serviço</span>
                <small>{images.length}/{MAX_ACTIVE_IMAGES}</small>
            </summary>

            <div className="demo-service-images-content">
                {images.length > 0 ? (
                    <div className="demo-service-image-list">
                        {images.map((image) => (
                            <article className="demo-service-image-item" key={image.id}>
                                {image.url ? (
                                    <img src={image.url} alt={"Imagem " + image.order + " do serviço " + service.title} loading="lazy" />
                                ) : (
                                    <div className="demo-service-image-private">
                                        <ImagePlus size={19} aria-hidden="true" />
                                        <span>Privada</span>
                                    </div>
                                )}
                                <div className="demo-service-image-meta">
                                    <strong>Imagem {image.order}</strong>
                                    <small>{formatFileSize(image.sizeBytes)}</small>
                                    {!image.url && <small>Visível publicamente quando o serviço for publicado.</small>}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={uploading || removingId === image.id}
                                    onClick={() => removeImage(image)}
                                    aria-label={"Remover imagem " + image.order}
                                >
                                    {removingId === image.id ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} aria-hidden="true" />}
                                </Button>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className="demo-service-images-empty">Nenhuma imagem cadastrada para este serviço.</p>
                )}

                {canUpload && (
                    <>
                        <label className="demo-service-image-picker">
                            <ImagePlus size={17} aria-hidden="true" />
                            <span>Selecionar imagens</span>
                            <small>JPG, PNG ou WebP · até 5 MB por arquivo · mais {remainingSlots} disponível(is)</small>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={selectFiles}
                                disabled={uploading}
                            />
                        </label>

                        {selectedFiles.length > 0 && (
                            <div className="demo-service-image-pending">
                                {selectedFiles.map((file, index) => (
                                    <div className="demo-service-image-pending-item" key={file.name + "-" + file.lastModified + "-" + index}>
                                        {previewUrls[index] && <img src={previewUrls[index]} alt={"Prévia de " + file.name} />}
                                        <span title={file.name}>{file.name}</span>
                                        <small>{formatFileSize(file.size)}</small>
                                        <button type="button" onClick={() => removeSelectedFile(index)} disabled={uploading} aria-label={"Retirar " + file.name}>
                                            <X size={14} aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                                <Button type="button" onClick={uploadSelectedFiles} disabled={uploading || !selectedFiles.length}>
                                    {uploading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <UploadCloud size={16} aria-hidden="true" />}
                                    {uploading ? "Enviando " + progress + "%" : "Enviar " + selectedFiles.length + " imagem(ns)"}
                                </Button>
                                {uploading && (
                                    <div className="demo-service-image-progress" role="progressbar" aria-label="Progresso do envio" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
                                        <span style={{ width: progress + "%" }} />
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
                {message && <p className="demo-service-images-message" role="status">{message}</p>}
            </div>
        </details>
    );
}
