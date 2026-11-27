import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft, ArrowRight, Check, Info, LockKeyhole, Mail, ShieldCheck, UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appRequest } from "@/services/app-api";
import { useAuth } from "@/hooks/use-auth";
import ProfessionalDashboardPage from "@/pages/ProfessionalDashboardPage";

const EMPTY_REGISTER = {
    fullName: "",
    publicName: "",
    email: "",
    whatsapp: "",
    presentation: "",
    cityId: "",
    password: "",
    passwordConfirmation: "",
};

const EMPTY_SERVICE = {
    title: "",
    categoryId: "",
    description: "",
    cityIds: [],
};

function getPasswordValidation(password) {
    if (typeof password !== "string") return "Informe uma senha.";
    const normalized = password.normalize("NFC");
    const codePoints = [...normalized].length;
    const byteLength = new TextEncoder().encode(normalized).byteLength;

    if (codePoints < 15) return "Use pelo menos 15 caracteres.";
    if (codePoints > 128) return "Use no máximo 128 caracteres.";
    if (byteLength > 512) return "A senha excede o limite de 512 bytes UTF-8.";

    const hasControlCharacter = [...normalized].some((character) => {
        const point = character.codePointAt(0);
        return point <= 0x1f || (point >= 0x7f && point <= 0x9f);
    });

    return hasControlCharacter ? "A senha não pode conter caracteres de controle." : "";
}


