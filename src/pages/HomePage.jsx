import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { useState } from "react";
import SiteHeader from "@/components/home/site-header";
import HeroSearch from "@/components/home/hero-search";
import {
    AboutSection,
    FAQSection,
    HowItWorks,
    PopularServices,
    ProfessionalsCTA,
} from "@/components/home/home-sections";
import AppLink from "@/components/public/app-link";
import ServiceCard from "@/components/public/service-card";
import SiteFooter from "@/components/public/site-footer";
import { Button } from "@/components/ui/button";
import usePublicCatalog from "@/hooks/use-public-catalog";
import { navigateTo } from "@/lib/navigation";

export default function HomePage() {
    const catalog = usePublicCatalog();
    const [query, setQuery] = useState("");
    const [city, setCity] = useState("");
    const featuredServices = catalog.services.slice(0, 5);

    function submitSearch(event) {
        event.preventDefault();
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (city.trim()) params.set("cidade", city.trim());
        navigateTo(params.toString() ? `/servicos?${params.toString()}` : "/servicos");
    }

    return (
        <>
            <SiteHeader active="inicio" />
            <main id="conteudo" tabIndex="-1">
                <HeroSearch query={query} city={city} onQueryChange={setQuery} onCityChange={setCity} onSubmit={submitSearch} availableCities={catalog.cities} />

                <section className="public-home-section public-home-services" id="servicos" aria-labelledby="home-services-title">
                    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="public-section-heading">
                            <div>
                                <span className="section-eyebrow">Cadastros publicados</span>
                                <h2 id="home-services-title">Serviços em destaque</h2>
                                <p>Serviços reais publicados por profissionais no catálogo.</p>
                            </div>
                            <AppLink to="/servicos" className="catalog-service-link">
                                Ver todos os serviços <ArrowRight size={16} aria-hidden="true" />
                            </AppLink>
                        </div>
                        {catalog.loading ? (
                            <div className="catalog-state" role="status">
                                Carregando serviços publicados...
                            </div>
                        ) : featuredServices.length ? (
                            <div className="catalog-service-grid">
                                {featuredServices.map((service) => (
                                    <ServiceCard service={service} key={service.id} />
                                ))}
                            </div>
                        ) : (
                            <div className="catalog-state">
                                <h3>{catalog.error ? "Não foi possível carregar os serviços publicados" : "Ainda não há serviços publicados"}</h3>
                                <p>{catalog.error ? "Os exemplos ilustrativos aparecem na próxima seção e não substituem os cadastros reais." : "Enquanto novos serviços não são publicados, conheça os exemplos de apresentação abaixo."}</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="public-home-section public-home-categories" id="categorias" aria-labelledby="home-categories-title">
                    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="public-section-heading">
                            <div>
                                <span className="section-eyebrow">Encontre por categoria</span>
                                <h2 id="home-categories-title">Por onde você quer começar?</h2>
                            </div>
                            <AppLink to="/categorias" className="catalog-service-link">
                                Ver todas as categorias <ArrowRight size={16} aria-hidden="true" />
                            </AppLink>
                        </div>
                        {catalog.loading ? (
                            <p className="catalog-inline-state" role="status">
                                Carregando categorias...
                            </p>
                        ) : catalog.categories.length ? (
                            <div className="home-category-grid">
                                {catalog.categories.slice(0, 3).map((category) => (
                                    <AppLink to={`/servicos?categoria=${encodeURIComponent(category.id)}`} className="home-category-card" key={category.id}>
                                        <span className="home-category-icon">
                                            <BriefcaseBusiness size={22} aria-hidden="true" />
                                        </span>
                                        <span className="home-category-name">{category.name}</span>
                                        <ArrowRight size={17} aria-hidden="true" />
                                    </AppLink>
                                ))}
                            </div>
                        ) : (
                            <p className="catalog-inline-state">{catalog.error ? "Não foi possível carregar as categorias agora." : "As categorias serão exibidas aqui quando estiverem disponíveis."}</p>
                        )}
                    </div>
                </section>

                <PopularServices />
                <AboutSection />
                <HowItWorks />
                <ProfessionalsCTA />
                <FAQSection />

                <section className="public-home-final-cta">
                    <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                        <div>
                            <strong>Está procurando um serviço?</strong>
                            <span>Explore o catálogo completo e use os filtros.</span>
                        </div>
                        <Button type="button" onClick={() => navigateTo("/servicos")}>
                            Explorar serviços <ArrowRight size={16} aria-hidden="true" />
                        </Button>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </>
    );
}
