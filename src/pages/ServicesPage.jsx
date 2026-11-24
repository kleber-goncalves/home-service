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
    return { query: params.get("q") || "", categoryId: params.get("categoria") || "", city: params.get("cidade") || "" };
}
export default function ServicesPage() {
    const catalog = usePublicCatalog();
    const [filters, setFilters] = useState(readInitialFilters);
    const filteredServices = useMemo(() => filterPublicServices(catalog.services, filters), [catalog.services, filters]);

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

    return <>
        <SiteHeader active="servicos" />
        <main className="public-page" id="conteudo" tabIndex="-1">
            <section className="public-page-hero">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                    <span className="section-eyebrow">Descubra opções na sua região</span>
                    <h1>Encontre o serviço que você procura.</h1>
                    <p>Pesquise por necessidade, categoria ou localidade. O catálogo reúne exemplos fictícios e serviços cadastrados.</p>
                </div>
            </section>
            <section className="public-content-section">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                    <form className="catalog-filter-panel" role="search" onSubmit={(event) => event.preventDefault()}>
                        <label className="catalog-filter-field catalog-filter-field--search">
                            <span>Pesquisar serviços</span>
                            <span className="catalog-filter-input-wrap"><Search size={17} aria-hidden="true" /><input type="search" value={filters.query} onChange={(event) => updateFilter("query", event.target.value)} placeholder="Ex.: instalação elétrica, limpeza..." /></span>
                        </label>
                        <label className="catalog-filter-field">
                            <span>Categoria</span>
                            <select value={filters.categoryId} onChange={(event) => updateFilter("categoryId", event.target.value)}>
                                <option value="">Todas as categorias</option>
                                {catalog.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                            </select>
                        </label>
                        <label className="catalog-filter-field">
                            <span>Cidade ou região</span>
                            <input type="search" list="catalog-city-options" value={filters.city} onChange={(event) => updateFilter("city", event.target.value)} placeholder="Ex.: Capelinha - MG" />
                            <datalist id="catalog-city-options">{catalog.cities.map((city) => <option key={city.id} value={city.name + " - " + city.state} />)}</datalist>
                        </label>
                        <Button type="button" variant="outline" onClick={clearFilters} disabled={!hasFilters}><X size={15} aria-hidden="true" /> Limpar</Button>
                    </form>
                    <div className="catalog-results-heading">
                        <div>
                            <span className="section-eyebrow">Catálogo público</span>
                            <h2>{catalog.loading ? "Carregando serviços..." : `${filteredServices.length} serviço${filteredServices.length === 1 ? "" : "s"} encontrado${filteredServices.length === 1 ? "" : "s"}`}</h2>
                            {!catalog.loading && (
                                <div className="catalog-source-counts" aria-live="polite">
                                    <span>{filteredServices.filter((service) => !service.isDemo).length} cadastrados</span>
                                    <span>{filteredServices.filter((service) => service.isDemo).length} exemplos fictícios</span>
                                </div>
                            )}
                        </div>
                        <span className="catalog-results-note"><Filter size={14} aria-hidden="true" />Filtros atualizados automaticamente</span>
                    </div>
                    {catalog.loading ? <div className="catalog-state" role="status">Carregando exemplos e serviços cadastrados...</div>
                        : filteredServices.length ? <>
                            {catalog.error && (
                                <p className="catalog-inline-state catalog-inline-state--error" role="status">
                                    Não foi possível atualizar os serviços cadastrados. Os exemplos fictícios locais continuam disponíveis.
                                </p>
                            )}
                            <div className="catalog-service-grid">{filteredServices.map((service) => <ServiceCard service={service} key={service.id} />)}</div>
                        </>
                            : <div className="catalog-state">
                                <h3>Nenhum serviço corresponde aos filtros.</h3>
                                <p>Experimente outra palavra, remova a localidade ou limpe os filtros. Os exemplos fictícios não são associados a cidades reais.</p>
                                {hasFilters && <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>}
                            </div>}
                </div>
            </section>
        </main>
        <SiteFooter />
    </>;
}
