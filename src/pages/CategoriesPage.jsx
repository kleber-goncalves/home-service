import {
    ArrowUpRight,
    BriefcaseBusiness,
    Brush,
    Droplets,
    Hammer,
    House,
    Leaf,
    Paintbrush,
    Wrench,
    Zap,
} from "lucide-react";
import SiteHeader from "@/components/home/site-header";
import SiteFooter from "@/components/public/site-footer";
import AppLink from "@/components/public/app-link";
import usePublicCatalog from "@/hooks/use-public-catalog";
import { FAQSection } from "@/components/home/home-sections";

function CategoryIcon({ name }) {
    const normalized = String(name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");

    if (/limpez|faxin/.test(normalized)) return <Brush size={31} strokeWidth={1.55} aria-hidden="true" />;
    if (/eletric/.test(normalized)) return <Zap size={31} strokeWidth={1.55} aria-hidden="true" />;
    if (/hidraul|encan/.test(normalized)) return <Droplets size={31} strokeWidth={1.55} aria-hidden="true" />;
    if (/constr|reform|obra|montag|moveis/.test(normalized)) return <Hammer size={31} strokeWidth={1.55} aria-hidden="true" />;
    if (/pint/.test(normalized)) return <Paintbrush size={31} strokeWidth={1.55} aria-hidden="true" />;
    if (/jardin|paisag/.test(normalized)) return <Leaf size={31} strokeWidth={1.55} aria-hidden="true" />;
    if (/manuten|repar/.test(normalized)) return <Wrench size={31} strokeWidth={1.55} aria-hidden="true" />;
    if (/domestic|residencial|casa/.test(normalized)) return <House size={31} strokeWidth={1.55} aria-hidden="true" />;

    return <BriefcaseBusiness size={31} strokeWidth={1.55} aria-hidden="true" />;
}





export default function CategoriesPage() {
    const catalog = usePublicCatalog();

    return (
        <>
            <SiteHeader active="categorias" />
            <main className="public-page categories-page" id="conteudo" tabIndex="-1">
                <section className="categories-page-hero" aria-labelledby="categories-page-title">
                    <div className=" w-full px-4 sm:px-6 lg:px-29">
                        <div className="categories-page-heading">
                            <div className="categories-page-heading-copy">
                                <h1 id="categories-page-title">
                                    Encontre o serviço certo para o que você precisa.
                                </h1>
                            </div>

                            <div className="categories-page-heading-aside">
                                <p>
                                    Escolha uma categoria e descubra serviços publicados e exemplos
                                    ilustrativos reunidos no Conecta Local.
                                </p>
                               
                            </div>
                        </div>
                    </div>
                </section>

                <section className="categories-page-content" aria-label="Categorias disponíveis">
                    <div className=" w-full px-4 sm:px-6 lg:px-29">
                        {catalog.loading ? (
                            <div className="catalog-state categories-page-state" role="status">
                                Carregando categorias e exemplos...
                            </div>
                        ) : catalog.error && catalog.categories.length === 0 ? (
                            <div className="catalog-state catalog-state--error categories-page-state" role="alert">
                                <h3>Não foi possível carregar as categorias.</h3>
                                <p>Atualize a página para tentar novamente.</p>
                            </div>
                        ) : catalog.categories.length ? (
                            <div className="categories-page-grid">
                                {catalog.categories.map((category) => {
                        

                                    return (
                                        <article className="categories-page-card" key={category.id}>
                                            <div className="categories-page-card-top">
                                                <span className="categories-page-card-icon">
                                                    <CategoryIcon name={category.name} />
                                                </span>
               
                                            </div>

                                            <div className="categories-page-card-copy">
                                                <h2>{category.name}</h2>
                                                <p>
                                                    Explore todos os serviços disponíveis nesta categoria.
                                                </p>
                                            </div>

                                            

                                            <AppLink
                                                to={`/servicos?categoria=${encodeURIComponent(category.id)}`}
                                                className="categories-page-card-link"
                                            >
                                                Explorar categoria
                                                <ArrowUpRight size={18} aria-hidden="true" />
                                            </AppLink>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="catalog-state categories-page-state">
                                <h3>Nenhuma categoria ativa encontrada.</h3>
                                <p>As categorias disponíveis aparecerão aqui quando estiverem disponíveis.</p>
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
