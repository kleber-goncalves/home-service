import { useState } from "react";
import {
    BriefcaseBusiness,
    Brush,
    Droplets,
    Hammer,
    House,
    Leaf,
    MapPin,
    MessageCircle,
    Paintbrush,
    Wrench,
    Zap,
} from "lucide-react";
import AppLink from "@/components/public/app-link";
import ServiceImage from "@/components/public/service-image";

function normalizedCategoryName(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");
}

function iconForCategory(name) {
    const normalized = normalizedCategoryName(name);

    if (/limpez|faxin/.test(normalized)) return Brush;
    if (/eletric/.test(normalized)) return Zap;
    if (/hidraul|encan/.test(normalized)) return Droplets;
    if (/constr|reform|obra/.test(normalized)) return Hammer;
    if (/pint/.test(normalized)) return Paintbrush;
    if (/jardin|paisag/.test(normalized)) return Leaf;
    if (/manuten|repar/.test(normalized)) return Wrench;
    if (/domestic|residencial|casa/.test(normalized)) return House;

    return BriefcaseBusiness;
}

function createWhatsappUrl(phone, title) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!/^55\d{10,11}$/.test(digits)) return null;

    const message = encodeURIComponent(
        `Olá! Vi o serviço "${title}" no Conecta Local e gostaria de mais informações.`,
    );

    return `https://wa.me/${digits}?text=${message}`;
}

function serviceLocationTags(service) {
    const cities = Array.isArray(service.cities) ? service.cities : [];

    if (cities.length) {
        return cities.slice(0, 4).map((city) => ({
            key: city.id || `${city.name}-${city.state}`,
            label: [city.name, city.state].filter(Boolean).join(" - "),
        })).concat(
            cities.length > 4
                ? [{ key: "more-cities", label: `+${cities.length - 4} localidades` }]
                : [],
        );
    }

    if (service.isDemo) return [];

    return service.cityLabel
        ? [{ key: "service-location", label: service.cityLabel }]
        : [];
}

function ServiceFacts({ service, categoryName }) {
    const locationTags = serviceLocationTags(service);
    const whatsappUrl = createWhatsappUrl(service.whatsapp, service.title);

    return (
        <aside className="category-featured-card category-featured-facts" aria-label="Informações rápidas do serviço">
            <h3>Informações rápidas</h3>
            <div className="category-featured-tags">
                <span className="category-featured-tag">{categoryName}</span>
                <span className="category-featured-tag">{service.isDemo ? "Exemplo fictício" : "Cadastro publicado"}</span>
                {locationTags.map((location) => (
                    <span className="category-featured-tag" key={location.key}>{location.label}</span>
                ))}
                {service.isDemo
                    ? <span className="category-featured-tag">Sem contato real</span>
                    : whatsappUrl && <span className="category-featured-tag">WhatsApp disponível</span>}
            </div>
        </aside>
    );
}

function ServiceSummary({ service }) {
    const whatsappUrl = createWhatsappUrl(service.whatsapp, service.title);
    const serviceHref = service.isDemo ? "/servicos" : `/servicos/${encodeURIComponent(service.id)}`;

    return (
        <aside className="category-featured-card category-featured-summary">
            <span className="category-featured-kicker">Serviço em destaque</span>
            <h3>{service.title}</h3>
            <p className="category-featured-description">{service.description}</p>

            <div className="category-featured-divider" />

            <div className="category-featured-owner">
                <span className="category-featured-owner-label">Quem oferece</span>
                <span className="category-featured-owner-line">
                    <BriefcaseBusiness size={17} aria-hidden="true" />
                    <strong>{service.professionalName || (service.isDemo ? "Perfil fictício" : "Profissional")}</strong>
                </span>
                <span className="category-featured-owner-line">
                    <MapPin size={17} aria-hidden="true" />
                    <span>{service.cityLabel || "Localidade não informada"}</span>
                </span>
            </div>

            {service.isDemo ? (
                <AppLink to={serviceHref} className="category-featured-contact">
                    Ver serviços disponíveis
                </AppLink>
            ) : whatsappUrl ? (
                <a className="category-featured-contact" href={whatsappUrl} target="_blank" rel="noreferrer">
                    <MessageCircle size={17} aria-hidden="true" />
                    Entrar em contato
                </a>
            ) : (
                <AppLink to={serviceHref} className="category-featured-contact">
                    Ver detalhes do serviço
                </AppLink>
            )}
        </aside>
    );
}

