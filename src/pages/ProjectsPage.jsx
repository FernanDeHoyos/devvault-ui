import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownAZ, ArrowRight, Boxes, Code2, FolderGit2, GitBranch, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";

const FILTERS = [
  { id: "ALL", label: "Todos" },
  { id: "ACTIVE", label: "Activos" },
  { id: "NOT_FOUND", label: "Ruta no encontrada" },
  { id: "ARCHIVED", label: "Archivados" },
];

function SummaryCard({ label, value, icon: Icon, tone }) {
  return <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"><span className={`grid h-10 w-10 place-items-center rounded-lg ${tone}`}><Icon size={18} /></span><div><p className="text-xs text-text-muted">{label}</p><p className="mt-1 font-mono text-xl">{value}</p></div></div>;
}

function ProjectCard({ project, onDelete, isDeleting }) {
  return <article className="flex min-h-52 flex-col rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent-dim hover:bg-surface-raised/50">
    <Link to={`/projects/${project.id}`} className="group flex flex-1 flex-col">
      <div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-base text-accent"><Code2 size={18} /></span><StatusBadge status={project.status} /></div>
      <h2 className="mt-4 truncate text-base font-medium text-text" title={project.name}>{project.name}</h2>
      <p className="mt-1 truncate text-xs text-text-muted">{[project.language, project.framework, project.version, ...(project.technologies || [])].filter(Boolean).join(" · ") || "Tecnología no identificada"}</p>
      <p className="mt-3 flex min-w-0 items-center gap-1.5 text-xs text-text-faint"><FolderGit2 size={13} className="shrink-0" /><span className="truncate" title={project.path}>{project.path}</span></p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4"><span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-text-muted" title={project.gitBranch || "Sin repositorio Git"}><GitBranch size={13} className="shrink-0" />{project.gitBranch || "Sin rama Git"}{project.gitShortCommitHash && <span className="font-mono text-text-faint">· {project.gitShortCommitHash}</span>}</span><span className="inline-flex shrink-0 items-center gap-1 text-xs text-accent opacity-80 group-hover:opacity-100">Abrir y ejecutar <ArrowRight size={13} /></span></div>
    </Link>
    <div className="mt-3 flex justify-end border-t border-border pt-3"><button type="button" onClick={() => onDelete(project)} disabled={isDeleting} aria-label={`Eliminar ${project.name} de DevVault`} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-danger-dim/20 hover:text-danger disabled:opacity-50"><Trash2 size={13} />{isDeleting ? "Eliminando…" : "Eliminar de DevVault"}</button></div>
  </article>;
}

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (projectId) => api.deleteProject(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  const handleDelete = (project) => {
    const confirmed = window.confirm(`¿Eliminar "${project.name}" de DevVault? Se detendrá si está corriendo y se borrarán sus datos de DevVault. Los archivos de la carpeta permanecerán intactos.`);
    if (confirmed) deleteMutation.mutate(project.id);
  };
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("NAME");
  const [searchParams, setSearchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspace");
  const { data: projects = [], isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["projects", workspaceId || "ALL"], queryFn: () => api.listProjects(workspaceId || undefined) });
  const { data: workspaces = [] } = useQuery({ queryKey: ["workspaces"], queryFn: () => api.listWorkspaces(), enabled: !!workspaceId });
  const workspaceName = workspaces.find((workspace) => workspace.id === workspaceId)?.name;
  const counts = useMemo(() => ({ total: projects.length, active: projects.filter((project) => project.status === "ACTIVE").length, missing: projects.filter((project) => project.status === "NOT_FOUND").length }), [projects]);
  const filteredProjects = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return projects.filter((project) => {
      const matchesStatus = status === "ALL" || project.status === status;
      const searchable = [project.name, project.path, project.language, project.framework, project.gitBranch].filter(Boolean).join(" ").toLocaleLowerCase();
      return matchesStatus && (!term || searchable.includes(term));
    }).sort((a, b) => sort === "STATUS" ? a.status.localeCompare(b.status) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  }, [projects, search, status, sort]);

  return <div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-accent">Catálogo</p>
        <h1 className="mt-1 text-2xl font-semibold">Projects</h1>
        <p className="mt-2 text-sm text-text-muted">Explora, filtra y ejecuta los proyectos detectados en tus workspaces.</p>
      </div>
      <button type="button" onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-text-muted transition-colors hover:text-text disabled:opacity-50">
        <ArrowDownAZ size={14} /> {isFetching ? "Actualizando…" : "Actualizar"}
      </button>
    </header>
    {deleteMutation.isError &&
      <div className="rounded-lg border border-danger-dim bg-danger-dim/10 px-4 py-3 text-sm text-danger">
        No se pudo eliminar el proyecto: {deleteMutation.error?.message || "error inesperado"}
      </div>}
    {workspaceId &&
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-dim/50 bg-accent-dim/10 px-4 py-3"><p className="text-sm text-text">
        Escaneo completado · {workspaceName || "Workspace seleccionado"}
        <span className="text-xs text-text-muted">({projects.length} proyectos)</span>
      </p><button type="button" onClick={() => setSearchParams({})} className="text-xs text-accent hover:underline">Ver todos los proyectos
        </button>
      </div>}
    {!isLoading && !isError &&
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Proyectos detectados" value={counts.total} icon={Boxes} tone="bg-accent-dim/20 text-accent" />
        <SummaryCard label="Disponibles" value={counts.active} icon={Code2} tone="bg-accent-dim/20 text-accent" />
        <SummaryCard label="Rutas faltantes" value={counts.missing} icon={FolderGit2} tone="bg-danger-dim/20 text-danger" />
      </section>}
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, ruta, lenguaje o framework…" className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent-dim" /></label>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs text-text-muted">
          <SlidersHorizontal size={14} />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent py-2.5 text-text outline-none">
            <option value="NAME">Ordenar: nombre</option>
            <option value="STATUS">Ordenar: estado</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">{FILTERS.map((filter) => <button key={filter.id} type="button" onClick={() => setStatus(filter.id)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${status === filter.id ? "border-accent-dim bg-accent-dim/20 text-accent" : "border-border bg-surface text-text-muted hover:text-text"}`}>{filter.label}{filter.id === "ALL" ? ` · ${counts.total}` : filter.id === "ACTIVE" ? ` · ${counts.active}` : filter.id === "NOT_FOUND" ? ` · ${counts.missing}` : ""}</button>)}</div>
    </section>
    {isLoading &&
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) =>
        <div key={item} className="h-48 animate-pulse rounded-xl border border-border bg-surface" />)}
      </div>}
    {isError &&
      <div className="rounded-xl border border-danger-dim bg-danger-dim/10 p-4 text-sm text-danger">No se pudo cargar la lista de proyectos. Revisa la conexión con el backend.</div>}
    {!isLoading && !isError && filteredProjects.length === 0 && <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center"><Search size={22} className="mx-auto mb-3 text-text-faint" /><p className="text-sm text-text-muted">{projects.length === 0 ? "Todavía no hay proyectos." : "No hay proyectos que coincidan con estos filtros."}</p><p className="mt-1 text-xs text-text-faint">{projects.length === 0 ? <>Añade y escanea un <Link to="/workspaces" className="text-accent hover:underline">Workspace</Link> para comenzar.</> : "Prueba otra búsqueda o cambia el estado seleccionado."}</p></div>}
    {!isLoading && !isError && filteredProjects.length > 0 && <><p className="text-xs text-text-faint">Mostrando {filteredProjects.length} de {projects.length} proyectos</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredProjects.map((project) => <ProjectCard key={project.id} project={project} onDelete={handleDelete} isDeleting={deleteMutation.isPending && deleteMutation.variables === project.id} />)}</div></>}
  </div>;
}
