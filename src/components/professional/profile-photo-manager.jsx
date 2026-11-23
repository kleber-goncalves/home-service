import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, Trash2, UploadCloud, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeProfilePhoto, uploadProfilePhoto } from "@/services/image-api";

const MAX_FILE_BYTES = 5_000_000;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatFileSize(bytes) {
    return (Number(bytes || 0) / (1024 * 1024)).toFixed(2) + " MB";
}

export default function ProfilePhotoManager({ user, csrfToken, onPhotoChange }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("");
    const abortControllerRef = useRef(null);

    useEffect(() => {
        if (!previewUrl) return undefined;
        return () => URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    function clearSelection() {
        setSelectedFile(null);
        setPreviewUrl("");
        setProgress(0);
    }

    function selectPhoto(event) {
        const file = event.target.files?.[0] || null;
        event.target.value = "";
        setMessage("");

        if (!file) return;
        if (!ACCEPTED_TYPES.has(file.type)) {
            setMessage("Use uma foto JPG, PNG ou WebP.");
            return;
        }
        if (file.size < 12 || file.size > MAX_FILE_BYTES) {
            setMessage("A foto deve ter entre 12 bytes e 5 MB.");
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setProgress(0);
    }

    async function savePhoto() {
        if (!selectedFile || uploading || removing) return;

        const controller = new AbortController();
        abortControllerRef.current = controller;
        setUploading(true);
        setMessage("");
        setProgress(0);
        try {
            const result = await uploadProfilePhoto({
                file: selectedFile,
                csrfToken,
                signal: controller.signal,
                onProgress: setProgress,
            });

            onPhotoChange({
                photoId: result.id,
                photoUrl: result.url || "",
            });
            clearSelection();
            setMessage("Foto de perfil atualizada.");
        } catch (error) {
            setMessage(error.name === "AbortError"
                ? "Envio cancelado. A foto anterior foi preservada."
                : error.message || "Não foi possível atualizar a foto de perfil.");
        } finally {
            abortControllerRef.current = null;
            setUploading(false);
        }
    }

    async function removePhoto() {
        if (!user.photoId || removing || uploading) return;
        const confirmed = window.confirm("Remover sua foto de perfil? O arquivo será restringido no Drive e o registro será preservado.");
        if (!confirmed) return;

        setRemoving(true);
        setMessage("");
        try {
            await removeProfilePhoto(user.photoId, csrfToken);
            onPhotoChange({ photoId: "", photoUrl: "" });
            clearSelection();
            setMessage("Foto removida e acesso restringido.");
        } catch (error) {
            setMessage(error.message || "Não foi possível remover a foto de perfil.");
        } finally {
            setRemoving(false);
        }
    }

    return (
        <section className="demo-profile-photo" aria-labelledby="profile-photo-heading">
            <div className="demo-profile-photo-preview" aria-hidden="true">
                {previewUrl ? (
                    <img src={previewUrl} alt="" />
                ) : user.photoUrl ? (
                    <img src={user.photoUrl} alt="" />
                ) : (
                    <UserRound size={30} />
                )}
            </div>

            <div className="demo-profile-photo-content">
                <div>
                    <span className="section-eyebrow">Imagem da conta</span>
                    <h3 id="profile-photo-heading">Foto de perfil</h3>
                    <p>Adicione uma foto para identificar sua conta. JPG, PNG ou WebP, até 5 MB.</p>
                </div>

                <div className="demo-profile-photo-actions">
                    <label className="demo-profile-photo-picker">
                        <Camera size={15} aria-hidden="true" />
                        <span>{user.photoUrl ? "Escolher outra foto" : "Escolher foto"}</span>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={selectPhoto}
                            disabled={uploading || removing}
                        />
                    </label>
                    {selectedFile && (
                        <Button type="button" onClick={savePhoto} disabled={uploading || removing}>
                            {uploading
                                ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                                : <UploadCloud size={15} aria-hidden="true" />}
                            {uploading ? "Enviando " + progress + "%" : "Salvar foto"}
                        </Button>
                    )}
                    {selectedFile && (
                        <Button type="button" variant="secondary" size="sm" onClick={clearSelection} disabled={uploading}>
                            <X size={14} aria-hidden="true" /> Cancelar
                        </Button>
                    )}
                    {uploading && (
                        <Button type="button" variant="secondary" size="sm" onClick={() => abortControllerRef.current?.abort()}>
                            <X size={14} aria-hidden="true" /> Interromper envio
                        </Button>
                    )}
                    {!selectedFile && user.photoId && (
                        <Button type="button" variant="ghost" size="sm" onClick={removePhoto} disabled={uploading || removing}>
                            {removing
                                ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                                : <Trash2 size={14} aria-hidden="true" />}
                            Remover foto
                        </Button>
                    )}
                </div>

                {uploading && (
                    <div className="demo-profile-photo-progress" role="progressbar" aria-label="Progresso do envio da foto" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
                        <span style={{ width: progress + "%" }} />
                    </div>
                )}
                {selectedFile && <small className="demo-profile-photo-file">{selectedFile.name} · {formatFileSize(selectedFile.size)}</small>}
                {message && <p className="demo-service-images-message" role="status" aria-live="polite">{message}</p>}
            </div>
        </section>
    );
}
