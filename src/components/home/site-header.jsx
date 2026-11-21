import { useState } from "react";
import { ArrowRight, House, Menu, UserRound, X } from "lucide-react";
import AppLink from "@/components/public/app-link";
const navigation = [
    { label: "Início", href: "/" }, { label: "Serviços", href: "/servicos" },
    { label: "Categorias", href: "/categorias" }, { label: "Como funciona", href: "/#como-funciona" },
];
export default function SiteHeader({ active = "" }) {
    const [menuOpen, setMenuOpen] = useState(false);
    return <>
        <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
        <header className="site-header">
            <div className="nav-shell mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <AppLink to="/" className="brand" aria-label="Conecta Local — início">
                    <span className="brand-mark" aria-hidden="true"><House size={22} strokeWidth={2.4} /></span><span className="brand-name">Conecta <strong>Local</strong></span>
                </AppLink>
                <nav className="desktop-nav" aria-label="Navegação principal">
                    {navigation.map((item) => {
                        const key = item.href === "/" ? "inicio" : item.href.split("/")[1];
                        return <AppLink key={item.href} to={item.href} aria-current={active === key ? "page" : undefined}>{item.label}</AppLink>;
                    })}
                </nav>
                <AppLink to="/?auth=demo" className="nav-cta">Entrar <UserRound size={16} aria-hidden="true" /></AppLink>
                <button type="button" className="mobile-menu-toggle" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                    aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((current) => !current)}>
                    {menuOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
                </button>
            </div>
            <nav id="mobile-navigation" className={`mobile-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação móvel" aria-hidden={!menuOpen}>
                {navigation.map((item) => <AppLink key={item.href} to={item.href} onClick={() => setMenuOpen(false)}>{item.label}<ArrowRight size={15} aria-hidden="true" /></AppLink>)}
                <AppLink className="mobile-nav-cta" to="/servicos" onClick={() => setMenuOpen(false)}>Encontrar serviço</AppLink>
                <AppLink className="mobile-nav-cta mobile-nav-cta--secondary" to="/?auth=demo" onClick={() => setMenuOpen(false)}>Acessar conta demonstrativa</AppLink>
            </nav>
        </header>
    </>;
}
