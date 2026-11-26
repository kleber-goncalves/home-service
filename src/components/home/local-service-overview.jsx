import ServiceImage from "@/components/public/service-image";

function formatCount(value) {
    return new Intl.NumberFormat("pt-BR").format(value);
}

export default function LocalServiceOverview({
    realServices = [],
    demoServices = [],
    categories = [],
    cities = [],
    loading = false,
    error = false,
}) {
    const photoServices = [...realServices, ...demoServices]
        .filter((service) => service?.images?.some((image) => image?.url))
        .slice(0, 3);

    const metrics = [
        {
            value: loading || error ? "—" : formatCount(realServices.length),
            label: "serviços publicados listados",
        },
        {
            value: loading ? "—" : formatCount(demoServices.length),
            label: "exemplos fictícios para conhecer",
        },
        {
            value: loading || error ? "—" : formatCount(categories.length),
            label: "categorias disponíveis",
        },
        {
            value: loading || error ? "—" : formatCount(cities.length),
            label: "localidades no filtro",
        },
    ];

    return (
        <section className="home-local-overview" aria-labelledby="home-local-overview-title">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="home-local-overview-intro">
                    <div className="home-local-overview-copy">
                        <span className="home-local-overview-eyebrow">Conecta Local</span>
                        <h2 id="home-local-overview-title">
                            Encontre serviços para cuidar da casa e da rotina
                            <span> sem complicar o caminho.</span>
                        </h2>
                        <p>
                            Explore categorias, conheça exemplos de demonstração e consulte os
                            serviços publicados no Conecta Local.
                        </p>
                    </div>

                    <div className="home-local-overview-gallery" role="group" aria-label="Imagens de serviços e exemplos do catálogo">
                        {photoServices.map((service, index) => {
                            const image = service.images.find((item) => item?.url);

                            return (
                                <figure className="home-local-overview-photo" key={service.id}>
                                    <ServiceImage
                                        image={image}
                                        alt={image.alt || `Imagem do serviço: ${service.title}`}
                                        loading="lazy"
                                    />
                                </figure>
                            );
                        })}
                    </div>
                </div>

                <ul className="home-local-overview-metrics" aria-label="Indicadores do catálogo público">
                    {metrics.map((metric) => (
                        <li className="home-local-overview-metric" key={metric.label}>
                            <strong>{metric.value}</strong>
                            <span>{metric.label}</span>
                        </li>
                    ))}
                </ul>

                <p className="home-local-overview-note">
                    {error
                        ? "Os exemplos continuam disponíveis; não foi possível atualizar todos os indicadores do catálogo."
                        : "Indicadores calculados com os dados retornados pelo catálogo público. A lista de serviços considera até os 100 registros publicados mais recentes."}
                </p>
            </div>
        </section>
    );
}
