function normalizeSearch(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function isPublicDriveImageUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === "drive.google.com" && url.pathname === "/uc"
            && url.searchParams.get("export") === "view" && Boolean(url.searchParams.get("id"));
    } catch {
        return false;
    }
}

function mapPublicImage(image) {
    if (!image || image.status !== "active" || !isPublicDriveImageUrl(image.url)) return null;
    return {
        id: String(image.id || ""),
        order: Number(image.order || 0),
        mimeType: String(image.mimeType || ""),
        sizeBytes: Number(image.sizeBytes || 0),
        url: image.url,
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
            ...service.cities.map((item) => [item.name, item.state].filter(Boolean).join(" ")),
            service.cityLabel || "",
        ].map(normalizeSearch).join(" ");
        const matchesCity = !normalizedCity || serviceCities.includes(normalizedCity);
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
