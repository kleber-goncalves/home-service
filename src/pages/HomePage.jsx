import { FAQSection, HowSection } from "@/components/home/home-sections";
import AppLink from "@/components/public/app-link";
import HomeFeaturedServiceCard from "@/components/home/featured-service-card";
import SiteFooter from "@/components/public/site-footer";
import usePublicCatalog from "@/hooks/use-public-catalog";
import { navigateTo } from "@/lib/navigation";

export default function HomePage() {
    const catalog = usePublicCatalog();
    const [query, setQuery] = useState("");
    const [city, setCity] = useState("");
    const featuredServices = [
        ...catalog.realServices.slice(0, 3),
        ...catalog.demoServices.slice(0, 3),
    ];

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
                <HowSection />

                <CategoryFeaturedServices categories={catalog.categories} services={catalog.services} loading={catalog.loading} error={catalog.error} />

                <LocalServiceOverview realServices={catalog.realServices} demoServices={catalog.demoServices} categories={catalog.categories} cities={catalog.cities} loading={catalog.loading} error={catalog.error} />

                <section className="public-home-section public-home-services" id="servicos" aria-labelledby="home-services-title">
                    <div className=" w-full px-4 sm:px-6 lg:px-29">
                        <div className="home-featured-services-heading">
                            <h2 id="home-services-title">Serviços para conhecer</h2>
                            <p>Explore serviços publicados e exemplos ilustrativos do Conecta Local.</p>
                        </div>

                        {!catalog.loading && catalog.error && (
                            <p className="catalog-inline-state catalog-inline-state--error" role="status">
                                Não foi possível atualizar os cadastros reais agora; os exemplos fictícios continuam disponíveis.
                            </p>
                        )}

                        {catalog.loading ? (
                            <div className="catalog-state" role="status">
                                Carregando exemplos e serviços cadastrados...
                            </div>
                        ) : featuredServices.length ? (
                            <div className="home-featured-service-grid">
                                {featuredServices.map((service) => (
                                    <HomeFeaturedServiceCard service={service} key={service.id} />
                                ))}
                            </div>
                        ) : (
                            <div className="catalog-state">
                                <h3>Não há serviços disponíveis para exibir.</h3>
                                <p>{catalog.error ? "Não foi possível carregar os cadastros e os exemplos locais estão indisponíveis." : "Os serviços e exemplos aparecerão aqui quando estiverem disponíveis."}</p>
                            </div>
                        )}

                        <div className="home-featured-services-all">
                            <AppLink to="/servicos" className="category-featured-contact">
                                <p>Ver todos os serviços</p> <ArrowRight size={16} aria-hidden="true" />
                            </AppLink>
                        </div>
                    </div>
                </section>

                <FAQSection />
            </main>
            <SiteFooter />
        </>
    );
}
