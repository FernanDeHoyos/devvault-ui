import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, RefreshCw, RadioTower } from "lucide-react";
import { api } from "../lib/api";

function SummaryCard({ label, value, detail }) {
  return <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
    <p className="mb-2 text-xs text-text-muted">{label}</p>
    <p className="font-mono text-2xl">{value}</p>
    <p className="mt-1 text-xs text-text-faint">{detail}</p>
  </div>;
}

function PortState({ port }) {
  const style = port.status === "CONFLICT"
    ? "border-danger-dim bg-danger-dim/10 text-danger"
    : port.status === "LISTENING"
      ? "border-accent-dim bg-accent-dim/10 text-accent"
      : port.status === "AVAILABLE"
        ? "border-border bg-surface-raised text-text-muted"
        : "border-warning/30 bg-warning/10 text-warning";
  const label = {
    CONFLICT: "Conflicto",
    LISTENING: "En escucha",
    AVAILABLE: "Libre",
    UNKNOWN: "Sin comprobar",
  }[port.status] || port.status;
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${style}`}>{label}</span>;
}

export function PortsPage() {
  const queryClient = useQueryClient();
  const portsQuery = useQuery({
    queryKey: ["ports"], queryFn: () => api.portOverview(), refetchInterval: 10000, retry: false,
  });
  const overview = portsQuery.data;
  const ports = overview?.ports || [];
  const listeningCount = ports.filter((port) => port.status === "LISTENING").length;
  const conflictCount = ports.filter((port) => port.conflict).length;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-accent">Entorno local</p>
        <h1 className="mt-1 text-2xl font-semibold">Puertos</h1>
        <p className="mt-1 text-xs text-text-muted">Servicios registrados y procesos que escuchan en sus puertos.</p>
      </div>
      <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: ["ports"] })}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs text-text-muted hover:text-text">
        <RefreshCw size={13} /> Actualizar
      </button>
    </header>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
      <SummaryCard label="Puertos registrados" value={portsQuery.isLoading ? "…" : ports.length} detail="Servicios detectados por DevVault" />
      <SummaryCard label="En escucha" value={portsQuery.isLoading ? "…" : listeningCount} detail="Con un proceso enlazado al puerto" />
      <SummaryCard label="Conflictos" value={portsQuery.isLoading ? "…" : conflictCount} detail="Proceso huérfano o servicio sin listener" />
    </section>

    {portsQuery.isLoading && <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-text-muted">Consultando los puertos del sistema…</p>}
    {portsQuery.isError && <p role="alert" className="rounded-lg border border-danger-dim bg-danger-dim/10 p-4 text-sm text-danger">No se pudo consultar el inventario de puertos.</p>}

    {overview && !overview.listenerScanAvailable && <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
      DevVault no pudo leer los procesos del sistema. Comprueba que <code>netstat</code> esté disponible en Windows o <code>lsof</code>/<code>ss</code> en Linux.
    </p>}

    {overview && ports.length === 0 && <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center">
      <RadioTower size={22} className="mx-auto mb-3 text-text-faint" />
      <p className="text-sm text-text-muted">Aún no hay servicios con un puerto registrado.</p>
      <p className="mt-1 text-xs text-text-faint">Inicia un proyecto para que DevVault detecte sus puertos.</p>
    </div>}

    {ports.length > 0 && <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[840px] text-left text-sm">
        <thead><tr className="border-b border-border text-xs text-text-faint">
          <th className="px-4 py-3 font-normal">Puerto</th>
          <th className="px-4 py-3 font-normal">Estado</th>
          <th className="px-4 py-3 font-normal">Proyectos y servicios</th>
          <th className="px-4 py-3 font-normal">Proceso del sistema</th>
          <th className="px-4 py-3 font-normal">Abrir</th>
        </tr></thead>
        <tbody>{ports.map((port) => <tr key={port.port} className="border-b border-border last:border-0 align-top">
          <td className="px-4 py-3 font-mono">{port.port}</td>
          <td className="px-4 py-3">
            <PortState port={port} />
            {port.conflictReason && <p className="mt-2 max-w-[240px] text-xs text-danger">{port.conflictReason}</p>}
          </td>
          <td className="space-y-2 px-4 py-3">
            {port.services.map((service) => <div key={service.serviceId} className="flex flex-col">
              <span>{service.projectName} <span className="text-text-faint">/</span> {service.serviceName}</span>
              <span className="text-xs text-text-faint">{service.serviceStatus}{service.runtimeKind ? ` · ${service.runtimeKind === "LOCAL_PROCESS" ? "Local" : "Docker"}` : ""}</span>
            </div>)}
          </td>
          <td className="px-4 py-3 text-xs text-text-muted">
            {port.listeners.length === 0 ? <span className="text-text-faint">Sin proceso escuchando</span> : port.listeners.map((listener, index) =>
              <div key={`${listener.pid ?? "unknown"}-${index}`} className="font-mono">
                {listener.processName}{listener.pid ? ` · PID ${listener.pid}` : ""}
              </div>)}
          </td>
          <td className="px-4 py-3">
            {port.canOpen ? <a href={port.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
              <ExternalLink size={13} /> localhost:{port.port}
            </a> : <span className="text-xs text-text-faint">—</span>}
          </td>
        </tr>)}</tbody>
      </table>
    </div>}

    {overview && <p className="text-xs text-text-faint">El inventario se actualiza cada 10 segundos. DevVault solo informa de conflictos; no detiene procesos externos.</p>}
  </div>;
}
