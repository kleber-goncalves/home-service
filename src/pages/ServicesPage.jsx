import { useEffect, useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import SiteHeader from "@/components/home/site-header";
import SiteFooter from "@/components/public/site-footer";
import ServiceCard from "@/components/public/service-card";
import { Button } from "@/components/ui/button";
import usePublicCatalog from "@/hooks/use-public-catalog";
import { filterPublicServices } from "@/lib/public-catalog";

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

export default function ServicesPage() {
    const catalog = usePublicCatalog();
    const [filters, setFilters] = useState(readInitialFilters);
    const filteredServices = useMemo(
        () => filterPublicServices(catalog.services, filters),
        [catalog.services, filters],
    );
    const sourceCounts = useMemo(
        () => filteredServices.reduce((counts, service) => {
            if (service.isDemo) counts.demo += 1;
            else counts.published += 1;
            return counts;
        }, { published: 0, demo: 0 }),
        [filteredServices],
    );

    useEffect(() => {
        const params = new URLSearchParams();
        if (filters.query.trim()) params.set("q", filters.query.trim());
        if (filters.categoryId) params.set("categoria", filters.categoryId);
        if (filters.city.trim()) params.set("cidade", filters.city.trim());
        const search = params.toString();
        window.history.replaceState({}, "", search ? `/servicos?${search}` : "/servicos");
    }, [filters]);

    function updateFilter(name, value) {
        setFilters((current) => ({ ...current, [name]: value }));
    }

    function clearFilters() {
        setFilters({ query: "", categoryId: "", city: "" });
    }

    const hasFilters = Boolean(filters.query.trim() || filters.categoryId || filters.city.trim());

    return (
        <>
            <SiteHeader active="servicos" />
            <main className="public-page services-page" id="conteudo" tabIndex="-1">
                <section className="services-page-hero" aria-labelledby="services-page-title">
                    <div className="w-full px-4 sm:px-6 lg:px-29">
                        <div className="services-page-heading">
                            <div className="services-page-heading-copy">
                                <span className="section-eyebrow">Catálogo Conecta Local</span>
                                <h1 id="services-page-title">
                                    Encontre o serviço certo para cada necessidade.
                                </h1>
                            </div>

                            <div className="services-page-heading-aside">
                                <p>
                                    Explore serviços publicados e exemplos ilustrativos. Pesquise por
                                    necessidade, escolha uma categoria ou encontre opções em sua região.
                                </p>
                                <div className="services-page-summary" aria-live="polite">
                                    <span className="services-page-summary-dot" aria-hidden="true" />
                                    {catalog.loading
                                        ? "Carregando catálogo..."
                                        : `${formatCount(filteredServices.length)} ${filteredServices.length === 1 ? "resultado disponível" : "resultados disponíveis"}`}
                                </div>
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
                                    <span className="services-page-filter-eyebrow">Encontre com facilidade</span>
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
                                <span className="section-eyebrow">Explore as opções</span>
                                <h2>
                                    {catalog.loading
                                        ? "Carregando serviços..."
                                        : `${formatCount(filteredServices.length)} serviço${filteredServices.length === 1 ? "" : "s"} encontrado${filteredServices.length === 1 ? "" : "s"}`}
                                </h2>
                                {!catalog.loading && (
                                    <div className="services-page-source-counts" aria-live="polite">
                                        <span className="services-page-source-count services-page-source-count--published">
                                            <strong>{formatCount(sourceCounts.published)}</strong>
                                            cadastrados
                                        </span>
                                        <span className="services-page-source-count services-page-source-count--demo">
                                            <strong>{formatCount(sourceCounts.demo)}</strong>
                                            exemplos fictícios
                                        </span>
                                    </div>
                                )}
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
                                <div className="catalog-service-grid services-page-service-grid">
                                    {filteredServices.map((service) => (
                                        <ServiceCard service={service} key={service.id} />
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
            </main>
            <SiteFooter />
        </>
    );
}
