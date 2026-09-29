import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Container, ExternalLink, RefreshCw, Square, Terminal } from "lucide-react";
import { api, ApiError } from "../lib/api";

function Summary({ label, value, icon: Icon }) {
  return <div className="rounded-xl border border-border bg-surface p-4"><div className="flex items-center gap-2 text-text-muted"><Icon size={14} /><p className="text-xs">{label}</p></div><p className="mt-2 text-2xl font-mono">{value}</p></div>;
}

export function DockerPage() {
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => api.listProjects() });
  const runtimesQuery = useQuery({ queryKey: ["runtime", "active"], queryFn: () => api.activeRuntimes(), refetchInterval: 5000, retry: false });
  const stopMutation = useMutation({
    mutationFn: (projectId) => api.stopProject(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["runtime", "active"] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "status"] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "services"] });
    },
  });
  const projects = projectsQuery.data || [];
  const dockerRuntimes = useMemo(() => (runtimesQuery.data || []).flatMap((runtime) => {
    const services = (runtime.services || []).filter((service) => service.kind === "DOCKER");
    if (!services.length) return [];
    const project = projects.find((item) => item.id === runtime.projectId);
    return [{ ...runtime, projectName: project?.name || "Proyecto", projectPath: project?.path, services }];
  }), [runtimesQuery.data, projects]);
  const containers = dockerRuntimes.reduce((total, runtime) => total + runtime.services.length, 0);
  const mappedPorts = dockerRuntimes.reduce((total, runtime) => total + runtime.services.filter((service) => service.port).length, 0);

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs uppercase tracking-[0.18em] text-accent">Runtime</p><h1 className="mt-1 text-2xl font-semibold">Docker</h1><p className="mt-2 text-sm text-text-muted">Contenedores de proyectos activos que DevVault inició con Docker Compose.</p></div>
      <button onClick={() => queryClient.invalidateQueries({ queryKey: ["runtime", "active"] })} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-text-muted hover:text-text"><RefreshCw size={13} />Actualizar</button>
    </header>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Summary label="Proyectos Docker activos" value={dockerRuntimes.length} icon={Container} />
      <Summary label="Servicios / contenedores" value={containers} icon={Box} />
      <Summary label="Servicios con puerto" value={mappedPorts} icon={ExternalLink} />
    </section>

    {(projectsQuery.isError || runtimesQuery.isError) && <div role="alert" className="rounded-lg border border-danger-dim bg-danger-dim/10 p-3 text-sm text-danger">{(projectsQuery.error || runtimesQuery.error) instanceof ApiError ? (projectsQuery.error || runtimesQuery.error).message : "No se pudo consultar el runtime de Docker. Comprueba que el backend esté activo."}</div>}
    {(projectsQuery.isLoading || runtimesQuery.isLoading) && <p className="text-sm text-text-muted">Consultando contenedores…</p>}

    {!projectsQuery.isLoading && !runtimesQuery.isLoading && !projectsQuery.isError && !runtimesQuery.isError && dockerRuntimes.length === 0 && <section className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
      <Container size={24} className="mx-auto text-text-faint" /><h2 className="mt-3 text-base font-medium">No hay contenedores Docker activos</h2><p className="mx-auto mt-2 max-w-md text-sm text-text-muted">Al iniciar desde Projects un proyecto que tenga docker-compose.yml, sus servicios aparecerán aquí.</p><Link to="/projects" className="mt-4 inline-flex rounded-md bg-accent-dim/30 px-3 py-2 text-xs font-medium text-accent hover:bg-accent-dim/50">Ir a Projects</Link>
    </section>}

    {dockerRuntimes.map((runtime) => <section key={runtime.projectId} className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0"><Link to={`/projects/${runtime.projectId}`} className="truncate text-sm font-semibold text-text hover:text-accent">{runtime.projectName}</Link><p className="mt-1 truncate font-mono text-[11px] text-text-faint" title={runtime.projectPath}>{runtime.projectPath || runtime.projectId}</p><p className="mt-1 text-[11px] text-text-muted">Activo desde {runtime.startedAt ? new Date(runtime.startedAt).toLocaleString() : "—"}</p></div>
        <div className="flex items-center gap-2"><Link to={`/projects/${runtime.projectId}`} className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text-muted hover:text-text">Detalle</Link><button onClick={() => stopMutation.mutate(runtime.projectId)} disabled={stopMutation.isPending} className="inline-flex items-center gap-1.5 rounded-md border border-danger-dim px-2.5 py-1.5 text-xs text-danger hover:bg-danger-dim/10 disabled:opacity-50"><Square size={12} />{stopMutation.isPending && stopMutation.variables === runtime.projectId ? "Deteniendo…" : "Detener proyecto"}</button></div>
      </header>
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-border text-xs text-text-muted"><th className="px-4 py-2 font-normal">Servicio</th><th className="px-4 py-2 font-normal">Tipo</th><th className="px-4 py-2 font-normal">Estado</th><th className="px-4 py-2 font-normal">Puerto</th><th className="px-4 py-2 font-normal">Contenedor</th><th className="px-4 py-2 font-normal">Logs</th></tr></thead><tbody>
        {runtime.services.map((service) => <tr key={service.id} className="border-b border-border last:border-0"><td className="px-4 py-3 font-medium">{service.name}</td><td className="px-4 py-3 text-xs text-text-muted">{service.type}</td><td className="px-4 py-3"><span className={"rounded-full px-2 py-1 text-[11px] " + (service.status === "RUNNING" ? "bg-accent-dim/20 text-accent" : "bg-warning/10 text-warning")}>{service.status}</span></td><td className="px-4 py-3 font-mono text-xs">{service.port ? <a href={`http://localhost:${service.port}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">localhost:{service.port}<ExternalLink size={11} /></a> : "—"}</td><td className="px-4 py-3 font-mono text-xs text-text-faint" title={service.dockerContainerId || ""}>{service.dockerContainerId?.slice(0, 12) || "—"}</td><td className="px-4 py-3"><Link to={`/logs?project=${runtime.projectId}&service=${encodeURIComponent(service.name)}`} className="inline-flex items-center gap-1 text-xs text-accent hover:underline"><Terminal size={12} />Abrir</Link></td></tr>)}
      </tbody></table></div>
    </section>)}
    {stopMutation.isError && <div role="alert" className="rounded-lg border border-danger-dim bg-danger-dim/10 p-3 text-sm text-danger">{stopMutation.error instanceof ApiError ? stopMutation.error.message : "No se pudo detener el proyecto Docker."}</div>}
    <p className="text-xs text-text-faint">Esta vista refleja los servicios que DevVault inició y tiene registrados; no enumera contenedores externos iniciados fuera de DevVault.</p>
  </div>;
}
