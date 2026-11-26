import { useState } from "react";
import { ArrowLeft, BriefcaseBusiness, MapPin, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import SiteHeader from "@/components/home/site-header";
import SiteFooter from "@/components/public/site-footer";
import ServiceImage from "@/components/public/service-image";
import AppLink from "@/components/public/app-link";
import usePublicCatalog from "@/hooks/use-public-catalog";

function createWhatsappUrl(phone, title) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!/^55\d{10,11}$/.test(digits)) return null;
    const message = encodeURIComponent(`Olá! Vi o serviço "${title}" no Conecta Local e gostaria de mais informações.`);
    return `https://wa.me/${digits}?text=${message}`;
}
export default function ServiceDetailPage({ serviceId }) {
    const catalog = usePublicCatalog();
    const [activeIndex, setActiveIndex] = useState(0);
    const service = catalog.services.find((item) => item.id === serviceId);
    const images = service?.images || [];
    const activeImage = images[activeIndex] || null;
    const whatsappUrl = service && !service.isDemo ? createWhatsappUrl(service.whatsapp, service.title) : null;

    return <>
        <SiteHeader active="servicos" />
        <main className="public-page" id="conteudo" tabIndex="-1">
            <section className="public-content-section service-detail-section">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                    <AppLink to="/servicos" className="catalog-back-link"><ArrowLeft size={16} aria-hidden="true" /> Voltar para serviços</AppLink>
                    {catalog.loading ? <div className="catalog-state" role="status">Carregando detalhes do serviço...</div>
                        : catalog.error && !service ? <div className="catalog-state catalog-state--error" role="alert">Não foi possível carregar este serviço agora. Atualize a página para tentar novamente.</div>
                            : !service ? <div className="catalog-state">
                                <h1>Serviço não encontrado</h1>
                                <p>Ele pode ter sido pausado, removido ou não estar mais disponível no catálogo público.</p>
                                <AppLink to="/servicos" className="catalog-service-link">Ver catálogo <ChevronRight size={16} aria-hidden="true" /></AppLink>
                            </div>
                                : <div className="service-detail-layout">
                                    <section className="service-detail-gallery" aria-label={`Galeria de imagens de ${service.title}`}>
                                        <div className="service-detail-main-image">
                                            <ServiceImage key={activeImage?.url || "no-image"} image={activeImage} alt={`Imagem ${activeIndex + 1} do serviço ${service.title}`} className="service-detail-image" loading="eager" />
                                            {images.length > 1 && <>
                                                <button type="button" className="service-gallery-arrow service-gallery-arrow--previous" aria-label="Ver imagem anterior" onClick={() => setActiveIndex((current) => (current - 1 + images.length) % images.length)}><ChevronLeft size={22} aria-hidden="true" /></button>
                                                <button type="button" className="service-gallery-arrow service-gallery-arrow--next" aria-label="Ver próxima imagem" onClick={() => setActiveIndex((current) => (current + 1) % images.length)}><ChevronRight size={22} aria-hidden="true" /></button>
                                                <span className="service-gallery-counter">{activeIndex + 1} de {images.length}</span>
                                            </>}
                                        </div>
                                        {images.length > 1 && <div className="service-gallery-thumbnails" aria-label="Selecionar imagem">
                                            {images.map((image, index) => <button type="button" className={`service-gallery-thumbnail ${index === activeIndex ? "is-active" : ""}`} key={image.id || image.url}
                                                aria-label={`Exibir imagem ${index + 1}`} aria-pressed={index === activeIndex} onClick={() => setActiveIndex(index)}>
                                                <ServiceImage image={image} alt="" />
                                            </button>)}
                                        </div>}
                                    </section>
                                    <section className="service-detail-copy">
                                        <span className="catalog-service-category">{service.category}</span>
                                        {service.isDemo && <span className="service-detail-demo-badge">Exemplo fictício — não representa um cadastro real</span>}
                                        <h1>{service.title}</h1>
                                        <p className="service-detail-description">{service.description}</p>
                                        <div className="service-detail-meta">
                                            <div><MapPin size={17} aria-hidden="true" /><span><strong>Atendimento</strong>{service.cities.length ? service.cities.map((city) => [city.name, city.state].filter(Boolean).join(" - ")).join(", ") : service.cityLabel}</span></div>
                                            <div><BriefcaseBusiness size={17} aria-hidden="true" /><span><strong>Profissional</strong>{service.professionalName}</span></div>
                                        </div>
                                        {whatsappUrl ? <a className="service-contact-button" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> Entrar em contato pelo WhatsApp</a>
                                            : <p className="service-contact-unavailable">{service.isDemo ? "Este é um exemplo fictício: não existe profissional real nem canal de contato associado." : "Este serviço ainda não possui um WhatsApp público disponível."}</p>}
                                        <p className="service-detail-note">{service.isDemo ? "Conteúdo demonstrativo com imagem e informações fictícias, sem vínculo com um profissional real." : "As informações exibidas são as informações públicas disponibilizadas pelo profissional."}</p>
                                    </section>
                                </div>}
                </div>
            </section>
        </main>
        <SiteFooter />
    </>;
}
