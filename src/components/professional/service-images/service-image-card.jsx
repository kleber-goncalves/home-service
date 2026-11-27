import { ImagePlus, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatImageSize } from "./image-utils.js";

export default function ServiceImageCard({ image, serviceTitle, busy = false, onEdit, onRemove }) {
    return (
        <article className="demo-service-image-item" aria-busy={busy}>
            {image.url ? (
                <img src={image.url} alt={"Imagem " + image.order + " do serviço " + serviceTitle} loading="lazy" />
            ) : (
                <div className="demo-service-image-private">
                    <ImagePlus size={19} aria-hidden="true" />
                    <span>Privada</span>
                </div>
            )}
            <div className="demo-service-image-meta">
                <strong>Imagem {image.order}</strong>
                <small>{formatImageSize(image.sizeBytes)}</small>
                {!image.url && <small>Visível publicamente quando o serviço for publicado.</small>}
            </div>
            <div className="demo-service-image-actions">
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onEdit} aria-label={"Editar imagem " + image.order}>
                    {busy ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}
                    Editar
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove} aria-label={"Remover imagem " + image.order}>
                    <Trash2 size={15} aria-hidden="true" />
                </Button>
            </div>
        </article>
    );
}