function FeaturedServicePanel({ service, categoryName }) {
    const image = service.images?.[0] || null;

    return (
        <div className="category-featured-grid" aria-live="polite">
            <ServiceFacts service={service} categoryName={categoryName} />
            <figure className="category-featured-card category-featured-media">
                <ServiceImage
                    image={image}
                    alt={image ? `Imagem do serviço ${service.title}` : `Imagem indisponível para ${service.title}`}
                    className="category-featured-image"
                    loading="eager"
                />
            </figure>
            <ServiceSummary service={service} />
        </div>
    );
}

export default function CategoryFeaturedServices({ categories = [], services = [], loading = false, error = false }) {
    const [selectedCategoryId, setSelectedCategoryId] = useState("");

    const firstCategoryWithService = categories.find((category) =>
        services.some((service) => service.categoryId === category.id),
    );
    const selectedCategory = categories.find((category) => category.id === selectedCategoryId)
        || firstCategoryWithService
        || categories[0]
        || null;

    // Prefer a real published service. When a category has no published entry, show its local example.
    const categoryServices = selectedCategory
        ? services.filter((service) => service.categoryId === selectedCategory.id)
        : [];
    const featuredService = categoryServices.find((service) => !service.isDemo)
        || categoryServices.find((service) => service.isDemo)
        || null;

    return (
        <section className="category-featured-section" id="servicos-por-categoria" aria-labelledby="category-featured-title">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="category-featured-heading">
                    <h2 id="category-featured-title">Serviços que você pode encontrar.</h2>
                    <p className="pt-4 font-bold opacity-75 text-lg">Find trusted local experts just around the corner.</p>
                </div>

                {loading ? (
                    <p className="category-featured-state" role="status">
                        Carregando categorias e serviços...
                    </p>
                ) : error && !categories.length ? (
                    <p className="category-featured-state" role="alert">
                        Não foi possível carregar as categorias agora.
                    </p>
                ) : categories.length ? (
                    <>
                        <div className="category-featured-tabs pt-11" role="tablist" aria-label="Categorias de serviços">
                            {categories.map((category) => {
                                const Icon = iconForCategory(category.name);
                                const isSelected = selectedCategory?.id === category.id;

                                return (
                                    <button className={`category-featured-tab${isSelected ? " is-active" : ""}`} type="button" role="tab" id={`category-featured-tab-${category.id}`} aria-selected={isSelected} aria-controls="category-featured-panel" key={category.id} onClick={() => setSelectedCategoryId(category.id)}>
                                        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                                        <span>{category.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div id="category-featured-panel" className="category-featured-panel" role="tabpanel" aria-labelledby={`category-featured-tab-${selectedCategory.id}`} tabIndex={0}>
                            {featuredService ? (
                                <FeaturedServicePanel service={featuredService} categoryName={selectedCategory.name} />
                            ) : (
                                <div className="category-featured-empty">
                                    <h3>Ainda não há serviço nem exemplo nesta categoria.</h3>
                                    <p>Quando houver um serviço cadastrado ou um exemplo ilustrativo para esta área, ele aparecerá aqui.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <p className="category-featured-state">{error ? "Não foi possível carregar as categorias e serviços." : "As categorias serão exibidas aqui quando estiverem disponíveis."}</p>
                )}
            </div>
        </section>
    );
}
