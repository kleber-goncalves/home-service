import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
    ArrowUpRight, BriefcaseBusiness, Check, ChevronRight, ImageIcon, Info,
    LayoutDashboard, LogOut, Mail, MapPin, Menu, Pencil, Plus, ShieldCheck,
    Tags, UserRound, Wrench, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DonutChart, HorizontalBarChart } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import ProfessionalServiceList from "@/components/professional/services/professional-service-list";
import ProfessionalServiceFormDialog from "@/components/professional/services/professional-service-form-dialog";
import ProfilePhotoManager from "@/components/professional/profile-photo-manager";

const NAV_ITEMS = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard },
    { id: "services", label: "Meus serviços", icon: BriefcaseBusiness },
    { id: "profile", label: "Meu perfil", icon: UserRound },
    { id: "account", label: "Conta e segurança", icon: ShieldCheck },
];

function formatStatus(status) {
    const labels = {
        draft: "Rascunho",
        published: "Publicado",
        paused: "Em pausa",
        suspended: "Suspenso",
        removed: "Removido",
    };
    return labels[status] || "Estado desconhecido";
}


const CHART_COLORS = ["#2563eb", "#5486e8", "#83a5ed", "#a8bee9", "#c1d0e6", "#7892b5"];

function getServiceCityNames(service) {
    if (Array.isArray(service.cities) && service.cities.length) {
        return service.cities
            .map((city) => [city.name, city.state].filter(Boolean).join(" - ").trim())
            .filter(Boolean);
    }

    return String(service.city || "")
        .split(",")
        .map((city) => city.trim())
        .filter(Boolean);
}

function buildProfessionalAnalytics(serviceList, statusItems) {
    const categoryCounts = new Map();
    const cityCounts = new Map();
    let servicesWithImages = 0;
    let activeImages = 0;

    serviceList.forEach((service) => {
        const category = String(service.category || "Sem categoria").trim() || "Sem categoria";
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

        new Set(getServiceCityNames(service)).forEach((city) => {
            cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
        });

        const images = Array.isArray(service.images)
            ? service.images.filter((image) => image && image.status === "active")
            : [];
        if (images.length) servicesWithImages += 1;
        activeImages += images.length;
    });

    const sortDistribution = (entries, limit) => Array.from(entries, ([label, value], index) => ({
        label,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length],
    })).sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, "pt-BR")).slice(0, limit);

    const total = serviceList.length;
    return {
        cityCount: cityCounts.size,
        servicesWithImages,
        servicesWithoutImages: Math.max(0, total - servicesWithImages),
        activeImages,
        statusDistribution: statusItems.map((item, index) => ({
            label: item.label,
            value: item.value,
            color: ["#2563eb", "#d8a344", "#93a4b8", "#c66b6b", "#cbd5e1"][index],
        })),
        categoryDistribution: sortDistribution(categoryCounts, 6),
        cityDistribution: sortDistribution(cityCounts, 6),
        imageDistribution: [
            { label: "Com imagem", value: servicesWithImages, color: "#16a36a" },
            { label: "Sem imagem", value: Math.max(0, total - servicesWithImages), color: "#cbd5e1" },
        ],
    };
}

