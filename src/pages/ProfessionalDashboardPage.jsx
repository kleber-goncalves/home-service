import {
    Check, Info, LogOut, Mail, Pencil, Plus, ShieldCheck, Trash2, UserRound, Wrench, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ServiceImageManager from "@/components/professional/service-image-manager";
import ProfilePhotoManager from "@/components/professional/profile-photo-manager";

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
    requestAnotherEmailCode,
    toggleServiceForm,
    showServiceForm,
    saveService,
    editingServiceId,
    newService,
    editingService,
    toggleServiceCity,
    startEditingService,
    toggleService,
    removeService,
    refreshServices,
    logout,
}) {
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
