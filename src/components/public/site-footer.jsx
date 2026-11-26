import {
    ArrowUpRight,
    BriefcaseBusiness,
    Compass,
    House,
    Layers3,
} from "lucide-react";
import AppLink from "@/components/public/app-link";

const footerGroups = [
    {
        title: "Descobrir",
        links: [
            { label: "Início", to: "/" },
            { label: "Todos os serviços", to: "/servicos" },
            { label: "Categorias", to: "/categorias" },
        ],
    },
    {
        title: "Profissionais",
        links: [
            { label: "Entrar na área", to: "/?auth=demo&mode=login" },
            { label: "Criar cadastro", to: "/?auth=demo&mode=register" },
        ],
    },
    {
        title: "Atalhos",
        links: [
            { label: "Perguntas frequentes", to: "/#perguntas" },
            { label: "Oferecer um serviço", to: "/#profissionais-cta" },
        ],
    },
    {
        title: "Projeto",
        links: [
            { label: "Código-fonte", href: "https://github.com/kleber-goncalves/home-service", external: true },
            { label: "Histórico de alterações", href: "https://github.com/kleber-goncalves/home-service/commits/dev", external: true },
        ],
    },
];

const projectInformation = [
    { label: "Projeto acadêmico", icon: BriefcaseBusiness },
    { label: "Versão demonstrativa", icon: Layers3 },
    { label: "Conexões locais", icon: Compass },
];

export default function SiteFooter() {
    return (
        <footer className="site-footer">
            <div className="site-footer-panel w-full">
                <div className="footer-top">
                    <div className="footer-intro">
                        <AppLink
                            to="/"
                            className="brand brand--footer"
                            aria-label="Conecta Local — início"
                        >
                            <span className="brand-mark" aria-hidden="true">
                                <House size={21} />
                            </span>
                            <span className="brand-name">
                                Conecta <strong>Local</strong>
                            </span>
                        </AppLink>

                        <h2 className="footer-headline">
                            Encontre serviços locais
                            <span>com mais facilidade.</span>
                        </h2>

                        <p className="footer-description">
                            Descubra serviços publicados na sua região e encontre um caminho mais
                            simples para conhecer quem pode ajudar.
                        </p>

                        <div className="footer-project-note">
                            <span className="footer-project-indicator" aria-hidden="true" />
                            Projeto acadêmico <span aria-hidden="true">·</span> versão demonstrativa
                        </div>
                    </div>

                    <div className="footer-cta">
                        <span className="footer-cta-eyebrow">Comece por aqui</span>
                        <h3>O que você precisa hoje?</h3>
                        <p>
                            Explore os serviços disponíveis ou conheça a área demonstrativa
                            destinada aos profissionais.
                        </p>

                        <div className="footer-cta-actions">
                            <AppLink to="/servicos" className="footer-action footer-action--primary">
                                Explorar serviços
                                <ArrowUpRight size={17} aria-hidden="true" />
                            </AppLink>
                            <AppLink
                                to="/?auth=demo&mode=register"
                                className="footer-action footer-action--secondary"
                            >
                                Oferecer um serviço
                                <ArrowUpRight size={17} aria-hidden="true" />
                            </AppLink>
                        </div>
                    </div>
                </div>

                <nav className="footer-directory" aria-label="Links do rodapé">
                    {footerGroups.map((group) => (
                        <div className="footer-nav-column" key={group.title}>
                            <h3>{group.title}</h3>
                            <ul>
                                {group.links.map((link) => (
                                    <li key={link.label}>
                                        {link.external ? (
                                            <a href={link.href} target="_blank" rel="noreferrer">
                                                {link.label}
                                                <ArrowUpRight size={13} aria-hidden="true" />
                                            </a>
                                        ) : (
                                            <AppLink to={link.to}>{link.label}</AppLink>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    <div className="footer-nav-column footer-information">
                        <h3>Sobre o Conecta Local</h3>
                        <ul>
                            {projectInformation.map(({ label, icon: Icon }) => (
                                <li key={label}>
                                    <span>
                                        <Icon size={14} aria-hidden="true" />
                                        {label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>

                <div className="footer-legal">
                    <span>© {new Date().getFullYear()} Conecta Local.</span>
                    <span>Feito para aproximar pessoas e serviços da região.</span>
                </div>
            </div>
        </footer>
    );
}
