import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bell, Check, Cpu, RefreshCw } from "lucide-react";
import { api, ApiError } from "../lib/api";

function ErrorNotice({ error }) {
  if (!error) return null;
  return <div className="border border-danger-dim bg-danger-dim/10 text-danger text-xs rounded-md px-3 py-2">
    {error instanceof ApiError ? error.message : "No se pudo conectar con la API."}
  </div>;
}
function MetricCard({ label, value, detail }) {
  return <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
    <p className="text-xs text-text-muted mb-2">{label}</p><p className="text-2xl font-mono">{value}</p>
    <p className="text-xs text-text-faint mt-1">{detail}</p>
  </div>;
}
export function MonitoringPage() {
  const [projectId, setProjectId] = useState("ALL");
  const [alertStatus, setAlertStatus] = useState("ACTIVE");
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => api.listProjects() });
  const runtimesQuery = useQuery({
    queryKey: ["runtime", "active"], queryFn: () => api.activeRuntimes(), refetchInterval: 5000,
  });
  const activeProjectIds = [...new Set((runtimesQuery.data || []).map((runtime) => runtime.projectId))].sort();
  const activeProjectId = projectId === "ALL" || activeProjectIds.includes(projectId) ? projectId : "ALL";
  const metricsQuery = useQuery({
    queryKey: ["monitoring", "metrics", activeProjectIds.join(",")],
    queryFn: async () => (await Promise.all(activeProjectIds.map(async (id) =>
      (await api.projectMetrics(id)).map((metric) => ({ ...metric, projectId: id }))
    ))).flat(),
    enabled: runtimesQuery.data != null && activeProjectIds.length > 0, refetchInterval: 10000, retry: false,
  });
  const alertsQuery = useQuery({
    queryKey: ["monitoring", "alerts", alertStatus, activeProjectId],
    queryFn: () => api.listAlerts({ status: alertStatus, projectId: activeProjectId }), refetchInterval: 10000, retry: false,
  });
  const resolveMutation = useMutation({
    mutationFn: (id) => api.resolveAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitoring", "alerts"] }),
  });
  const projects = projectsQuery.data || [];
  const allMetrics = metricsQuery.data || [];
  const metrics = activeProjectId === "ALL" ? allMetrics : allMetrics.filter((metric) => metric.projectId === activeProjectId);
  const alerts = alertsQuery.data || [];
  const projectName = (id) => projects.find((project) => project.id === id)?.name || id;
  const totalCpu = allMetrics.reduce((sum, metric) => sum + (metric.cpuPercent || 0), 0);
  const totalMemory = allMetrics.reduce((sum, metric) => sum + (metric.memMb || 0), 0);

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs uppercase tracking-[0.18em] text-accent">Observabilidad</p><h1 className="mt-1 text-2xl font-semibold">Monitoring</h1>
        <p className="text-xs text-text-muted mt-1">Métricas actuales de contenedores Docker y procesos locales, y alertas de fallos de proyectos.</p></div>
      <button onClick={() => queryClient.invalidateQueries({ queryKey: ["monitoring"] })}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-surface-raised text-text-muted border border-border hover:text-text">
        <RefreshCw size={13} /> Actualizar</button>
    </header>

    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><Activity size={15} className="text-accent" /><h2 className="text-sm">CPU y memoria</h2></div>
        <label className="flex items-center gap-2 text-xs text-text-muted">Proyecto en ejecución
          <select value={activeProjectId} onChange={(event) => setProjectId(event.target.value)}
            className="bg-base border border-border rounded-md px-2.5 py-1.5 text-text">
            <option value="ALL">Todos los proyectos activos</option>
            {projects.filter((project) => activeProjectIds.includes(project.id)).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-text-faint mb-4">Consumo de todos los proyectos activos; el detalle se filtra con el selector. Las muestras se actualizan cada 10 segundos.</p>
      <div className="grid grid-cols-2 gap-3 mb-4 xl:grid-cols-3">
        <MetricCard label="Proyectos en ejecución" value={runtimesQuery.isLoading ? "…" : activeProjectIds.length} detail="Actualización cada 5 segundos" />
        <MetricCard label="CPU total" value={metricsQuery.isLoading ? "…" : `${totalCpu.toFixed(1)}%`} detail="Suma de los procesos medidos" />
        <MetricCard label="RAM total" value={metricsQuery.isLoading ? "…" : `${totalMemory.toFixed(1)} MB`} detail="Docker y procesos locales" />
      </div>
      {(runtimesQuery.isLoading || metricsQuery.isLoading) && <p className="text-xs text-text-muted">Consultando runtimes…</p>}
      <ErrorNotice error={runtimesQuery.error || metricsQuery.error} />
      {!runtimesQuery.isLoading && !runtimesQuery.isError && activeProjectIds.length === 0 &&
        <p className="text-sm text-text-muted text-center py-6">No hay proyectos en ejecución para medir.</p>}
      {activeProjectIds.length > 0 && !metricsQuery.isLoading && !metricsQuery.isError && metrics.length === 0 &&
        <p className="text-sm text-text-muted text-center py-6">No hay métricas disponibles para los procesos activos.</p>}
      {metrics.length > 0 && <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Servicios medidos" value={metrics.length} detail={activeProjectId === "ALL" ? "Todos los proyectos activos" : projectName(activeProjectId)} />
        </div>
        <div className="border border-border rounded-lg overflow-x-auto"><table className="w-full min-w-[660px] text-sm">
          <thead><tr className="text-xs text-text-muted text-left border-b border-border">
            <th className="font-normal px-3 py-2">Proyecto</th><th className="font-normal px-3 py-2">Servicio</th><th className="font-normal px-3 py-2">Runtime</th><th className="font-normal px-3 py-2">Identificador</th>
            <th className="font-normal px-3 py-2">CPU</th><th className="font-normal px-3 py-2">Memoria</th>
            <th className="font-normal px-3 py-2">Muestra</th></tr></thead>
          <tbody>{metrics.map((metric) => <tr key={metric.serviceId} className="border-b border-border last:border-0">
            <td className="px-3 py-2">{projectName(metric.projectId)}</td>
            <td className="px-3 py-2">{metric.serviceName}</td>
            <td className="px-3 py-2 text-xs">{metric.runtimeKind === "LOCAL_PROCESS" ? "Local" : "Docker"}</td>
            <td className="px-3 py-2 font-mono text-xs text-text-faint">{metric.runtimeKind === "LOCAL_PROCESS" ? `PID ${metric.pid}` : metric.containerId?.slice(0, 12)}</td>
            <td className="px-3 py-2 font-mono">{metric.cpuPercent == null ? "—" : metric.cpuPercent.toFixed(1) + "%"}</td>
            <td className="px-3 py-2 font-mono">{metric.memMb.toFixed(1)} MB</td>
            <td className="px-3 py-2 text-xs text-text-muted">{new Date(metric.capturedAt).toLocaleTimeString()}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="text-xs text-text-faint inline-flex items-center gap-1"><Cpu size={12} /> CPU se calcula con dos muestras separadas por un segundo; en local, OSHI agrega el PID y sus procesos descendientes.</p>
      </div>}
    </section>

    <section className="border border-border rounded-lg bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2"><Bell size={15} className="text-warning" /><h2 className="text-sm">Alertas</h2>
          <span className="text-xs text-text-faint">{alerts.length}</span></div>
        <select value={alertStatus} onChange={(event) => setAlertStatus(event.target.value)}
          className="bg-base border border-border rounded-md px-2.5 py-1.5 text-xs text-text">
          <option value="ACTIVE">Activas</option><option value="RESOLVED">Resueltas</option><option value="ALL">Todas</option>
        </select>
      </div>
      <div className="p-4 space-y-3">
        <ErrorNotice error={alertsQuery.error || resolveMutation.error} />
        {alertsQuery.isLoading && <p className="text-xs text-text-muted">Cargando alertas…</p>}
        {!alertsQuery.isLoading && !alertsQuery.isError && alerts.length === 0 &&
          <p className="text-sm text-text-muted text-center py-5">No hay alertas para este filtro.</p>}
        {alerts.map((alert) => <article key={alert.id} className="border border-border rounded-lg p-3">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={"w-1.5 h-1.5 rounded-full " + (alert.status === "ACTIVE" ? "bg-danger" : "bg-fill-success")} />
              <span className="text-sm">{alert.type}</span>
              <span className="text-xs text-text-faint">{alert.status === "ACTIVE" ? "Activa" : "Resuelta"}</span>
            </div>
            <p className="text-xs text-text-muted mt-1">{projectName(alert.projectId)}</p>
            <p className="text-sm mt-2 break-words">{alert.message}</p>
            <p className="text-xs font-mono text-text-faint mt-2">
              {new Date(alert.createdAt).toLocaleString()}
              {alert.resolvedAt ? " · Resuelta " + new Date(alert.resolvedAt).toLocaleString() : ""}
            </p>
          </div>
          {alert.status === "ACTIVE" && <button onClick={() => resolveMutation.mutate(alert.id)}
            disabled={resolveMutation.isPending}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-surface-raised text-text-muted border border-border hover:text-text disabled:opacity-50">
            <Check size={13} /> Resolver</button>}
          </div>
        </article>)}
      </div>
    </section>
  </div>;
}

