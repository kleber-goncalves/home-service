import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export const Slider = forwardRef(function Slider(
    {
        id,
        label,
        value,
        min = 0,
        max = 100,
        step = 1,
        formatValue,
        onValueChange,
        className,
        ...props
    },
    ref,
) {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
        <label className={cn("ui-slider", className)} htmlFor={inputId}>
            <span className="ui-slider__heading">
                <span>{label}</span>
                <output htmlFor={inputId}>
                    {formatValue ? formatValue(value) : value}
                </output>
            </span>
            <input
                ref={ref}
                id={inputId}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => onValueChange?.(Number(event.target.value))}
                {...props}
            />
        </label>
    );
});
