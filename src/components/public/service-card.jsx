import { ArrowRight, BriefcaseBusiness, Image as ImageIcon, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AppLink from "@/components/public/app-link";
import ServiceImage from "@/components/public/service-image";
export default function ServiceCard({ service }) {
    const image = service.images?.[0] || null;
    const additionalImages = Math.max(0, (service.images?.length || 0) - 1);
    const serviceHref = service.isDemo ? "/servicos" : `/servicos/${encodeURIComponent(service.id)}`;
    return <Card className="catalog-service-card">
        <div className="catalog-service-media">
            <AppLink to={serviceHref} className="catalog-service-image-link" aria-label={service.isDemo ? "Ver catálogo de serviços" : `Ver detalhes de ${service.title}`}>
                <ServiceImage image={image} alt={image ? `Imagem do serviço ${service.title}` : `Imagem indisponível para ${service.title}`} className="catalog-service-image" />
            </AppLink>
            {additionalImages > 0 && <span className="catalog-photo-count"><ImageIcon size={13} aria-hidden="true" /> +{additionalImages} {additionalImages === 1 ? "foto" : "fotos"}</span>}
            <span className="catalog-service-tag">{service.isDemo ? "Exemplo ilustrativo" : service.category}</span>
        </div>
        <CardContent className="catalog-service-content">
            <span className="catalog-service-category">{service.category}</span>
            <h3>{service.title}</h3>
            <p className="catalog-service-description">{service.description}</p>
            <div className="catalog-service-meta">
                <span><MapPin size={14} aria-hidden="true" />{service.cityLabel || "Localidade não informada"}</span>
                {service.professionalName && <span><BriefcaseBusiness size={14} aria-hidden="true" />{service.professionalName}</span>}
            </div>
            {service.isDemo ? <span className="catalog-service-demo-note">Exemplo visual — não é um cadastro publicado</span>
                : <AppLink to={serviceHref} className="catalog-service-link">Ver detalhes <ArrowRight size={16} aria-hidden="true" /></AppLink>}
        </CardContent>
    </Card>;
}
