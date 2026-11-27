import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { BriefcaseBusiness, Check, ImageIcon, MapPin, Tags, Wrench } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { DonutChart, HorizontalBarChart } from "@/components/ui/chart";

const DEMO_STATUS = [
    { label: "Publicados", value: 17, color: "#2563eb" },
    { label: "Em pausa", value: 5, color: "#d8a344" },
    { label: "Rascunhos", value: 4, color: "#93a4b8" },
    { label: "Suspensos", value: 1, color: "#c66b6b" },
    { label: "Removidos", value: 1, color: "#cbd5e1" },
];

const DEMO_CATEGORIES = [
    { label: "Elétrica", value: 8, color: "#2563eb" },
    { label: "Hidráulica", value: 6, color: "#4d7fe0" },
    { label: "Pintura", value: 5, color: "#7297e5" },
    { label: "Montagem", value: 4, color: "#91afe9" },
    { label: "Jardinagem", value: 3, color: "#adc2eb" },
    { label: "Limpeza", value: 2, color: "#c2d0e7" },
];

const DEMO_CITIES = [
    { label: "Nova Aurora", value: 8, color: "#2563eb" },
    { label: "Santa Clara", value: 6, color: "#4d7fe0" },
    { label: "Vale Verde", value: 5, color: "#7297e5" },
    { label: "Jardim Alto", value: 4, color: "#91afe9" },
    { label: "Campo Novo", value: 3, color: "#adc2eb" },
    { label: "Bela Vista", value: 2, color: "#c2d0e7" },
];

const DEMO_IMAGES = [
    { label: "Com imagem", value: 21, color: "#16a36a" },
    { label: "Sem imagem", value: 7, color: "#cbd5e1" },
];

const DEMO_KPIS = [
    { label: "Serviços cadastrados", value: "28", detail: "Registros de demonstração", icon: BriefcaseBusiness },
    { label: "Publicados", value: "17", detail: "Disponíveis na vitrine", icon: Check },
    { label: "Em pausa", value: "5", detail: "Podem ser reativados", icon: Wrench },
    { label: "Cidades atendidas", value: "6", detail: "Localidades de exemplo", icon: MapPin },
];

