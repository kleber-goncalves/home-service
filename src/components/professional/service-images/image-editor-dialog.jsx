import { useId, useRef, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ImageCropCanvas from "./image-crop-canvas.jsx";
import ImageEditorControls from "./image-editor-controls.jsx";

export default function ImageEditorDialog({
    open,
    file,
    title = "Editar imagem",
    saving = false,
    progress = 0,
    onOpenChange,
    onSave,
    onCancel,
}) {
    const exportRef = useRef(null);
    const titleId = useId();
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [aspectRatio, setAspectRatio] = useState("16:10");
    const [error, setError] = useState("");

    function resetEditor() {
        setZoom(1);
        setRotation(0);
        setAspectRatio("16:10");
        setError("");
    }

    async function saveEditedImage() {
        if (!exportRef.current || saving) return;
        setError("");
        try {
            const editedFile = await exportRef.current();
            await onSave(editedFile);
            resetEditor();
            onOpenChange(false);
        } catch (saveError) {
            setError(saveError.message || "Não foi possível aplicar as alterações.");
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!saving) {
                    if (!nextOpen) resetEditor();
                    onOpenChange(nextOpen);
                }
            }}
            ariaLabelledBy={titleId}
            className="image-editor-dialog"
        >
            <DialogContent>
                <DialogHeader className="image-editor-header">
                    <div>
                        <DialogTitle id={titleId}>{title}</DialogTitle>
                        <DialogDescription>
                            Ajuste o enquadramento sem alterar a imagem original até confirmar.
                        </DialogDescription>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Fechar editor"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        <X size={18} aria-hidden="true" />
                    </Button>
                </DialogHeader>

                {file && (
                    <div className="image-editor-layout">
                        <ImageCropCanvas
                            file={file}
                            aspectRatio={aspectRatio}
                            zoom={zoom}
                            rotation={rotation}
                            exportRef={exportRef}
                        />
                        <ImageEditorControls
                            zoom={zoom}
                            aspectRatio={aspectRatio}
                            onZoomChange={setZoom}
                            onRotate={(degrees) => setRotation((current) => current + degrees)}
                            onReset={resetEditor}
                            onAspectRatioChange={setAspectRatio}
                            disabled={saving}
                        />
                    </div>
                )}

                {error && <p className="image-editor-error" role="alert">{error}</p>}
                {saving && (
                    <div className="image-editor-upload-progress">
                        <div className="demo-service-image-progress" role="progressbar" aria-label="Progresso da substituição" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
                            <span style={{ width: progress + "%" }} />
                        </div>
                        <small>Enviando a nova imagem: {progress}%</small>
                    </div>
                )}

                <DialogFooter className="image-editor-footer">
                    {saving ? (
                        <Button type="button" variant="secondary" onClick={onCancel}>
                            <X size={16} aria-hidden="true" /> Interromper envio
                        </Button>
                    ) : (
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                    )}
                    <Button type="button" onClick={saveEditedImage} disabled={!file || saving}>
                        {saving ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                        {saving ? "Aplicando..." : "Aplicar edição"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
