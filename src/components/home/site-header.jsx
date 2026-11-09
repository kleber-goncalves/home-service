import { useState } from "react";
import { ArrowRight, House, Menu, X } from "lucide-react";

const navigation = [
    { label: "Início", href: "#inicio" },
    { label: "Categorias", href: "#categorias" },
    { label: "Serviços", href: "#servicos" },
    { label: "Como funciona", href: "#como-funciona" },
    { label: "Para profissionais", href: "#profissionais-cta" },
];

export default function SiteHeader() {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <>
            <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
            <header className="site-header">
                <div className="nav-shell mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <a className="brand" href="#inicio" aria-label="Conecta Local — início" onClick={() => setMenuOpen(false)}>
                        <span className="brand-mark" aria-hidden="true"><House size={22} strokeWidth={2.4} /></span>
                        <span className="brand-name">Conecta <strong>Local</strong></span>
                    </a>
                    <nav className="desktop-nav" aria-label="Navegação principal">
                        {navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
                    </nav>
                    <a className="nav-cta" href="#categorias">Encontrar serviço <ArrowRight size={16} aria-hidden="true" /></a>
                    <button
                        type="button"
                        className="mobile-menu-toggle"
                        aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-navigation"
                        onClick={() => setMenuOpen((current) => !current)}
                    >
                        {menuOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
                    </button>
                </div>
                <nav id="mobile-navigation" className={`mobile-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação móvel" aria-hidden={!menuOpen}>
                    {navigation.map((item) => (
                        <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                            {item.label}<ArrowRight size={15} aria-hidden="true" />
                        </a>
                    ))}
                    <a className="mobile-nav-cta" href="#categorias" onClick={() => setMenuOpen(false)}>Encontrar serviço</a>
                </nav>
            </header>
        </>
    );
}
