import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, Folder, FolderOpen, HardDrive, LoaderCircle, Plus, ScanLine, Trash2, X } from "lucide-react";
import { api, ApiError } from "../lib/api";

const inputClass = "w-full rounded-md border border-border bg-base px-3 py-2 text-sm outline-none focus:border-accent/60";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function ScanStatus({ workspaceId, scanning, onFinish }) {
  const { data, isError, error } = useQuery({
    queryKey: ["workspaces", workspaceId, "scan-status"],
    queryFn: async () => {
      try { return await api.scanStatus(workspaceId); }
      catch (requestError) { if (requestError.status === 404) return null; throw requestError; }
    },
    retry: false,
    refetchInterval: (query) => scanning || query.state.data?.status === "IN_PROGRESS" ? 1500 : false,
  });
  useEffect(() => {
    if (scanning && data && ["COMPLETED", "FAILED"].includes(data.status)) onFinish();
  }, [data, scanning, onFinish]);

  if (scanning || data?.status === "IN_PROGRESS") return <span className="inline-flex items-center gap-1.5 text-xs text-warning"><LoaderCircle size={13} className="animate-spin" /> Escaneando</span>;
  if (data?.status === "COMPLETED") return <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 text-xs text-accent"><Check size={13} /> {data.projectsFound} proyecto(s) detectado(s)</span>{data.projectsFound > 0 && <Link to={"/projects?workspace=" + workspaceId} className="text-xs text-accent underline-offset-2 hover:underline">Ver y ejecutar</Link>}</div>;
  if (data?.status === "FAILED") return <span className="text-xs text-danger" title={data.errorMessage}>Escaneo fallido</span>;
  // El backend devuelve NOT_STARTED cuando el workspace nunca se ha escaneado,
  // así que el 404 que antes llenaba la consola ya no aparece. El isError se
  // mantiene por si el backend no está accesible, que sí sería un fallo real.
  if (isError) return <span className="text-xs text-danger" title={error?.message}>Estado no disponible</span>;
  return <span className="text-xs text-text-faint">Sin escanear</span>;
}

