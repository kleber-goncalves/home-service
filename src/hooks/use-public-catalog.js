import { useEffect, useState } from "react";
import { mapPublicService } from "@/lib/public-catalog";
import { appRequest } from "@/services/app-api";
const initialState = { services: [], categories: [], cities: [], loading: true, error: false };
export default function usePublicCatalog() {
    const [catalog, setCatalog] = useState(initialState);
    useEffect(() => {
        let active = true;
        async function loadCatalog() {
            const [servicesResult, catalogResult] = await Promise.allSettled([appRequest("public.services"), appRequest("public.catalog")]);
            if (!active) return;
            const servicesOk = servicesResult.status === "fulfilled" && Array.isArray(servicesResult.value);
            const catalogOk = catalogResult.status === "fulfilled" && catalogResult.value;
            setCatalog({
                services: servicesOk ? servicesResult.value.map(mapPublicService) : [],
                categories: catalogOk && Array.isArray(catalogResult.value.categories) ? catalogResult.value.categories : [],
                cities: catalogOk && Array.isArray(catalogResult.value.cities) ? catalogResult.value.cities : [],
                loading: false, error: !servicesOk || !catalogOk,
            });
        }
        loadCatalog();
        return () => { active = false; };
    }, []);
    return catalog;
}
