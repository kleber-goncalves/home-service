import { ArrowRight, ArrowUpRight, Check, ChevronDown, House, MapPin, MessageCircle, Search, Users, UserRoundSearch, BriefcaseBusiness, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categories, frequentlyAskedQuestions, popularServices } from "@/data/homepage";

function SectionHeading({ eyebrow, title, description, align = "left" }) {
    return (
        <div className={`section-heading section-heading--${align}`}>
            {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
            {description && <p>{description}</p>}
        </div>
    );
}

export function CategorySection({ selectedCategory, onSelect }) {
    return (
        <section className="category-section" id="categorias" aria-labelledby="category-title">
            <div className="category-inner mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="category-heading">
                    <span className="section-eyebrow">Encontre por categoria</span>
                    <h2 className="sr-only" id="category-title">Explore os tipos de serviço</h2>
                </div>
                <div className="category-scroller" aria-label="Filtrar exemplos por categoria">
                    <button type="button" className={`category-chip ${selectedCategory === "todas" ? "is-active" : ""}`} aria-pressed={selectedCategory === "todas"} onClick={() => onSelect("todas")}>Todas</button>
                    {categories.map(({ id, label, icon: Icon }) => (
                        <button type="button" className={`category-chip ${selectedCategory === label ? "is-active" : ""}`} key={id} aria-pressed={selectedCategory === label} onClick={() => onSelect(label)}>
                            <Icon size={18} strokeWidth={1.9} aria-hidden="true" />{label}
                        </button>
                    ))}
                </div>
                <a className="category-more" href="#profissionais">Ver exemplos <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
        </section>
    );
}

function ProfessionalCard({ professional }) {
    return (
        <Card className="professional-card">
            <div className="professional-photo">
                <img src={professional.image} alt={professional.imageAlt} loading="lazy" />
                <Badge variant="demo">Exemplo</Badge>
            </div>
            <CardContent className="professional-card-content">
                <span className="professional-category">{professional.category}</span>
                <h3>{professional.title}</h3>
                <p>{professional.description}</p>
                <div className="professional-card-meta"><MapPin size={14} aria-hidden="true" /><span>Região não informada</span></div>
                <a className="professional-card-link" href="#como-funciona">Como funciona <ArrowRight size={15} aria-hidden="true" /></a>
            </CardContent>
        </Card>
    );
}

export function ProfessionalSection({ professionals, hasSearched, query, city, selectedCategory, onClearFilters }) {
    const hasFilters = hasSearched || selectedCategory !== "todas";
    return (
        <section className="professionals-section section-space" id="profissionais" aria-labelledby="professionals-title">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="professionals-topline">
                    <SectionHeading eyebrow="Possibilidades para sua região" title="Conheça os exemplos de perfil" description="Veja como os serviços poderão ser apresentados quando os profissionais começarem a criar seus perfis." />
                    <span className="demo-disclaimer"><span aria-hidden="true" />Conteúdo demonstrativo</span>
                </div>
                {hasFilters && (
                    <div className="results-feedback" aria-live="polite">
                        <div>
                            <strong>{professionals.length} exemplo{professionals.length === 1 ? "" : "s"} encontrado{professionals.length === 1 ? "" : "s"}</strong>
                            <span>
                                {query.trim() ? ` Busca por “${query.trim()}”.` : selectedCategory !== "todas" ? ` Categoria: ${selectedCategory}.` : " Filtro demonstrativo aplicado."}
                                {city.trim() ? ` Localidade informada: ${city.trim()}; o filtro geográfico ainda não está conectado.` : ""}
                            </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClearFilters}>Limpar filtros</Button>
                    </div>
                )}
                {professionals.length ? (
                    <div className="professional-grid">{professionals.map((person) => <ProfessionalCard key={person.id} professional={person} />)}</div>
                ) : (
                    <div className="empty-results">
                        <h3>Nenhum exemplo encontrado</h3>
                        <p>Tente outra palavra ou escolha uma categoria diferente. A busca ainda não consulta profissionais reais.</p>
                        <Button variant="outline" onClick={onClearFilters}>Limpar busca</Button>
                    </div>
                )}
                <p className="photo-credit-note">As imagens são ilustrativas e não representam profissionais cadastrados no Conecta Local.</p>
            </div>
        </section>
    );
}

