import { useEffect, useRef, useState } from "react";
import {
    ArrowRight, ChevronDown, House, LogOut, Menu, Search, UserPlus, UserRound, X,
} from "lucide-react";
import AppLink from "@/components/public/app-link";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { navigateTo } from "@/lib/navigation";

function HeaderSearch({ id, className, query, onQueryChange, onSubmit }) {
    return (
        <form
            className={className}
            role="search"
            aria-label="Buscar serviços no catálogo"
            onSubmit={onSubmit}
        >
            <label className="header-search-field" htmlFor={id}>
                <Search size={20} aria-hidden="true" />
                <Input
                    id={id}
                    className="header-search-input"
                    type="search"
                    name="q"
                    placeholder="Buscar serviços..."
                    autoComplete="off"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                />
            </label>
        </form>
    );
}

export default function SiteHeader({ active = "" }) {
    const { user, isLoading, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [headerQuery, setHeaderQuery] = useState(
        () => new URLSearchParams(window.location.search).get("q") || ""
    );
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

        function handleMenuKeyboard(event) {
            if (!accountMenuRef.current?.contains(event.target)) return;

            if (event.key === "Escape") {
                setAccountMenuOpen(false);
                accountTriggerRef.current?.focus();
                return;
            }

            const menuItems = Array.from(
                accountMenuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')
            );
            if (!menuItems.length) return;

            const activeIndex = menuItems.indexOf(document.activeElement);
            let nextIndex = null;

            if (event.key === "ArrowDown") {
                nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % menuItems.length;
            } else if (event.key === "ArrowUp") {
                nextIndex = activeIndex < 0
                    ? menuItems.length - 1
                    : (activeIndex - 1 + menuItems.length) % menuItems.length;
            } else if (event.key === "Home") {
                nextIndex = 0;
            } else if (event.key === "End") {
                nextIndex = menuItems.length - 1;
            } else if (event.key === "Tab") {
                const leavingMenuForward = !event.shiftKey && activeIndex === menuItems.length - 1;
                const leavingMenuBackward = event.shiftKey && (activeIndex === 0 || event.target === accountTriggerRef.current);
                if (leavingMenuForward || leavingMenuBackward) setAccountMenuOpen(false);
            }

            if (nextIndex !== null) {
                event.preventDefault();
                menuItems[nextIndex].focus();
            }
        }

        document.addEventListener("pointerdown", closeOnOutsidePointer);
        document.addEventListener("keydown", handleMenuKeyboard);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutsidePointer);
            document.removeEventListener("keydown", handleMenuKeyboard);
        };
    }, [accountMenuOpen]);

    function submitHeaderSearch(event) {
        event.preventDefault();

        const params = new URLSearchParams();
        const query = headerQuery.trim();
        if (query) params.set("q", query);

        const currentUrl = new URL(window.location.href);
        const currentPath = currentUrl.pathname.replace(/\/+$/, "") || "/";
        if (currentPath === "/servicos") {
            ["categoria", "cidade"].forEach((name) => {
                const value = currentUrl.searchParams.get(name);
                if (value) params.set(name, value);
            });
        }

        const search = params.toString();
        setMenuOpen(false);
        navigateTo(search ? `/servicos?${search}` : "/servicos");
    }

    function closeMobileMenu() {
        setMenuOpen(false);
    }

    function closeServicesDropdown(event) {
        const details = event.currentTarget.closest("details");
        if (details) details.open = false;
        setMenuOpen(false);
    }

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
                <div className="nav-shell flex w-full items-center px-4 sm:px-6 lg:px-8">
                    <AppLink to="/" className="brand" aria-label="Conecta Local — início">
                        <span className="brand-mark" aria-hidden="true"><House size={22} strokeWidth={2.4} /></span>
                        <span className="brand-name">Conecta <strong>Local</strong></span>
                    </AppLink>

                    <nav className="desktop-nav" aria-label="Navegação principal">
                                        <details
                            className="desktop-services-menu"
                            onBlur={(event) => {
                                if (!event.currentTarget.contains(event.relatedTarget)) {
                                    event.currentTarget.open = false;
                                }
                            }}
                        >
                            <summary aria-current={active === "servicos" || active === "categorias" ? "page" : undefined}>
                                Serviços
                                <ChevronDown size={15} aria-hidden="true" />
                            </summary>
                            <div className="services-menu-dropdown">
                                <AppLink
                                    to="/servicos"
                                    aria-current={active === "servicos" ? "page" : undefined}
                                    onClick={closeServicesDropdown}
                                >
                                    Todos os serviços
                                </AppLink>
                                <AppLink
                                    to="/categorias"
                                    aria-current={active === "categorias" ? "page" : undefined}
                                    onClick={closeServicesDropdown}
                                >
                                    Categorias
                                </AppLink>
                            </div>
                        </details>

                        <AppLink to="/?auth=demo&mode=register" className="desktop-provider-link">
                            Seja um profissional
                        </AppLink>
                    </nav>

                    <HeaderSearch
                        id="desktop-header-search"
                        className="header-search desktop-header-search"
                        query={headerQuery}
                        onQueryChange={setHeaderQuery}
                        onSubmit={submitHeaderSearch}
                    />

                    <div className="header-account-area">
                        {isLoading ? (
                            <span className="account-session-placeholder" role="status" aria-label="Verificando sessão" />
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
                                    <span className="account-avatar" aria-hidden="true">
                                        <UserRound size={18} />
                                        {user.photoUrl && <img className="account-avatar-image" src={user.photoUrl} alt="" />}
                                    </span>
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
                            <div className="auth-actions" aria-label="Acesso à conta">
                                <AppLink to="/?auth=demo&mode=login" className="nav-cta">
                                    <UserRound size={16} aria-hidden="true" />
                                    Entrar
                                </AppLink>
                                <AppLink to="/?auth=demo&mode=register" className="nav-cta nav-cta--secondary">
                                    <UserPlus size={16} aria-hidden="true" />
                                    Criar conta
                                </AppLink>
                            </div>
                        )}
                    </div>

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
                    <details className="mobile-services-menu">
                        <summary>
                            Serviços
                            <ChevronDown size={15} aria-hidden="true" />
                        </summary>
                        <div className="mobile-services-dropdown">
                            <AppLink to="/servicos" onClick={closeServicesDropdown}>
                                Todos os serviços
                            </AppLink>
                            <AppLink to="/categorias" onClick={closeServicesDropdown}>
                                Categorias
                            </AppLink>
                        </div>
                    </details>

                    <AppLink to="/?auth=demo&mode=register" onClick={closeMobileMenu}>
                        Seja um profissional <ArrowRight size={15} aria-hidden="true" />
                    </AppLink>

                    <HeaderSearch
                        id="mobile-header-search"
                        className="header-search mobile-header-search"
                        query={headerQuery}
                        onQueryChange={setHeaderQuery}
                        onSubmit={submitHeaderSearch}
                    />

                    {!isLoading && !user && (
                        <div className="mobile-nav-auth-actions" aria-label="Acesso à conta">
                            <AppLink
                                className="mobile-nav-auth-link mobile-nav-auth-link--secondary"
                                to="/?auth=demo&mode=login"
                                onClick={closeMobileMenu}
                            >
                                Entrar
                            </AppLink>
                            <AppLink
                                className="mobile-nav-auth-link"
                                to="/?auth=demo&mode=register"
                                onClick={closeMobileMenu}
                            >
                                Criar conta
                            </AppLink>
                        </div>
                    )}
                    {logoutError && <p className="account-menu-error" role="status">{logoutError}</p>}
                </nav>
            </header>
        </>
    );
}