export default function AuthDemoPage({ initialMode = "login" }) {
    const {
        user: currentUser,
        csrfToken,
        services,
        setServices,
        updateUser,
        establishSession,
        clearSession,
        logout: logoutSession,
        isLoading: authLoading,
    } = useAuth();
    const [mode, setMode] = useState(initialMode === "register" ? "register" : "login");
    const [registerStep, setRegisterStep] = useState(1);
    const [catalog, setCatalog] = useState({ categories: [], cities: [] });
    const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
    const [loginForm, setLoginForm] = useState({ email: "", password: "" });
    const [verificationCode, setVerificationCode] = useState("");
    const [verificationCodeInput, setVerificationCodeInput] = useState("");
    const [pendingEmail, setPendingEmail] = useState("");
    const [newService, setNewService] = useState(EMPTY_SERVICE);
    const [showServiceForm, setShowServiceForm] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState(null);
    const [notice, setNotice] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [catalogReady, setCatalogReady] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        fullName: "",
        publicName: "",
        whatsapp: "",
        presentation: "",
        cityId: "",
    });
    const [isEmailChangeOpen, setIsEmailChangeOpen] = useState(false);
    const [emailChangeForm, setEmailChangeForm] = useState({ currentPassword: "", newEmail: "" });
    const [pendingEmailChange, setPendingEmailChange] = useState(null);
    const [emailChangeCodeInput, setEmailChangeCodeInput] = useState("");

    const activeServices = useMemo(
        () => services.filter((service) => service.status === "published").length,
        [services],
    );
    const pausedServices = useMemo(
        () => services.filter((service) => service.status === "paused").length,
        [services],
    );
    const removedServices = useMemo(
        () => services.filter((service) => service.status === "removed").length,
        [services],
    );
    const editingService = services.find((service) => service.id === editingServiceId) || null;

    useEffect(() => {
        let active = true;

        async function initialize() {
            try {
                const data = await appRequest("public.catalog");
                if (active) {
                    setCatalog(data || { categories: [], cities: [] });
                    setCatalogReady(true);
                    if (data?.cities?.[0]?.id) {
                        setRegisterForm((current) => ({
                            ...current,
                            cityId: current.cityId || data.cities[0].id,
                        }));
                    }
                    if (data?.categories?.[0]?.id) {
                        setNewService((current) => ({
                            ...current,
                            categoryId: current.categoryId || data.categories[0].id,
                        }));
                    }
                }
            } catch (error) {
                if (active) {
                    setNotice({
                        title: "Planilha ainda não conectada",
                        message: error.message || "Configure o Apps Script e as variáveis Preview para ativar o cadastro.",
                        tone: "warning",
                    });
                }
            } finally {
                if (active) setPageLoading(false);
            }
        }

        initialize();
        return () => { active = false; };
    }, []);

    function updateRegisterField(event) {
        const { name, value } = event.target;
        setRegisterForm((current) => ({ ...current, [name]: value }));
        setNotice(null);
    }

    function updateLoginField(event) {
        const { name, value } = event.target;
        setLoginForm((current) => ({ ...current, [name]: value }));
        setNotice(null);
    }

    function updateProfileField(event) {
        const { name, value } = event.target;
        setProfileForm((current) => ({ ...current, [name]: value }));
        setNotice(null);
    }

    function switchMode(nextMode) {
        setMode(nextMode);
        setNotice(null);
        setVerificationCode("");
        if (nextMode === "register") {
            setRegisterStep(1);
            setRegisterForm((current) => ({ ...current, password: "", passwordConfirmation: "" }));
        } else {
            setLoginForm((current) => ({ ...current, password: "" }));
        }
    }

    function handleRegistrationStepSubmit(event) {
        event.preventDefault();

        if (registerStep === 2 && (!catalogReady || !catalog.cities.length)) {
            setNotice({
                title: "Catálogo de cidades indisponível",
                message: "Não foi possível carregar as cidades. Atualize a página e tente novamente.",
                tone: "warning",
            });
            return;
        }

        if (registerStep < 3) {
            setRegisterStep((current) => Math.min(current + 1, 3));
            setNotice(null);
            return;
        }

        submitRegistration(event);
    }

    function goToPreviousRegistrationStep() {
        setRegisterStep((current) => Math.max(current - 1, 1));
        setNotice(null);
    }

    async function submitRegistration(event) {
        event.preventDefault();
        const passwordError = getPasswordValidation(registerForm.password);
        if (passwordError) {
            setNotice({ title: "Revise a senha", message: passwordError, tone: "warning" });
            return;
        }
        if (registerForm.password !== registerForm.passwordConfirmation) {
            setNotice({ title: "As senhas não coincidem", message: "Confira os dois campos e tente novamente.", tone: "warning" });
            return;
        }
        if (!catalog.cities.length) {
            setNotice({ title: "Catálogo indisponível", message: "Não foi possível carregar as cidades da planilha.", tone: "warning" });
            return;
        }

        setBusy(true);
        setNotice(null);
        try {
            const result = await appRequest("auth.register", {
                fullName: registerForm.fullName,
                publicName: registerForm.publicName,
                email: registerForm.email,
                whatsapp: registerForm.whatsapp,
                presentation: registerForm.presentation,
                cityId: registerForm.cityId,
                password: registerForm.password,
            });
            setPendingEmail(registerForm.email.trim());
            setVerificationCode(String(result.verificationCode || ""));
            setVerificationCodeInput("");
            setRegisterForm((current) => ({ ...current, password: "", passwordConfirmation: "" }));
            setMode("verify");
            setNotice({
                title: "Cadastro gravado na planilha",
                message: "A conta e o perfil foram registrados. Use o código demonstrativo abaixo para ativar o acesso.",
                tone: "info",
            });
        } catch (error) {
            setNotice({ title: "Não foi possível cadastrar", message: error.message, tone: "warning" });
        } finally {
            setBusy(false);
        }
    }

    async function submitVerification(event) {
        event.preventDefault();
        if (!/^\d{6}$/.test(verificationCodeInput)) {
            setNotice({ title: "Código inválido", message: "Digite os seis números do código demonstrativo.", tone: "warning" });
            return;
        }

        setBusy(true);
        setNotice(null);
        try {
            await appRequest("auth.verify", { email: pendingEmail, code: verificationCodeInput });
            setLoginForm({ email: pendingEmail, password: "" });
            setVerificationCode("");
            setVerificationCodeInput("");
            setMode("login");
            setNotice({
                title: "Cadastro confirmado",
                message: "Seu cadastro foi ativado na planilha. Entre com o e-mail e a senha que acabou de criar.",
                tone: "info",
            });
        } catch (error) {
            setNotice({ title: "Não foi possível confirmar", message: error.message, tone: "warning" });
        } finally {
            setBusy(false);
        }
    }

    async function submitLogin(event) {
        event.preventDefault();
        setBusy(true);
        setNotice(null);
        try {
            const result = await appRequest("auth.login", {
                email: loginForm.email,
                password: loginForm.password,
            });
            const mine = await appRequest("service.listMine", {}, result.csrfToken || "");
            establishSession({
                user: result.user,
                csrfToken: result.csrfToken || "",
                services: mine.services || [],
            });
            setLoginForm((current) => ({ ...current, password: "" }));
        } catch (error) {
            setNotice({ title: "Não foi possível entrar", message: error.message, tone: "warning" });
        } finally {
            setBusy(false);
        }
    }

    function startEditingProfile() {
        setProfileForm({
            fullName: currentUser?.fullName || "",
            publicName: currentUser?.publicName || "",
            whatsapp: currentUser?.whatsapp || "",
            presentation: currentUser?.presentation || "",
            cityId: currentUser?.cityId || "",
        });
        setIsEditingProfile(true);
        setNotice(null);
    }

    function cancelProfileEditing() {
        setProfileForm({
            fullName: currentUser?.fullName || "",
            publicName: currentUser?.publicName || "",
            whatsapp: currentUser?.whatsapp || "",
            presentation: currentUser?.presentation || "",
            cityId: currentUser?.cityId || "",
        });
        setIsEditingProfile(false);
        setNotice(null);
    }

    function updateProfilePhoto(photo) {
        updateUser({ ...currentUser, ...photo });
    }

    async function saveProfile(event) {
        event.preventDefault();
        setBusy(true);
        setNotice(null);
        try {
            const result = await appRequest("profile.update", {
                nome_completo: profileForm.fullName,
                nome_publico: profileForm.publicName,
                whatsapp: profileForm.whatsapp,
                apresentacao: profileForm.presentation,
                id_cidade_principal: profileForm.cityId,
            }, csrfToken);

            if (!result?.user || result.user.idUsuario !== currentUser?.idUsuario) {
                throw new Error("O servidor não confirmou a atualização do seu perfil.");
            }

            updateUser(result.user);
            setIsEditingProfile(false);
            setNotice({
                title: "Perfil atualizado",
                message: "Suas informações foram validadas e salvas na planilha.",
                tone: "info",
            });
        } catch (error) {
            setNotice({
                title: "Não foi possível atualizar o perfil",
                message: error.message || "Revise os dados e tente novamente.",
                tone: "warning",
            });
        } finally {
            setBusy(false);
        }
    }


    function openEmailChange() {
        setEmailChangeForm({ currentPassword: "", newEmail: pendingEmailChange?.email || "" });
        setEmailChangeCodeInput("");
        setIsEmailChangeOpen(true);
        setNotice(null);
    }

    function closeEmailChange() {
        setIsEmailChangeOpen(false);
        setEmailChangeForm({ currentPassword: "", newEmail: "" });
        setEmailChangeCodeInput("");
        setNotice(null);
    }

    function updateEmailChangeField(event) {
        const { name, value } = event.target;
        setEmailChangeForm((current) => ({ ...current, [name]: value }));
        setNotice(null);
    }

    async function requestEmailChange(event) {
        event.preventDefault();
        setBusy(true);
        setNotice(null);
        try {
            const result = await appRequest("auth.email.change.start", {
                currentPassword: emailChangeForm.currentPassword,
                newEmail: emailChangeForm.newEmail,
            }, csrfToken);

            if (!result?.requested || !result.pendingEmail || !result.verificationCode) {
                throw new Error("O servidor não confirmou a criação do código.");
            }

            setPendingEmailChange({
                email: result.pendingEmail,
                verificationCode: String(result.verificationCode),
                expiresAt: result.expiresAt || "",
            });
            setEmailChangeCodeInput("");
            setEmailChangeForm((current) => ({ ...current, currentPassword: "" }));
            setNotice({
                title: "Código demonstrativo gerado",
                message: "O novo endereço ainda não foi gravado. Confirme o código abaixo para concluir a alteração. Nenhum e-mail é enviado neste protótipo.",
                tone: "info",
            });
        } catch (error) {
            setNotice({
                title: "Não foi possível solicitar a alteração",
                message: error.message || "Confira a senha atual e o novo endereço.",
                tone: "warning",
            });
        } finally {
            setBusy(false);
        }
    }

    async function confirmEmailChange(event) {
        event.preventDefault();
        if (!/^\d{6}$/.test(emailChangeCodeInput)) {
            setNotice({ title: "Código inválido", message: "Digite os seis números apresentados nesta demonstração.", tone: "warning" });
            return;
        }

        setBusy(true);
        setNotice(null);
        try {
            const result = await appRequest("auth.email.change.confirm", {
                code: emailChangeCodeInput,
            }, csrfToken);

            if (!result?.changed || !result.requiresLogin || !result.email) {
                throw new Error("O servidor não confirmou a alteração do e-mail.");
            }

            const confirmedEmail = result.email;
            clearSession();
            setLoginForm({ email: confirmedEmail, password: "" });
            setPendingEmailChange(null);
            setEmailChangeCodeInput("");
            setIsEmailChangeOpen(false);
            setMode("login");
            setNotice({
                title: "E-mail alterado com sucesso",
                message: "Todas as sessões anteriores foram encerradas por segurança. Entre novamente usando o novo e-mail e sua senha atual.",
                tone: "info",
            });
        } catch (error) {
            setNotice({
                title: "Não foi possível confirmar o novo e-mail",
                message: error.message || "O código não foi aceito. Confira o prazo e as tentativas restantes.",
                tone: "warning",
            });
        } finally {
            setBusy(false);
        }
    }

    function requestAnotherEmailCode() {
        setPendingEmailChange(null);
        setEmailChangeCodeInput("");
        setEmailChangeForm({ currentPassword: "", newEmail: "" });
        setNotice({
            title: "Nova solicitação",
            message: "Aguarde pelo menos 60 segundos desde a solicitação anterior antes de gerar outro código.",
            tone: "info",
        });
    }

    async function refreshServices() {
        setBusy(true);
        try {
            const result = await appRequest("service.listMine", {}, csrfToken);
            setServices(result.services || []);
            setNotice({ title: "Lista atualizada", message: "Os serviços foram recarregados da planilha.", tone: "info" });
        } catch (error) {
            setNotice({ title: "Não foi possível atualizar", message: error.message, tone: "warning" });
        } finally {
            setBusy(false);
        }
    }

    function cancelServiceForm() {
        setShowServiceForm(false);
        setEditingServiceId(null);
        setNewService({
            ...EMPTY_SERVICE,
            categoryId: catalog.categories[0]?.id || "",
            cityIds: catalog.cities.some((city) => city.id === currentUser?.cityId) ? [currentUser.cityId] : (catalog.cities[0]?.id ? [catalog.cities[0].id] : []),
        });
    }

    function toggleServiceForm() {
        if (showServiceForm) {
            cancelServiceForm();
            return;
        }
        setEditingServiceId(null);
        setNewService({
            ...EMPTY_SERVICE,
            categoryId: catalog.categories[0]?.id || "",
            cityIds: catalog.cities.some((city) => city.id === currentUser?.cityId) ? [currentUser.cityId] : (catalog.cities[0]?.id ? [catalog.cities[0].id] : []),
        });
        setShowServiceForm(true);
        setNotice(null);
    }

    function startEditingService(service) {
        setEditingServiceId(service.id);
        setNewService({
            title: service.title,
            categoryId: service.categoryId || "",
            description: service.description,
            cityIds: Array.isArray(service.cityIds) ? service.cityIds.slice() : [],
        });
        setShowServiceForm(true);
        setNotice(null);
    }

    function toggleServiceCity(cityId) {
        setNewService((current) => ({
            ...current,
            cityIds: current.cityIds.includes(cityId)
                ? current.cityIds.filter((id) => id !== cityId)
                : [...current.cityIds, cityId],
        }));
    }

    async function saveService(event) {
        event.preventDefault();
        if (!newService.cityIds.length) {
            setNotice({ title: "Selecione uma cidade", message: "Escolha ao menos um município atendido pelo serviço.", tone: "warning" });
            return;
        }
        if (!newService.categoryId) {
            setNotice({ title: "Selecione uma categoria", message: "O catálogo ainda não oferece uma categoria ativa.", tone: "warning" });
            return;
        }

        setBusy(true);
        setNotice(null);
        try {
            const payload = {
                categoryId: newService.categoryId,
                title: newService.title,
                description: newService.description,
                cityIds: newService.cityIds,
            };
            if (editingServiceId) {
                await appRequest("service.update", { serviceId: editingServiceId, ...payload }, csrfToken);
            } else {
                await appRequest("service.create", payload, csrfToken);
            }

            const latest = await appRequest("service.listMine", {}, csrfToken);
            setServices(latest.services || []);

            cancelServiceForm();
            setNotice(editingServiceId
                ? { title: "Serviço atualizado", message: "As alterações foram confirmadas e salvas na planilha.", tone: "info" }
                : { title: "Serviço salvo na planilha", message: "O serviço foi cadastrado e já pode aparecer na vitrine pública.", tone: "info" });
        } catch (error) {
            setNotice({
                title: editingServiceId ? "Não foi possível atualizar" : "Não foi possível salvar",
                message: error.message,
                tone: "warning",
            });
        } finally {
            setBusy(false);
        }
    }

    async function removeService(service) {
        const confirmed = window.confirm(
            "Remover logicamente o serviço “" + service.title + "”? O registro será preservado no histórico e deixará de aparecer na vitrine.",
        );
        if (!confirmed) return;

        setBusy(true);
        setNotice(null);
        try {
            await appRequest("service.remove", {
                serviceId: service.id,
            }, csrfToken);
            const latest = await appRequest("service.listMine", {}, csrfToken);
            setServices(latest.services || []);
            setNotice({
                title: "Serviço removido",
                message: "O serviço foi retirado da vitrine. Seu registro e histórico foram preservados.",
                tone: "info",
            });
        } catch (error) {
            setNotice({ title: "Não foi possível remover", message: error.message, tone: "warning" });
        } finally {
            setBusy(false);
        }
    }

    async function toggleService(service) {
        if (service.status !== "published" && service.status !== "paused") return;
        const nextStatus = service.status === "published" ? "paused" : "published";
        setBusy(true);
        setNotice(null);
        try {
            await appRequest("service.setStatus", {
                serviceId: service.id,
                status: nextStatus,
            }, csrfToken);
            const latest = await appRequest("service.listMine", {}, csrfToken);
            setServices(latest.services || []);
        } catch (error) {
            setNotice({ title: "Não foi possível atualizar", message: error.message, tone: "warning" });
        } finally {
            setBusy(false);
        }
    }

    async function logout() {
        setBusy(true);
        try {
            await logoutSession();
            setMode("login");
            setLoginForm({ email: "", password: "" });
            setNotice({ title: "Sessão encerrada", message: "A sessão foi revogada no armazenamento.", tone: "info" });
        } catch (error) {
            setNotice({ title: "Falha ao encerrar sessão", message: error.message, tone: "warning" });
        } finally {
            setBusy(false);
        }
    }

    if (pageLoading || authLoading) {
        return (
            <main className="auth-demo-page">
                <div className="auth-demo-shell">
                    <div className="auth-demo-card">
                        <span className="section-eyebrow">Conecta Local</span>
                        <h2>Conectando ao cadastro...</h2>
                        <p>Carregando a planilha e verificando sua sessão.</p>
                    </div>
                </div>
            </main>
        );
    }

    if (currentUser) {
        return (
            <ProfessionalDashboardPage
                currentUser={currentUser}
                csrfToken={csrfToken}
                services={services}
                setServices={setServices}
                activeServices={activeServices}
                pausedServices={pausedServices}
                removedServices={removedServices}
                notice={notice}
                busy={busy}
                isEditingProfile={isEditingProfile}
                cancelProfileEditing={cancelProfileEditing}
                startEditingProfile={startEditingProfile}
                updateProfilePhoto={updateProfilePhoto}
                saveProfile={saveProfile}
                profileForm={profileForm}
                updateProfileField={updateProfileField}
                catalog={catalog}
                isEmailChangeOpen={isEmailChangeOpen}
                openEmailChange={openEmailChange}
                closeEmailChange={closeEmailChange}
                requestEmailChange={requestEmailChange}
                pendingEmailChange={pendingEmailChange}
                emailChangeForm={emailChangeForm}
                updateEmailChangeField={updateEmailChangeField}
                confirmEmailChange={confirmEmailChange}
                emailChangeCodeInput={emailChangeCodeInput}
                requestAnotherEmailCode={requestAnotherEmailCode}
                toggleServiceForm={toggleServiceForm}
                showServiceForm={showServiceForm}
                saveService={saveService}
                editingServiceId={editingServiceId}
                newService={newService}
                editingService={editingService}
                toggleServiceCity={toggleServiceCity}
                startEditingService={startEditingService}
                toggleService={toggleService}
                removeService={removeService}
                refreshServices={refreshServices}
                logout={logout}
            />
        );
    }


    const isRegister = mode === "register";
    const isVerify = mode === "verify";

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
                            {isVerify ? "Confirme seu cadastro." : isRegister ? "Seu próximo passo começa aqui." : "Bom ter você de volta."}
                        </h1>
                        <p>
                            {isVerify
                                ? "Ative sua conta demonstrativa para acessar a área profissional."
                                : isRegister
                                    ? "Cadastre seu perfil e comece a apresentar seus serviços na plataforma."
                                    : "Entre na sua conta e gerencie o perfil e os serviços cadastrados."}
                        </p>
                        <div className="auth-demo-benefit">
                            <ShieldCheck size={20} aria-hidden="true" />
                            <span>Projeto acadêmico com dados de demonstração.</span>
                        </div>
                    </section>

                    <section className="auth-demo-card" aria-label={isRegister ? "Cadastro profissional" : isVerify ? "Confirmação de e-mail" : "Login profissional"}>
                        <div className="auth-demo-card-heading">
                            <span className="auth-demo-icon"><LockKeyhole size={20} aria-hidden="true" /></span>
                            <div>
                                <span className="section-eyebrow">Conecta Local</span>
                                <h2>{isVerify ? "Confirmar cadastro" : isRegister ? "Criar conta profissional" : "Entrar na conta"}</h2>
                            </div>
                        </div>

                        {isRegister && (
                            <nav className="auth-register-progress" aria-label="Progresso do cadastro">
                                <div className="auth-register-progress-heading">
                                    <span>Etapa {registerStep} de 3</span>
                                    <strong>
                                        {registerStep === 1 ? "Seus dados" : registerStep === 2 ? "Contato e perfil" : "Segurança da conta"}
                                    </strong>
                                </div>
                                <ol className="auth-register-progress-list">
                                    {[
                                        { id: 1, label: "Seus dados" },
                                        { id: 2, label: "Contato e perfil" },
                                        { id: 3, label: "Segurança" },
                                    ].map((step) => (
                                        <li
                                            key={step.id}
                                            className={[
                                                "auth-register-progress-step",
                                                registerStep === step.id ? "is-current" : "",
                                                registerStep > step.id ? "is-complete" : "",
                                            ].filter(Boolean).join(" ")}
                                            aria-current={registerStep === step.id ? "step" : undefined}
                                        >
                                            <span className="auth-register-progress-number">
                                                {registerStep > step.id ? <Check size={14} aria-hidden="true" /> : step.id}
                                            </span>
                                            <span className="auth-register-progress-label">{step.label}</span>
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        )}

                        <div className="auth-demo-warning" role="note">
                            <Info size={17} aria-hidden="true" />
                            <p><strong>Protótipo acadêmico:</strong> use dados fictícios. O cadastro, o hash de senha, a sessão e os serviços são gravados na planilha do projeto. O código de confirmação é mostrado na tela; nenhum e-mail é enviado.</p>
                        </div>

                        {notice && (
                            <div className={"auth-demo-feedback auth-demo-feedback--" + notice.tone} role="status" aria-live="polite">
                                <strong>{notice.title}</strong>
                                <p>{notice.message}</p>
                            </div>
                        )}

                        {isVerify ? (
                            <form className="auth-demo-form" onSubmit={submitVerification}>
                                <div className="demo-code-card">
                                    <span>Código demonstrativo de confirmação</span>
                                    <strong>{verificationCode || "------"}</strong>
                                    <small>Conta: {pendingEmail}. Válido por 10 minutos e até cinco tentativas.</small>
                                </div>
                                <label htmlFor="verification-code">Digite os seis números</label>
                                <Input id="verification-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verificationCodeInput} onChange={(event) => setVerificationCodeInput(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required />
                                <Button type="submit" className="auth-demo-submit" disabled={busy}>{busy ? "Confirmando..." : "Confirmar cadastro"} <ArrowRight size={17} aria-hidden="true" /></Button>
                                <button className="auth-demo-text-button" type="button" onClick={() => switchMode("login")}>Voltar para entrar</button>
                            </form>
                        ) : isRegister ? (
                            <form className="auth-demo-form auth-register-form" onSubmit={handleRegistrationStepSubmit}>
                                {registerStep === 1 && (
                                    <div className="auth-register-step" aria-labelledby="auth-register-step-one">
                                        <div className="auth-register-step-heading">
                                            <span>ETAPA 1 · SEUS DADOS</span>
                                            <h3 id="auth-register-step-one">Como podemos chamar você?</h3>
                                            <p>Informe seu nome e como deseja aparecer para quem procura seus serviços.</p>
                                        </div>
                                        <div className="auth-demo-field">
                                            <label htmlFor="fullName">Nome completo</label>
                                            <Input id="fullName" name="fullName" autoComplete="name" placeholder="Ex.: Alex Silva" value={registerForm.fullName} onChange={updateRegisterField} minLength={2} maxLength={120} required />
                                        </div>
                                        <div className="auth-demo-field">
                                            <label htmlFor="publicName">Nome público</label>
                                            <Input id="publicName" name="publicName" autoComplete="nickname" placeholder="Ex.: Alex Reformas" value={registerForm.publicName} onChange={updateRegisterField} minLength={2} maxLength={80} required />
                                        </div>
                                    </div>
                                )}

                                {registerStep === 2 && (
                                    <div className="auth-register-step" aria-labelledby="auth-register-step-two">
                                        <div className="auth-register-step-heading">
                                            <span>ETAPA 2 · CONTATO E PERFIL</span>
                                            <h3 id="auth-register-step-two">Como clientes podem encontrar você?</h3>
                                            <p>Adicione seus meios de contato e uma apresentação breve do seu trabalho.</p>
                                        </div>
                                        <div className="auth-demo-field">
                                            <label htmlFor="register-email">E-mail</label>
                                            <div className="auth-demo-input-wrap">
                                                <Mail size={17} aria-hidden="true" />
                                                <Input id="register-email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.invalid" value={registerForm.email} onChange={updateRegisterField} maxLength={254} required />
                                            </div>
                                        </div>
                                        <div className="auth-demo-field">
                                            <label htmlFor="register-whatsapp">WhatsApp com DDD</label>
                                            <Input id="register-whatsapp" name="whatsapp" type="tel" autoComplete="tel" placeholder="Ex.: (33) 99999-9999" value={registerForm.whatsapp} onChange={updateRegisterField} maxLength={20} required />
                                        </div>
                                        <div className="auth-demo-field">
                                            <label htmlFor="register-presentation">Apresentação profissional</label>
                                            <textarea id="register-presentation" name="presentation" className="demo-auth-textarea" rows={3} minLength={10} maxLength={500} placeholder="Conte um pouco sobre os serviços que você oferece." value={registerForm.presentation} onChange={updateRegisterField} required />
                                        </div>
                                        <div className="auth-demo-field">
                                            <label htmlFor="register-city">Cidade principal</label>
                                            <select id="register-city" name="cityId" value={registerForm.cityId} onChange={updateRegisterField} disabled={!catalogReady || !catalog.cities.length} required>
                                                <option value="">Selecione sua cidade</option>
                                                {catalog.cities.map((city) => <option key={city.id} value={city.id}>{city.name} - {city.state}</option>)}
                                            </select>
                                            {catalogReady && !catalog.cities.length && (
                                                <p className="auth-demo-hint">Nenhuma cidade está disponível no catálogo neste momento.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {registerStep === 3 && (
                                    <div className="auth-register-step" aria-labelledby="auth-register-step-three">
                                        <div className="auth-register-step-heading">
                                            <span>ETAPA 3 · SEGURANÇA DA CONTA</span>
                                            <h3 id="auth-register-step-three">Proteja seu acesso.</h3>
                                            <p>Crie uma senha forte para acessar sua área profissional.</p>
                                        </div>
                                        <div className="auth-demo-field">
                                            <label htmlFor="register-password">Senha</label>
                                            <Input id="register-password" name="password" type="password" autoComplete="new-password" placeholder="Crie uma senha fictícia" value={registerForm.password} onChange={updateRegisterField} required />
                                        </div>
                                        <div className="auth-demo-field">
                                            <label htmlFor="passwordConfirmation">Confirmar senha</label>
                                            <Input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" placeholder="Repita a senha" value={registerForm.passwordConfirmation} onChange={updateRegisterField} required />
                                        </div>
                                        <p className="auth-demo-hint">Use pelo menos 15 caracteres. A senha é processada com Argon2id no servidor. Nunca use sua senha pessoal neste protótipo.</p>
                                    </div>
                                )}

                                <div className={"auth-register-navigation" + (registerStep === 1 ? " is-first-step" : "")}>
                                    {registerStep > 1 && (
                                        <Button type="button" className="auth-register-back" onClick={goToPreviousRegistrationStep} disabled={busy}>
                                            <ArrowLeft size={16} aria-hidden="true" /> Voltar
                                        </Button>
                                    )}
                                    <Button type="submit" className="auth-demo-submit auth-register-continue" disabled={busy}>
                                        {registerStep === 3
                                            ? (busy ? "Gravando cadastro..." : "Criar minha conta")
                                            : "Continuar"}
                                        <ArrowRight size={17} aria-hidden="true" />
                                    </Button>
                                </div>
                                <p className="auth-demo-switch">Já tem uma conta? <button className="auth-demo-text-button" type="button" onClick={() => switchMode("login")}>Entrar</button></p>
                            </form>
                        ) : (
                            <form className="auth-demo-form" onSubmit={submitLogin}>
                                <div className="auth-demo-field">
                                    <label htmlFor="login-email">E-mail</label>
                                    <div className="auth-demo-input-wrap">
                                        <Mail size={17} aria-hidden="true" />
                                        <Input id="login-email" name="email" type="email" autoComplete="username" placeholder="voce@exemplo.invalid" value={loginForm.email} onChange={updateLoginField} maxLength={254} required />
                                    </div>
                                </div>
                                <div className="auth-demo-field">
                                    <label htmlFor="login-password">Senha</label>
                                    <Input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Digite sua senha fictícia" value={loginForm.password} onChange={updateLoginField} required />
                                </div>
                                <Button type="submit" className="auth-demo-submit" disabled={busy}>
                                    {busy ? "Entrando..." : "Entrar na área profissional"} <ArrowRight size={17} aria-hidden="true" />
                                </Button>
                                <p className="auth-demo-switch">Ainda não tem conta? <button className="auth-demo-text-button" type="button" onClick={() => switchMode("register")}>Criar conta</button></p>
                            </form>
                        )}

                        <div className="auth-demo-footer">
                            <span>Conecta Local</span>
                            <span>Protótipo acadêmico · Google Sheets</span>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
