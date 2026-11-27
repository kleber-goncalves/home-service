import { ImagePlus } from "lucide-react";

export default function ServiceImagePicker({ disabled = false, remainingSlots, onSelect }) {
    return (
        <label className="demo-service-image-picker">
            <ImagePlus size={17} aria-hidden="true" />
            <span>Selecionar imagens</span>
            <small>JPG, PNG ou WebP · até 5 MB por arquivo · mais {remainingSlots} disponível(is)</small>
            <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={onSelect}
                disabled={disabled || remainingSlots <= 0}
            />
        </label>
    );
}
