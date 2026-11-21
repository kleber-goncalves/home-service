import { ArrowUpRight, House } from "lucide-react";
import AppLink from "@/components/public/app-link";
export default function SiteFooter() {
    return <footer className="site-footer">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="footer-main">
                <div className="footer-brand-block">
                    <AppLink to="/" className="brand brand--footer" aria-label="Conecta Local — início">
                        <span className="brand-mark" aria-hidden="true"><House size={21} /></span><span className="brand-name">Conecta <strong>Local</strong></span>
                    </AppLink>
                    <p>Conectando pessoas e serviços na sua região.</p>
                </div>
                <nav className="footer-nav" aria-label="Navegação do rodapé">
                    <AppLink to="/">Início</AppLink><AppLink to="/servicos">Serviços</AppLink>
                    <AppLink to="/categorias">Categorias</AppLink><AppLink to="/?auth=demo">Área do profissional</AppLink>
                </nav>
                <a className="footer-repository-link" href="https://github.com/kleber-goncalves/home-service" target="_blank" rel="noreferrer">Conheça o projeto <ArrowUpRight size={15} /></a>
            </div>
            <div className="footer-bottom"><span>© {new Date().getFullYear()} Conecta Local.</span><span>Projeto acadêmico — versão demonstrativa.</span></div>
        </div>
    </footer>;
}
