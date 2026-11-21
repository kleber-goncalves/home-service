import SiteHeader from "@/components/home/site-header";
import SiteFooter from "@/components/public/site-footer";
import AppLink from "@/components/public/app-link";
export default function NotFoundPage() {
    return <>
        <SiteHeader />
        <main className="public-page" id="conteudo" tabIndex="-1">
            <section className="catalog-state catalog-not-found">
                <h1>Página não encontrada</h1>
                <p>O endereço acessado não corresponde a uma página pública do Conecta Local.</p>
                <AppLink to="/" className="catalog-service-link">Voltar ao início</AppLink>
            </section>
        </main>
        <SiteFooter />
    </>;
}
