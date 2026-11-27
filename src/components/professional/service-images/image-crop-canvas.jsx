import { useCallback, useEffect, useRef, useState } from "react";
import { createEditedImageFile, getImageAspectRatio } from "./image-utils.js";

function clampOffset(offset, viewport, image, zoom, rotation) {
    if (!viewport.width || !viewport.height || !image) return { x: 0, y: 0 };

    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const radians = normalizedRotation * Math.PI / 180;
    const rotatedWidth = normalizedRotation % 180 === 0 ? image.naturalWidth : image.naturalHeight;
    const rotatedHeight = normalizedRotation % 180 === 0 ? image.naturalHeight : image.naturalWidth;
    const scale = Math.max(viewport.width / rotatedWidth, viewport.height / rotatedHeight) * zoom;
    const drawnWidth = image.naturalWidth * scale;
    const drawnHeight = image.naturalHeight * scale;
    const boundsWidth = Math.abs(Math.cos(radians)) * drawnWidth + Math.abs(Math.sin(radians)) * drawnHeight;
    const boundsHeight = Math.abs(Math.sin(radians)) * drawnWidth + Math.abs(Math.cos(radians)) * drawnHeight;

    const maxX = Math.max(0, (boundsWidth - viewport.width) / 2);
    const maxY = Math.max(0, (boundsHeight - viewport.height) / 2);

    return {
        x: Math.max(-maxX, Math.min(maxX, offset.x)),
        y: Math.max(-maxY, Math.min(maxY, offset.y)),
    };
}

