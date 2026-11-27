const FALLBACK_COLORS = ["#2563eb", "#5486e8", "#83a5ed", "#a8bee9", "#c1d0e6", "#7892b5"];

function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
}

export function DonutChart({
    data = [],
    total,
    centerLabel = "total",
    ariaLabel = "Gráfico de distribuição",
    valueFormatter = (value) => String(value),
}) {
    const normalizedData = data.map((item, index) => ({
        label: String(item.label || "Sem rótulo"),
        value: safeNumber(item.value),
        color: item.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    }));
    const sum = normalizedData.reduce((value, item) => value + item.value, 0);
    const chartTotal = total === undefined ? sum : safeNumber(total);
    const circumference = 2 * Math.PI * 42;
    let offset = 0;

    return (
        <div className="ui-donut-chart">
            <div className="ui-donut-chart-visual">
                <svg
                    viewBox="0 0 108 108"
                    role="img"
                    aria-label={ariaLabel}
                    className="ui-donut-chart-svg"
                >
                    <circle className="ui-donut-chart-track" cx="54" cy="54" r="42" />
                    {chartTotal > 0 && normalizedData.filter((item) => item.value > 0).map((item) => {
                        const length = Math.min(circumference, (item.value / chartTotal) * circumference);
                        const currentOffset = offset;
                        offset += length;
                        return (
                            <circle
                                className="ui-donut-chart-segment"
                                key={item.label}
                                cx="54"
                                cy="54"
                                r="42"
                                fill="none"
                                stroke={item.color}
                                strokeWidth="12"
                                strokeDasharray={length + " " + Math.max(0, circumference - length)}
                                strokeDashoffset={-currentOffset}
                            />
                        );
                    })}
                </svg>
                <div className="ui-donut-chart-center" aria-hidden="true">
                    <strong>{valueFormatter(chartTotal)}</strong>
                    <span>{centerLabel}</span>
                </div>
            </div>
            <ul className="ui-donut-chart-legend">
                {normalizedData.map((item) => {
                    const percentage = chartTotal > 0 ? Math.round((item.value / chartTotal) * 100) : 0;
                    return (
                        <li key={item.label}>
                            <span className="ui-donut-chart-legend-label">
                                <i style={{ backgroundColor: item.color }} aria-hidden="true" />
                                <span>{item.label}</span>
                            </span>
                            <strong>{valueFormatter(item.value)}</strong>
                            <small>{percentage}%</small>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export function HorizontalBarChart({
    data = [],
    emptyMessage = "Ainda não há dados para apresentar.",
    ariaLabel = "Gráfico de barras",
    valueFormatter = (value) => String(value),
}) {
    const normalizedData = data.map((item, index) => ({
        label: String(item.label || "Sem rótulo"),
        value: safeNumber(item.value),
        color: item.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    }));
    const maxValue = Math.max(...normalizedData.map((item) => item.value), 1);

    if (!normalizedData.length || normalizedData.every((item) => item.value === 0)) {
        return (
            <div className="ui-chart-empty" role="status">
                <span>{emptyMessage}</span>
            </div>
        );
    }

    return (
        <div className="ui-horizontal-bar-chart" role="list" aria-label={ariaLabel}>
            {normalizedData.map((item) => {
                const percentage = Math.max(0, Math.min(100, (item.value / maxValue) * 100));
                return (
                    <div className="ui-horizontal-bar-row" role="listitem" key={item.label}>
                        <div className="ui-horizontal-bar-meta">
                            <span title={item.label}>{item.label}</span>
                            <strong>{valueFormatter(item.value)}</strong>
                        </div>
                        <div
                            className="ui-horizontal-bar-track"
                            role="img"
                            aria-label={item.label + ": " + valueFormatter(item.value)}
                        >
                            <span style={{ width: percentage + "%", backgroundColor: item.color }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
