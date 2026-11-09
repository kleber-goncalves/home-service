import { useMemo, useState } from "react";
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
import { professionals } from "@/data/homepage";

export default function HomePage() {
    const [query, setQuery] = useState("");
    const [city, setCity] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("todas");
    const [hasSearched, setHasSearched] = useState(false);

    const visibleProfessionals = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase("pt-BR");
        return professionals.filter((professional) => {
            const matchesCategory = selectedCategory === "todas" || professional.category === selectedCategory;
            const searchText = [professional.category, professional.title, professional.description]
                .join(" ").toLocaleLowerCase("pt-BR");
            return matchesCategory && (!normalized || searchText.includes(normalized));
        });
    }, [query, selectedCategory]);

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
                <CategorySection selectedCategory={selectedCategory} onSelect={selectCategory} />
                <ProfessionalSection
                    professionals={visibleProfessionals}
                    hasSearched={hasSearched}
                    query={query}
                    city={city}
                    selectedCategory={selectedCategory}
                    onClearFilters={clearFilters}
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
