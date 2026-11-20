import { useEffect, useMemo, useState } from "react";
import SiteHeader from "@/components/home/site-header";
import HeroSearch from "@/components/home/hero-search";
import {
    AboutSection,
    CategorySection,
    FAQSection,
    HowItWorks,
    PopularServices,
    ProfessionalSection,
    ProfessionalsCTA,
    SiteFooter,
} from "@/components/home/home-sections";
import { professionals as exampleProfessionals } from "@/data/homepage";
import { appRequest } from "@/services/app-api";

function imageForCategory(category) {
    const normalized = String(category || "").toLocaleLowerCase("pt-BR");
    const match = exampleProfessionals.find((item) => {
        const candidate = item.category.toLocaleLowerCase("pt-BR");
        return normalized.includes(candidate) || candidate.includes(normalized);
    });
    if (match) return match.image;
    if (/hidraul|encan/.test(normalized)) return exampleProfessionals[1].image;
    if (/limpez|diar/.test(normalized)) return exampleProfessionals[2].image;
    if (/limpez|diar/.test(normalized)) return exampleProfessionals[2].image;
    if (/pint|reform/.test(normalized)) return exampleProfessionals[3].image;
    if (/jardin|paisag/.test(normalized)) return exampleProfessionals[4].image;
    return exampleProfessionals[0].image;
}

function mapPublicService(service) {
    return {
        id: service.id,
        category: service.category,
        title: service.title,
        description: service.description,
        image: imageForCategory(service.category),
        imageAlt: "Imagem ilustrativa de " + service.category + ".",
        city: Array.isArray(service.cities) && service.cities.length
            ? service.cities.map((item) => item.name + " - " + item.state).join(", ")
            : service.city,
        cityIds: Array.isArray(service.cityIds) ? service.cityIds : [],
        cities: Array.isArray(service.cities) ? service.cities : [],
        professionalName: service.professional,
        whatsapp: service.whatsapp,
        isPersisted: true,
    };
}

export default function HomePage() {
    const [query, setQuery] = useState("");
    const [city, setCity] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("todas");
    const [hasSearched, setHasSearched] = useState(false);
    const [realServices, setRealServices] = useState([]);
    const [catalogCategories, setCatalogCategories] = useState([]);

    useEffect(() => {
        let active = true;

        async function loadPublicData() {
            const [servicesResult, catalogResult] = await Promise.allSettled([
                appRequest("public.services"),
                appRequest("public.catalog"),
            ]);

            if (!active) return;

            if (servicesResult.status === "fulfilled" && Array.isArray(servicesResult.value)) {
                setRealServices(servicesResult.value.map(mapPublicService));
            }
            if (catalogResult.status === "fulfilled" && Array.isArray(catalogResult.value?.categories)) {
                setCatalogCategories(catalogResult.value.categories);
            }
        }

        loadPublicData();
        return () => { active = false; };
    }, []);

    const sourceProfessionals = useMemo(
        () => [
            ...exampleProfessionals.map((item) => ({
                ...item,
                city: "Exemplo de localidade",
                professionalName: "",
                isPersisted: false,
            })),
            ...realServices,
        ],
        [realServices],
    );

    const visibleProfessionals = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
        const normalizedCity = city.trim().toLocaleLowerCase("pt-BR");

        return sourceProfessionals.filter((professional) => {
            const matchesCategory = selectedCategory === "todas" || professional.category === selectedCategory;
            const searchText = [
                professional.category,
                professional.title,
                professional.description,
                professional.professionalName,
                professional.city,
            ].join(" ").toLocaleLowerCase("pt-BR");
            const matchesQuery = !normalizedQuery || searchText.includes(normalizedQuery);
            const matchesCity = !normalizedCity || String(professional.city || "").toLocaleLowerCase("pt-BR").includes(normalizedCity);
            return matchesCategory && matchesQuery && matchesCity;
        });
    }, [sourceProfessionals, query, city, selectedCategory]);

    function scrollToExamples() {
        window.requestAnimationFrame(() => {
            document.getElementById("profissionais")?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                block: "start",
            });
        });
    }

    function submitSearch(event) {
        event.preventDefault();
        setHasSearched(true);
        scrollToExamples();
    }

    function selectCategory(category) {
        setSelectedCategory(category);
        setHasSearched(true);
        scrollToExamples();
    }

    function clearFilters() {
        setQuery("");
        setCity("");
        setSelectedCategory("todas");
        setHasSearched(false);
    }

    return (
        <>
            <SiteHeader />
            <main id="conteudo" tabIndex="-1">
                <HeroSearch query={query} city={city} onQueryChange={setQuery} onCityChange={setCity} onSubmit={submitSearch} />
                <CategorySection
                    selectedCategory={selectedCategory}
                    onSelect={selectCategory}
                    catalogCategories={catalogCategories}
                />
                <ProfessionalSection
                    professionals={visibleProfessionals}
                    hasSearched={hasSearched}
                    query={query}
                    city={city}
                    selectedCategory={selectedCategory}
                    onClearFilters={clearFilters}
                    hasRealServices={realServices.length > 0}
                />
                <PopularServices />
                <AboutSection />
                <HowItWorks />
                <ProfessionalsCTA />
                <FAQSection />
            </main>
            <SiteFooter />
        </>
    );
}
