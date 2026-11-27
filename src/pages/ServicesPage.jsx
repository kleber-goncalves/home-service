import { useEffect, useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import SiteHeader from "@/components/home/site-header";
import SiteFooter from "@/components/public/site-footer";
import HomeFeaturedServiceCard from "@/components/home/featured-service-card";
import { Button } from "@/components/ui/button";
import usePublicCatalog from "@/hooks/use-public-catalog";
import { filterPublicServices } from "@/lib/public-catalog";
import { FAQSection } from "@/components/home/home-sections";

function readInitialFilters() {
    const params = new URLSearchParams(window.location.search);
    return {
        query: params.get("q") || "",
        categoryId: params.get("categoria") || "",
        city: params.get("cidade") || "",
    };
}

function formatCount(value) {
    return new Intl.NumberFormat("pt-BR").format(value);
}

function buildServicesHref({ query = "", categoryId = "", city = "" }) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryId) params.set("categoria", categoryId);
    if (city.trim()) params.set("cidade", city.trim());
    const search = params.toString();
    return search ? `/servicos?${search}` : "/servicos";
}

export default function ServicesPage() {
    const catalog = usePublicCatalog();
    const [filters, setFilters] = useState(readInitialFilters);
    const filteredServices = useMemo(
        () => filterPublicServices(catalog.services, filters),
        [catalog.services, filters],
    );

    useEffect(() => {
        window.history.replaceState({}, "", buildServicesHref(filters));
    }, [filters]);

    function updateFilter(name, value) {
        setFilters((current) => ({ ...current, [name]: value }));
    }

    function clearFilters() {
        setFilters({ query: "", categoryId: "", city: "" });
    }

    const hasFilters = Boolean(filters.query.trim() || filters.categoryId || filters.city.trim());
    const demoHref = buildServicesHref(filters);

    return (
        <>
            <SiteHeader active="servicos" />
            <main className="public-page services-page" id="conteudo" tabIndex="-1">
                <section className="services-page-hero" aria-labelledby="services-page-title">
                    <div className="w-full px-4 sm:px-6 lg:px-29">
                        <div className="services-page-heading">
                            <div className="services-page-heading-copy">

                                <h1 id="services-page-title">
                                    Encontre o serviço certo para cada necessidade.
                                </h1>
                            </div>

                            <div className="services-page-heading-aside">
                                <p>
                                    Explore serviços publicados e exemplos ilustrativos. Pesquise por
                                    necessidade, escolha uma categoria ou encontre opções em sua região.
                                </p>
                               
                            </div>
                        </div>
                    </div>
                </section>

                <section className="services-page-content" aria-label="Pesquisar e explorar serviços">
                    <div className=" w-full px-4 sm:px-6 lg:px-29">
                        <form
                            className="services-page-filter-panel"
                            role="search"
                            onSubmit={(event) => event.preventDefault()}
                        >
                            <div className="services-page-filter-heading">
                                <div>
                                   
                                    <h2>Refine sua busca</h2>
                                    <p>Combine os filtros para chegar mais rápido ao serviço que procura.</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={clearFilters}
                                    disabled={!hasFilters}
                                    className="services-page-clear-button"
                                >
                                    <X size={15} aria-hidden="true" />
                                    Limpar filtros
                                </Button>
                            </div>

                            <div className="services-page-filter-grid">
                                <label className="services-page-filter-field services-page-filter-field--search">
                                    <span>O que você procura?</span>
                                    <span className="services-page-filter-input-wrap">
                                        <Search size={18} aria-hidden="true" />
                                        <input
                                            type="search"
                                            value={filters.query}
                                            onChange={(event) => updateFilter("query", event.target.value)}
                                            placeholder="Ex.: instalação elétrica, limpeza..."
                                        />
                                    </span>
                                </label>

                                <label className="services-page-filter-field">
                                    <span>Categoria</span>
                                    <select
                                        value={filters.categoryId}
                                        onChange={(event) => updateFilter("categoryId", event.target.value)}
                                    >
                                        <option value="">Todas as categorias</option>
                                        {catalog.categories.map((category) => (
                                            <option value={category.id} key={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="services-page-filter-field">
                                    <span>Cidade ou região</span>
                                    <input
                                        type="search"
                                        list="catalog-city-options"
                                        value={filters.city}
                                        onChange={(event) => updateFilter("city", event.target.value)}
                                        placeholder="Ex.: Capelinha - MG"
                                    />
                                    <datalist id="catalog-city-options">
                                        {catalog.cities.map((city) => (
                                            <option key={city.id} value={city.name + " - " + city.state} />
                                        ))}
                                    </datalist>
                                </label>
                            </div>
                        </form>

                        <div className="services-page-results-heading">
                            <div className="services-page-results-copy">
                              
                                <h2>
                                    {catalog.loading
                                        ? "Carregando serviços..."
                                        : `${formatCount(filteredServices.length)} serviço${filteredServices.length === 1 ? "" : "s"} encontrado${filteredServices.length === 1 ? "" : "s"}`}
                                </h2>
                               
                            </div>
                            <span className="services-page-results-note">
                                <Filter size={15} aria-hidden="true" />
                                Resultados atualizados automaticamente
                            </span>
                        </div>

                        {catalog.loading ? (
                            <div className="catalog-state services-page-state" role="status">
                                Carregando exemplos e serviços cadastrados...
                            </div>
                        ) : filteredServices.length ? (
                            <>
                                {catalog.error && (
                                    <p className="catalog-inline-state catalog-inline-state--error services-page-inline-error" role="status">
                                        Não foi possível atualizar os serviços cadastrados. Os exemplos fictícios locais continuam disponíveis.
                                    </p>
                                )}
                                <div className="home-featured-service-grid">
                                    {filteredServices.map((service) => (
                                        <HomeFeaturedServiceCard
                                            service={service}
                                            demoHref={demoHref}
                                            key={service.id}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="catalog-state services-page-state">
                                <h3>Nenhum serviço corresponde aos filtros.</h3>
                                <p>
                                    Experimente outra palavra, remova a localidade ou limpe os filtros.
                                    Os exemplos fictícios não são associados a cidades reais.
                                </p>
                                {hasFilters && (
                                    <Button
                                        variant="outline"
                                        onClick={clearFilters}
                                        className="services-page-empty-action"
                                    >
                                        Limpar filtros
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </section>
                 <FAQSection />
            </main>
            <SiteFooter />
        </>
    );
}