export default function DashboardVisualPreviewPage() {
    const contentRef = useRef(null);

    useLayoutEffect(() => {
        const content = contentRef.current;
        const prefersReducedMotion = typeof window !== "undefined"
            && typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!content || prefersReducedMotion) return undefined;

        const context = gsap.context(() => {
            const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
            timeline.fromTo(
                ".dashboard-visual-preview-heading",
                { autoAlpha: 0, y: 16 },
                { autoAlpha: 1, y: 0, duration: 0.45 },
            );
            timeline.fromTo(
                ".dashboard-visual-preview-banner",
                { autoAlpha: 0, y: 12 },
                { autoAlpha: 1, y: 0, duration: 0.35 },
                "-=0.2",
            );
            timeline.fromTo(
                ".dashboard-visual-preview .professional-dashboard-kpi",
                { autoAlpha: 0, y: 18 },
                { autoAlpha: 1, y: 0, duration: 0.38, stagger: 0.07 },
                "-=0.12",
            );
            timeline.fromTo(
                ".dashboard-visual-preview .pro-dashboard-chart-card",
                { autoAlpha: 0, y: 20 },
                { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.09 },
                "-=0.08",
            );
        }, content);

        return () => context.revert();
    }, []);

    return (
        <main className="professional-dashboard dashboard-visual-preview">
            <aside className="professional-dashboard-sidebar" aria-label="Prévia da navegação profissional">
                <a className="professional-dashboard-brand" href="/" aria-label="Conecta Local — início">
                    <span className="professional-dashboard-brand-mark"><BriefcaseBusiness size={19} aria-hidden="true" /></span>
                    <span>Conecta <strong>Local</strong></span>
                </a>
                <div className="professional-dashboard-nav-heading">PRÉVIA DE INTERFACE</div>
                <nav className="professional-dashboard-nav" aria-label="Seção demonstrativa">
                    <div className="professional-dashboard-nav-item is-active" aria-current="page">
                        <BriefcaseBusiness size={18} aria-hidden="true" />
                        <span>Visão geral</span>
                    </div>
                </nav>
                <div className="professional-dashboard-sidebar-spacer" />
                <div className="professional-dashboard-sidebar-foot">Dados fictícios · Somente visual</div>
            </aside>

            <div className="professional-dashboard-main">
                <header className="professional-dashboard-topbar">
                    <div className="professional-dashboard-topbar-left">
                        <span className="professional-dashboard-topbar-label">PAINEL DO PROFISSIONAL · PRÉVIA</span>
                    </div>
                    <span className="professional-dashboard-connected">AMOSTRA VISUAL</span>
                </header>

                <div ref={contentRef} className="professional-dashboard-content">
                    <div className="professional-dashboard-page-heading dashboard-visual-preview-heading">
                        <div>
                            <span className="section-eyebrow">REVISÃO DE DESIGN</span>
                            <h1>Visão geral do profissional</h1>
                            <p>Uma amostra ampliada para avaliar tamanho, hierarquia, legibilidade e interação dos gráficos.</p>
                        </div>
                    </div>

                    <div className="dashboard-visual-preview-banner" role="note">
                        <span>DADOS FICTÍCIOS</span>
                        <p>Os números e distribuições desta página são apenas uma massa de teste visual. Não representam uma conta real e não são enviados ao backend.</p>
                    </div>

                    <section className="professional-dashboard-overview" aria-label="Prévia da visão geral">
                        <div className="professional-dashboard-kpis">
                            {DEMO_KPIS.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article className="professional-dashboard-kpi" key={item.label}>
                                        <span className="professional-dashboard-kpi-icon"><Icon size={17} aria-hidden="true" /></span>
                                        <span className="professional-dashboard-kpi-label">{item.label}</span>
                                        <strong>{item.value}</strong>
                                        <small>{item.detail}</small>
                                        <span className="dashboard-visual-preview-source">Amostra</span>
                                    </article>
                                );
                            })}
                        </div>

                        <div className="professional-dashboard-analytics-grid">
                            <Card className="pro-dashboard-chart-card pro-dashboard-chart-card--status">
                                <CardHeader className="pro-dashboard-chart-header">
                                    <div>
                                        <span className="professional-dashboard-card-eyebrow">DADOS DA CONTA</span>
                                        <CardTitle className="pro-dashboard-chart-title">Situação dos serviços</CardTitle>
                                        <CardDescription className="pro-dashboard-chart-description">Distribuição dos 28 serviços de exemplo por status.</CardDescription>
                                    </div>
                                    <span className="professional-dashboard-card-icon"><BriefcaseBusiness size={18} aria-hidden="true" /></span>
                                </CardHeader>
                                <CardContent className="pro-dashboard-chart-content">
                                    <DonutChart
                                        data={DEMO_STATUS}
                                        total={28}
                                        centerLabel="serviços"
                                        ariaLabel="Demonstração da distribuição dos serviços por situação"
                                    />
                                </CardContent>
                                <CardFooter className="pro-dashboard-chart-footer">
                                    <span>Total de registros de exemplo</span>
                                    <strong>28</strong>
                                </CardFooter>
                            </Card>

                            <Card className="pro-dashboard-chart-card pro-dashboard-chart-card--categories">
                                <CardHeader className="pro-dashboard-chart-header">
                                    <div>
                                        <span className="professional-dashboard-card-eyebrow">ORGANIZAÇÃO DO CATÁLOGO</span>
                                        <CardTitle className="pro-dashboard-chart-title">Serviços por categoria</CardTitle>
                                        <CardDescription className="pro-dashboard-chart-description">Categorias com mais serviços vinculados à conta de exemplo.</CardDescription>
                                    </div>
                                    <span className="professional-dashboard-card-icon"><Tags size={18} aria-hidden="true" /></span>
                                </CardHeader>
                                <CardContent className="pro-dashboard-chart-content">
                                    <HorizontalBarChart
                                        data={DEMO_CATEGORIES}
                                        ariaLabel="Demonstração de quantidade de serviços por categoria"
                                    />
                                </CardContent>
                            </Card>

                            <Card className="pro-dashboard-chart-card pro-dashboard-chart-card--cities">
                                <CardHeader className="pro-dashboard-chart-header">
                                    <div>
                                        <span className="professional-dashboard-card-eyebrow">ÁREA DE ATENDIMENTO</span>
                                        <CardTitle className="pro-dashboard-chart-title">Cobertura por cidade</CardTitle>
                                        <CardDescription className="pro-dashboard-chart-description">Distribuição dos serviços por localidade de exemplo.</CardDescription>
                                    </div>
                                    <span className="professional-dashboard-card-icon"><MapPin size={18} aria-hidden="true" /></span>
                                </CardHeader>
                                <CardContent className="pro-dashboard-chart-content">
                                    <HorizontalBarChart
                                        data={DEMO_CITIES}
                                        ariaLabel="Demonstração da quantidade de serviços por cidade"
                                    />
                                </CardContent>
                            </Card>

                            <Card className="pro-dashboard-chart-card pro-dashboard-chart-card--images">
                                <CardHeader className="pro-dashboard-chart-header">
                                    <div>
                                        <span className="professional-dashboard-card-eyebrow">APRESENTAÇÃO DOS SERVIÇOS</span>
                                        <CardTitle className="pro-dashboard-chart-title">Cobertura de imagens</CardTitle>
                                        <CardDescription className="pro-dashboard-chart-description">Proporção de serviços de exemplo com pelo menos uma imagem ativa.</CardDescription>
                                    </div>
                                    <span className="professional-dashboard-card-icon"><ImageIcon size={18} aria-hidden="true" /></span>
                                </CardHeader>
                                <CardContent className="pro-dashboard-chart-content">
                                    <DonutChart
                                        data={DEMO_IMAGES}
                                        total={28}
                                        centerLabel="serviços"
                                        ariaLabel="Demonstração de proporção de serviços com imagens"
                                    />
                                </CardContent>
                                <CardFooter className="pro-dashboard-chart-footer">
                                    <span>Imagens ativas de exemplo</span>
                                    <strong>34</strong>
                                </CardFooter>
                            </Card>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
