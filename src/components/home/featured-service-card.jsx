import {
    ArrowUpRight,
    BriefcaseBusiness,
    Brush,
    Droplets,
    Hammer,
    House,
    Image as ImageIcon,
    Leaf,
    MapPin,
    Paintbrush,
    Wrench,
    Zap,
} from "lucide-react";
import AppLink from "@/components/public/app-link";
import ServiceImage from "@/components/public/service-image";

function categoryIcon(category = "") {
    const normalized = String(category)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");

    if (/limpez|faxin/.test(normalized)) return Brush;
    if (/eletric/.test(normalized)) return Zap;
    if (/hidraul|encan/.test(normalized)) return Droplets;
    if (/constr|reform|obra|montag|moveis/.test(normalized)) return Hammer;
    if (/pint/.test(normalized)) return Paintbrush;
    if (/jardin|paisag/.test(normalized)) return Leaf;
    if (/manuten|repar/.test(normalized)) return Wrench;
    if (/domestic|residencial|casa/.test(normalized)) return House;

    return BriefcaseBusiness;
}

export default function HomeFeaturedServiceCard({ service }) {
    const image = service.images?.[0] || null;
    const additionalImages = Math.max(0, (service.images?.length || 0) - 1);
    const serviceHref = service.isDemo
        ? "/servicos"
        : `/servicos/${encodeURIComponent(service.id)}`;
    const CategoryIcon = categoryIcon(service.category);
    const location = service.isDemo
        ? "Sem localidade real"
        : (service.cityLabel || "Localidade não informada");

    return (
        <article className="home-featured-service-card">
            <div className="home-featured-service-media">
                <AppLink
                    to={serviceHref}
                    className="home-featured-service-image-link"
                    aria-label={service.isDemo
                        ? "Consultar catálogo de serviços de demonstração"
                        : `Ver detalhes de ${service.title}`}
                >
                    <ServiceImage
                        image={image}
                        alt={image ? `Imagem do serviço ${service.title}` : `Imagem indisponível para ${service.title}`}
                        className="home-featured-service-image"
                    />
                </AppLink>
                {service.isDemo && (
                    <span className="home-featured-service-demo-tag">
                        Exemplo ilustrativo
                    </span>
                )}
                {additionalImages > 0 && (
                    <span className="home-featured-service-photo-count">
                        <ImageIcon size={13} aria-hidden="true" />
                        +{additionalImages} {additionalImages === 1 ? "foto" : "fotos"}
                    </span>
                )}
            </div>

            <div className="home-featured-service-content">
                <div className="home-featured-service-title-row">
                    <div className="home-featured-service-title-copy">
                        <span className="home-featured-service-category">
                            {service.category}
                        </span>
                        <h3>
                            <AppLink to={serviceHref}>{service.title}</AppLink>
                        </h3>
                    </div>
                    <CategoryIcon
                        className="home-featured-service-icon"
                        size={54}
                        strokeWidth={1.25}
                        aria-hidden="true"
                    />
                </div>

                {service.description && (
                    <p className="home-featured-service-description">
                        {service.description}
                    </p>
                )}

                <div className="home-featured-service-footer">
                    <div className="home-featured-service-location">
                        <span>Atendimento</span>
                        <strong>
                            <MapPin size={14} aria-hidden="true" />
                            {location}
                        </strong>
                    </div>
                    <AppLink
                        to={serviceHref}
                        className="home-featured-service-action"
                    >
                        {service.isDemo ? "Ver catálogo" : "Ver detalhes"}
                        <ArrowUpRight size={16} aria-hidden="true" />
                    </AppLink>
                </div>
            </div>
        </article>
    );
}
