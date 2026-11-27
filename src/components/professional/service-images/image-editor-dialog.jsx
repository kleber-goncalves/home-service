import { useRef, useState } from "react";
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
    onOpenChange,
    onSave,
}) {
    const exportRef = useRef(null);
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
            ariaLabelledBy="service-image-editor-title"
            className="image-editor-dialog"
        >
            <DialogContent>
                <DialogHeader className="image-editor-header">
                    <div>
                        <DialogTitle id="service-image-editor-title">{title}</DialogTitle>
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

                <DialogFooter className="image-editor-footer">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={saveEditedImage} disabled={!file || saving}>
                        {saving ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                        {saving ? "Aplicando..." : "Aplicar edição"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