export default function ProfessionalDashboardPage({
    currentUser,
    csrfToken,
    services,
    setServices,
    activeServices,
    pausedServices,
    removedServices,
    notice,
    busy,
    isEditingProfile,
    cancelProfileEditing,
    startEditingProfile,
    updateProfilePhoto,
    saveProfile,
    profileForm,
    updateProfileField,
    catalog,
    isEmailChangeOpen,
    openEmailChange,
    closeEmailChange,
    requestEmailChange,
    pendingEmailChange,
    emailChangeForm,
    updateEmailChangeField,
    confirmEmailChange,
    emailChangeCodeInput,
    setEmailChangeCodeInput,
    requestAnotherEmailCode,
    toggleServiceForm,
    showServiceForm,
    cancelServiceForm,
    saveService,
    serviceFormError,
    editingServiceId,
    newService,
    editingService,
    updateServiceFormField,
    toggleServiceCity,
    startEditingService,
    toggleService,
    removeService,
    refreshServices,
    logout,
}) {
    const [activeSection, setActiveSection] = useState("overview");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dashboardContentRef = useRef(null);

    useLayoutEffect(() => {
        const content = dashboardContentRef.current;
        const prefersReducedMotion = typeof window !== "undefined"
            && typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!content || prefersReducedMotion) return undefined;

        const animationContext = gsap.context(() => {
            const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
            const heading = content.querySelector(".professional-dashboard-page-heading");

            if (heading) {
                timeline.fromTo(
                    heading,
                    { autoAlpha: 0, y: 14 },
                    { autoAlpha: 1, y: 0, duration: 0.42 },
                );
            }

            if (activeSection === "overview") {
                const indicators = content.querySelectorAll(".professional-dashboard-kpi");
                const charts = content.querySelectorAll(
                    ".pro-dashboard-chart-card, .pro-dashboard-analytics-note, .professional-dashboard-services-summary",
                );

                if (indicators.length) {
                    timeline.fromTo(
                        indicators,
                        { autoAlpha: 0, y: 16 },
                        { autoAlpha: 1, y: 0, duration: 0.44, stagger: 0.07 },
                        "-=0.16",
                    );
                }

                if (charts.length) {
                    timeline.fromTo(
                        charts,
                        { autoAlpha: 0, y: 18 },
                        { autoAlpha: 1, y: 0, duration: 0.48, stagger: 0.075 },
                        "-=0.18",
                    );
                }
            } else {
                const sectionPanel = content.querySelector(".professional-dashboard-section > *");
                if (sectionPanel) {
                    timeline.fromTo(
                        sectionPanel,
                        { autoAlpha: 0, y: 14 },
                        { autoAlpha: 1, y: 0, duration: 0.42 },
                        "-=0.14",
                    );
                }
            }
        }, content);

        return () => animationContext.revert();
    }, [activeSection]);

    const serviceList = Array.isArray(services) ? services : [];
    const draftServices = serviceList.filter((service) => service.status === "draft").length;
    const suspendedServices = serviceList.filter((service) => service.status === "suspended").length;
    const statusItems = [
        { key: "published", label: "Publicados", value: activeServices },
        { key: "paused", label: "Em pausa", value: pausedServices },
        { key: "draft", label: "Rascunhos", value: draftServices },
        { key: "suspended", label: "Suspensos", value: suspendedServices },
        { key: "removed", label: "Removidos", value: removedServices },
    ];
    const analytics = buildProfessionalAnalytics(serviceList, statusItems);
    const pageHeading = {
        overview: {
            eyebrow: "ÁREA PROFISSIONAL",
            title: "Olá, " + (currentUser.publicName || "profissional") + "!",
            description: "Acompanhe seus serviços e gerencie sua presença no Conecta Local.",
        },
        services: {
            eyebrow: "GESTÃO DO NEGÓCIO",
            title: "Meus serviços",
            description: "Cadastre, edite e controle os serviços que aparecem na vitrine pública.",
        },
        profile: {
            eyebrow: "IDENTIDADE PROFISSIONAL",
            title: "Meu perfil",
            description: "Mantenha suas informações profissionais atualizadas para os clientes.",
        },
        account: {
            eyebrow: "ACESSO E PROTEÇÃO",
            title: "Conta e segurança",
            description: "Consulte seu e-mail de acesso e gerencie a confirmação de alterações.",
        },
    }[activeSection];

    function navigateTo(section) {
        setActiveSection(section);
        setMobileMenuOpen(false);
    }

    function openNewService() {
        navigateTo("services");
        if (!showServiceForm) toggleServiceForm();
    }

    function openProfileEditor() {
        navigateTo("profile");
        if (!isEditingProfile) startEditingProfile();
    }

    return (
        <main className="professional-dashboard">
            <a className="professional-dashboard-skip" href="#professional-dashboard-content">Pular para o conteúdo</a>

            {mobileMenuOpen && (
                <button
                    className="professional-dashboard-overlay"
                    type="button"
                    aria-label="Fechar menu de navegação"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <aside className={"professional-dashboard-sidebar" + (mobileMenuOpen ? " is-open" : "")} aria-label="Navegação da área profissional">
                <a className="professional-dashboard-brand" href="/" aria-label="Conecta Local — início">
                    <span className="professional-dashboard-brand-mark"><BriefcaseBusiness size={19} aria-hidden="true" /></span>
                    <span>Conecta <strong>Local</strong></span>
                </a>

                <div className="professional-dashboard-nav-heading">MENU PRINCIPAL</div>
                <nav className="professional-dashboard-nav" id="professional-dashboard-navigation" aria-label="Seções da área profissional">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                className={"professional-dashboard-nav-item" + (activeSection === item.id ? " is-active" : "")}
                                key={item.id}
                                type="button"
                                aria-current={activeSection === item.id ? "page" : undefined}
                                onClick={() => navigateTo(item.id)}
                            >
                                <Icon size={18} aria-hidden="true" />
                                <span>{item.label}</span>
                                {activeSection === item.id && <ChevronRight size={15} aria-hidden="true" />}
                            </button>
                        );
                    })}
                </nav>

                <div className="professional-dashboard-sidebar-spacer" />
                <div className="professional-dashboard-user">
                    <div className="professional-dashboard-user-avatar">
                        {currentUser.photoUrl
                            ? <img src={currentUser.photoUrl} alt="" />
                            : <UserRound size={18} aria-hidden="true" />}
                    </div>
                    <div className="professional-dashboard-user-copy">
                        <strong>{currentUser.publicName}</strong>
                        <span>{currentUser.email}</span>
                    </div>
                </div>
                <button className="professional-dashboard-logout" type="button" onClick={logout} disabled={busy}>
                    <LogOut size={17} aria-hidden="true" />
                    <span>{busy ? "Aguarde..." : "Sair da conta"}</span>
                </button>
                <div className="professional-dashboard-sidebar-foot">Conecta Local · Protótipo acadêmico</div>
            </aside>

            <div className="professional-dashboard-main">
                <header className="professional-dashboard-topbar">
                    <div className="professional-dashboard-topbar-left">
                        <button
                            className="professional-dashboard-menu-toggle"
                            type="button"
                            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                            aria-expanded={mobileMenuOpen}
                            aria-controls="professional-dashboard-navigation"
                            onClick={() => setMobileMenuOpen((open) => !open)}
                        >
                            {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                        </button>
                        <span className="professional-dashboard-topbar-label">PAINEL DO PROFISSIONAL</span>
                    </div>
                    <span className="professional-dashboard-connected"><i aria-hidden="true" /> Dados da conta conectados</span>
                </header>

                <div ref={dashboardContentRef} className="professional-dashboard-content" id="professional-dashboard-content" tabIndex="-1">
                    <div className="professional-dashboard-page-heading">
                        <div>
                            <span className="section-eyebrow">{pageHeading.eyebrow}</span>
                            <h1>{pageHeading.title}</h1>
                            <p>{pageHeading.description}</p>
                        </div>
                        {activeSection === "overview" && (
                            <div className="professional-dashboard-heading-actions">
                                <Button type="button" variant="secondary" onClick={openProfileEditor} disabled={busy}>
                                    <Pencil size={15} aria-hidden="true" /> Editar perfil
                                </Button>
                                <Button type="button" onClick={openNewService} disabled={busy}>
                                    <Plus size={16} aria-hidden="true" /> Novo serviço
                                </Button>
                            </div>
                        )}
                    </div>

                    {notice && (
                        <div className={"demo-dashboard-notice is-" + (notice.tone || "info")} role="status" aria-live="polite">
                            <Info size={18} aria-hidden="true" />
                            <p><strong>{notice.title}:</strong> {notice.message}</p>
                        </div>
                    )}

                    {activeSection === "overview" && (
                        <section className="professional-dashboard-overview" aria-label="Resumo da atividade profissional">
                            <div className="professional-dashboard-kpis">
                                <article className="professional-dashboard-kpi">
                                    <span className="professional-dashboard-kpi-icon"><BriefcaseBusiness size={17} aria-hidden="true" /></span>
                                    <span className="professional-dashboard-kpi-label">Serviços cadastrados</span>
                                    <strong>{serviceList.length}</strong>
                                    <small>Registros vinculados à sua conta</small>
                                    <span className="professional-dashboard-data-source">Dado real</span>
                                </article>
                                <article className="professional-dashboard-kpi">
                                    <span className="professional-dashboard-kpi-icon"><Check size={17} aria-hidden="true" /></span>
                                    <span className="professional-dashboard-kpi-label">Publicados</span>
                                    <strong>{activeServices}</strong>
                                    <small>Visíveis na vitrine pública</small>
                                    <span className="professional-dashboard-data-source">Dado real</span>
                                </article>
                                <article className="professional-dashboard-kpi">
                                    <span className="professional-dashboard-kpi-icon"><Wrench size={17} aria-hidden="true" /></span>
                                    <span className="professional-dashboard-kpi-label">Em pausa</span>
                                    <strong>{pausedServices}</strong>
                                    <small>Podem ser reativados</small>
                                    <span className="professional-dashboard-data-source">Dado real</span>
                                </article>
                                <article className="professional-dashboard-kpi">
                                    <span className="professional-dashboard-kpi-icon"><MapPin size={17} aria-hidden="true" /></span>
                                    <span className="professional-dashboard-kpi-label">Cidades atendidas</span>
                                    <strong>{analytics.cityCount}</strong>
                                    <small>Localidades associadas aos serviços</small>
                                    <span className="professional-dashboard-data-source">Dado real</span>
                                </article>
                            </div>

                            <div className="professional-dashboard-analytics-grid">
                                <Card className="pro-dashboard-chart-card pro-dashboard-chart-card--status">
                                    <CardHeader className="pro-dashboard-chart-header">
                                        <div>
                                            <span className="professional-dashboard-card-eyebrow">DADOS DA CONTA</span>
                                            <CardTitle className="pro-dashboard-chart-title">Situação dos serviços</CardTitle>
                                            <CardDescription className="pro-dashboard-chart-description">Como seus serviços estão distribuídos por status.</CardDescription>
                                        </div>
                                        <span className="professional-dashboard-card-icon"><BriefcaseBusiness size={18} aria-hidden="true" /></span>
                                    </CardHeader>
                                    <CardContent className="pro-dashboard-chart-content">
                                        <DonutChart
                                            data={analytics.statusDistribution}
                                            total={serviceList.length}
                                            centerLabel="serviços"
                                            ariaLabel="Distribuição dos serviços por situação"
                                        />
                                    </CardContent>
                                    <CardFooter className="pro-dashboard-chart-footer">
                                        <span>Total de registros</span>
                                        <strong>{serviceList.length}</strong>
                                    </CardFooter>
                                </Card>

                                <Card className="pro-dashboard-chart-card pro-dashboard-chart-card--categories">
                                    <CardHeader className="pro-dashboard-chart-header">
                                        <div>
                                            <span className="professional-dashboard-card-eyebrow">ORGANIZAÇÃO DO CATÁLOGO</span>
                                            <CardTitle className="pro-dashboard-chart-title">Serviços por categoria</CardTitle>
                                            <CardDescription className="pro-dashboard-chart-description">Categorias com mais serviços vinculados à sua conta.</CardDescription>
                                        </div>
                                        <span className="professional-dashboard-card-icon"><Tags size={18} aria-hidden="true" /></span>
                                    </CardHeader>
                                    <CardContent className="pro-dashboard-chart-content">
                                        <HorizontalBarChart
                                            data={analytics.categoryDistribution}
                                            emptyMessage="Cadastre um serviço para visualizar a distribuição por categoria."
                                            ariaLabel="Quantidade de serviços por categoria"
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="pro-dashboard-chart-card pro-dashboard-chart-card--cities">
                                    <CardHeader className="pro-dashboard-chart-header">
                                        <div>
                                            <span className="professional-dashboard-card-eyebrow">ÁREA DE ATENDIMENTO</span>
                                            <CardTitle className="pro-dashboard-chart-title">Cobertura por cidade</CardTitle>
                                            <CardDescription className="pro-dashboard-chart-description">Quantidade de serviços associados a cada localidade.</CardDescription>
                                        </div>
                                        <span className="professional-dashboard-card-icon"><MapPin size={18} aria-hidden="true" /></span>
                                    </CardHeader>
                                    <CardContent className="pro-dashboard-chart-content">
                                        <HorizontalBarChart
                                            data={analytics.cityDistribution}
                                            emptyMessage="As cidades vinculadas aos serviços aparecerão aqui."
                                            ariaLabel="Quantidade de serviços por cidade atendida"
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="pro-dashboard-chart-card pro-dashboard-chart-card--images">
                                    <CardHeader className="pro-dashboard-chart-header">
                                        <div>
                                            <span className="professional-dashboard-card-eyebrow">APRESENTAÇÃO DOS SERVIÇOS</span>
                                            <CardTitle className="pro-dashboard-chart-title">Cobertura de imagens</CardTitle>
                                            <CardDescription className="pro-dashboard-chart-description">Serviços que já possuem pelo menos uma imagem ativa.</CardDescription>
                                        </div>
                                        <span className="professional-dashboard-card-icon"><ImageIcon size={18} aria-hidden="true" /></span>
                                    </CardHeader>
                                    <CardContent className="pro-dashboard-chart-content">
                                        <DonutChart
                                            data={analytics.imageDistribution}
                                            total={serviceList.length}
                                            centerLabel="serviços"
                                            ariaLabel="Proporção de serviços com e sem imagens"
                                        />
                                    </CardContent>
                                    <CardFooter className="pro-dashboard-chart-footer">
                                        <span>Imagens ativas cadastradas</span>
                                        <strong>{analytics.activeImages}</strong>
                                    </CardFooter>
                                </Card>

                                <Card className="pro-dashboard-analytics-note">
                                    <div className="pro-dashboard-analytics-note-icon"><MapPin size={18} aria-hidden="true" /></div>
                                    <div>
                                        <strong>Próxima etapa: audiência do perfil</strong>
                                        <p>Visualizações, interesse nos serviços e cliques em contato só serão exibidos quando a plataforma registrar eventos reais. Nenhum número demonstrativo é apresentado como resultado da sua conta.</p>
                                    </div>
                                    <Badge variant="default">Coleta futura</Badge>
                                </Card>
                            </div>

                            <section className="professional-dashboard-card professional-dashboard-services-summary" aria-labelledby="overview-services-heading">
                                <div className="professional-dashboard-card-heading">
                                    <div>
                                        <span className="professional-dashboard-card-eyebrow">GERENCIAMENTO</span>
                                        <h2 id="overview-services-heading">Seus serviços</h2>
                                        <p>Consulte os registros disponíveis na sua conta.</p>
                                    </div>
                                    <button type="button" className="professional-dashboard-text-link" onClick={() => navigateTo("services")}>
                                        Ver todos <ArrowUpRight size={15} aria-hidden="true" />
                                    </button>
                                </div>
                                {serviceList.length ? (
                                    <div className="professional-dashboard-service-preview">
                                        {serviceList.slice(0, 3).map((service) => (
                                            <div className="professional-dashboard-service-preview-item" key={service.id}>
                                                <span className="professional-dashboard-service-preview-icon"><Wrench size={17} aria-hidden="true" /></span>
                                                <div>
                                                    <strong>{service.title}</strong>
                                                    <small>{service.category}</small>
                                                </div>
                                                <span className={"demo-service-status is-" + service.status}>{formatStatus(service.status)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="professional-dashboard-empty-services">
                                        <p>Você ainda não cadastrou serviços.</p>
                                        <Button type="button" onClick={openNewService}><Plus size={15} aria-hidden="true" /> Adicionar primeiro serviço</Button>
                                    </div>
                                )}
                            </section>
                        </section>
                    )}

                    {activeSection === "services" && (
                        <section className="professional-dashboard-section" aria-label="Gerenciamento dos serviços">
                            <section className="demo-panel demo-services-panel">
                        <div className="demo-panel-heading">
                            <div>
                                <span className="section-eyebrow">Gestão de serviços</span>
                                <h2>Meus serviços</h2>
                            </div>
                            <Button type="button" onClick={toggleServiceForm} disabled={busy}>
                                <Plus size={17} aria-hidden="true" /> Novo serviço
                            </Button>
                        </div>

                        <ProfessionalServiceList
                            services={services}
                            busy={busy}
                            csrfToken={csrfToken}
                            onServicesChange={setServices}
                            onEdit={startEditingService}
                            onToggle={toggleService}
                            onRemove={removeService}
                            onRefresh={refreshServices}
                        />

                        <ProfessionalServiceFormDialog
                            open={showServiceForm}
                            catalog={catalog}
                            editingService={editingService}
                            editingServiceId={editingServiceId}
                            serviceForm={newService}
                            serviceFormError={serviceFormError}
                            busy={busy}
                            onServiceFormChange={updateServiceFormField}
                            onToggleCity={toggleServiceCity}
                            onSubmit={saveService}
                            onClose={cancelServiceForm}
                        />

                    </section>
                        </section>
                    )}

                    {activeSection === "profile" && (
                        <section className="professional-dashboard-section" aria-label="Informações do perfil profissional">
                            <section className="demo-panel demo-profile-panel">
                        <div className="demo-panel-heading">
                            <div>
                                <span className="section-eyebrow">Seu perfil</span>
                                <h2>Informações profissionais</h2>
                            </div>
                            <div className="demo-profile-heading-actions">
                                <span className="demo-status-label">Conta ativa</span>
                                {isEditingProfile ? (
                                    <Button type="button" variant="secondary" size="sm" onClick={cancelProfileEditing} disabled={busy}>
                                        <X size={14} aria-hidden="true" /> Cancelar
                                    </Button>
                                ) : (
                                    <Button type="button" variant="secondary" size="sm" onClick={startEditingProfile} disabled={busy}>
                                        <Pencil size={14} aria-hidden="true" /> Editar perfil
                                    </Button>
                                )}
                            </div>
                        </div>

                        <ProfilePhotoManager
                            user={currentUser}
                            csrfToken={csrfToken}
                            onPhotoChange={updateProfilePhoto}
                        />

                        {isEditingProfile ? (
                            <form className="demo-new-service-form demo-profile-form" onSubmit={saveProfile}>
                                <div className="demo-new-service-fields">
                                    <label htmlFor="profile-full-name">
                                        Nome completo
                                        <Input id="profile-full-name" name="fullName" autoComplete="name" value={profileForm.fullName} onChange={updateProfileField} minLength={2} maxLength={120} required />
                                    </label>
                                    <label htmlFor="profile-public-name">
                                        Nome público
                                        <Input id="profile-public-name" name="publicName" autoComplete="organization" value={profileForm.publicName} onChange={updateProfileField} minLength={2} maxLength={80} required />
                                    </label>
                                    <label htmlFor="profile-whatsapp">
                                        Telefone / WhatsApp
                                        <Input id="profile-whatsapp" name="whatsapp" type="tel" autoComplete="tel" value={profileForm.whatsapp} onChange={updateProfileField} maxLength={20} required />
                                    </label>
                                    <label htmlFor="profile-city">
                                        Cidade principal
                                        <select id="profile-city" name="cityId" value={profileForm.cityId} onChange={updateProfileField} required>
                                            {catalog.cities.map((city) => (
                                                <option key={city.id} value={city.id}>{city.name} - {city.state}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <label htmlFor="profile-presentation">
                                    Apresentação profissional
                                    <textarea id="profile-presentation" name="presentation" rows={4} minLength={10} maxLength={500} value={profileForm.presentation} onChange={updateProfileField} required />
                                </label>
                                <div className="demo-profile-form-actions">
                                    <Button type="button" variant="secondary" onClick={cancelProfileEditing} disabled={busy}>Cancelar</Button>
                                    <Button type="submit" disabled={busy || !catalog.cities.length}>
                                        <Check size={15} aria-hidden="true" /> {busy ? "Salvando..." : "Salvar alterações"}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="demo-profile-details">
                                    <div><span>Nome público</span><strong>{currentUser.publicName}</strong></div>
                                    <div><span>Nome completo</span><strong>{currentUser.fullName}</strong></div>
                                    <div><span>Telefone / WhatsApp</span><strong>{currentUser.whatsapp}</strong></div>
                                    <div><span>Localidade</span><strong>{catalog.cities.find((city) => city.id === currentUser.cityId)?.name || currentUser.cityId}</strong></div>
                                </div>
                                <p className="demo-profile-description">{currentUser.presentation}</p>
                            </>
                        )}
                    </section>
                        </section>
                    )}

                    {activeSection === "account" && (
                        <section className="professional-dashboard-section" aria-label="Conta e segurança">
                            <section className="demo-panel professional-dashboard-account-panel">
                                <div className="demo-panel-heading">
                                    <div>
                                        <span className="section-eyebrow">ACESSO À CONTA</span>
                                        <h2>E-mail e segurança</h2>
                                    </div>
                                    <span className="demo-status-label">Conta ativa</span>
                                </div>
                                <div className="demo-email-change-panel">
                            <div className="demo-email-change-copy">
                                <span className="section-eyebrow">E-mail de acesso</span>
                                <strong>{currentUser.email}</strong>
                                <p>Para trocar este endereço, confirme sua senha atual e valide um código demonstrativo de uso único.</p>
                            </div>
                            {!isEmailChangeOpen && (
                                <Button type="button" variant="secondary" size="sm" onClick={openEmailChange} disabled={busy}>
                                    <Mail size={15} aria-hidden="true" /> Alterar e-mail
                                </Button>
                            )}
                        </div>

                        {isEmailChangeOpen && (
                            <section className="demo-email-change-form" aria-labelledby="email-change-heading">
                                <div className="demo-email-change-form-heading">
                                    <div>
                                        <span className="section-eyebrow">Segurança da conta</span>
                                        <h3 id="email-change-heading">{pendingEmailChange ? "Confirmar novo endereço" : "Alterar e-mail de acesso"}</h3>
                                    </div>
                                    <button type="button" className="auth-demo-text-button" onClick={closeEmailChange} disabled={busy}>Fechar</button>
                                </div>

                                {!pendingEmailChange ? (
                                    <form className="demo-new-service-form" onSubmit={requestEmailChange}>
                                        <p className="demo-email-change-explainer">A senha atual será validada novamente. O endereço só será trocado depois que o código de confirmação for aceito.</p>
                                        <label htmlFor="email-change-current-password">
                                            Senha atual
                                            <Input
                                                id="email-change-current-password"
                                                name="currentPassword"
                                                type="password"
                                                autoComplete="current-password"
                                                value={emailChangeForm.currentPassword}
                                                onChange={updateEmailChangeField}
                                                required
                                            />
                                        </label>
                                        <label htmlFor="email-change-new-address">
                                            Novo e-mail
                                            <Input
                                                id="email-change-new-address"
                                                name="newEmail"
                                                type="email"
                                                autoComplete="email"
                                                value={emailChangeForm.newEmail}
                                                onChange={updateEmailChangeField}
                                                maxLength={254}
                                                placeholder="novo-endereco@exemplo.invalid"
                                                required
                                            />
                                        </label>
                                        <div className="demo-profile-form-actions">
                                            <Button type="button" variant="secondary" onClick={closeEmailChange} disabled={busy}>Cancelar</Button>
                                            <Button type="submit" disabled={busy}>
                                                <ShieldCheck size={15} aria-hidden="true" /> {busy ? "Validando..." : "Validar senha e gerar código"}
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <form className="demo-new-service-form" onSubmit={confirmEmailChange}>
                                        <div className="demo-code-card">
                                            <span>Código demonstrativo de alteração de e-mail</span>
                                            <strong>{pendingEmailChange.verificationCode}</strong>
                                            <small>Novo endereço: {pendingEmailChange.email}. Válido por 10 minutos e até cinco tentativas. Nenhuma mensagem foi enviada.</small>
                                        </div>
                                        <label htmlFor="email-change-code">
                                            Digite os seis números
                                            <Input
                                                id="email-change-code"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                maxLength={6}
                                                value={emailChangeCodeInput}
                                                onChange={(event) => setEmailChangeCodeInput(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                                placeholder="000000"
                                                required
                                            />
                                        </label>
                                        <div className="demo-profile-form-actions">
                                            <Button type="button" variant="secondary" onClick={requestAnotherEmailCode} disabled={busy}>Solicitar outro código</Button>
                                            <Button type="submit" disabled={busy || emailChangeCodeInput.length !== 6}>
                                                <Check size={15} aria-hidden="true" /> {busy ? "Confirmando..." : "Confirmar novo e-mail"}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </section>
                        )}
                            </section>
                        </section>
                    )}

                    <footer className="professional-dashboard-footer">
                        <span>Conecta Local</span>
                        <span>Protótipo acadêmico · Indicadores calculados a partir dos serviços da conta</span>
                    </footer>
                </div>
            </div>
        </main>
    );
}
