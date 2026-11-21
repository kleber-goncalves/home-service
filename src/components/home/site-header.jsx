import { useEffect, useRef, useState } from "react";
import {
    ArrowRight, ChevronDown, House, LogOut, Menu, UserRound, X,
} from "lucide-react";
import AppLink from "@/components/public/app-link";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
    { label: "Início", href: "/" },
    { label: "Serviços", href: "/servicos" },
    { label: "Categorias", href: "/categorias" },
    { label: "Como funciona", href: "/#como-funciona" },
];

export default function SiteHeader({ active = "" }) {
    const { user, isLoading, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [logoutPending, setLogoutPending] = useState(false);
    const [logoutError, setLogoutError] = useState("");
    const accountMenuRef = useRef(null);
    const accountTriggerRef = useRef(null);

    useEffect(() => {
        if (!accountMenuOpen) return undefined;

        function closeOnOutsidePointer(event) {
            if (!accountMenuRef.current?.contains(event.target)) {
                setAccountMenuOpen(false);
            }
        }

        function closeOnEscape(event) {
            if (event.key === "Escape") {
                setAccountMenuOpen(false);
                accountTriggerRef.current?.focus();
            }
        }

        document.addEventListener("pointerdown", closeOnOutsidePointer);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutsidePointer);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [accountMenuOpen]);

    async function handleLogout() {
        setLogoutError("");
        setLogoutPending(true);
        try {
            await logout();
            setAccountMenuOpen(false);
            setMenuOpen(false);
        } catch (error) {
            setLogoutError(error.message || "Não foi possível encerrar a sessão.");
        } finally {
            setLogoutPending(false);
        }
    }

    return (
        <>
            <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
            <header className="site-header">
                <div className="nav-shell mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <AppLink to="/" className="brand" aria-label="Conecta Local — início">
                        <span className="brand-mark" aria-hidden="true"><House size={22} strokeWidth={2.4} /></span>
                        <span className="brand-name">Conecta <strong>Local</strong></span>
                    </AppLink>

                    <nav className="desktop-nav" aria-label="Navegação principal">
                        {navigation.map((item) => {
                            const key = item.href === "/" ? "inicio" : item.href.split("/")[1];
                            return (
                                <AppLink
                                    key={item.href}
                                    to={item.href}
                                    aria-current={active === key ? "page" : undefined}
                                >
                                    {item.label}
                                </AppLink>
                            );
                        })}
                    </nav>

                    {isLoading ? (
                        <span className="account-session-placeholder" aria-label="Verificando sessão" />
                    ) : user ? (
                        <div className="account-menu" ref={accountMenuRef}>
                            <button
                                ref={accountTriggerRef}
                                type="button"
                                className="account-menu-trigger"
                                aria-haspopup="menu"
                                aria-expanded={accountMenuOpen}
                                aria-controls="account-menu-dropdown"
                                onClick={() => {
                                    setLogoutError("");
                                    setAccountMenuOpen((current) => !current);
                                }}
                            >
                                <span className="account-avatar" aria-hidden="true"><UserRound size={18} /></span>
                                <span className="account-menu-name">{user.publicName || user.fullName || "Minha conta"}</span>
                                <ChevronDown className={accountMenuOpen ? "is-rotated" : ""} size={16} aria-hidden="true" />
                            </button>

                            {accountMenuOpen && (
                                <div id="account-menu-dropdown" className="account-menu-dropdown" role="menu" aria-label="Menu da conta">
                                    <AppLink
                                        to="/?auth=demo"
                                        role="menuitem"
                                        onClick={() => {
                                            setAccountMenuOpen(false);
                                            setMenuOpen(false);
                                        }}
                                    >
                                        <UserRound size={16} aria-hidden="true" />
                                        Minha conta
                                    </AppLink>
                                    <button type="button" role="menuitem" onClick={handleLogout} disabled={logoutPending}>
                                        <LogOut size={16} aria-hidden="true" />
                                        {logoutPending ? "Saindo..." : "Sair"}
                                    </button>
                                    {logoutError && <p className="account-menu-error" role="status">{logoutError}</p>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <AppLink to="/?auth=demo" className="nav-cta">
                            Entrar <UserRound size={16} aria-hidden="true" />
                        </AppLink>
                    )}

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

                <nav
                    id="mobile-navigation"
                    className={"mobile-nav" + (menuOpen ? " is-open" : "")}
                    aria-label="Navegação móvel"
                    aria-hidden={!menuOpen}
                >
                    {navigation.map((item) => (
                        <AppLink key={item.href} to={item.href} onClick={() => setMenuOpen(false)}>
                            {item.label}<ArrowRight size={15} aria-hidden="true" />
                        </AppLink>
                    ))}
                    <AppLink className="mobile-nav-cta" to="/servicos" onClick={() => setMenuOpen(false)}>
                        Encontrar serviço
                    </AppLink>
                    {!isLoading && !user && (
                        <AppLink
                            className="mobile-nav-cta mobile-nav-cta--secondary"
                            to="/?auth=demo"
                            onClick={() => setMenuOpen(false)}
                        >
                            Entrar ou criar conta
                        </AppLink>
                    )}
                    {logoutError && <p className="account-menu-error" role="status">{logoutError}</p>}
                </nav>
            </header>
        </>
    );
}
