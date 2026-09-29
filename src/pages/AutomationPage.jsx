import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Zap, ZapOff } from "lucide-react";
import { api, ApiError } from "../lib/api";

const EVENT_TYPES = ["ProjectFailedEvent", "ProjectStartedEvent"];
const ACTION_TYPES = ["LOG"];

function NewRuleForm({ onCreated }) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const { data: projects = [] } = useQuery({ queryKey: ["automation-project-options"], queryFn: () => api.listProjects() });
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [conditionExpr, setConditionExpr] = useState("");
  const [actionType, setActionType] = useState(ACTION_TYPES[0]);
  const [message, setMessage] = useState("Automation activada para el proyecto #{projectId}");

  const createMutation = useMutation({
    mutationFn: () =>
      api.createRule({
        name,
        projectId: projectId || null,
        triggers: [{ eventType }],
        conditions: conditionExpr.trim() ? [{ expression: conditionExpr.trim() }] : [],
        actions: [{ actionType, params: { message } }],
      }),
    onSuccess: () => {
      setName("");
      setConditionExpr("");
      onCreated();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createMutation.mutate();
      }}
      className="mb-6 space-y-4 rounded-xl border border-border bg-surface p-5"
    >
      <div>
        <label className="block text-xs text-text-muted mb-1">Nombre de la regla</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Registrar un fallo de arranque"
          required
          className="w-full bg-base border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-border-strong"
        />
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">Alcance</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full bg-base border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-border-strong">
          <option value="">Todos los proyectos</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-text-muted mb-1">Cuándo (Trigger)</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full bg-base border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-border-strong"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t === "ProjectFailedEvent" ? "Falló al iniciar" : "Inició correctamente"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Acción (LOG: escribe en el log del backend)</label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="w-full bg-base border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-border-strong"
          >
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>Log del backend</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">
          Condición (opcional, expresión SpEL) <span className="text-text-faint">— fallo: #reason.contains('puerto'); ambos eventos: #projectId</span>
        </label>
        <input
          value={conditionExpr}
          onChange={(e) => setConditionExpr(e.target.value)}
          placeholder="vacío = siempre se ejecuta"
          className="w-full bg-base border border-border rounded-md px-3 py-1.5 text-sm font-mono outline-none focus:border-border-strong"
        />
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">
          Mensaje <span className="text-text-faint">— usa #{"{"}variable{"}"} para insertar datos del evento</span>
        </label>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-base border border-border rounded-md px-3 py-1.5 text-sm font-mono outline-none focus:border-border-strong"
        />
      </div>

      <button
        type="submit"
        disabled={createMutation.isPending}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-accent-dim/30 text-accent border border-accent-dim hover:bg-accent-dim/50 transition-colors disabled:opacity-50"
      >
        <Plus size={14} /> Crear regla
      </button>

      {createMutation.isError && (
        <div className="border border-danger-dim bg-danger-dim/10 text-danger text-xs rounded-md px-3 py-2">
          {createMutation.error instanceof ApiError ? createMutation.error.message : "Error al crear la regla"}
        </div>
      )}
    </form>
  );
}

export function AutomationPage() {
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: () => api.listRules(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isEnabled }) => api.updateRule(id, { isEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Automation</h1>
      <p className="text-xs text-text-muted mb-6">
        Reglas ante inicios correctos o fallidos. La acción disponible registra un mensaje en el log del backend.
      </p>

      <NewRuleForm onCreated={refresh} />

      {isLoading ? (
        <p className="text-text-muted text-sm">Cargando…</p>
      ) : rules?.length === 0 ? (
        <div className="border border-border rounded-lg px-4 py-8 text-center text-sm text-text-muted">
          Todavía no tienes reglas creadas.
        </div>
      ) : (
        <div className="space-y-2">
          {rules?.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {rule.enabled ? (
                    <Zap size={14} className="text-accent" />
                  ) : (
                    <ZapOff size={14} className="text-text-faint" />
                  )}
                  <span className="text-sm">{rule.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMutation.mutate({ id: rule.id, isEnabled: !rule.enabled })}
                    className="text-xs px-2.5 py-1 rounded-md bg-surface-raised text-text-muted border border-border hover:text-text transition-colors"
                  >
                    {rule.enabled ? "Deshabilitar" : "Habilitar"}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(rule.id)}
                    className="p-1.5 rounded-md text-text-faint hover:text-danger hover:bg-danger-dim/10 transition-colors"
                    aria-label="Eliminar regla"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-text-muted font-mono">
                <span>Proyecto: {rule.projectId || "Todos"}</span><span>Trigger: {rule.triggers.join(", ")}</span>
                {rule.conditions.length > 0 && <span>condición: {rule.conditions.join(", ")}</span>}
                <span>acción: {rule.actions.map((a) => a.actionType).join(", ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}




