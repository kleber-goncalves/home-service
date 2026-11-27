import { SERVICE_STATUS_FILTERS } from "./professional-service-utils.js";

export default function ProfessionalServiceFilters({ value, counts, onChange }) {
    return (
        <div className="professional-service-filters" role="group" aria-label="Filtrar serviços por situação">
            {SERVICE_STATUS_FILTERS.map((filter) => (
                <button
                    key={filter.value}
                    type="button"
                    className={"professional-service-filter" + (value === filter.value ? " is-active" : "")}
                    aria-pressed={value === filter.value}
                    onClick={() => onChange(filter.value)}
                >
                    <span>{filter.label}</span>
                    <span className="professional-service-filter-count">
                        {counts[filter.value] ?? 0}
                    </span>
                </button>
            ))}
        </div>
    );
}
