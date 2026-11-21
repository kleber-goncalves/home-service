export function navigateTo(path, { replace = false, scroll = true } = {}) {
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin) {
        window.location.assign(url);
        return;
    }
    const nextPath = url.pathname + url.search + url.hash;
    if (replace) window.history.replaceState({}, "", nextPath);
    else window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
    if (scroll) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
            if (url.hash) {
                document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                    block: "start",
                });
            } else window.scrollTo({ top: 0, behavior: "auto" });
        }));
    }
}
export function getCurrentRoute() {
    return window.location.pathname + window.location.search + window.location.hash;
}
