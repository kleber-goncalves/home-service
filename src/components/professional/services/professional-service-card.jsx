import { useState } from "react";
import { ImagePlus, Images, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ServiceImageManager from "@/components/professional/service-image-manager";
import ProfessionalServiceActions from "./professional-service-actions.jsx";
import {
    getServiceActiveImages,
    getServiceLocationLabel,
} from "./professional-service-utils.js";

const STATUS_LABELS = {
    draft: "Rascunho",
    published: "Publicado",
    paused: "Em pausa",
    suspended: "Suspenso",
    removed: "Removido",
};

export default function ProfessionalServiceCard({
    service,
    busy = false,
    csrfToken,
    onServicesChange,
    onEdit,
    onToggle,
    onRemove,
}) {
    const images = getServiceActiveImages(service);
    const mainImage = images[0] || null;
    const [failedImageUrl, setFailedImageUrl] = useState(null);
    const imageFailed = Boolean(mainImage?.url && failedImageUrl === mainImage.url);
    const canManageImages = ["draft", "published", "paused"].includes(service.status);


    const imageMessage = !mainImage
        ? "Adicione uma imagem para destacar este serviço."
        : imageFailed
            ? "Não foi possível carregar a imagem."
            : "Prévia privada até a publicação do serviço.";

    return (
        <Card className="professional-service-card">
            <div className="professional-service-card-media">
                {mainImage?.url && !imageFailed ? (
                    <img
                        src={mainImage.url}
                        alt={"Imagem principal do serviço " + service.title}
                        loading="lazy"
                        decoding="async"
                        onError={() => setFailedImageUrl(mainImage.url)}
                    />
                ) : (
                    <div
                        className="professional-service-card-image-placeholder"
                        role="img"
                        aria-label={imageMessage}
                    >
                        <ImagePlus size={28} strokeWidth={1.6} aria-hidden="true" />
                        <span>{imageMessage}</span>
                    </div>
                )}

                <span className={"professional-service-status is-" + (
                    STATUS_LABELS[service.status] ? service.status : "unknown"
                )}>
                    {STATUS_LABELS[service.status] || "Estado desconhecido"}
                </span>

                <span className="professional-service-photo-count">
                    <Images size={14} aria-hidden="true" />
                    {images.length}/5 fotos
                </span>
            </div>

            <CardContent className="professional-service-card-content">
                <div className="professional-service-card-heading">
                    <span className="professional-service-category">
                        {service.category || "Sem categoria"}
                    </span>
                    <h3>{service.title}</h3>
                </div>

                {service.description && (
                    <p className="professional-service-description">
                        {service.description}
                    </p>
                )}

                <div className="professional-service-card-location">
                    <MapPin size={15} aria-hidden="true" />
                    <span>{getServiceLocationLabel(service)}</span>
                </div>

                <ProfessionalServiceActions
                    service={service}
                    busy={busy}
                    onEdit={onEdit}
                    onToggle={onToggle}
                    onRemove={onRemove}
                />

                {canManageImages && (
                    <ServiceImageManager
                        service={service}
                        csrfToken={csrfToken}
                        onServicesChange={onServicesChange}
                    />
                )}
            </CardContent>
        </Card>
    );
}
