export const SERVICE_STATUS_FILTERS = [
    { value: "all", label: "Todos" },
    { value: "published", label: "Publicados" },
    { value: "paused", label: "Em pausa" },
    { value: "draft", label: "Rascunhos" },
    { value: "suspended", label: "Suspensos" },
    { value: "removed", label: "Removidos" },
];

const TRACKED_STATUSES = SERVICE_STATUS_FILTERS
    .filter((filter) => filter.value !== "all")
    .map((filter) => filter.value);

export function getServiceActiveImages(service) {
    if (!Array.isArray(service?.images)) return [];

    return service.images
        .filter((image) => image && image.status === "active")
        .slice()
        .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
}

export function getServiceLocationLabel(service) {
    if (Array.isArray(service?.cities) && service.cities.length) {
        const labels = service.cities
            .map((city) => [city?.name, city?.state].filter(Boolean).join(" - ").trim())
            .filter(Boolean);
        if (labels.length) return [...new Set(labels)].join(", ");
    }

    const fallback = String(service?.city || "").trim();
    return fallback || "Localidade não informada";
}

export function getServiceStatusCounts(services) {
    const list = Array.isArray(services) ? services : [];
    const counts = { all: list.length };

    TRACKED_STATUSES.forEach((status) => {
        counts[status] = list.filter((service) => service?.status === status).length;
    });

    return counts;
}

export function filterProfessionalServices(services, status = "all") {
    const list = Array.isArray(services) ? services : [];
    if (status === "all") return list;
    if (!TRACKED_STATUSES.includes(status)) return list;
    return list.filter((service) => service?.status === status);
}
