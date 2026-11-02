import { Activity, Cpu, MemoryStick } from "lucide-react";
import { ApiError } from "../lib/api";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 176;
const CHART_PADDING = { top: 16, right: 12, bottom: 26, left: 44 };

function formatMetric(value, unit, digits = 1) {
  return value == null ? "—" : `${value.toFixed(digits)} ${unit}`;
}

function MetricChart({ title, icon: Icon, value, unit, points, color, gradientId, isLive }) {
  const width = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const height = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const numericValues = points.map((point) => point.value).filter(Number.isFinite);
  const maxValue = Math.max(1, ...numericValues) * 1.15;
  const chartPoints = points.map((point, index) => {
    const x = CHART_PADDING.left + (points.length <= 1 ? width : index / (points.length - 1) * width);
    const y = CHART_PADDING.top + height - ((point.value || 0) / maxValue) * height;
    return { ...point, x, y };
  });
  const segments = [];
  let segment = [];
  chartPoints.forEach((point) => {
    if (!Number.isFinite(point.value)) {
      if (segment.length) segments.push(segment);
      segment = [];
    } else {
      segment.push(point);
    }
  });
  if (segment.length) segments.push(segment);

  return (
    <article className="min-w-0 rounded-xl border border-border bg-base/50 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-border bg-surface-raised p-2" style={{ color }}>
            <Icon size={15} />
          </span>
          <div>
            <h3 className="text-xs font-medium text-text-muted">{title}</h3>
            <p className="mt-1 font-mono text-lg font-semibold">{formatMetric(value, unit)}</p>
          </div>
        </div>
        <span className="mt-1 flex items-center gap-1.5 text-[10px] text-text-faint">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
          {isLive ? "En vivo" : "Pausado"}
        </span>
      </header>
      <div className="mt-3 overflow-x-auto">
        <svg
          role="img"
          aria-label={`${title}: ${formatMetric(value, unit)} en la última muestra y ${points.length} muestras históricas`}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-40 min-w-[420px] w-full"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((fraction) => {
            const y = CHART_PADDING.top + height * fraction;
            const labelValue = maxValue * (1 - fraction);
            return (
              <g key={fraction}>
                <line x1={CHART_PADDING.left} x2={CHART_WIDTH - CHART_PADDING.right}
                  y1={y} y2={y} stroke="var(--color-border)" strokeDasharray="3 5" />
                <text x={CHART_PADDING.left - 7} y={y + 3} textAnchor="end"
                  fill="var(--color-text-faint)" fontSize="9">
                  {labelValue.toFixed(unit === "%" ? 0 : 1)}
                </text>
              </g>
            );
          })}
          {segments.map((pointsInSegment, index) => {
            const line = pointsInSegment.map((point) => `${point.x},${point.y}`).join(" ");
            const area = `${pointsInSegment[0].x},${CHART_PADDING.top + height} ${line} ${pointsInSegment.at(-1).x},${CHART_PADDING.top + height}`;
            return (
              <g key={`${gradientId}-${index}`}>
                {pointsInSegment.length > 1 && (
                  <polygon points={area} fill={`url(#${gradientId})`} />
                )}
                <polyline points={line} fill="none" stroke={color} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
                {pointsInSegment.map((point) => (
                  <circle key={point.at} cx={point.x} cy={point.y} r="3"
                    fill="var(--color-surface)" stroke={color} strokeWidth="1.5">
                    <title>{`${new Date(point.at).toLocaleTimeString()} · ${formatMetric(point.value, unit)}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
          {points.length === 0 && (
            <text x={CHART_PADDING.left + width / 2} y={CHART_PADDING.top + height / 2}
              fill="var(--color-text-faint)" fontSize="11" textAnchor="middle">
              Sin muestras todavía
            </text>
          )}
          <text x={CHART_PADDING.left} y={CHART_HEIGHT - 5} fill="var(--color-text-faint)" fontSize="9">
            {points[0] ? new Date(points[0].at).toLocaleTimeString() : "Esperando muestras"}
          </text>
          {points.length > 1 && (
            <text x={CHART_WIDTH - CHART_PADDING.right} y={CHART_HEIGHT - 5} textAnchor="end"
              fill="var(--color-text-faint)" fontSize="9">
              {new Date(points.at(-1).at).toLocaleTimeString()}
            </text>
          )}
        </svg>
      </div>
      <p className="mt-1 text-[10px] text-text-faint">Escala ajustada a las muestras · últimas 5 min</p>
    </article>
  );
}

export function RuntimeMetricsCharts({
  metrics = [],
  history = [],
  projects = [],
  selectedProjectId,
  onProjectChange,
  isLoading,
  isError,
  error,
  isActive,
}) {
  const projectIsAvailable = selectedProjectId === "ALL"
    || projects.some((project) => project.id === selectedProjectId);
  const selectedId = projectIsAvailable ? selectedProjectId : "ALL";
  const visibleMetrics = selectedId === "ALL"
    ? metrics
    : metrics.filter((metric) => metric.projectId === selectedId);
  const cpuValues = visibleMetrics.map((metric) => metric.cpuPercent).filter(Number.isFinite);
  const memoryValues = visibleMetrics.map((metric) => metric.memMb).filter(Number.isFinite);
  const currentCpu = cpuValues.length ? cpuValues.reduce((sum, value) => sum + value, 0) : null;
  const currentMemory = memoryValues.length
    ? memoryValues.reduce((sum, value) => sum + value, 0)
    : null;
  const chartPoints = (metric) => history.map((sample) => ({
    at: sample.at,
    value: selectedId === "ALL" ? sample.all?.[metric] : sample.projects?.[selectedId]?.[metric],
  }));
  const selectedProjectName = projects.find((project) => project.id === selectedId)?.name;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-raised/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-accent" />
          <div>
            <h2 className="text-sm font-medium">Uso de recursos</h2>
            <p className="mt-0.5 text-[11px] text-text-faint">
              {selectedId === "ALL" ? "Consumo agregado de los proyectos activos" : `Consumo de ${selectedProjectName || "proyecto"}`}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          Proyecto
          <select
            value={selectedId}
            onChange={(event) => onProjectChange(event.target.value)}
            className="max-w-56 rounded-md border border-border bg-base px-2.5 py-1.5 text-text"
          >
            <option value="ALL">Todos los proyectos activos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
      </header>
      <div className="space-y-3 p-4">
        {isError ? (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger">
            {error instanceof ApiError ? error.message : "No se pudieron cargar las métricas de recursos."}
          </p>
        ) : isLoading ? (
          <p className="text-center text-xs text-text-muted">Consultando las métricas de los proyectos activos…</p>
        ) : !isActive ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-center text-xs text-text-muted">
            No hay proyectos en ejecución. Inicia uno para comenzar a generar muestras.
          </p>
        ) : visibleMetrics.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-center text-xs text-text-muted">
            No hay métricas disponibles para {selectedId === "ALL" ? "los proyectos activos" : "este proyecto"}.
          </p>
        ) : (
          <p className="text-[11px] text-text-faint">
            {visibleMetrics.length} servicio(s) medido(s) · actualización cada 2 segundos
          </p>
        )}
        <div className="grid gap-3 xl:grid-cols-2">
          <MetricChart title="CPU" icon={Cpu} value={currentCpu} unit="%"
            points={chartPoints("cpu")} color="#4fd1c5"
            gradientId={`cpu-fill-${selectedId}`} isLive={isActive && !isError} />
          <MetricChart title="Memoria" icon={MemoryStick} value={currentMemory} unit="MB"
            points={chartPoints("memory")} color="#8b93ff"
            gradientId={`memory-fill-${selectedId}`} isLive={isActive && !isError} />
        </div>
        <p className="text-[10px] text-text-faint">
          {selectedId === "ALL" ? "Valores sumados de los servicios medidos." : "Valores agregados de los servicios del proyecto."}
          {" "}CPU puede superar 100% en procesos multinúcleo; memoria no representa la RAM total del equipo.
        </p>
      </div>
    </section>
  );
}
