import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
    primary: "ui-button--primary",
    secondary: "ui-button--secondary",
    outline: "ui-button--outline",
    ghost: "ui-button--ghost",
};
const sizes = {
    default: "ui-button--default",
    sm: "ui-button--sm",
    lg: "ui-button--lg",
};

export const Button = forwardRef(function Button(
    { className, variant = "primary", size = "default", type = "button", children, ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            className={cn("ui-button", variants[variant] ?? variants.primary, sizes[size] ?? sizes.default, className)}
            {...props}
        >
            {children}
        </button>
    );
});
