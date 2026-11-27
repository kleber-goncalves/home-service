import { Pencil, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfessionalServiceActions({
    service,
    busy = false,
    onEdit,
    onToggle,
    onRemove,
}) {
    const canEdit = ["draft", "published", "paused"].includes(service.status);
    const canToggle = service.status === "published" || service.status === "paused";
    const canRemove = canEdit;

    return (
        <div className="professional-service-card-actions" aria-label={"Ações para " + service.title}>
            {canEdit && (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => onEdit(service)}
                >
                    <Pencil size={14} aria-hidden="true" />
                    Editar
                </Button>
            )}
            {canToggle && (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => onToggle(service)}
                >
                    {service.status === "published"
                        ? <Pause size={14} aria-hidden="true" />
                        : <Play size={14} aria-hidden="true" />}
                    {service.status === "published" ? "Pausar" : "Publicar"}
                </Button>
            )}
            {canRemove && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="professional-service-remove-action"
                    disabled={busy}
                    onClick={() => onRemove(service)}
                >
                    <Trash2 size={14} aria-hidden="true" />
                    Remover
                </Button>
            )}
        </div>
    );
}
