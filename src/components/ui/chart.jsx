import { useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const FALLBACK_COLORS = ["#2563eb", "#5486e8", "#83a5ed", "#a8bee9", "#c1d0e6", "#7892b5"];

function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
}

function motionIsAllowed() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ChartTooltip({ active, payload, label, valueFormatter }) {
    if (!active || !Array.isArray(payload) || !payload.length) {
        return null;
    }

    return (
        <div className="ui-chart-tooltip">
            <strong className="ui-chart-tooltip-heading">
                {label || payload[0].name || payload[0].payload?.label || "Detalhes"}
            </strong>
            {payload.map((entry, index) => (
                <div className="ui-chart-tooltip-row" key={String(entry.dataKey || entry.name || index)}>
                    <i
                        aria-hidden="true"
                        style={{ backgroundColor: entry.color || entry.payload?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length] }}
                    />
                    <span>{entry.name || entry.payload?.label || "Quantidade"}</span>
                    <strong>{valueFormatter(entry.value)}</strong>
                </div>
            ))}
        </div>
    );
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
    const chartData = normalizedData.filter((item) => item.value > 0);
    const sum = normalizedData.reduce((value, item) => value + item.value, 0);
    const chartTotal = total === undefined ? sum : safeNumber(total);
    const [activeLabel, setActiveLabel] = useState(null);
    const activeItem = normalizedData.find((item) => item.label === activeLabel);
    const animate = motionIsAllowed();

    function toggleActiveLabel(label) {
        setActiveLabel((current) => current === label ? null : label);
    }

    return (
        <div className="ui-donut-chart" role="group" aria-label={ariaLabel}>
            <div className={"ui-donut-chart-visual" + (chartData.length ? "" : " is-empty")}>
                {chartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart accessibilityLayer>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                innerRadius="64%"
                                outerRadius="88%"
                                paddingAngle={chartData.length > 1 ? 2 : 0}
                                cornerRadius={5}
                                stroke="none"
                                isAnimationActive={animate}
                                animationBegin={90}
                                animationDuration={900}
                                animationEasing="ease-out"
                                onMouseEnter={(entry) => setActiveLabel(entry?.label || null)}
                                onMouseLeave={() => setActiveLabel(null)}
                            >
                                {chartData.map((item) => (
                                    <Cell
                                        key={item.label}
                                        fill={item.color}
                                        fillOpacity={!activeLabel || activeLabel === item.label ? 1 : 0.32}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
                <div className="ui-donut-chart-center" aria-live="polite">
                    <strong>{valueFormatter(activeItem ? activeItem.value : chartTotal)}</strong>
                    <span>{activeItem ? activeItem.label : centerLabel}</span>
                </div>
            </div>

            <ul className="ui-donut-chart-legend">
                {normalizedData.map((item) => {
                    const percentage = chartTotal > 0
                        ? Math.max(0, Math.min(100, Math.round((item.value / chartTotal) * 100)))
                        : 0;
                    const isActive = activeLabel === item.label;

                    return (
                        <li key={item.label}>
                            <button
                                type="button"
                                aria-pressed={isActive}
                                onMouseEnter={() => setActiveLabel(item.label)}
                                onMouseLeave={() => setActiveLabel(null)}
                                onFocus={() => setActiveLabel(item.label)}
                                onBlur={() => setActiveLabel(null)}
                                onClick={() => toggleActiveLabel(item.label)}
                            >
                                <span className="ui-donut-chart-legend-label">
                                    <i style={{ backgroundColor: item.color }} aria-hidden="true" />
                                    <span>{item.label}</span>
                                </span>
                                <strong>{valueFormatter(item.value)}</strong>
                                <small>{percentage}%</small>
                            </button>
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
    const hasValues = normalizedData.some((item) => item.value > 0);
    const animate = motionIsAllowed();
    const chartHeight = Math.max(248, normalizedData.length * 48);
    const categoryGap = normalizedData.length <= 3 ? "42%" : "24%";

    if (!normalizedData.length || !hasValues) {
        return (
            <div className="ui-chart-empty" role="status">
                <span>{emptyMessage}</span>
            </div>
        );
    }

    return (
        <div className="ui-horizontal-bar-chart" role="img" aria-label={ariaLabel}>
            <ResponsiveContainer width="100%" height={chartHeight} minWidth={0}>
                <BarChart
                    data={normalizedData}
                    layout="vertical"
                    margin={{ top: 10, right: 22, bottom: 8, left: 4 }}
                    barCategoryGap={categoryGap}
                    accessibilityLayer
                >
                    <CartesianGrid horizontal={false} vertical stroke="#e8eef6" strokeDasharray="4 6" />
                    <XAxis
                        type="number"
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8795a8", fontSize: 11 }}
                    />
                    <YAxis
                        type="category"
                        dataKey="label"
                        width={128}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#53657d", fontSize: 12, fontWeight: 600 }}
                        tickFormatter={(value) => {
                            const label = String(value);
                            return label.length > 20 ? label.slice(0, 19) + "…" : label;
                        }}
                    />
                    <Tooltip
                        cursor={{ fill: "#f3f7fd" }}
                        content={<ChartTooltip valueFormatter={valueFormatter} />}
                    />
                    <Bar
                        dataKey="value"
                        name="Serviços"
                        barSize={24}
                        radius={[0, 9, 9, 0]}
                        isAnimationActive={animate}
                        animationBegin={100}
                        animationDuration={900}
                        animationEasing="ease-out"
                    >
                        {normalizedData.map((item) => (
                            <Cell key={item.label} fill={item.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
