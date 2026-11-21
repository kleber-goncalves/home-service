import { useState } from "react";
import { ImageOff } from "lucide-react";
export default function ServiceImage({ image, alt, className = "", placeholderClassName = "", loading = "lazy" }) {
    const [failed, setFailed] = useState(false);
    const url = typeof image === "string" ? image : image?.url;
    if (!url || failed) {
        const message = failed ? "Não foi possível carregar a imagem" : "Sem imagem cadastrada";
        return <div className={`service-image-placeholder ${placeholderClassName}`} role="img" aria-label={`${alt || "Imagem do serviço"}. ${message}.`}>
            <ImageOff size={27} strokeWidth={1.7} aria-hidden="true" /><span>{message}</span>
        </div>;
    }
    return <img className={className} src={url} alt={alt || "Imagem do serviço"} loading={loading} decoding="async" onError={() => setFailed(true)} />;
}
