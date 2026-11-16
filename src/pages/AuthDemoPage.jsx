import { useMemo, useState } from "react";
import {
    ArrowLeft, ArrowRight, Check, Eye, EyeOff, Info, LockKeyhole,
    LogOut, Mail, Plus, ShieldCheck, UserRound, Wrench, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO_ACCOUNT = {
    fullName: "Alex Silva",
    publicName: "Alex Reformas",
    email: "profissional@conectalocal.invalid",
    password: "ConectaLocal#Demo26",
    description: "Profissional demonstrativo de reformas e pequenos reparos residenciais.",
    city: "Capelinha - MG",
};

const INITIAL_SERVICES = [
    { id: "service-1", title: "Pintura residencial", category: "Pintura", description: "Pintura interna e externa, pequenos reparos e acabamento.", status: "published" },
    { id: "service-2", title: "Pequenos reparos", category: "Reformas", description: "Ajustes, montagem e manutenção residencial.", status: "paused" },
];

const EMPTY_FORM = { fullName: "", publicName: "", email: "", password: "", passwordConfirmation: "" };
const EMPTY_SERVICE = { title: "", category: "Reformas", description: "" };

function getPasswordValidation(password) {
    if (typeof password !== "string") return "Informe uma senha fictícia.";
    const normalized = password.normalize("NFC");
    const codePoints = [...normalized].length;
    const byteLength = new TextEncoder().encode(normalized).byteLength;

    if (codePoints < 15) return "Use pelo menos 15 caracteres.";
    if (codePoints > 128) return "Use no máximo 128 caracteres.";
    if (byteLength > 512) return "A senha excede o limite de 512 bytes UTF-8.";

    const hasControlCharacter = [...normalized].some((character) => {
        const codePoint = character.codePointAt(0);
        return (codePoint >= 0x00 && codePoint <= 0x1f)
            || (codePoint >= 0x7f && codePoint <= 0x9f);
    });

    if (hasControlCharacter) return "A senha não pode conter caracteres de controle.";
    return "";
}

function createDemoCode() {
    const values = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(values);
        return String(100000 + (values[0] % 900000));
    }
    return String(Math.floor(100000 + (Math.random() * 900000)));
}

function normalizeEmail(email) {
    return email.trim().toLocaleLowerCase("pt-BR");
}

