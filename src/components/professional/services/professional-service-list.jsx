import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ProfessionalServiceCard from "./professional-service-card.jsx";
import ProfessionalServiceFilters from "./professional-service-filters.jsx";
import {
    filterProfessionalServices,
    getServiceStatusCounts,
} from "./professional-service-utils.js";

export default function ProfessionalServiceList({
    services,
    busy = false,
    csrfToken,
    onServicesChange,
    onEdit,
    onToggle,
    onRemove,
    onRefresh,
}) {
    const [activeFilter, setActiveFilter] = useState("all");
    const serviceList = Array.isArray(services) ? services : [];
    const statusCounts = useMemo(
        () => getServiceStatusCounts(serviceList),
        [serviceList],
    );
    const filteredServices = useMemo(
        () => filterProfessionalServices(serviceList, activeFilter),
        [serviceList, activeFilter],
    );

    return (
        <div className="professional-service-list">
            <div className="professional-service-list-heading">
                <div>
                    <strong>{filteredServices.length} serviço{filteredServices.length === 1 ? "" : "s"}</strong>
                    <span>Organize seus anúncios e mantenha as informações atualizadas.</span>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={busy}
                >
                    Atualizar lista
                </Button>
            </div>

            <ProfessionalServiceFilters
                value={activeFilter}
                counts={statusCounts}
                onChange={setActiveFilter}
            />

            {filteredServices.length ? (
                <div className="professional-service-grid">
                    {filteredServices.map((service) => (
                        <ProfessionalServiceCard
                            key={service.id}
                            service={service}
                            busy={busy}
                            csrfToken={csrfToken}
                            onServicesChange={onServicesChange}
                            onEdit={onEdit}
                            onToggle={onToggle}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            ) : serviceList.length ? (
                <div className="professional-service-empty">
                    <h3>Nenhum serviço nesta situação</h3>
                    <p>Experimente outro filtro para consultar os serviços da sua conta.</p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveFilter("all")}
                    >
                        Ver todos os serviços
                    </Button>
                </div>
            ) : (
                <div className="professional-service-empty">
                    <h3>Você ainda não cadastrou serviços</h3>
                    <p>Adicione seu primeiro serviço para começar a aparecer na vitrine pública.</p>
                </div>
            )}
        </div>
    );
}
