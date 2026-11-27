import { RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { IMAGE_ASPECT_OPTIONS } from "./image-utils.js";

export default function ImageEditorControls({
    zoom,
    aspectRatio,
    onZoomChange,
    onRotate,
    onReset,
    onAspectRatioChange,
    disabled = false,
}) {
    return (
        <aside className="image-editor-controls" aria-label="Controles de edição">
            <section className="image-editor-control-group">
                <h3>Proporção</h3>
                <div className="image-editor-aspect-options">
                    {IMAGE_ASPECT_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={"image-editor-aspect-button" + (aspectRatio === option.value ? " is-active" : "")}
                            aria-pressed={aspectRatio === option.value}
                            onClick={() => onAspectRatioChange(option.value)}
                            disabled={disabled}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </section>

            <section className="image-editor-control-group">
                <h3>Zoom</h3>
                <Slider
                    label="Aproximar imagem"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.05}
                    formatValue={(value) => Math.round(value * 100) + "%"}
                    onValueChange={onZoomChange}
                    disabled={disabled}
                />
            </section>

            <section className="image-editor-control-group">
                <h3>Rotação</h3>
                <div className="image-editor-rotate-actions">
                    <Button type="button" variant="outline" size="sm" onClick={() => onRotate(-90)} disabled={disabled}>
                        <RotateCcw size={16} aria-hidden="true" /> Girar à esquerda
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onRotate(90)} disabled={disabled}>
                        <RotateCw size={16} aria-hidden="true" /> Girar à direita
                    </Button>
                </div>
            </section>

            <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={disabled}>
                Restaurar ajustes
            </Button>
        </aside>
    );
}
