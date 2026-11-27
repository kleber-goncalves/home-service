import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatImageSize } from "./image-utils.js";

export default function ServiceImageQueue({ files, disabled = false, onEdit, onRemove }) {
    if (!files.length) return null;

    return (
        <div className="demo-service-image-pending">
            {files.map((item) => (
                <div className="demo-service-image-pending-item" key={item.id}>
                    <img src={item.previewUrl} alt={"Prévia de " + item.file.name} />
                    <span title={item.file.name}>{item.file.name}</span>
                    <small>{formatImageSize(item.file.size)}</small>
                    <div className="demo-service-image-pending-actions">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(item)} disabled={disabled} aria-label={"Editar " + item.file.name}>
                            <Pencil size={14} aria-hidden="true" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(item)} disabled={disabled} aria-label={"Retirar " + item.file.name}>
                            <Trash2 size={14} aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
