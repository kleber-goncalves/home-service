import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
    return <div className={cn("ui-card", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
    return <div className={cn("ui-card-content", className)} {...props} />;
}