function FolderPicker({ open, onClose, onSelect }) {
  const [path, setPath] = useState("");
  const query = useQuery({ queryKey: ["directories", path], queryFn: () => api.listDirectories(path || undefined), enabled: open, retry: false });
  useEffect(() => { if (open) setPath(""); }, [open]);
  if (!open) return null;
  const listing = query.data;

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="folder-picker-title" className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
      <header className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 id="folder-picker-title" className="text-sm font-medium">Selecciona una carpeta</h2><p className="mt-1 break-all font-mono text-xs text-text-faint">{listing?.currentPath || "Este equipo"}</p></div><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md p-2 text-text-muted hover:bg-surface-raised hover:text-text"><X size={16} /></button></header>
      <div className="flex items-center justify-between border-b border-border px-4 py-2"><button type="button" disabled={!listing?.parentPath} onClick={() => setPath(listing.parentPath)} className={`${buttonClass} bg-surface-raised text-text-muted`}><ChevronLeft size={14} /> Subir un nivel</button>{listing?.currentPath && <button type="button" onClick={() => { onSelect(listing.currentPath); onClose(); }} className={`${buttonClass} bg-accent text-base`}><Check size={14} /> Elegir carpeta</button>}</div>
      <div className="max-h-80 min-h-48 overflow-y-auto p-2">
        {query.isLoading && <p className="px-3 py-8 text-center text-sm text-text-muted">Cargando carpetas…</p>}
        {query.isError && <p className="px-3 py-8 text-center text-sm text-danger">{query.error?.status === 400 ? "El backend activo aún no cargó el explorador de carpetas. Reinicia DevVault y vuelve a abrirlo." : query.error instanceof ApiError ? query.error.message : "No se pudo leer esta ubicación. Comprueba los permisos."}</p>}
        {listing?.directories.map((directory) => <button key={directory.path} type="button" onClick={() => setPath(directory.path)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-raised"><Folder size={15} className="shrink-0 text-warning" /><span className="truncate">{directory.name}</span></button>)}
        {listing && listing.directories.length === 0 && <p className="px-3 py-8 text-center text-sm text-text-muted">No hay subcarpetas aquí. Puedes elegir esta ubicación.</p>}
      </div>
    </section>
  </div>;
}

export function WorkspacesPage() {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scanningWorkspaceId, setScanningWorkspaceId] = useState(null);
  const queryClient = useQueryClient();
  const onScanFinished = useCallback(() => {
    setScanningWorkspaceId(null);
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient]);
  const { data: workspaces = [], isLoading, isError } = useQuery({ queryKey: ["workspaces"], queryFn: () => api.listWorkspaces() });
  const createMutation = useMutation({
    mutationFn: () => api.createWorkspace({ name: name.trim() || null, path }),
    onSuccess: () => { setName(""); setPath(""); queryClient.invalidateQueries({ queryKey: ["workspaces"] }); },
  });
  const scanMutation = useMutation({
    mutationFn: (id) => api.scanWorkspace(id),
    onMutate: (id) => {
      setScanningWorkspaceId(id);
      queryClient.setQueryData(["workspaces", id, "scan-status"], (previous) => ({ ...(previous || {}), status: "IN_PROGRESS", startedAt: new Date().toISOString() }));
    },
    onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: ["workspaces", id, "scan-status"] }),
    onError: () => setScanningWorkspaceId(null),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteWorkspace(id),
    // Tras borrar, los proyectos de ese workspace ya no existen, así que hay que
    // refrescar también la lista de proyectos y no solo la de workspaces.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  const handleDelete = (workspace) => {
    const confirmed = window.confirm(
      `¿Quitar "${workspace.name}" de DevVault?\n\n` +
      "Se eliminarán sus proyectos y los datos que DevVault tiene de ellos, y se detendrá lo que esté corriendo.\n\n" +
      "Los archivos de la carpeta NO se borran: seguirán en el disco."
    );
    if (confirmed) deleteMutation.mutate(workspace.id);
  };

  return <div className="space-y-7">
    <header><p className="text-xs uppercase tracking-[0.18em] text-accent">Organización</p><h1 className="mt-1 text-2xl font-semibold">Workspaces</h1><p className="mt-2 max-w-2xl text-sm text-text-muted">Añade una carpeta raíz para descubrir proyectos y consultar el resultado de cada escaneo.</p></header>
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-dim/20 text-accent"><Plus size={17} /></span><div><h2 className="text-sm font-medium">Añadir espacio de trabajo</h2><p className="mt-1 text-xs text-text-faint">El nombre se obtiene de la carpeta si lo dejas vacío.</p></div></div>
      <form onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }} className="grid gap-4 md:grid-cols-2">
        <label className="text-xs text-text-muted">Nombre <span className="text-text-faint">· opcional</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder={path ? path.split(/[\\/]/).filter(Boolean).at(-1) : "Nombre de la carpeta"} className={`${inputClass} mt-1.5`} /></label>
        <div><label className="mb-1.5 block text-xs text-text-muted">Carpeta</label><div className="flex gap-2"><button type="button" onClick={() => setPickerOpen(true)} className={`${buttonClass} shrink-0 border border-border bg-surface-raised text-text-muted hover:text-text`}><FolderOpen size={15} /> Examinar</button><div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-base px-3 py-2 text-xs font-mono text-text-muted"><HardDrive size={14} className="shrink-0 text-text-faint" /><span className="truncate" title={path}>{path || "Ninguna carpeta seleccionada"}</span></div></div></div>
        <div className="flex flex-wrap items-center justify-end gap-3 md:col-span-2"><label className="w-full text-xs text-text-faint">También puedes pegar la ruta<input value={path} onChange={(event) => setPath(event.target.value)} placeholder="C:/Users/user/Documents/proyectos" className="mt-1.5 w-full rounded-md border border-border bg-base px-3 py-2 font-mono text-xs text-text outline-none focus:border-accent/60" /></label>{createMutation.isError && <span className="mr-auto text-xs text-danger">{createMutation.error instanceof ApiError ? createMutation.error.message : "Error al crear el Workspace"}</span>}<button type="submit" disabled={createMutation.isPending || !path} className={`${buttonClass} bg-accent text-base hover:brightness-110`}><Plus size={15} />{createMutation.isPending ? "Creando…" : "Añadir workspace"}</button></div>
      </form>
    </section>
    <section><div className="mb-3"><h2 className="text-sm font-medium">Tus carpetas</h2><p className="mt-1 text-xs text-text-faint">{workspaces.length} workspace(s) configurados</p></div>
      {isLoading ? <p className="py-8 text-center text-sm text-text-muted">Cargando workspaces…</p> : isError ? <p className="rounded-lg border border-danger-dim bg-danger-dim/10 p-4 text-sm text-danger">No se pudieron cargar los workspaces.</p> : workspaces.length === 0 ? <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center"><Folder size={22} className="mx-auto mb-3 text-text-faint" /><p className="text-sm text-text-muted">Aún no tienes workspaces.</p><p className="mt-1 text-xs text-text-faint">Selecciona una carpeta arriba para comenzar.</p></div> : <div className="grid gap-3 lg:grid-cols-2">{workspaces.map((workspace) => <article key={workspace.id} className="rounded-xl border border-border bg-surface p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-raised text-warning"><Folder size={16} /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-medium">{workspace.name}</h3><p className="mt-1 truncate font-mono text-xs text-text-faint" title={workspace.path}>{workspace.path}</p></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><ScanStatus workspaceId={workspace.id} scanning={scanningWorkspaceId === workspace.id} onFinish={onScanFinished} /><button type="button" onClick={() => scanMutation.mutate(workspace.id)} disabled={scanMutation.isPending || scanningWorkspaceId === workspace.id} className={`${buttonClass} bg-surface-raised text-text-muted hover:text-text`}><ScanLine size={14} />{scanningWorkspaceId === workspace.id ? "Escaneando…" : "Escanear ahora"}</button><button type="button" onClick={() => handleDelete(workspace)} disabled={deleteMutation.isPending && deleteMutation.variables === workspace.id} aria-label={`Quitar ${workspace.name} de DevVault`} title="Quitar de DevVault. Los archivos de la carpeta no se borran." className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-danger-dim/20 hover:text-danger disabled:opacity-50"><Trash2 size={13} />{deleteMutation.isPending && deleteMutation.variables === workspace.id ? "Quitando…" : "Quitar"}</button></div>{scanMutation.isError && scanMutation.variables === workspace.id && <p className="mt-2 text-xs text-danger">{scanMutation.error instanceof ApiError ? scanMutation.error.message : "No se pudo iniciar el escaneo."}</p>}{deleteMutation.isError && deleteMutation.variables === workspace.id && <p className="mt-2 text-xs text-danger">{deleteMutation.error instanceof ApiError ? deleteMutation.error.message : "No se pudo quitar el workspace."}</p>}</article>)}</div>}
    </section>
    <FolderPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={setPath} />
  </div>;
}
