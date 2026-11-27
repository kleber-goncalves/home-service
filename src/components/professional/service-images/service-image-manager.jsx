import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appRequest } from "@/services/app-api";
import { getServiceImageFile, removeServiceImage, uploadServiceImage } from "@/services/image-api";
import ImageEditorDialog from "./image-editor-dialog.jsx";
import ServiceImageCard from "./service-image-card.jsx";
import ServiceImagePicker from "./service-image-picker.jsx";
import ServiceImageQueue from "./service-image-queue.jsx";
import { formatImageSize, MAX_IMAGE_BYTES, validateServiceImage } from "./image-utils.js";

const MAX_ACTIVE_IMAGES = 5;

function createPendingFile(file) {
    return { id: globalThis.crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) };
}

export default function ServiceImageManager({ service, csrfToken, onServicesChange }) {
    const [pendingFiles, setPendingFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [busyImageId, setBusyImageId] = useState(null);
    const [loadingImageId, setLoadingImageId] = useState(null);
    const [message, setMessage] = useState("");
    const [editor, setEditor] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const abortControllerRef = useRef(null);
    const pendingRef = useRef(pendingFiles);

    const images = Array.isArray(service.images) ? service.images.filter((image) => image.status === "active") : [];
    const remainingSlots = Math.max(0, MAX_ACTIVE_IMAGES - images.length);
    const availableForSelection = Math.max(0, remainingSlots - pendingFiles.length);
    const canUpload = !["suspended", "removed"].includes(service.status) && remainingSlots > 0;
    const busy = uploading || Boolean(busyImageId) || Boolean(loadingImageId);

    useEffect(() => {
        pendingRef.current = pendingFiles;
    }, [pendingFiles]);

    useEffect(() => () => {
        pendingRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    }, []);

    async function refreshImages() {
        const result = await appRequest("service.listMine", {}, csrfToken);
        onServicesChange(result.services || []);
    }

    function selectFiles(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        const accepted = [];
        const errors = [];

        files.forEach((file) => {
            const error = validateServiceImage(file);
            if (error) errors.push(file.name + ": " + error);
            else accepted.push(file);
        });

        const limited = accepted.slice(0, availableForSelection);
        if (accepted.length > availableForSelection) {
            errors.push("Você pode selecionar mais " + availableForSelection + " imagem(ns) para este serviço.");
        }

        setPendingFiles((current) => [...current, ...limited.map(createPendingFile)]);
        setProgress(0);
        setMessage(errors.join(" "));
    }

    function removePendingFile(item) {
        URL.revokeObjectURL(item.previewUrl);
        setPendingFiles((current) => current.filter((entry) => entry.id !== item.id));
        setProgress(0);
    }

    function openPendingEditor(item) {
        setEditor({ kind: "pending", pendingId: item.id, file: item.file, title: "Editar imagem antes do envio" });
        setMessage("");
    }

    async function openSavedEditor(image) {
        if (busy) return;
        const controller = new AbortController();
        setLoadingImageId(image.id);
        setMessage("");
        try {
            const file = await getServiceImageFile(image.id, csrfToken, controller.signal);
            setEditor({ kind: "saved", image, file, title: "Editar imagem " + image.order });
        } catch (error) {
            setMessage(error.message || "Não foi possível carregar a imagem para edição.");
        } finally {
            setLoadingImageId(null);
        }
    }

    async function saveEditedImage(file) {
        if (!editor || savingEdit) return;
        if (editor.kind === "pending") {
            setPendingFiles((current) => current.map((item) => {
                if (item.id !== editor.pendingId) return item;
                URL.revokeObjectURL(item.previewUrl);
                return { ...item, file, previewUrl: URL.createObjectURL(file) };
            }));
            setMessage("A edição foi aplicada. A imagem ainda não foi enviada.");
            return;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        setSavingEdit(true);
        setBusyImageId(editor.image.id);
        setProgress(0);
        setMessage("");
        try {
            await uploadServiceImage({
                serviceId: service.id,
                replaceImageId: editor.image.id,
                file,
                csrfToken,
                signal: controller.signal,
                onProgress: setProgress,
            });
            await refreshImages();
            setMessage("Imagem atualizada. A imagem anterior foi substituída com segurança.");
        } catch (error) {
            setMessage(error.name === "AbortError"
                ? "A substituição foi cancelada. A imagem anterior foi preservada."
                : error.message || "Não foi possível substituir a imagem.");
            try { await refreshImages(); } catch { /* keep the original error */ }
            throw error;
        } finally {
            abortControllerRef.current = null;
            setSavingEdit(false);
            setBusyImageId(null);
            setProgress(0);
        }
    }

    async function uploadSelectedFiles() {
        if (!pendingFiles.length || busy) return;
        if (pendingFiles.length > remainingSlots) {
            setMessage("Este serviço ainda comporta " + remainingSlots + " imagem(ns).");
            return;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const snapshot = [...pendingFiles];
        const completedIds = [];
        setUploading(true);
        setMessage("");
        setProgress(0);

        try {
            for (let index = 0; index < snapshot.length; index += 1) {
                if (controller.signal.aborted) break;
                const item = snapshot[index];
                await uploadServiceImage({
                    serviceId: service.id,
                    file: item.file,
                    csrfToken,
                    signal: controller.signal,
                    onProgress: (fileProgress) => {
                        setProgress(Math.round(((index + fileProgress / 100) / snapshot.length) * 100));
                    },
                });
                completedIds.push(item.id);
            }

            setPendingFiles((current) => current.filter((item) => {
                if (!completedIds.includes(item.id)) return true;
                URL.revokeObjectURL(item.previewUrl);
                return false;
            }));
            await refreshImages();
            setMessage(controller.signal.aborted
                ? "Envio interrompido. As imagens concluídas foram salvas."
                : "As imagens foram enviadas e os registros foram confirmados.");
        } catch (error) {
            setPendingFiles((current) => current.filter((item) => {
                if (!completedIds.includes(item.id)) return true;
                URL.revokeObjectURL(item.previewUrl);
                return false;
            }));
            setMessage(error.name === "AbortError"
                ? "Envio cancelado. Os arquivos concluídos foram salvos."
                : error.message || "Não foi possível concluir o envio das imagens.");
            try { await refreshImages(); } catch { /* keep the original error */ }
        } finally {
            abortControllerRef.current = null;
            setUploading(false);
            setProgress(0);
        }
    }

    async function removeImage(image) {
        const confirmed = window.confirm("Remover esta imagem do serviço? O arquivo será restringido no Drive e o registro será preservado.");
        if (!confirmed || busy) return;

        setBusyImageId(image.id);
        setMessage("");
        try {
            await removeServiceImage(image.id, csrfToken);
            await refreshImages();
            setMessage("Imagem removida e acesso restringido.");
        } catch (error) {
            setMessage(error.message || "Não foi possível remover a imagem.");
        } finally {
            setBusyImageId(null);
        }
    }

    return (
        <>
            <details className="demo-service-images">
                <summary>
                    <span><ImagePlus size={15} aria-hidden="true" /> Imagens do serviço</span>
                    <small>{images.length}/{MAX_ACTIVE_IMAGES}</small>
                </summary>
                <div className="demo-service-images-content">
                    {images.length > 0 ? (
                        <div className="demo-service-image-list">
                            {images.map((image) => (
                                <ServiceImageCard
                                    key={image.id}
                                    image={image}
                                    serviceTitle={service.title}
                                    busy={busyImageId === image.id || loadingImageId === image.id || uploading}
                                    onEdit={() => openSavedEditor(image)}
                                    onRemove={() => removeImage(image)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="demo-service-images-empty">Nenhuma imagem cadastrada para este serviço.</p>
                    )}

                    {canUpload && (
                        <>
                            <ServiceImagePicker
                                disabled={busy || availableForSelection <= 0}
                                remainingSlots={availableForSelection}
                                onSelect={selectFiles}
                            />
                            <ServiceImageQueue
                                files={pendingFiles}
                                disabled={busy}
                                onEdit={openPendingEditor}
                                onRemove={removePendingFile}
                            />
                            {pendingFiles.length > 0 && (
                                <div className="demo-service-image-upload-actions">
                                    <Button type="button" onClick={uploadSelectedFiles} disabled={busy}>
                                        {uploading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <UploadCloud size={16} aria-hidden="true" />}
                                        {uploading ? "Enviando " + progress + "%" : "Enviar " + pendingFiles.length + " imagem(ns)"}
                                    </Button>
                                    {uploading && (
                                        <Button type="button" variant="secondary" onClick={() => abortControllerRef.current?.abort()}>
                                            <X size={15} aria-hidden="true" /> Cancelar envio
                                        </Button>
                                    )}
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
                    {savingEdit && (
                        <p className="demo-service-images-message" role="status">
                            Atualizando imagem ({progress}%). A versão anterior permanece disponível até a confirmação.
                        </p>
                    )}
                    <p className="demo-service-images-hint">
                        Formatos JPG, PNG e WebP. Tamanho máximo de {formatImageSize(MAX_IMAGE_BYTES)} por imagem.
                    </p>
                </div>
            </details>

            <ImageEditorDialog
                open={Boolean(editor)}
                file={editor?.file || null}
                title={editor?.title}
                saving={savingEdit}
                onOpenChange={(open) => {
                    if (!open && !savingEdit) setEditor(null);
                }}
                onSave={saveEditedImage}
            />
        </>
    );
}
