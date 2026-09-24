import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, ExternalLink, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";

function StatCard({ label, value, tone = "text-text" }) {
  return <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">{label}</p><p className={`mt-2 text-2xl font-mono ${tone}`}>{value}</p></div>;
}

function MetricsTable({ metrics, projects, isLoading, isError }) {
  if (isLoading) return <p className="px-4 py-8 text-center text-sm text-text-muted">Tomando muestras de CPU y memoria…</p>;
  if (isError) return <p className="px-4 py-6 text-sm text-danger">No se pudieron cargar las métricas actuales.</p>;
  if (!metrics.length) return <p className="px-4 py-8 text-center text-sm text-text-muted">Inicia un proyecto para ver aquí las métricas de sus procesos.</p>;
  const projectName = (id) => projects.find((project) => project.id === id)?.name || "Proyecto";
  return <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-border text-xs text-text-faint"><th className="px-4 py-3 font-normal">Proceso</th><th className="px-4 py-3 font-normal">Proyecto</th><th className="px-4 py-3 font-normal">Runtime</th><th className="px-4 py-3 font-normal">CPU</th><th className="px-4 py-3 font-normal">Memoria</th></tr></thead><tbody>{metrics.map((metric) => <tr key={metric.serviceId} className="border-b border-border last:border-0"><td className="px-4 py-3"><p>{metric.serviceName}</p><p className="mt-1 font-mono text-[11px] text-text-faint">{metric.runtimeKind === "LOCAL_PROCESS" ? `PID ${metric.pid}` : metric.containerId?.slice(0, 12)}</p></td><td className="px-4 py-3 text-text-muted">{projectName(metric.projectId)}</td><td className="px-4 py-3 text-xs text-text-muted">{metric.runtimeKind === "LOCAL_PROCESS" ? "Local" : "Docker"}</td><td className="px-4 py-3 font-mono">{metric.cpuPercent == null ? "—" : `${metric.cpuPercent.toFixed(1)}%`}</td><td className="px-4 py-3 font-mono">{Number(metric.memMb || 0).toFixed(1)} MB</td></tr>)}</tbody></table></div>;
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => api.listProjects() });
  const runtimesQuery = useQuery({ queryKey: ["runtime", "active"], queryFn: () => api.activeRuntimes(), refetchInterval: 5000 });
  const projects = projectsQuery.data || [];
  const runtimes = runtimesQuery.data;
  const projectIds = [...new Set((runtimes || []).map((runtime) => runtime.projectId))].sort();
  const metricsQuery = useQuery({
    queryKey: ["dashboard", "runtime-metrics", projectIds.join(",")],
    queryFn: async () => (await Promise.all(projectIds.map(async (projectId) => (await api.projectMetrics(projectId)).map((metric) => ({ ...metric, projectId }))))).flat(),
    enabled: runtimes != null && projectIds.length > 0,
    refetchInterval: 10000,
    retry: false,
  });
  if (projectsQuery.isLoading) return <p className="text-sm text-text-muted">Cargando dashboard…</p>;
  if (projectsQuery.isError) return <p className="rounded-lg border border-danger-dim bg-danger-dim/10 p-4 text-sm text-danger">No se pudo conectar con la API. Comprueba que el backend esté corriendo.</p>;

  const metrics = metricsQuery.data || [];
  const totalCpu = metrics.reduce((sum, metric) => sum + (metric.cpuPercent || 0), 0);
  const totalMemory = metrics.reduce((sum, metric) => sum + (metric.memMb || 0), 0);
  const activeCount = runtimes?.length || 0;
  const notFound = projects.filter((project) => project.status === "NOT_FOUND").length;

  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-accent">Resumen del entorno</p><h1 className="mt-1 text-2xl font-semibold">Dashboard</h1><p className="mt-2 text-sm text-text-muted">Estado de tus proyectos y consumo de los procesos activos.</p></div><button onClick={() => { queryClient.invalidateQueries({ queryKey: ["runtime"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); }} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-text-muted hover:text-text"><RefreshCw size={13} /> Actualizar</button></header>
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard label="Proyectos detectados" value={projects.length} /><StatCard label="Proyectos activos" value={runtimesQuery.isLoading ? "…" : activeCount} tone="text-accent" /><StatCard label="CPU agregada" value={metricsQuery.isLoading ? "…" : `${totalCpu.toFixed(1)}%`} tone="text-warning" /><StatCard label="Memoria en uso" value={metricsQuery.isLoading ? "…" : `${totalMemory.toFixed(1)} MB`} /></section>
    <section className="overflow-hidden rounded-xl border border-border bg-surface"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"><div className="flex items-center gap-2"><Activity size={15} className="text-accent" /><div><h2 className="text-sm font-medium">Monitoreo de procesos activos</h2><p className="mt-0.5 text-xs text-text-faint">Docker y procesos locales · actualización cada 10 s</p></div></div><Link to="/monitoring" className="text-xs text-accent hover:underline">Ver monitoring</Link></div><MetricsTable metrics={metrics} projects={projects} isLoading={runtimesQuery.isLoading || (activeCount > 0 && metricsQuery.isLoading)} isError={runtimesQuery.isError || metricsQuery.isError} /></section>
    <section><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-medium">Proyectos recientes</h2><p className="mt-1 text-xs text-text-faint">{notFound} ruta(s) no encontradas</p></div><Link to="/projects" className="text-xs text-accent hover:underline">Ver todos</Link></div><div className="grid gap-3 md:grid-cols-2">{projects.length === 0 ? <div className="col-span-full rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">Todavía no hay proyectos. Crea un Workspace y escanéalo para empezar.</div> : projects.slice(0, 6).map((project) => <Link key={project.id} to={`/projects/${project.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"><div className="min-w-0"><p className="truncate text-sm font-medium">{project.name}</p><p className="mt-1 truncate text-xs text-text-faint">{project.language} · {project.framework}</p></div><StatusBadge status={project.status} /></Link>)}</div></section>
  </div>;
}
