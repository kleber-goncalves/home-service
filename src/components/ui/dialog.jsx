import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Dialog({ open, onOpenChange, ariaLabelledBy, children, className }) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const element = dialogRef.current;
        if (!element) return;

        if (open && !element.open) element.showModal();
        else if (!open && element.open) element.close();
    }, [open]);

    function requestClose() {
        onOpenChange?.(false);
    }

    return (
        <dialog
            ref={dialogRef}
            className={cn("ui-dialog", className)}
            aria-labelledby={ariaLabelledBy}
            onCancel={(event) => {
                event.preventDefault();
                requestClose();
            }}
            onClose={requestClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) requestClose();
            }}
        >
            {children}
        </dialog>
    );
}

export function DialogContent({ className, children, ...props }) {
    return (
        <div className={cn("ui-dialog__content", className)} {...props}>
            {children}
        </div>
    );
}

export function DialogHeader({ className, children, ...props }) {
    return (
        <header className={cn("ui-dialog__header", className)} {...props}>
            {children}
        </header>
    );
}

export function DialogTitle({ className, children, ...props }) {
    return (
        <h2 className={cn("ui-dialog__title", className)} {...props}>
            {children}
        </h2>
    );
}

export function DialogDescription({ className, children, ...props }) {
    return (
        <p className={cn("ui-dialog__description", className)} {...props}>
            {children}
        </p>
    );
}

export function DialogFooter({ className, children, ...props }) {
    return (
        <footer className={cn("ui-dialog__footer", className)} {...props}>
            {children}
        </footer>
    );
}
