import { useEffect, useState } from "react";
import AuthDemoPage from "@/pages/AuthDemoPage";
import CategoriesPage from "@/pages/CategoriesPage";
import DashboardVisualPreviewPage from "@/pages/DashboardVisualPreviewPage";
import HomePage from "@/pages/HomePage";
import NotFoundPage from "@/pages/NotFoundPage";
import Poc01Page from "@/pages/Poc01Page";
import ServiceDetailPage from "@/pages/ServiceDetailPage";
import ServicesPage from "@/pages/ServicesPage";
import { getCurrentRoute } from "@/lib/navigation";

function decodeRouteSegment(segment) {
    try {
        return decodeURIComponent(segment);
    } catch {
        return null;
    }
}

export default function App() {
    const [route, setRoute] = useState(getCurrentRoute);

    useEffect(() => {
        function handlePopState() {
            setRoute(getCurrentRoute());
        }
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    const currentUrl = new URL(route, window.location.origin);
    const params = currentUrl.searchParams;
    const pathname = currentUrl.pathname.replace(/\/+$/, "") || "/";

    if (params.get("poc") === "01") return <Poc01Page />;
    if (params.get("auth") === "demo") return <AuthDemoPage initialMode={params.get("mode")} />;
    if (pathname === "/dashboard-visual-preview") return <DashboardVisualPreviewPage />;
    if (pathname === "/") return <HomePage />;
    if (pathname === "/servicos") return <ServicesPage key={route} />;
    if (pathname === "/categorias") return <CategoriesPage />;

    const serviceMatch = pathname.match(/^\/servicos\/([^/]+)$/);
    if (serviceMatch) {
        const serviceId = decodeRouteSegment(serviceMatch[1]);
        if (!serviceId) return <NotFoundPage />;
        return <ServiceDetailPage key={serviceId} serviceId={serviceId} />;
    }

    return <NotFoundPage />;
}
