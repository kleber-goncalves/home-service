import { useEffect, useId, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

function serializeServiceForm(form) {
    return JSON.stringify({
        title: String(form?.title || ""),
        categoryId: String(form?.categoryId || ""),
        description: String(form?.description || ""),
        cityIds: Array.isArray(form?.cityIds) ? [...form.cityIds].sort() : [],
    });
}

export default function ProfessionalServiceFormDialog({
    open,
    catalog,
    editingService,
    editingServiceId,
    serviceForm,
    serviceFormError,
    busy = false,
    onServiceFormChange,
    onToggleCity,
    onSubmit,
    onClose,
}) {
    const titleId = useId();
    const descriptionId = useId();
    const [baseline, setBaseline] = useState(null);
    const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
    const isEditing = Boolean(editingServiceId);
    const categories = Array.isArray(catalog?.categories) ? catalog.categories : [];
    const cities = [
        ...(Array.isArray(catalog?.cities) ? catalog.cities : []),
        ...(editingService?.cities || []).filter(
            (city) => !(catalog?.cities || []).some((item) => item.id === city.id),
        ),
    ];
    const isDirty = baseline !== null && baseline !== serializeServiceForm(serviceForm);

    useEffect(() => {
        if (open && baseline === null) {
            setBaseline(serializeServiceForm(serviceForm));
        } else if (!open && baseline !== null) {
            setBaseline(null);
            setShowDiscardConfirmation(false);
        }
    }, [open, baseline, serviceForm]);

    function requestClose() {
        if (busy) return;
        if (isDirty) {
            setShowDiscardConfirmation(true);
            return;
        }
        onClose();
    }

    function discardChanges() {
        setShowDiscardConfirmation(false);
        onClose();
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen && open) requestClose();
            }}
            ariaLabelledBy={titleId}
            className="service-form-dialog"
        >
            <DialogContent className="service-form-dialog__content">
                <DialogHeader className="service-form-dialog__header">
                    <div>
                        <span className="service-form-dialog__eyebrow">
                            {isEditing ? "ATUALIZAÇÃO DO ANÚNCIO" : "NOVO ANÚNCIO"}
                        </span>
                        <DialogTitle id={titleId}>
                            {isEditing ? "Editar serviço" : "Criar novo serviço"}
                        </DialogTitle>
                        <DialogDescription id={descriptionId}>
                            {isEditing
                                ? "Atualize as informações que os clientes encontram na vitrine."
                                : "Apresente seu trabalho com informações claras para os clientes."}
                        </DialogDescription>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Fechar formulário"
                        onClick={requestClose}
                        disabled={busy}
                    >
                        <X size={18} aria-hidden="true" />
                    </Button>
                </DialogHeader>

                {showDiscardConfirmation ? (
                    <div className="service-form-dialog__discard">
                        <div className="service-form-dialog__discard-icon" aria-hidden="true">
                            <X size={20} />
                        </div>
                        <h3>Descartar alterações?</h3>
                        <p>As informações que você preencheu ainda não foram salvas e serão perdidas.</p>
                        <div className="service-form-dialog__discard-actions">
                            <Button type="button" variant="outline" onClick={() => setShowDiscardConfirmation(false)}>
                                Continuar editando
                            </Button>
                            <Button type="button" onClick={discardChanges}>
                                Descartar alterações
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form
                        className="demo-new-service-form service-form-dialog__form"
                        onSubmit={onSubmit}
                        aria-describedby={descriptionId}
                    >
                        <div className="service-form-dialog__body">
                            <div className="service-form-dialog__section-heading">
                                <span>01</span>
                                <div>
                                    <h3>Informações básicas</h3>
                                    <p>Defina como seu serviço será apresentado.</p>
                                </div>
                            </div>

                            <div className="demo-new-service-fields">
                                <label htmlFor="service-form-title">
                                    Nome do serviço
                                    <Input
                                        id="service-form-title"
                                        autoFocus
                                        value={serviceForm.title}
                                        onChange={(event) => onServiceFormChange("title", event.target.value)}
                                        placeholder="Ex.: Instalação de chuveiro"
                                        maxLength={100}
                                        minLength={5}
                                        required
                                        disabled={busy}
                                    />
                                </label>
                                <label htmlFor="service-form-category">
                                    Categoria
                                    <select
                                        id="service-form-category"
                                        value={serviceForm.categoryId}
                                        onChange={(event) => onServiceFormChange("categoryId", event.target.value)}
                                        required
                                        disabled={busy}
                                    >
                                        {editingService && !categories.some((category) => category.id === editingService.categoryId) && (
                                            <option value={editingService.categoryId}>
                                                {editingService.category} (inativa)
                                            </option>
                                        )}
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <label htmlFor="service-form-description">
                                Descrição
                                <textarea
                                    id="service-form-description"
                                    value={serviceForm.description}
                                    onChange={(event) => onServiceFormChange("description", event.target.value)}
                                    placeholder="Descreva o serviço oferecido, sua experiência e o que o cliente pode esperar."
                                    maxLength={1000}
                                    minLength={10}
                                    rows={4}
                                    required
                                    disabled={busy}
                                />
                            </label>

                            <div className="service-form-dialog__section-heading">
                                <span>02</span>
                                <div>
                                    <h3>Área de atendimento</h3>
                                    <p>Selecione todos os municípios onde você oferece este serviço.</p>
                                </div>
                            </div>

                            <fieldset className="demo-service-cities">
                                <legend>Municípios atendidos</legend>
                                <div className="service-form-dialog__city-options">
                                    {cities.map((city) => (
                                        <label className="demo-service-city-option" key={city.id}>
                                            <input
                                                type="checkbox"
                                                checked={serviceForm.cityIds.includes(city.id)}
                                                onChange={() => onToggleCity(city.id)}
                                                disabled={busy}
                                            />
                                            <span>
                                                {city.name} - {city.state}
                                                {city.status === "inactive" ? " (inativa — vínculo existente)" : ""}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                {!categories.length && (
                                    <small>Não há categorias ativas cadastradas no catálogo.</small>
                                )}
                                {!cities.length && (
                                    <small>Não há municípios disponíveis no catálogo.</small>
                                )}
                                <span className="demo-service-city-summary">
                                    {serviceForm.cityIds.length} município(s) selecionado(s). Selecione ao menos um.
                                </span>
                            </fieldset>

                            {serviceFormError && (
                                <div className="service-form-dialog__error" role="alert">
                                    <strong>{serviceFormError.title}</strong>
                                    <p>{serviceFormError.message}</p>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="service-form-dialog__footer">
                            <Button type="button" variant="outline" onClick={requestClose} disabled={busy}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={busy}>
                                <Check size={16} aria-hidden="true" />
                                {busy
                                    ? "Salvando..."
                                    : isEditing
                                        ? "Salvar alterações"
                                        : "Cadastrar serviço"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
