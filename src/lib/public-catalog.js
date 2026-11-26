import { professionals as demoServiceDefinitions } from "../data/homepage.js";

function normalizeSearch(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function categoryFallbackId(name) {
    return "demo-category-" + normalizeSearch(name).replace(/\s+/g, "-");
}

export function createDemoCategories() {
    const seen = new Set();

    return demoServiceDefinitions.reduce((result, service) => {
        const normalizedName = normalizeSearch(service.category);
        if (seen.has(normalizedName)) return result;
        seen.add(normalizedName);
        result.push({
            id: categoryFallbackId(service.category),
            name: service.category,
            isDemo: true,
        });
        return result;
    }, []);
}

export function createDemoServices(categories = []) {
    return demoServiceDefinitions.map((service) => {
        const normalizedCategory = normalizeSearch(service.category);
        const matchingCategory = categories.find(
            (category) => normalizeSearch(category.name) === normalizedCategory,
        );

        return {
            id: "demo-" + service.id,
            categoryId: matchingCategory?.id || categoryFallbackId(service.category),
            category: service.category,
            title: service.title,
            description: service.description,
            professionalName: "Perfil fictício de demonstração",
            cityIds: [],
            cities: [],
            cityLabel: "Sem localidade real (exemplo)",
            whatsapp: "",
            images: [{
                id: "demo-image-" + service.id,
                url: service.image,
                alt: service.imageAlt,
            }],
            isPersisted: false,
            isDemo: true,
        };
    });
}

const IMAGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function mapPublicImage(image) {
    const id = String(image?.id || "");
    const mimeType = String(image?.mimeType || "").toLowerCase();
    const sizeBytes = Number(image?.sizeBytes);
    if (!image || image.status !== "active" || !IMAGE_ID_PATTERN.test(id)
        || !IMAGE_TYPES.has(mimeType)
        || !Number.isSafeInteger(sizeBytes) || sizeBytes < 12 || sizeBytes > 5_000_000) return null;

    return {
        id,
        order: Number(image.order || 0),
        mimeType,
        sizeBytes,
        url: "/api/public-images?id=" + encodeURIComponent(id),
    };
}

function cityLabel(cities) {
    if (!cities.length) return "Localidade não informada";
    const first = [cities[0].name, cities[0].state].filter(Boolean).join(" - ");
    if (cities.length === 1) return first;
    return first + " +" + (cities.length - 1) + (cities.length === 2 ? " outra cidade" : " outras cidades");
}

export function mapPublicService(service) {
    if (!service || typeof service !== "object" || Array.isArray(service)) {
        throw new TypeError("O serviço público precisa ser um objeto.");
    }

    const cities = Array.isArray(service.cities)
        ? service.cities
            .filter((city) => city && typeof city === "object")
            .map((city) => ({
                id: String(city.id || ""),
                name: String(city.name || ""),
                state: String(city.state || ""),
            }))
        : [];
    const images = Array.isArray(service.images)
        ? service.images.map(mapPublicImage).filter(Boolean).sort((left, right) => left.order - right.order)
        : [];

    return {
        id: String(service.id || ""),
        categoryId: String(service.categoryId || ""),
        category: String(service.category || "Outros"),
        title: String(service.title || "Serviço sem título"),
        description: String(service.description || ""),
        professionalName: String(service.professional || "Profissional"),
        cityIds: Array.isArray(service.cityIds) ? service.cityIds.map(String) : [],
        cities,
        cityLabel: cities.length ? cityLabel(cities) : String(service.city || "Localidade não informada"),
        whatsapp: String(service.whatsapp || ""),
        images,
        isPersisted: true,
        isDemo: false,
    };
}

export function filterPublicServices(services, { query = "", categoryId = "", city = "" } = {}) {
    const normalizedQuery = normalizeSearch(query);
    const normalizedCity = normalizeSearch(city);

    return services.filter((service) => {
        const matchesCategory = !categoryId || service.categoryId === String(categoryId);
        const serviceCities = [
            ...(Array.isArray(service.cities) ? service.cities : [])
                .map((item) => [item.name, item.state].filter(Boolean).join(" ")),
            service.isDemo ? "" : (service.cityLabel || ""),
        ].filter(Boolean).map(normalizeSearch).join(" ");
        const matchesCity = !normalizedCity || (!service.isDemo && serviceCities.includes(normalizedCity));
        const searchText = normalizeSearch([
            service.title,
            service.category,
            service.description,
            service.professionalName,
            serviceCities,
        ].join(" "));
        const matchesQuery = !normalizedQuery || searchText.includes(normalizedQuery);
        return matchesCategory && matchesCity && matchesQuery;
    });
}