export function PopularServices() {
    return (
        <section className="popular-section section-space" id="servicos">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="popular-layout">
                    <div className="popular-intro">
                        <span className="section-eyebrow">Serviços do dia a dia</span>
                        <h2>Pequenos cuidados que fazem diferença.</h2>
                        <p>Uma vitrine organizada para facilitar a descoberta de soluções para sua casa e sua rotina.</p>
                    </div>
                    <ul className="popular-list">
                        {popularServices.map((service) => <li key={service}><span className="popular-check"><Check size={14} aria-hidden="true" /></span>{service}</li>)}
                    </ul>
                    <div className="popular-image">
                        <img src="https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Profissional realizando um reparo hidráulico." loading="lazy" />
                        <span>Exemplo visual de serviço</span>
                    </div>
                    <div className="popular-aside">
                        <span className="popular-aside-number">01 / 03</span>
                        <h3>Encontre o serviço certo para sua necessidade.</h3>
                        <p>Pesquise por categoria e conheça a proposta do Conecta Local.</p>
                        <a href="#categorias" className="text-link">Explorar categorias <ArrowRight size={16} aria-hidden="true" /></a>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function AboutSection() {
    return (
        <section className="about-section section-space" id="sobre">
            <div className="mx-auto grid w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="about-copy">
                    <SectionHeading eyebrow="Sobre o Conecta Local" title="Uma ponte entre quem precisa e quem sabe fazer." description="O Conecta Local nasce com uma ideia simples: organizar a descoberta de serviços e dar mais visibilidade a profissionais autônomos e pequenos empreendedores da região." />
                    <div className="about-points">
                        <div><span className="about-point-icon"><MapPin size={19} /></span><span><strong>Olhar local</strong><small>Serviços organizados por região e área de atendimento.</small></span></div>
                        <div><span className="about-point-icon"><Users size={19} /></span><span><strong>Mais visibilidade</strong><small>Um espaço para apresentar serviços de forma clara.</small></span></div>
                        <div><span className="about-point-icon"><House size={19} /></span><span><strong>Contato direto</strong><small>A proposta é aproximar pessoas e profissionais.</small></span></div>
                    </div>
                    <a className="text-link" href="#como-funciona">Entenda a proposta <ArrowUpRight size={16} aria-hidden="true" /></a>
                </div>
                <div className="about-gallery" aria-label="Imagens ilustrativas de serviços">
                    <figure className="about-gallery-main">
                        <img src="https://images.pexels.com/photos/27176671/pexels-photo-27176671.jpeg?auto=compress&cs=tinysrgb&w=1000" alt="Pessoa cuidando da limpeza de uma sala." loading="lazy" />
                        <figcaption>Cuidados com o lar</figcaption>
                    </figure>
                    <figure className="about-gallery-top">
                        <img src="https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Profissional pintando uma parede." loading="lazy" />
                        <figcaption>Manutenção</figcaption>
                    </figure>
                    <figure className="about-gallery-bottom">
                        <img src="https://images.pexels.com/photos/27176054/pexels-photo-27176054.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Mãos com luvas cuidando de plantas no jardim." loading="lazy" />
                        <figcaption>Jardinagem</figcaption>
                    </figure>
                    <div className="about-gallery-note"><strong>Conexões que começam perto.</strong><span>Imagem e composição demonstrativas.</span></div>
                </div>
            </div>
        </section>
    );
}

export function HowItWorks() {
    const steps = [
        { number: "01", icon: Search, title: "Busque o serviço", description: "Escolha uma categoria ou descreva o que você precisa." },
        { number: "02", icon: UserRoundSearch, title: "Conheça as opções", description: "Veja os detalhes públicos e conheça a apresentação de cada serviço." },
        { number: "03", icon: MessageCircle, title: "Entre em contato", description: "Fale diretamente com o profissional pelos canais que ele divulgar." },
    ];
    return (
        <section className="how-section section-space" id="como-funciona">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionHeading eyebrow="Uma jornada simples" title="Como o Conecta Local vai funcionar?" description="A ideia é deixar o caminho entre a sua necessidade e o contato com o profissional mais claro." align="center" />
                <div className="steps-grid">
                    {steps.map(({ number, icon: Icon, title, description }, index) => (
                        <article className="step-card" key={number}>
                            <div className="step-topline"><span className="step-number">{number}</span><span className="step-icon"><Icon size={21} /></span></div>
                            <h3>{title}</h3><p>{description}</p>
                            {index < 2 && <ArrowRight className="step-arrow" size={20} aria-hidden="true" />}
                        </article>
                    ))}
                </div>
                <p className="steps-note">Este fluxo representa a experiência planejada. A busca e o contato ainda não estão integrados a cadastros reais.</p>
            </div>
        </section>
    );
}

export function ProfessionalsCTA() {
    return (
        <section className="professionals-cta-section section-space" id="profissionais-cta">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="professionals-cta-card">
                    <div className="professionals-cta-copy">
                        <span className="cta-eyebrow"><BriefcaseBusiness size={16} />Para quem oferece serviços</span>
                        <h2>Seu trabalho merece ser encontrado.</h2>
                        <p>O Conecta Local quer criar um espaço para profissionais apresentarem seus serviços e se aproximarem de novos clientes.</p>
                        <a className="cta-button" href="#sobre">Conheça a proposta <ArrowRight size={17} /></a>
                        <span className="cta-note"><CheckCircle2 size={15} />Cadastro de profissionais ainda não disponível</span>
                    </div>
                    <div className="professionals-cta-image">
                        <img src="https://images.pexels.com/photos/27928762/pexels-photo-27928762.jpeg?auto=compress&cs=tinysrgb&w=1000" alt="Imagem ilustrativa de profissional executando um serviço." loading="lazy" />
                        <span>Profissionais e pequenos negócios</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function FAQSection() {
    return (
        <section className="faq-section section-space" id="perguntas">
            <div className="mx-auto grid w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="faq-intro">
                    <SectionHeading eyebrow="Dúvidas comuns" title="Perguntas frequentes" description="Entenda o que já está disponível e o que ainda faz parte das próximas etapas." />
                    <p className="faq-contact">Não encontrou sua dúvida? Acompanhe a evolução do projeto pelo repositório.</p>
                    <a className="text-link" href="https://github.com/kleber-goncalves/home-service" target="_blank" rel="noreferrer">Acessar o projeto <ChevronDown size={15} /></a>
                </div>
                <div className="faq-list">
                    {frequentlyAskedQuestions.map((item, index) => (
                        <details className="faq-item" key={item.question} open={index === 0}>
                            <summary><span>{item.question}</span><ChevronDown size={18} /></summary>
                            <div className="faq-answer">{item.answer}</div>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function SiteFooter() {
    const links = [
        ["Início", "#inicio"], ["Categorias", "#categorias"], ["Sobre", "#sobre"],
        ["Como funciona", "#como-funciona"], ["Perguntas frequentes", "#perguntas"],
    ];
    return (
        <footer className="site-footer">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="footer-main">
                    <div className="footer-brand-block">
                        <a className="brand brand--footer" href="#inicio"><span className="brand-mark"><House size={21} /></span><span className="brand-name">Conecta <strong>Local</strong></span></a>
                        <p>Conectando pessoas e serviços na sua região.</p>
                    </div>
                    <nav className="footer-nav" aria-label="Navegação do rodapé">
                        {links.map(([label, href]) => <a href={href} key={href}>{label}</a>)}
                    </nav>
                    <a className="footer-repository-link" href="https://github.com/kleber-goncalves/home-service" target="_blank" rel="noreferrer">Conheça o projeto <ArrowUpRight size={15} /></a>
                </div>
                <div className="footer-bottom"><span>© {new Date().getFullYear()} Conecta Local.</span><span>Projeto acadêmico — versão demonstrativa.</span></div>
            </div>
        </footer>
    );
}
