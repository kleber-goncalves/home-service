import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Info, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMPTY_FORM = {
    fullName: "",
    publicName: "",
    email: "",
    password: "",
    passwordConfirmation: "",
};

function getPasswordValidation(password) {
    if (typeof password !== "string") return "Informe uma senha de demonstração.";
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

export default function AuthDemoPage({ initialMode = "login" }) {
    const [mode, setMode] = useState(initialMode === "register" ? "register" : "login");
    const [form, setForm] = useState(EMPTY_FORM);
    const [notice, setNotice] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    function updateField(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
        setNotice(null);
    }

    function switchMode(nextMode) {
        setMode(nextMode);
        setNotice(null);
        setShowPassword(false);
        setForm(EMPTY_FORM);
    }

    function showLocalOnlyNotice(title, message, tone = "info") {
        setNotice({ title, message, tone });
        setForm((current) => ({ ...current, password: "", passwordConfirmation: "" }));
        setShowPassword(false);
    }

    function handleRegister(event) {
        event.preventDefault();

        const passwordError = getPasswordValidation(form.password);
        if (passwordError) {
            showLocalOnlyNotice("Revise a senha de demonstração", passwordError, "warning");
            return;
        }
        if (form.password !== form.passwordConfirmation) {
            showLocalOnlyNotice("As senhas não coincidem", "Confira os dois campos e tente novamente.", "warning");
            return;
        }

        showLocalOnlyNotice(
            "Formulário validado nesta interface",
            "Nenhum cadastro foi enviado ou salvo. A integração com Apps Script, a criação da conta e a etapa de confirmação por código serão implementadas depois da validação do fluxo de sessão.",
        );
    }

    function handleLogin(event) {
        event.preventDefault();
        if (!form.email.trim() || !form.password) {
            showLocalOnlyNotice("Preencha os campos", "Informe um e-mail e uma senha fictícios para testar a apresentação do formulário.", "warning");
            return;
        }

        showLocalOnlyNotice(
            "Interface de login pronta para integração",
            "A autenticação ainda não está conectada ao backend. Nenhuma credencial foi transmitida, validada ou armazenada.",
        );
    }

    function handleRecovery(event) {
        event.preventDefault();
        showLocalOnlyNotice(
            "Solicitação não enviada",
            "A recuperação de senha e a emissão de código de demonstração serão conectadas ao Apps Script em uma etapa posterior.",
        );
    }

    const isRegister = mode === "register";
    const isRecovery = mode === "recovery";

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
                            {isRecovery ? "Recupere seu acesso." : isRegister ? "Seu próximo passo começa aqui." : "Bom ter você de volta."}
                        </h1>
                        <p>
                            {isRecovery
                                ? "Uma experiência de recuperação está sendo preparada para a demonstração."
                                : isRegister
                                    ? "Apresente seu trabalho e prepare seu espaço profissional no Conecta Local."
                                    : "Acesse a área demonstrativa do profissional e acompanhe a evolução da plataforma."}
                        </p>
                        <div className="auth-demo-benefit">
                            <ShieldCheck size={20} aria-hidden="true" />
                            <span>Projeto acadêmico com dados exclusivamente fictícios.</span>
                        </div>
                    </section>

                    <section className="auth-demo-card" aria-label={isRegister ? "Cadastro demonstrativo" : isRecovery ? "Recuperação demonstrativa" : "Login demonstrativo"}>
                        <div className="auth-demo-card-heading">
                            <span className="auth-demo-icon"><LockKeyhole size={20} aria-hidden="true" /></span>
                            <div>
                                <span className="section-eyebrow">Ambiente demonstrativo</span>
                                <h2>{isRecovery ? "Recuperar acesso" : isRegister ? "Criar conta profissional" : "Entrar na conta"}</h2>
                            </div>
                        </div>

                        <div className="auth-demo-warning" role="note">
                            <Info size={17} aria-hidden="true" />
                            <p><strong>Não use sua senha real.</strong> Esta tela ainda não envia dados ao servidor nem persiste informações. Utilize somente dados fictícios.</p>
                        </div>

                        {notice && (
                            <div className={`auth-demo-feedback auth-demo-feedback--${notice.tone}`} role="status" aria-live="polite">
                                <strong>{notice.title}</strong>
                                <p>{notice.message}</p>
                            </div>
                        )}

                        {isRecovery ? (
                            <form className="auth-demo-form" onSubmit={handleRecovery}>
                                <label htmlFor="recovery-email">E-mail da conta</label>
                                <div className="auth-demo-input-wrap">
                                    <Mail size={17} aria-hidden="true" />
                                    <Input id="recovery-email" name="email" type="email" autoComplete="off" placeholder="voce@exemplo.invalid" value={form.email} onChange={updateField} required />
                                </div>
                                <Button type="submit" className="auth-demo-submit">Continuar <ArrowRight size={17} aria-hidden="true" /></Button>
                                <button className="auth-demo-text-button" type="button" onClick={() => switchMode("login")}>Voltar para entrar</button>
                            </form>
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
                                    <label htmlFor="register-email">E-mail</label>
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
                                <p className="auth-demo-hint">A validação de senha nesta tela é apenas visual/local. Ela não substitui as regras do backend.</p>
                                <Button type="submit" className="auth-demo-submit">Validar formulário <ArrowRight size={17} aria-hidden="true" /></Button>
                                <p className="auth-demo-switch">Já tem uma conta? <button className="auth-demo-text-button" type="button" onClick={() => switchMode("login")}>Entrar</button></p>
                            </form>
                        ) : (
                            <form className="auth-demo-form" onSubmit={handleLogin}>
                                <div className="auth-demo-field">
                                    <label htmlFor="login-email">E-mail</label>
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
                                        <Input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="off" placeholder="Digite uma senha fictícia" value={form.password} onChange={updateField} required />
                                        <button className="auth-demo-password-toggle" type="button" aria-label={showPassword ? "Ocultar senha" : "Exibir senha"} onClick={() => setShowPassword((value) => !value)}>
                                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                        </button>
                                    </div>
                                </div>
                                <Button type="submit" className="auth-demo-submit">Testar interface de login <ArrowRight size={17} aria-hidden="true" /></Button>
                                <p className="auth-demo-switch">Ainda não tem conta? <button className="auth-demo-text-button" type="button" onClick={() => switchMode("register")}>Criar conta</button></p>
                            </form>
                        )}

                        <div className="auth-demo-footer">
                            <span>Conecta Local</span>
                            <span>Protótipo acadêmico · Autenticação não conectada</span>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
