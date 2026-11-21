import { navigateTo } from "@/lib/navigation";
export default function AppLink({ to, href, onClick, target, children, ...props }) {
    const destination = to || href || "/";
    function handleClick(event) {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
            || (target && target !== "_self") || props.download) return;
        let url;
        try { url = new URL(destination, window.location.href); } catch { return; }
        if (url.origin !== window.location.origin) return;
        event.preventDefault();
        navigateTo(url.pathname + url.search + url.hash);
    }
    return <a href={destination} target={target} onClick={handleClick} {...props}>{children}</a>;
}