export default function ImageCropCanvas({
    file,
    aspectRatio,
    zoom,
    rotation,
    resetVersion,
    exportRef,
}) {
    const viewportRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const dragRef = useRef(null);
    const [viewport, setViewport] = useState({ width: 0, height: 0 });
    const [loadedImage, setLoadedImage] = useState(null);
    const [offsetState, setOffsetState] = useState({
        file: null,
        resetVersion: null,
        value: { x: 0, y: 0 },
    });
    const naturalSize = loadedImage?.file === file
        ? { width: loadedImage.width, height: loadedImage.height }
        : { width: 0, height: 0 };
    const imageError = loadedImage?.file === file ? loadedImage.error : "";
    const offset = offsetState.file === file && offsetState.resetVersion === resetVersion
        ? offsetState.value
        : { x: 0, y: 0 };

    function updateOffset(nextValue) {
        setOffsetState((current) => ({
            file,
            resetVersion,
            value: typeof nextValue === "function"
                ? nextValue(current.file === file && current.resetVersion === resetVersion
                    ? current.value
                    : { x: 0, y: 0 })
                : nextValue,
        }));
    }

    useEffect(() => {
        if (!file) return undefined;

        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
            imageRef.current = image;
            setLoadedImage({
                file,
                width: image.naturalWidth,
                height: image.naturalHeight,
                error: "",
            });
        };
        image.onerror = () => {
            imageRef.current = null;
            setLoadedImage({
                file,
                width: 0,
                height: 0,
                error: "Não foi possível abrir esta imagem no navegador.",
            });
        };
        image.src = objectUrl;

        return () => {
            image.onload = null;
            image.onerror = null;
            imageRef.current = null;
            URL.revokeObjectURL(objectUrl);
        };
    }, [file]);

    useEffect(() => {
        const element = viewportRef.current;
        if (!element) return undefined;

        const updateSize = () => {
            const rect = element.getBoundingClientRect();
            setViewport({
                width: Math.max(0, rect.width),
                height: Math.max(0, rect.height),
            });
        };

        updateSize();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateSize);
            return () => window.removeEventListener("resize", updateSize);
        }

        const observer = new ResizeObserver(updateSize);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const aspect = getImageAspectRatio(
        aspectRatio,
        naturalSize.width,
        naturalSize.height,
        rotation,
    );

    const imageDimensions = naturalSize.width > 0 && naturalSize.height > 0
        ? { naturalWidth: naturalSize.width, naturalHeight: naturalSize.height }
        : null;
    const normalizedOffset = clampOffset(
        offset,
        viewport,
        imageDimensions,
        zoom,
        rotation,
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image || !viewport.width || !viewport.height) return;

        const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        canvas.width = Math.round(viewport.width * pixelRatio);
        canvas.height = Math.round(viewport.height * pixelRatio);

        const context = canvas.getContext("2d");
        if (!context) return;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);
        context.fillStyle = "#111827";
        context.fillRect(0, 0, viewport.width, viewport.height);

        const normalizedRotation = ((rotation % 360) + 360) % 360;
        const radians = normalizedRotation * Math.PI / 180;
        const rotatedWidth = normalizedRotation % 180 === 0 ? image.naturalWidth : image.naturalHeight;
        const rotatedHeight = normalizedRotation % 180 === 0 ? image.naturalHeight : image.naturalWidth;
        const scale = Math.max(
            viewport.width / rotatedWidth,
            viewport.height / rotatedHeight,
        ) * zoom;

        context.save();
        context.translate(
            viewport.width / 2 + normalizedOffset.x,
            viewport.height / 2 + normalizedOffset.y,
        );
        context.rotate(radians);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(
            image,
            -(image.naturalWidth * scale) / 2,
            -(image.naturalHeight * scale) / 2,
            image.naturalWidth * scale,
            image.naturalHeight * scale,
        );
        context.restore();
    }, [
        viewport,
        naturalSize.width,
        naturalSize.height,
        normalizedOffset.x,
        normalizedOffset.y,
        zoom,
        rotation,
    ]);

    const exportCrop = useCallback(async () => {
        const image = imageRef.current;
        if (!image) throw new Error("A imagem ainda está sendo carregada.");

        return createEditedImageFile({
            image,
            file,
            viewport,
            offset: normalizedOffset,
            zoom,
            rotation,
            aspectRatio,
        });
    }, [file, viewport, normalizedOffset, zoom, rotation, aspectRatio]);

    useEffect(() => {
        if (!exportRef) return undefined;
        exportRef.current = exportCrop;
        return () => {
            if (exportRef.current === exportCrop) exportRef.current = null;
        };
    }, [exportRef, exportCrop]);

    function handlePointerDown(event) {
        if (!imageRef.current || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            offset: normalizedOffset,
        };
    }

    function handlePointerMove(event) {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;

        const next = {
            x: drag.offset.x + event.clientX - drag.x,
            y: drag.offset.y + event.clientY - drag.y,
        };
        updateOffset(clampOffset(next, viewport, imageRef.current, zoom, rotation));
    }

    function handlePointerEnd(event) {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
    }

    function handleKeyDown(event) {
        const movement = event.shiftKey ? 24 : 8;
        const movementByKey = {
            ArrowLeft: { x: -movement, y: 0 },
            ArrowRight: { x: movement, y: 0 },
            ArrowUp: { x: 0, y: -movement },
            ArrowDown: { x: 0, y: movement },
        };
        const delta = movementByKey[event.key];
        if (!delta) return;
        event.preventDefault();
        updateOffset(clampOffset({
            x: normalizedOffset.x + delta.x,
            y: normalizedOffset.y + delta.y,
        }, viewport, imageRef.current, zoom, rotation));
    }

    return (
        <div className="image-editor-preview-wrap">
            <div
                ref={viewportRef}
                className="image-editor-preview"
                style={{
                    aspectRatio: String(aspect),
                    width: "min(100%, " + (58 * aspect) + "vh)",
                }}
                role="group"
                aria-label="Área de recorte. Arraste a imagem ou use as setas do teclado para posicioná-la."
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onLostPointerCapture={() => { dragRef.current = null; }}
            >
                <canvas ref={canvasRef} aria-hidden="true" />
                {!naturalSize.width && !imageError && (
                    <span className="image-editor-preview-status">Carregando imagem…</span>
                )}
                {imageError && <span className="image-editor-preview-error" role="alert">{imageError}</span>}
            </div>
            <p className="image-editor-help">
                Arraste para reposicionar. Use as setas do teclado para ajustes finos.
            </p>
        </div>
    );
}
