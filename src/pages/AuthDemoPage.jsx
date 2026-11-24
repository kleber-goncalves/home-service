import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft, ArrowRight, Check, Info, LockKeyhole, LogOut,
    Mail, Pencil, Plus, ShieldCheck, Trash2, UserRound, Wrench, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appRequest } from "@/services/app-api";
import ServiceImageManager from "@/components/professional/service-image-manager";
import ProfilePhotoManager from "@/components/professional/profile-photo-manager";
import { useAuth } from "@/hooks/use-auth";

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
            setRegisterForm((current) => ({ ...current, password: "", passwordConfirmation: "" }));
        } else {
            setLoginForm((current) => ({ ...current, password: "" }));
        }
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
        setEmailChangeForm({ currentPassword: "", newEmail: "" });
        setPendingEmailChange(null);
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
            <main className="demo-dashboard-page">
                <header className="demo-dashboard-header">
                    <a className="brand" href="/" aria-label="Conecta Local — início">
                        <span className="brand-mark"><UserRound size={21} aria-hidden="true" /></span>
                        <span className="brand-name">Conecta <strong>Local</strong></span>
                    </a>
                    <div className="demo-dashboard-header-actions">
                        <span className="demo-mode-pill"><span /> Dados salvos na planilha</span>
                        <button className="demo-logout-button" type="button" onClick={logout} disabled={busy}>
                            <LogOut size={16} aria-hidden="true" /> Sair
                        </button>
                    </div>
                </header>

                <div className="demo-dashboard-shell">
                    <div className="demo-dashboard-welcome">
                        <div>
                            <span className="section-eyebrow">Área do profissional</span>
                            <h1>Olá, {currentUser.publicName}!</h1>
                            <p>Gerencie seu perfil e os serviços cadastrados no Conecta Local.</p>
                        </div>
                        <div className="demo-profile-avatar" aria-hidden="true">
                            <UserRound size={30} />
                            {currentUser.photoUrl && <img src={currentUser.photoUrl} alt="" />}
                        </div>
                    </div>

                    {notice && (
                        <div className="demo-dashboard-notice" role="status">
                            <Info size={18} aria-hidden="true" />
                            <p><strong>{notice.title}:</strong> {notice.message}</p>
                        </div>
                    )}

                    <section className="demo-dashboard-stats" aria-label="Resumo dos serviços">
                        <article className="demo-stat-card">
                            <span>Serviços cadastrados</span>
                            <strong>{services.length}</strong>
                            <small>Registros da sua conta</small>
                        </article>
                        <article className="demo-stat-card">
                            <span>Publicados</span>
                            <strong>{activeServices}</strong>
                            <small>Visíveis na página pública</small>
                        </article>
                        <article className="demo-stat-card">
                            <span>Em pausa</span>
                            <strong>{pausedServices}</strong>
                            <small>Podem ser reativados</small>
                        </article>
                        <article className="demo-stat-card">
                            <span>Removidos</span>
                            <strong>{removedServices}</strong>
                            <small>Registros preservados</small>
                        </article>
                    </section>

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

                    <section className="demo-panel demo-services-panel">
                        <div className="demo-panel-heading">
                            <div>
                                <span className="section-eyebrow">Gestão de serviços</span>
                                <h2>Meus serviços</h2>
                            </div>
                            <Button type="button" onClick={toggleServiceForm} disabled={busy}>
                                {showServiceForm ? <X size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
                                {showServiceForm ? "Cancelar" : "Novo serviço"}
                            </Button>
                        </div>

                        {showServiceForm && (
                            <form className="demo-new-service-form" onSubmit={saveService}>
                                <h3>{editingServiceId ? "Editar serviço" : "Novo serviço"}</h3>
                                <div className="demo-new-service-fields">
                                    <label>
                                        Nome do serviço
                                        <Input value={newService.title} onChange={(event) => setNewService((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: Instalação de chuveiro" maxLength={100} minLength={5} required />
                                    </label>
                                    <label>
                                        Categoria
                                        <select value={newService.categoryId} onChange={(event) => setNewService((current) => ({ ...current, categoryId: event.target.value }))} required>
                                            {editingService && !catalog.categories.some((category) => category.id === editingService.categoryId) && (
                                                <option value={editingService.categoryId}>{editingService.category} (inativa)</option>
                                            )}
                                            {catalog.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                                        </select>
                                    </label>
                                </div>
                                <label>
                                    Descrição
                                    <textarea value={newService.description} onChange={(event) => setNewService((current) => ({ ...current, description: event.target.value }))} placeholder="Descreva o serviço oferecido." maxLength={1000} minLength={10} rows={3} required />
                                </label>
                                <fieldset className="demo-service-cities">
                                    <legend>Municípios atendidos</legend>
                                    <p>Selecione uma ou mais cidades onde este serviço pode ser encontrado.</p>
                                    <div className="demo-service-city-options">
                                        {[
                                            ...catalog.cities,
                                            ...(editingService?.cities || []).filter((city) => !catalog.cities.some((item) => item.id === city.id)),
                                        ].map((city) => (
                                            <label className="demo-service-city-option" key={city.id}>
                                                <input
                                                    type="checkbox"
                                                    checked={newService.cityIds.includes(city.id)}
                                                    onChange={() => toggleServiceCity(city.id)}
                                                    disabled={busy}
                                                />
                                                <span>{city.name} - {city.state}{city.status === "inactive" ? " (inativa — vínculo existente)" : ""}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {!catalog.cities.length && <small>Não há cidades ativas cadastradas na planilha.</small>}
                                </fieldset>
                                <Button type="submit" disabled={busy}><Check size={16} aria-hidden="true" /> {busy ? "Salvando..." : editingServiceId ? "Salvar alterações" : "Salvar na planilha"}</Button>
                            </form>
                        )}

                        <div className="demo-service-list">
                            {services.length ? services.map((service) => {
                                const canToggle = service.status === "published" || service.status === "paused";
                                const canEdit = ["draft", "published", "paused"].includes(service.status);
                                const canRemove = canEdit;
                                return (
                                    <article className="demo-service-item" key={service.id}>
                                        <div className="demo-service-icon"><Wrench size={19} aria-hidden="true" /></div>
                                        <div className="demo-service-copy">
                                            <div className="demo-service-title-row">
                                                <h3>{service.title}</h3>
                                                <span className={`demo-service-status is-${service.status}`}>
                                                    {formatStatus(service.status)}
                                                </span>
                                            </div>
                                            <span className="demo-service-category">{service.category}</span>
                                            <p>{service.description}</p>
                                            {service.city && <span className="demo-service-city-summary">Atende: {service.city}</span>}
                                            {canEdit && (
                                                <ServiceImageManager
                                                    service={service}
                                                    csrfToken={csrfToken}
                                                    onServicesChange={setServices}
                                                />
                                            )}
                                        </div>
                                        <div className="demo-service-actions">
                                            {canEdit && (
                                                <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => startEditingService(service)}>
                                                    <Pencil size={14} aria-hidden="true" /> Editar
                                                </Button>
                                            )}
                                            {canToggle && (
                                                <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => toggleService(service)}>
                                                    {service.status === "published" ? "Pausar" : "Publicar"}
                                                </Button>
                                            )}
                                            {canRemove && (
                                                <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => removeService(service)}>
                                                    <Trash2 size={14} aria-hidden="true" /> Remover
                                                </Button>
                                            )}
                                        </div>
                                    </article>
                                );
                            }) : (
                                <div className="empty-results">
                                    <h3>Você ainda não cadastrou serviços</h3>
                                    <p>Adicione seu primeiro serviço para começar a aparecer na vitrine pública.</p>
                                </div>
                            )}
                        </div>
                        <div className="demo-services-refresh">
                            <button type="button" onClick={refreshServices} disabled={busy}>Atualizar lista</button>
                        </div>
                    </section>

                    <footer className="demo-dashboard-footer">
                        <span>Conecta Local</span>
                        <span>Protótipo acadêmico · Dados fictícios · Google Sheets</span>
                    </footer>
                </div>
            </main>
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
                            <form className="auth-demo-form" onSubmit={submitRegistration}>
                                <div className="auth-demo-fields-grid">
                                    <div className="auth-demo-field">
                                        <label htmlFor="fullName">Nome completo</label>
                                        <Input id="fullName" name="fullName" autoComplete="off" placeholder="Ex.: Alex Silva" value={registerForm.fullName} onChange={updateRegisterField} minLength={2} maxLength={120} required />
                                    </div>
                                    <div className="auth-demo-field">
                                        <label htmlFor="publicName">Nome público</label>
                                        <Input id="publicName" name="publicName" autoComplete="off" placeholder="Ex.: Alex Reformas" value={registerForm.publicName} onChange={updateRegisterField} minLength={2} maxLength={80} required />
                                    </div>
                                </div>
                                <div className="auth-demo-field">
                                    <label htmlFor="register-email">E-mail fictício</label>
                                    <div className="auth-demo-input-wrap">
                                        <Mail size={17} aria-hidden="true" />
                                        <Input id="register-email" name="email" type="email" autoComplete="off" placeholder="voce@exemplo.invalid" value={registerForm.email} onChange={updateRegisterField} maxLength={254} required />
                                    </div>
                                </div>
                                <div className="auth-demo-field">
                                    <label htmlFor="register-whatsapp">WhatsApp com DDD</label>
                                    <Input id="register-whatsapp" name="whatsapp" type="tel" autoComplete="off" placeholder="Ex.: (33) 99999-9999" value={registerForm.whatsapp} onChange={updateRegisterField} maxLength={20} required />
                                </div>
                                <div className="auth-demo-field">
                                    <label htmlFor="register-presentation">Apresentação profissional</label>
                                    <textarea id="register-presentation" name="presentation" className="demo-auth-textarea" rows={3} minLength={10} maxLength={500} placeholder="Conte um pouco sobre os serviços que você oferece." value={registerForm.presentation} onChange={updateRegisterField} required />
                                </div>
                                <div className="auth-demo-fields-grid">
                                    <div className="auth-demo-field">
                                        <label htmlFor="register-city">Cidade principal</label>
                                        <select id="register-city" name="cityId" value={registerForm.cityId} onChange={updateRegisterField} required>
                                            {catalog.cities.map((city) => <option key={city.id} value={city.id}>{city.name} - {city.state}</option>)}
                                        </select>
                                    </div>
                                    <div className="auth-demo-field">
                                        <label htmlFor="register-password">Senha (mínimo 15 caracteres)</label>
                                        <Input id="register-password" name="password" type="password" autoComplete="new-password" placeholder="Crie uma senha fictícia" value={registerForm.password} onChange={updateRegisterField} required />
                                    </div>
                                </div>
                                <div className="auth-demo-field">
                                    <label htmlFor="passwordConfirmation">Confirmar senha</label>
                                    <Input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" placeholder="Repita a senha" value={registerForm.passwordConfirmation} onChange={updateRegisterField} required />
                                </div>
                                <p className="auth-demo-hint">Senha processada com Argon2id no servidor. Nunca use sua senha pessoal neste protótipo.</p>
                                <Button type="submit" className="auth-demo-submit" disabled={busy || !catalogReady || !catalog.cities.length}>
                                    {busy ? "Gravando cadastro..." : "Cadastrar e salvar na planilha"} <ArrowRight size={17} aria-hidden="true" />
                                </Button>
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