export default function AuthDemoPage({ initialMode = "login" }) {
    const [mode, setMode] = useState(initialMode === "register" ? "register" : "login");
    const [screen, setScreen] = useState("auth");
    const [form, setForm] = useState(EMPTY_FORM);
    const [notice, setNotice] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [registeredAccount, setRegisteredAccount] = useState(null);
    const [pendingAccount, setPendingAccount] = useState(null);
    const [confirmationCode, setConfirmationCode] = useState("");
    const [codeInput, setCodeInput] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [services, setServices] = useState(INITIAL_SERVICES);
    const [showServiceForm, setShowServiceForm] = useState(false);
    const [newService, setNewService] = useState(EMPTY_SERVICE);
    const [recoveryCode, setRecoveryCode] = useState("");
    const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
    const [recoveryEmail, setRecoveryEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [recoveryStage, setRecoveryStage] = useState("email");

    const activeServices = useMemo(
        () => services.filter((service) => service.status === "published").length,
        [services],
    );

    function updateField(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
        setNotice(null);
    }

    function switchMode(nextMode) {
        setMode(nextMode);
        setScreen("auth");
        setNotice(null);
        setShowPassword(false);
        setForm(EMPTY_FORM);
        setCodeInput("");
        setRecoveryStage("email");
        setRecoveryCode("");
        setRecoveryCodeInput("");
        setNewPassword("");
    }

    function enterDashboard(account) {
        setCurrentUser({
            fullName: account.fullName,
            publicName: account.publicName,
            email: account.email,
            description: account.description || "Perfil profissional demonstrativo.",
            city: account.city || "Capelinha - MG",
        });
        setScreen("dashboard");
        setNotice(null);
        setShowServiceForm(false);
    }

    function handleDemoAccess() {
        enterDashboard(DEMO_ACCOUNT);
    }

    function handleLogin(event) {
        event.preventDefault();

        const email = normalizeEmail(form.email);
        const password = form.password;
        const account = registeredAccount
            && normalizeEmail(registeredAccount.email) === email
            ? registeredAccount
            : DEMO_ACCOUNT;

        if (normalizeEmail(account.email) !== email || account.password !== password) {
            setNotice({
                title: "Não foi possível entrar",
                message: "Confira os dados fictícios ou utilize o botão de acesso à conta demonstrativa.",
                tone: "warning",
            });
            return;
        }

        enterDashboard(account);
    }

    function handleRegister(event) {
        event.preventDefault();

        const passwordError = getPasswordValidation(form.password);
        if (passwordError) {
            setNotice({ title: "Revise a senha fictícia", message: passwordError, tone: "warning" });
            return;
        }

        if (form.password !== form.passwordConfirmation) {
            setNotice({
                title: "As senhas não coincidem",
                message: "Confira os dois campos e tente novamente.",
                tone: "warning",
            });
            return;
        }

        if (
            normalizeEmail(form.email) === normalizeEmail(DEMO_ACCOUNT.email)
            || (registeredAccount && normalizeEmail(form.email) === normalizeEmail(registeredAccount.email))
        ) {
            setNotice({
                title: "E-mail já utilizado nesta demonstração",
                message: "Use outro endereço fictício para simular um novo cadastro.",
                tone: "warning",
            });
            return;
        }

        const account = {
            fullName: form.fullName.trim(),
            publicName: form.publicName.trim(),
            email: form.email.trim(),
            password: form.password,
            description: "Novo perfil profissional demonstrativo.",
            city: "Capelinha - MG",
        };

        setPendingAccount(account);
        setConfirmationCode(createDemoCode());
        setCodeInput("");
        setMode("confirm");
        setNotice(null);
        setForm((current) => ({ ...current, password: "", passwordConfirmation: "" }));
    }

    function handleConfirmRegistration(event) {
        event.preventDefault();

        if (codeInput.trim() !== confirmationCode) {
            setNotice({
                title: "Código incorreto",
                message: "Digite o código demonstrativo exibido nesta tela.",
                tone: "warning",
            });
            return;
        }

        setRegisteredAccount(pendingAccount);
        enterDashboard(pendingAccount);
    }

    function handleRecoveryRequest(event) {
        event.preventDefault();

        const email = normalizeEmail(recoveryEmail);
        if (!registeredAccount || normalizeEmail(registeredAccount.email) !== email) {
            setNotice({
                title: "Conta não localizada nesta sessão",
                message: "Nesta demonstração, a recuperação funciona para uma conta criada no mesmo acesso. Também é possível criar uma nova conta fictícia.",
                tone: "warning",
            });
            return;
        }

        setRecoveryCode(createDemoCode());
        setRecoveryCodeInput("");
        setRecoveryStage("code");
        setNotice({
            title: "Código demonstrativo gerado",
            message: "Use o código apresentado abaixo para continuar. Nenhum e-mail foi enviado.",
            tone: "info",
        });
    }

    function handleRecoveryCode(event) {
        event.preventDefault();

        if (recoveryCodeInput.trim() !== recoveryCode) {
            setNotice({
                title: "Código incorreto",
                message: "Confira o código demonstrativo e tente novamente.",
                tone: "warning",
            });
            return;
        }

        setRecoveryStage("password");
        setNotice(null);
    }

    function handlePasswordReset(event) {
        event.preventDefault();

        const passwordError = getPasswordValidation(newPassword);
        if (passwordError) {
            setNotice({ title: "Revise a nova senha", message: passwordError, tone: "warning" });
            return;
        }

        setRegisteredAccount((current) => ({ ...current, password: newPassword }));
        setMode("login");
        setRecoveryStage("email");
        setRecoveryCode("");
        setNewPassword("");
        setForm(EMPTY_FORM);
        setNotice({
            title: "Senha fictícia atualizada",
            message: "A alteração existe somente nesta demonstração em memória.",
            tone: "info",
        });
    }

    function logout() {
        setCurrentUser(null);
        setScreen("auth");
        setMode("login");
        setForm(EMPTY_FORM);
        setNotice({
            title: "Você saiu da demonstração",
            message: "A sessão visual foi encerrada. Nenhuma sessão de servidor foi criada.",
            tone: "info",
        });
    }

    function addService(event) {
        event.preventDefault();
        if (!newService.title.trim() || !newService.description.trim()) return;

        setServices((current) => [{
            id: "service-" + Date.now(),
            title: newService.title.trim(),
            category: newService.category,
            description: newService.description.trim(),
            status: "published",
        }, ...current]);

        setNewService(EMPTY_SERVICE);
        setShowServiceForm(false);
    }

    function toggleService(serviceId) {
        setServices((current) => current.map((service) => (
            service.id === serviceId
                ? { ...service, status: service.status === "published" ? "paused" : "published" }
                : service
        )));
    }

    const isRegister = mode === "register";
    const isRecovery = mode === "recovery";
    const isConfirm = mode === "confirm";

    if (screen === "dashboard" && currentUser) {
        return (
            <main className="demo-dashboard-page">
                <header className="demo-dashboard-header">
                    <a className="brand" href="/" aria-label="Conecta Local — início">
                        <span className="brand-mark"><UserRound size={21} aria-hidden="true" /></span>
                        <span className="brand-name">Conecta <strong>Local</strong></span>
                    </a>
                    <div className="demo-dashboard-header-actions">
                        <span className="demo-mode-pill"><span /> Demonstração</span>
                        <button className="demo-logout-button" type="button" onClick={logout}>
                            <LogOut size={16} aria-hidden="true" /> Sair
                        </button>
                    </div>
                </header>

                <div className="demo-dashboard-shell">
                    <div className="demo-dashboard-welcome">
                        <div>
                            <span className="section-eyebrow">Área do profissional</span>
                            <h1>Olá, {currentUser.publicName}!</h1>
                            <p>Este é o seu espaço de demonstração para organizar seu perfil e seus serviços.</p>
                        </div>
                        <div className="demo-profile-avatar" aria-hidden="true"><UserRound size={30} /></div>
                    </div>

                    <div className="demo-dashboard-notice" role="note">
                        <Info size={18} aria-hidden="true" />
                        <p><strong>Ambiente acadêmico:</strong> as alterações ficam somente na memória desta página. Nenhum dado é enviado ou salvo em um banco.</p>
                    </div>

                    <section className="demo-dashboard-stats" aria-label="Resumo dos serviços">
                        <article className="demo-stat-card">
                            <span>Serviços cadastrados</span>
                            <strong>{services.length}</strong>
                            <small>Exemplos desta demonstração</small>
                        </article>
                        <article className="demo-stat-card">
                            <span>Publicados</span>
                            <strong>{activeServices}</strong>
                            <small>Visíveis no perfil simulado</small>
                        </article>
                        <article className="demo-stat-card">
                            <span>Em pausa</span>
                            <strong>{services.length - activeServices}</strong>
                            <small>Podem ser reativados</small>
                        </article>
                    </section>

                    <div className="demo-dashboard-grid">
                        <section className="demo-panel demo-profile-panel">
                            <div className="demo-panel-heading">
                                <div>
                                    <span className="section-eyebrow">Seu perfil</span>
                                    <h2>Informações profissionais</h2>
                                </div>
                                <span className="demo-status-label">Ativo na demonstração</span>
                            </div>
                            <div className="demo-profile-details">
                                <div><span>Nome público</span><strong>{currentUser.publicName}</strong></div>
                                <div><span>Nome completo</span><strong>{currentUser.fullName}</strong></div>
                                <div><span>E-mail fictício</span><strong>{currentUser.email}</strong></div>
                                <div><span>Localidade</span><strong>{currentUser.city}</strong></div>
                            </div>
                            <p className="demo-profile-description">{currentUser.description}</p>
                        </section>

                        <section className="demo-panel demo-shortcuts-panel">
                            <span className="section-eyebrow">Próximos passos</span>
                            <h2>Deixe seu perfil pronto</h2>
                            <p>Adicione serviços claros, descreva o que você faz e mantenha as informações de contato atualizadas.</p>
                            <button className="demo-shortcut-link" type="button" onClick={() => setShowServiceForm(true)}>
                                <Plus size={17} aria-hidden="true" /> Adicionar serviço
                            </button>
                            <a className="demo-shortcut-link demo-shortcut-link--secondary" href="/">
                                <ArrowLeft size={17} aria-hidden="true" /> Voltar à página pública
                            </a>
                        </section>
                    </div>

                    <section className="demo-panel demo-services-panel">
                        <div className="demo-panel-heading">
                            <div>
                                <span className="section-eyebrow">Gestão de serviços</span>
                                <h2>Meus serviços</h2>
                            </div>
                            <Button type="button" onClick={() => setShowServiceForm((value) => !value)}>
                                {showServiceForm ? <X size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
                                {showServiceForm ? "Cancelar" : "Novo serviço"}
                            </Button>
                        </div>

                        {showServiceForm && (
                            <form className="demo-new-service-form" onSubmit={addService}>
                                <div className="demo-new-service-fields">
                                    <label>
                                        Nome do serviço
                                        <Input value={newService.title} onChange={(event) => setNewService((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: Instalação de chuveiro" maxLength={80} required />
                                    </label>
                                    <label>
                                        Categoria
                                        <select value={newService.category} onChange={(event) => setNewService((current) => ({ ...current, category: event.target.value }))}>
                                            <option>Reformas</option>
                                            <option>Elétrica</option>
                                            <option>Hidráulica</option>
                                            <option>Pintura</option>
                                            <option>Limpeza</option>
                                            <option>Jardinagem</option>
                                        </select>
                                    </label>
                                </div>
                                <label>
                                    Descrição
                                    <textarea value={newService.description} onChange={(event) => setNewService((current) => ({ ...current, description: event.target.value }))} placeholder="Descreva o serviço oferecido." maxLength={300} rows={3} required />
                                </label>
                                <Button type="submit"><Check size={16} aria-hidden="true" /> Adicionar à demonstração</Button>
                            </form>
                        )}

                        <div className="demo-service-list">
                            {services.map((service) => (
                                <article className="demo-service-item" key={service.id}>
                                    <div className="demo-service-icon"><Wrench size={19} aria-hidden="true" /></div>
                                    <div className="demo-service-copy">
                                        <div className="demo-service-title-row">
                                            <h3>{service.title}</h3>
                                            <span className={service.status === "published" ? "demo-service-status is-published" : "demo-service-status is-paused"}>
                                                {service.status === "published" ? "Publicado" : "Em pausa"}
                                            </span>
                                        </div>
                                        <span className="demo-service-category">{service.category}</span>
                                        <p>{service.description}</p>
                                    </div>
                                    <Button type="button" variant="secondary" size="sm" onClick={() => toggleService(service.id)}>
                                        {service.status === "published" ? "Pausar" : "Publicar"}
                                    </Button>
                                </article>
                            ))}
                        </div>
                    </section>

                    <footer className="demo-dashboard-footer">
                        <span>Conecta Local</span>
                        <span>Protótipo acadêmico · Dados fictícios · Sem persistência</span>
                    </footer>
                </div>
            </main>
        );
    }

    return (
        <main className="auth-demo-page">
            <div className="auth-demo-shell">
                <a className="auth-back-link" href="/">
                    <ArrowLeft size={16} aria-hidden="true" />
                    Voltar ao Conecta Local
                </a>

                <div className="auth-demo-grid">
                    <section className="auth-demo-intro" aria-labelledby="auth-demo-heading">
                        <a className="brand auth-demo-brand" href="/" aria-label="Conecta Local — início">
                            <span className="brand-mark"><UserRound size={21} aria-hidden="true" /></span>
                            <span className="brand-name">Conecta <strong>Local</strong></span>
                        </a>
                        <span className="auth-demo-eyebrow">Área do profissional</span>
                        <h1 id="auth-demo-heading">
                            {isRecovery ? "Vamos recuperar seu acesso." : isConfirm ? "Só falta confirmar." : isRegister ? "Seu próximo passo começa aqui." : "Bom ter você de volta."}
                        </h1>
                        <p>
                            {isRecovery
                                ? "Simule a recuperação de acesso com um código demonstrativo exibido nesta tela."
                                : isConfirm
                                    ? "Confirme o cadastro fictício para acessar a área demonstrativa do profissional."
                                    : isRegister
                                        ? "Crie um perfil fictício e explore a experiência do profissional no Conecta Local."
                                        : "Acesse a área demonstrativa e conheça as ferramentas preparadas para profissionais."}
                        </p>
                        <div className="auth-demo-benefit">
                            <ShieldCheck size={20} aria-hidden="true" />
                            <span>Projeto acadêmico com dados exclusivamente fictícios.</span>
                        </div>
                    </section>

                    <section className="auth-demo-card" aria-label={isRegister ? "Cadastro demonstrativo" : isRecovery ? "Recuperação demonstrativa" : isConfirm ? "Confirmação demonstrativa" : "Login demonstrativo"}>
                        <div className="auth-demo-card-heading">
                            <span className="auth-demo-icon"><LockKeyhole size={20} aria-hidden="true" /></span>
                            <div>
                                <span className="section-eyebrow">Ambiente demonstrativo</span>
                                <h2>{isRecovery ? "Recuperar acesso" : isConfirm ? "Confirmar cadastro" : isRegister ? "Criar conta profissional" : "Entrar na conta"}</h2>
                            </div>
                        </div>

                        <div className="auth-demo-warning" role="note">
                            <Info size={17} aria-hidden="true" />
                            <p><strong>Use somente dados fictícios.</strong> Esta demonstração funciona no navegador, não envia dados ao servidor e não persiste informações após recarregar a página.</p>
                        </div>

                        {notice && (
                            <div className={"auth-demo-feedback auth-demo-feedback--" + notice.tone} role="status" aria-live="polite">
                                <strong>{notice.title}</strong>
                                <p>{notice.message}</p>
                            </div>
                        )}

                        {isConfirm ? (
                            <form className="auth-demo-form" onSubmit={handleConfirmRegistration}>
                                <div className="demo-code-card">
                                    <span>Código fictício de confirmação</span>
                                    <strong>{confirmationCode}</strong>
                                    <small>Na aplicação real, este código seria enviado ao e-mail informado.</small>
                                </div>
                                <label htmlFor="confirmation-code">Digite o código de 6 números</label>
                                <Input id="confirmation-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codeInput} onChange={(event) => setCodeInput(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required />
                                <Button type="submit" className="auth-demo-submit">Confirmar e acessar <ArrowRight size={17} aria-hidden="true" /></Button>
                                <button className="auth-demo-text-button" type="button" onClick={() => switchMode("register")}>Voltar ao cadastro</button>
                            </form>
                        ) : isRecovery ? (
                            recoveryStage === "email" ? (
                                <form className="auth-demo-form" onSubmit={handleRecoveryRequest}>
                                    <label htmlFor="recovery-email">E-mail da conta criada nesta sessão</label>
                                    <div className="auth-demo-input-wrap">
                                        <Mail size={17} aria-hidden="true" />
                                        <Input id="recovery-email" name="email" type="email" autoComplete="off" placeholder="voce@exemplo.invalid" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} required />
                                    </div>
                                    <Button type="submit" className="auth-demo-submit">Gerar código demonstrativo <ArrowRight size={17} aria-hidden="true" /></Button>
                                    <button className="auth-demo-text-button" type="button" onClick={() => switchMode("login")}>Voltar para entrar</button>
                                </form>
                            ) : recoveryStage === "code" ? (
                                <form className="auth-demo-form" onSubmit={handleRecoveryCode}>
                                    <div className="demo-code-card">
                                        <span>Código fictício de recuperação</span>
                                        <strong>{recoveryCode}</strong>
                                        <small>Nenhuma mensagem foi enviada por e-mail.</small>
                                    </div>
                                    <label htmlFor="recovery-code">Digite o código de 6 números</label>
                                    <Input id="recovery-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={recoveryCodeInput} onChange={(event) => setRecoveryCodeInput(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required />
                                    <Button type="submit" className="auth-demo-submit">Validar código <ArrowRight size={17} aria-hidden="true" /></Button>
                                    <button className="auth-demo-text-button" type="button" onClick={() => switchMode("login")}>Cancelar</button>
                                </form>
                            ) : (
                                <form className="auth-demo-form" onSubmit={handlePasswordReset}>
                                    <label htmlFor="recovery-new-password">Nova senha fictícia</label>
                                    <Input id="recovery-new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" placeholder="Mínimo de 15 caracteres" required />
                                    <Button type="submit" className="auth-demo-submit">Atualizar senha <ArrowRight size={17} aria-hidden="true" /></Button>
                                    <button className="auth-demo-text-button" type="button" onClick={() => switchMode("login")}>Cancelar</button>
                                </form>
                            )
                        ) : isRegister ? (
                            <form className="auth-demo-form" onSubmit={handleRegister}>
                                <div className="auth-demo-fields-grid">
                                    <div className="auth-demo-field">
                                        <label htmlFor="fullName">Nome completo (uso interno)</label>
                                        <Input id="fullName" name="fullName" autoComplete="off" placeholder="Ex.: Alex Silva" value={form.fullName} onChange={updateField} minLength={2} maxLength={120} required />
                                    </div>
                                    <div className="auth-demo-field">
                                        <label htmlFor="publicName">Nome público</label>
                                        <Input id="publicName" name="publicName" autoComplete="off" placeholder="Ex.: Alex Reformas" value={form.publicName} onChange={updateField} minLength={2} maxLength={80} required />
                                    </div>
                                </div>
                                <div className="auth-demo-field">
                                    <label htmlFor="register-email">E-mail fictício</label>
                                    <div className="auth-demo-input-wrap">
                                        <Mail size={17} aria-hidden="true" />
                                        <Input id="register-email" name="email" type="email" autoComplete="off" placeholder="voce@exemplo.invalid" value={form.email} onChange={updateField} maxLength={254} required />
                                    </div>
                                </div>
                                <div className="auth-demo-fields-grid">
                                    <div className="auth-demo-field">
                                        <label htmlFor="register-password">Senha fictícia</label>
                                        <div className="auth-demo-input-wrap auth-demo-password-wrap">
                                            <Input id="register-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo de 15 caracteres" value={form.password} onChange={updateField} required />
                                            <button className="auth-demo-password-toggle" type="button" aria-label={showPassword ? "Ocultar senha" : "Exibir senha"} onClick={() => setShowPassword((value) => !value)}>
                                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="auth-demo-field">
                                        <label htmlFor="passwordConfirmation">Confirmar senha</label>
                                        <Input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" placeholder="Repita a senha" value={form.passwordConfirmation} onChange={updateField} required />
                                    </div>
                                </div>
                                <p className="auth-demo-hint">A senha é usada somente para simular o fluxo nesta página. Não utilize uma senha pessoal.</p>
                                <Button type="submit" className="auth-demo-submit">Continuar cadastro <ArrowRight size={17} aria-hidden="true" /></Button>
                                <p className="auth-demo-switch">Já tem uma conta? <button className="auth-demo-text-button" type="button" onClick={() => switchMode("login")}>Entrar</button></p>
                            </form>
                        ) : (
                            <form className="auth-demo-form" onSubmit={handleLogin}>
                                <div className="auth-demo-field">
                                    <label htmlFor="login-email">E-mail fictício</label>
                                    <div className="auth-demo-input-wrap">
                                        <Mail size={17} aria-hidden="true" />
                                        <Input id="login-email" name="email" type="email" autoComplete="off" placeholder="voce@exemplo.invalid" value={form.email} onChange={updateField} maxLength={254} required />
                                    </div>
                                </div>
                                <div className="auth-demo-field">
                                    <div className="auth-demo-label-row">
                                        <label htmlFor="login-password">Senha fictícia</label>
                                        <button className="auth-demo-text-button" type="button" onClick={() => switchMode("recovery")}>Esqueceu a senha?</button>
                                    </div>
                                    <div className="auth-demo-input-wrap auth-demo-password-wrap">
                                        <Input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="off" placeholder="Digite a senha fictícia" value={form.password} onChange={updateField} required />
                                        <button className="auth-demo-password-toggle" type="button" aria-label={showPassword ? "Ocultar senha" : "Exibir senha"} onClick={() => setShowPassword((value) => !value)}>
                                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                        </button>
                                    </div>
                                </div>
                                <Button type="submit" className="auth-demo-submit">Entrar na demonstração <ArrowRight size={17} aria-hidden="true" /></Button>
                                <p className="auth-demo-switch">Ainda não tem conta? <button className="auth-demo-text-button" type="button" onClick={() => switchMode("register")}>Criar conta</button></p>

                                <div className="demo-credentials-card">
                                    <div>
                                        <span>Acesso rápido para apresentação</span>
                                        <strong>{DEMO_ACCOUNT.email}</strong>
                                        <small>Senha fictícia: {DEMO_ACCOUNT.password}</small>
                                    </div>
                                    <button type="button" onClick={handleDemoAccess}>Entrar sem digitar</button>
                                </div>
                            </form>
                        )}

                        <div className="auth-demo-footer">
                            <span>Conecta Local</span>
                            <span>Protótipo acadêmico · Dados fictícios · Sem persistência</span>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
