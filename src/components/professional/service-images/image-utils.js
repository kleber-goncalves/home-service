export const MAX_IMAGE_BYTES = 5_000_000;
export const ACCEPTED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export const IMAGE_ASPECT_OPTIONS = [
    { label: "Original", value: "original" },
    { label: "16:10", value: "16:10" },
    { label: "1:1", value: "1:1" },
    { label: "4:3", value: "4:3" },
    { label: "16:9", value: "16:9" },
];

const IMAGE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export function formatImageSize(bytes) {
    return (Number(bytes || 0) / (1024 * 1024)).toFixed(2) + " MB";
}

export function validateServiceImage(file) {
    if (!(file instanceof File)) return "Selecione um arquivo de imagem.";
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) return "Use uma imagem JPG, PNG ou WebP.";
    if (file.size < 12 || file.size > MAX_IMAGE_BYTES) return "A imagem deve ter entre 12 bytes e 5 MB.";
    return "";
}

export function getImageAspectRatio(value, width, height, rotation = 0) {
    if (value === "original" && width > 0 && height > 0) {
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        return normalizedRotation % 180 === 0 ? width / height : height / width;
    }

    const parts = String(value || "16:10").split(":").map(Number);
    if (parts.length !== 2 || !parts[0] || !parts[1]) return 16 / 10;
    return parts[0] / parts[1];
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("O navegador não conseguiu preparar a imagem editada."));
        }, type, quality);
    });
}

export async function createEditedImageFile({
    image,
    file,
    viewport,
    offset,
    zoom,
    rotation,
    aspectRatio,
}) {
    if (!image || !file || !viewport?.width || !viewport?.height) {
        throw new Error("A imagem ainda não está pronta para edição.");
    }

    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const radians = normalizedRotation * Math.PI / 180;
    const orientedWidth = normalizedRotation % 180 === 0 ? image.naturalWidth : image.naturalHeight;
    const orientedHeight = normalizedRotation % 180 === 0 ? image.naturalHeight : image.naturalWidth;
    const ratio = getImageAspectRatio(aspectRatio, image.naturalWidth, image.naturalHeight, normalizedRotation);

    const sourceCropWidth = Math.min(orientedWidth, orientedHeight * ratio);
    const outputScale = Math.min(1, 1920 / Math.max(sourceCropWidth, sourceCropHeight));
    let outputWidth = Math.max(1, Math.floor(sourceCropWidth * outputScale));
    let outputHeight = Math.max(1, Math.floor(outputWidth / ratio));

    const baseScale = Math.max(
        viewport.width / orientedWidth,
        viewport.height / orientedHeight,
    );
    const displayScale = baseScale * zoom;
    const canvas = document.createElement("canvas");
    let blob = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("O navegador não disponibilizou o editor de imagem.");

        context.clearRect(0, 0, outputWidth, outputHeight);
        if (file.type === "image/jpeg") {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, outputWidth, outputHeight);
        }

        const scale = outputWidth / viewport.width;
        context.save();
        context.translate(
            outputWidth / 2 + offset.x * scale,
            outputHeight / 2 + offset.y * scale,
        );
        context.rotate(radians);
        const imageWidth = image.naturalWidth * displayScale * scale;
        const imageHeight = image.naturalHeight * displayScale * scale;
        context.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
        context.restore();

        blob = await canvasToBlob(canvas, file.type, 0.92);
        if (blob.type !== file.type) {
            throw new Error("Este navegador não conseguiu manter o formato original da imagem.");
        }
        if (blob.size <= MAX_IMAGE_BYTES) break;

        outputWidth = Math.max(1, Math.floor(outputWidth * 0.82));
        outputHeight = Math.max(1, Math.floor(outputWidth / ratio));
    }

    if (!blob || blob.size < 12 || blob.size > MAX_IMAGE_BYTES) {
        throw new Error("O recorte ainda ultrapassa 5 MB. Reduza a área ou selecione outra imagem.");
    }

    const extension = IMAGE_EXTENSIONS[blob.type];
    const baseName = file.name.replace(/\.[^.]+$/, "") || "imagem";
    return new File(
        [blob],
        baseName + "-editada." + extension,
        { type: blob.type, lastModified: Date.now() },
    );
}
