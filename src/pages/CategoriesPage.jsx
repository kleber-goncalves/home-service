import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import SiteHeader from "@/components/home/site-header";
import SiteFooter from "@/components/public/site-footer";
import AppLink from "@/components/public/app-link";
import usePublicCatalog from "@/hooks/use-public-catalog";

export default function CategoriesPage() {
    const catalog = usePublicCatalog();
    return <>
        <SiteHeader active="categorias" />
        <main className="public-page" id="conteudo" tabIndex="-1">
            <section className="public-page-hero">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                    <span className="section-eyebrow">Explore por categoria</span>
                    <h1>Que tipo de serviço você precisa?</h1>
                    <p>Escolha uma categoria para explorar exemplos fictícios e serviços cadastrados por profissionais.</p>
                </div>
            </section>
            <section className="public-content-section">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                    {catalog.loading ? <div className="catalog-state" role="status">Carregando categorias e exemplos...</div>
                        : catalog.error && catalog.categories.length === 0 ? <div className="catalog-state catalog-state--error" role="alert">Não foi possível carregar as categorias remotas. Atualize a página para tentar novamente.</div>
                            : catalog.categories.length ? <div className="catalog-category-grid">
                                {catalog.categories.map((category) => <article className="catalog-category-card" key={category.id}>
                                    <span className="catalog-category-icon"><BriefcaseBusiness size={22} aria-hidden="true" /></span>
                                    <h2>{category.name}</h2>
                                    <p>Explore todos os serviços disponíveis nesta categoria.</p>
                                    <div className="catalog-category-counts">
                                        <span>{catalog.services.filter((service) => service.categoryId === category.id && !service.isDemo).length} cadastrados</span>
                                        <span>{catalog.services.filter((service) => service.categoryId === category.id && service.isDemo).length} exemplos fictícios</span>
                                    </div>
                                    <AppLink to={`/servicos?categoria=${encodeURIComponent(category.id)}`} className="catalog-service-link">Ver serviços <ArrowRight size={16} aria-hidden="true" /></AppLink>
                                </article>)}
                            </div>
                                : <div className="catalog-state"><h3>Nenhuma categoria ativa encontrada.</h3><p>As categorias disponíveis aparecerão aqui.</p></div>}
                </div>
            </section>
        </main>
        <SiteFooter />
    </>;
}
