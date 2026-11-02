import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes, Check, ChevronDown, ChevronRight, CircleHelp, File, Folder, Network, ScanSearch,
} from "lucide-react";
import { api } from "../lib/api";

const CATEGORIES = [
  ["FRONTEND", "Frontend"],
  ["BACKEND", "Backend"],
  ["DATABASE", "Base de datos"],
  ["INFRASTRUCTURE", "Infraestructura"],
  ["TOOLS", "Herramientas"],
  ["LANGUAGE", "Lenguajes"],
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES);
const NODE_LABELS = {
  MODULE: "Módulo",
  DEPENDENCY: "Dependencia",
  DATABASE: "Base de datos",
  TOOL: "Herramienta",
  SERVICE: "Servicio",
  CONFIGURATION: "Configuración",
  TECHNOLOGY: "Tecnología",
};
const SCOPE_LABELS = {
  PRODUCTION: "Producción",
  DEVELOPMENT: "Desarrollo",
  TRANSITIVE: "Transitiva",
};
const DATABASE_STATUS_LABELS = {
  CONFIGURED: "Configuración declarada",
  DEPENDENCY: "Driver declarado",
  DECLARED: "Servicio declarado",
};
const RELATIONSHIP_LABELS = {
  uses: "usa",
  contains: "contiene",
  "configured-for": "configura",
  "driver-declared": "declara driver",
  "declared-service": "declara servicio",
  "built-or-managed-by": "herramienta",
  "declared-in": "declara",
  "configured-by": "configuración",
  declares: "declara",
};
const SECTIONS = [
  ["summary", "Resumen"],
  ["structure", "Estructura"],
  ["stack", "Stack y mapa"],
  ["dependencies", "Dependencias"],
  ["infrastructure", "Infraestructura"],
];

function TechnologyCard({ technology, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-w-0 rounded-lg border p-3 text-left transition-colors ${
        selected ? "border-accent bg-accent-dim/20" : "border-border bg-surface-raised hover:border-accent-dim"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium">{technology.name}</span>
        {technology.primary && <Check size={14} className="shrink-0 text-accent" aria-label="Principal" />}
      </span>
      <span className="mt-1 block text-xs text-text-muted">
        {CATEGORY_LABELS[technology.category] || technology.category}
      </span>
      <span className="mt-2 block truncate font-mono text-xs text-text-faint">
        {technology.version || "Versión no determinada"}
      </span>
    </button>
  );
}

function EvidenceList({ evidence, onOpenEvidence, isOpeningEvidence }) {
  if (!evidence?.length) {
    return <p className="text-xs text-text-faint">No hay una ruta de evidencia disponible para este registro.</p>;
  }
  return (
    <ul className="mt-2 space-y-1">
      {evidence.map((item, index) => (
        <li key={`${item.file}-${item.property}-${index}`} className="text-xs">
          <code className="break-all text-accent">{item.file}</code>
          {item.property && <span className="text-text-muted"> · {item.property}</span>}
          {item.value && <span className="text-text-faint"> = {item.value}</span>}
          <button
            type="button"
            disabled={isOpeningEvidence}
            onClick={() => onOpenEvidence(item.file)}
            className="ml-2 text-accent underline-offset-2 hover:underline disabled:opacity-50"
          >
            {isOpeningEvidence ? "Abriendo…" : "Abrir"}
          </button>
        </li>
      ))}
    </ul>
  );
}

function InventorySection({ title, items, emptyText, children }) {
  return (
    <section>
      {title && (
        <h3 className="mb-2 text-sm font-medium">
          {title} <span className="text-text-faint">({items.length})</span>
        </h3>
      )}
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-text-muted">
          {emptyText}
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto overscroll-contain pr-2">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => children(item))}
          </div>
        </div>
      )}
    </section>
  );
}

function InventoryCard({ title, subtitle, evidence, onOpenEvidence, isOpeningEvidence }) {
  return (
    <article className="min-w-0 rounded-lg border border-border bg-surface-raised/50 p-3">
      <p className="break-all text-sm font-medium">{title}</p>
      {subtitle && <p className="mt-1 break-all text-xs text-text-muted">{subtitle}</p>}
      {evidence && (
        <EvidenceList evidence={[evidence]} onOpenEvidence={onOpenEvidence}
          isOpeningEvidence={isOpeningEvidence} />
      )}
    </article>
  );
}

function TreeEntry({ node, depth = 0 }) {
  const indentation = { paddingLeft: `${depth * 16}px` };
  if (!node.directory) {
    return (
      <div className="flex min-w-0 items-center gap-2 py-1 text-xs text-text-muted" style={indentation}>
        <File size={14} className="shrink-0 text-text-faint" />
        <span className="truncate" title={node.path}>{node.name}</span>
      </div>
    );
  }
  return (
    <details open={depth === 0} className="group min-w-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded py-1 text-xs hover:bg-surface-raised"
        style={indentation}>
        <ChevronRight size={14} className="shrink-0 group-open:hidden" />
        <ChevronDown size={14} className="hidden shrink-0 group-open:block" />
        <Folder size={14} className="shrink-0 text-accent" />
        <span className="truncate font-medium" title={node.path || node.name}>{node.name}</span>
      </summary>
      <div>
        {node.children?.map((child) => (
          <TreeEntry key={child.path} node={child} depth={depth + 1} />
        ))}
        {node.truncated && (
          <p className="py-1 text-[11px] text-text-faint" style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
            Contenido limitado para mantener el árbol ligero.
          </p>
        )}
      </div>
    </details>
  );
}

function SummaryCard({ label, count }) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised/50 p-3">
      <p className="text-lg font-semibold">{count}</p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </div>
  );
}

function ArchitectureDiagram({ projectName, nodes, edges, selectedType, onSelectType }) {
  const projectNode = nodes.find((node) => node.type === "PROJECT");
  const groupedNodes = Object.values(nodes
    .filter((node) => node.type !== "PROJECT")
    .reduce((groups, node) => {
      const key = node.type;
      if (!groups[key]) {
        groups[key] = { key, label: NODE_LABELS[key] || key, nodes: [] };
      }
      groups[key].nodes.push(node);
      return groups;
    }, {}));
  const rowHeight = 82;
  const height = Math.max(150, groupedNodes.length * rowHeight + 36);
  const rootY = groupedNodes.length === 1 ? 23 : height / 2 - 27;
  const branchX = 270;
  const groupX = 320;
  const groupWidth = 620;
  const componentIds = new Set(nodes.filter((node) => node.type !== "PROJECT").map((node) => node.id));
  const componentEdges = edges.filter((edge) => componentIds.has(edge.target));

  if (!groupedNodes.length) {
    return <p className="text-xs text-text-muted">No se detectaron componentes confirmables.</p>;
  }

  return (
    <div className="max-h-[32rem] overflow-auto rounded-lg border border-border bg-base/60 p-3">
      <svg
        role="img"
        aria-label={`Diagrama de arquitectura de ${projectName}, agrupado por tipo de componente`}
        viewBox={`0 0 960 ${height}`}
        className="h-auto min-w-[720px]"
      >
        <path
          d={`M 206 ${height / 2} H ${branchX} M ${branchX} 50 V ${18 + (groupedNodes.length - 1) * rowHeight + 32}`}
          fill="none"
          stroke="var(--color-accent-dim)"
          strokeWidth="2"
        />
        {groupedNodes.map((group, index) => {
          const y = 18 + index * rowHeight;
          const centerY = y + 32;
          const selected = selectedType === group.key;
          const relationshipNames = [...new Set(componentEdges
            .filter((edge) => group.nodes.some((node) => node.id === edge.target))
            .map((edge) => RELATIONSHIP_LABELS[edge.relationship] || edge.relationship))];
          const examples = group.nodes.slice(0, 3).map((node) => node.name);
          const preview = examples.join(" · ");
          const remaining = group.nodes.length - examples.length;
          return (
            <g
              key={group.key}
              role="button"
              tabIndex={0}
              aria-label={`Filtrar ${group.label}: ${group.nodes.length} componentes`}
              aria-pressed={selected}
              onClick={() => onSelectType(selected ? "ALL" : group.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectType(selected ? "ALL" : group.key);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <path d={`M ${branchX} ${centerY} H ${groupX}`} fill="none"
                stroke="var(--color-accent-dim)" strokeWidth="2" />
              <rect x={groupX} y={y} width={groupWidth} height="64" rx="9"
                fill={selected ? "var(--color-accent-dim)" : "var(--color-surface-raised)"}
                fillOpacity={selected ? "0.22" : "1"}
                stroke={selected ? "var(--color-accent)" : "var(--color-border-strong)"}
                strokeWidth={selected ? "2" : "1"} />
              <text x={groupX + 16} y={y + 23} fill="var(--color-accent)"
                fontSize="13" fontWeight="600">
                {group.label} · {group.nodes.length}
              </text>
              <text x={groupX + 16} y={y + 45} fill="var(--color-text-muted)" fontSize="11">
                {`${preview.length > 58 ? `${preview.slice(0, 55)}…` : preview}${remaining > 0 ? ` · +${remaining} más` : ""}`}
              </text>
              {relationshipNames.length > 0 && (
                <text x={groupX + groupWidth - 14} y={y + 23} fill="var(--color-text-faint)"
                  fontSize="10" textAnchor="end">
                  {relationshipNames.join(" · ")}
                </text>
              )}
            </g>
          );
        })}
        <rect x="16" y={rootY} width="190" height="54" rx="9"
          fill="var(--color-accent-dim)" fillOpacity="0.2" stroke="var(--color-accent)" />
        <text x="111" y={rootY + 22} fill="var(--color-text-faint)" fontSize="9"
          textAnchor="middle" letterSpacing="1.2">PROYECTO</text>
        <text x="111" y={rootY + 41} fill="var(--color-text)" fontSize="13"
          fontWeight="600" textAnchor="middle">
          {(projectNode?.name || projectName).length > 24
            ? `${(projectNode?.name || projectName).slice(0, 21)}…`
            : projectNode?.name || projectName}
        </text>
      </svg>
    </div>
  );
}

export function ProjectIntelligencePanel({
  project, data, isLoading, isError, onOpenEvidence, isOpeningEvidence, openedEvidence, openEvidenceError,
}) {
  const [activeSection, setActiveSection] = useState("summary");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTechnologyId, setSelectedTechnologyId] = useState(null);
  const [selectedMapType, setSelectedMapType] = useState("ALL");
  const [dependencySearch, setDependencySearch] = useState("");
  const { data: tree, isLoading: treeLoading, isError: treeError } = useQuery({
    queryKey: ["projects", project.id, "tree"],
    queryFn: () => api.projectTree(project.id),
    enabled: activeSection === "structure",
    retry: false,
  });

  const stack = data?.stack || [];
  const modules = data?.modules || [];
  const dependencies = data?.dependencies || [];
  const databases = data?.databases || [];
  const tools = data?.tools || [];
  const services = data?.services || [];
  const configurations = data?.configurations || [];
  const technologies = stack.filter(
    (technology) => selectedCategories.length === 0 || selectedCategories.includes(technology.category),
  );
  const visibleDependencies = dependencies.filter((dependency) => (
    `${dependency.name} ${dependency.manager} ${dependency.scope}`.toLowerCase()
      .includes(dependencySearch.toLowerCase())
  ));
  const selectedTechnology = stack.find((technology) => technology.id === selectedTechnologyId);
  const mapNodes = (data?.map?.nodes || []).filter((node) => node.type !== "PROJECT");
  const visibleIds = new Set(mapNodes.map((node) => node.id));
  const mapEdges = (data?.map?.edges || []).filter((edge) => visibleIds.has(edge.target));

  function toggleCategory(category) {
    setSelectedCategories((current) => current.includes(category)
      ? current.filter((value) => value !== category)
      : [...current, category]);
  }

  return (
    <section className="mb-7 overflow-hidden rounded-xl border border-accent-dim/50 bg-surface shadow-lg shadow-accent-dim/5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-raised/60 px-4 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Boxes size={18} className="text-accent" /> Arquitectura del proyecto
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Stack, estructura y dependencias detectados en archivos del proyecto.
          </p>
        </div>
        {data?.scannedAt && (
          <p className="text-xs text-text-faint">Escaneado {new Date(data.scannedAt).toLocaleString()}</p>
        )}
      </header>

      {isLoading ? (
        <p className="px-4 py-6 text-sm text-text-muted">Cargando el análisis del proyecto…</p>
      ) : isError ? (
        <p role="alert" className="px-4 py-6 text-sm text-danger">No se pudo cargar el análisis del proyecto.</p>
      ) : (
        <>
          <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-2" aria-label="Secciones de arquitectura">
            {SECTIONS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-current={activeSection === key ? "page" : undefined}
                onClick={() => setActiveSection(key)}
                className={`shrink-0 border-b-2 px-3 py-2 text-xs transition-colors ${
                  activeSection === key
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="space-y-5 p-4">
            {data?.warnings?.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <p className="flex items-center gap-2 text-xs font-medium text-warning">
                  <CircleHelp size={14} /> Advertencias del escaneo
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-text-muted">
                  {data.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
                </ul>
              </div>
            )}

            {activeSection === "summary" && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                  <SummaryCard label="Tecnologías" count={stack.length} />
                  <SummaryCard label="Módulos" count={modules.length} />
                  <SummaryCard label="Dependencias" count={dependencies.length} />
                  <SummaryCard label="Bases de datos" count={databases.length} />
                  <SummaryCard label="Herramientas" count={tools.length} />
                  <SummaryCard label="Servicios" count={services.length} />
                </div>
                <section>
                  <h3 className="mb-2 text-sm font-medium">Tecnologías principales</h3>
                  {stack.length === 0 ? (
                    <p className="text-xs text-text-muted">Aún no hay stack detectado. Vuelve a escanear el workspace.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {(stack.filter((technology) => technology.primary).length
                        ? stack.filter((technology) => technology.primary)
                        : stack.slice(0, 4)
                      ).slice(0, 4).map((technology) => (
                        <TechnologyCard
                          key={technology.id}
                          technology={technology}
                          selected={false}
                          onSelect={() => {
                            setSelectedTechnologyId(technology.id);
                            setActiveSection("stack");
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
                <p className="text-xs text-text-faint">
                  La detección es estática: no ejecuta el proyecto ni comprueba conexiones a servicios.
                </p>
              </>
            )}

            {activeSection === "structure" && (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Folder size={15} className="text-accent" /> Archivos y carpetas
                  </h3>
                  {treeLoading ? (
                    <p className="rounded-lg border border-border p-4 text-xs text-text-muted">Leyendo estructura…</p>
                  ) : treeError ? (
                    <p role="alert" className="rounded-lg border border-danger/30 p-4 text-xs text-danger">
                      No se pudo leer el árbol del proyecto.
                    </p>
                  ) : tree ? (
                    <div className="max-h-[34rem] overflow-auto rounded-lg border border-border bg-base/60 p-3">
                      <TreeEntry node={tree} />
                    </div>
                  ) : (
                    <p className="rounded-lg border border-border p-4 text-xs text-text-muted">
                      Selecciona esta sección para cargar el árbol.
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-text-faint">
                    El árbol omite dependencias generadas y enlaces simbólicos; carpetas grandes se limitan para agilizar la vista.
                  </p>
                </section>
                <InventorySection title="Módulos detectados" items={modules}
                  emptyText="No se declararon módulos en los manifiestos compatibles.">
                  {(item) => (
                    <InventoryCard key={item.id} title={item.path || item.name}
                      subtitle={`${item.type} · ${item.name}`}
                      evidence={item.evidence} onOpenEvidence={onOpenEvidence}
                      isOpeningEvidence={isOpeningEvidence} />
                  )}
                </InventorySection>
              </div>
            )}

            {activeSection === "stack" && (
              <>
                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">Tecnologías <span className="text-text-faint">({technologies.length})</span></h3>
                    <div className="flex flex-wrap gap-1.5" aria-label="Filtrar por categoría">
                      {CATEGORIES.map(([category, label]) => {
                        const active = selectedCategories.includes(category);
                        return (
                          <button key={category} type="button" aria-pressed={active}
                            onClick={() => toggleCategory(category)}
                            className={`rounded-full border px-2.5 py-1 text-xs ${
                              active ? "border-accent bg-accent-dim/30 text-accent" : "border-border text-text-muted hover:text-text"
                            }`}>
                            {label}
                          </button>
                        );
                      })}
                      {selectedCategories.length > 0 && (
                        <button type="button" onClick={() => setSelectedCategories([])}
                          className="px-2 py-1 text-xs text-text-faint hover:text-text">Limpiar</button>
                      )}
                    </div>
                  </div>
                  {technologies.length ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {technologies.map((technology) => (
                        <TechnologyCard key={technology.id} technology={technology}
                          selected={technology.id === selectedTechnologyId}
                          onSelect={() => setSelectedTechnologyId(technology.id)} />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-text-muted">
                      {stack.length ? "No hay tecnologías en estas categorías." : "Aún no hay tecnologías detectadas."}
                    </p>
                  )}
                </section>
                <details className="rounded-lg border border-border">
                  <summary className="flex cursor-pointer items-center gap-2 p-3 text-sm font-medium">
                    <Network size={15} className="text-accent" /> Mapa de arquitectura
                    <span className="text-xs text-text-faint">{mapNodes.length} componentes · {mapEdges.length} relaciones</span>
                  </summary>
                  <div className="border-t border-border p-3">
                    {mapNodes.length ? (
                      <>
                        <p className="mb-3 text-xs text-text-faint">
                          Selecciona un grupo del diagrama para filtrar los componentes y consultar su evidencia.
                        </p>
                        <ArchitectureDiagram projectName={project.name} nodes={data?.map?.nodes || []}
                          edges={mapEdges} selectedType={selectedMapType} onSelectType={setSelectedMapType} />
                        <details className="mt-3 rounded-lg border border-border">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-text-muted">
                            Ver detalle de componentes y evidencia
                            {selectedMapType !== "ALL" && ` · ${NODE_LABELS[selectedMapType] || selectedMapType}`}
                          </summary>
                          <div className="max-h-96 overflow-y-auto overscroll-contain border-t border-border p-3">
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              {mapNodes.filter((node) => selectedMapType === "ALL" || node.type === selectedMapType).map((node) => {
                                const edge = mapEdges.find((item) => item.target === node.id);
                                return (
                                  <article key={node.id} className="min-w-0 rounded-lg border border-border bg-surface-raised p-3">
                                    <span className="text-[10px] uppercase tracking-wider text-accent">
                                      {NODE_LABELS[node.type] || node.type}
                                    </span>
                                    <p className="mt-1 break-all text-sm font-medium">{node.name}</p>
                                    <p className="mt-1 text-xs text-text-muted">
                                      {edge && `${RELATIONSHIP_LABELS[edge.relationship] || edge.relationship} · `}
                                      {node.category}{node.version && ` · ${node.version}`}
                                    </p>
                                    <EvidenceList evidence={node.evidence} onOpenEvidence={onOpenEvidence}
                                      isOpeningEvidence={isOpeningEvidence} />
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        </details>
                      </>
                    ) : (
                      <p className="text-xs text-text-muted">No se detectaron componentes confirmables.</p>
                    )}
                  </div>
                </details>
                {selectedTechnology && (
                  <div className="rounded-lg border border-border bg-surface-raised/50 p-3" aria-live="polite">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <ScanSearch size={14} className="text-accent" /> Evidencia: {selectedTechnology.name}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {selectedTechnology.confidence === "DIRECT" ? "Detección directa" : "Inferencia"} ·{" "}
                      {CATEGORY_LABELS[selectedTechnology.category] || selectedTechnology.category}
                      {selectedTechnology.version && ` · ${selectedTechnology.version}`}
                    </p>
                    <EvidenceList evidence={selectedTechnology.evidence} onOpenEvidence={onOpenEvidence}
                      isOpeningEvidence={isOpeningEvidence} />
                  </div>
                )}
              </>
            )}

            {activeSection === "dependencies" && (
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">
                    Dependencias declaradas <span className="text-text-faint">({visibleDependencies.length} de {dependencies.length})</span>
                  </h3>
                  <input
                    type="search"
                    value={dependencySearch}
                    onChange={(event) => setDependencySearch(event.target.value)}
                    placeholder="Buscar dependencia…"
                    aria-label="Buscar dependencia"
                    className="w-full max-w-xs rounded-lg border border-border bg-base px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>
                <InventorySection title="" items={visibleDependencies}
                  emptyText={dependencies.length ? "No hay dependencias que coincidan con la búsqueda." : "No se encontraron dependencias en los manifiestos compatibles."}>
                  {(item) => (
                    <InventoryCard key={item.id} title={item.name}
                      subtitle={[item.version, SCOPE_LABELS[item.scope] || item.scope, item.manager]
                        .filter(Boolean).join(" · ")}
                      evidence={item.evidence} onOpenEvidence={onOpenEvidence}
                      isOpeningEvidence={isOpeningEvidence} />
                  )}
                </InventorySection>
              </section>
            )}

            {activeSection === "infrastructure" && (
              <>
                <p className="text-xs text-text-muted">
                  Elementos declarados en configuraciones; no implica que estén activos o conectados.
                </p>
                <div className="grid gap-5 xl:grid-cols-2">
                  <InventorySection title="Bases de datos" items={databases}
                    emptyText="No se detectó una configuración, driver o servicio de base de datos.">
                    {(item) => (
                      <InventoryCard key={item.id} title={item.name}
                        subtitle={DATABASE_STATUS_LABELS[item.status] || item.status}
                        evidence={item.evidence} onOpenEvidence={onOpenEvidence}
                        isOpeningEvidence={isOpeningEvidence} />
                    )}
                  </InventorySection>
                  <InventorySection title="Herramientas" items={tools}
                    emptyText="No se identificaron herramientas de construcción o gestión.">
                    {(item) => (
                      <InventoryCard key={item.id} title={item.name}
                        subtitle={item.version || "Versión no determinada"}
                        evidence={item.evidence} onOpenEvidence={onOpenEvidence}
                        isOpeningEvidence={isOpeningEvidence} />
                    )}
                  </InventorySection>
                  <InventorySection title="Servicios declarados" items={services}
                    emptyText="No se encontraron servicios en archivos Compose.">
                    {(item) => (
                      <InventoryCard key={item.id} title={item.name}
                        subtitle={[item.type, item.image].filter(Boolean).join(" · ")}
                        evidence={item.evidence} onOpenEvidence={onOpenEvidence}
                        isOpeningEvidence={isOpeningEvidence} />
                    )}
                  </InventorySection>
                  <InventorySection title="Configuraciones" items={configurations}
                    emptyText="No se encontraron configuraciones de base de datos o servicios.">
                    {(item) => (
                      <InventoryCard key={item.id} title={item.file}
                        subtitle={item.purpose}
                        evidence={{ file: item.file, property: item.purpose }}
                        onOpenEvidence={onOpenEvidence} isOpeningEvidence={isOpeningEvidence} />
                    )}
                  </InventorySection>
                </div>
              </>
            )}

            {openEvidenceError && <p role="alert" className="text-xs text-danger">{openEvidenceError}</p>}
            {openedEvidence && <p role="status" className="text-xs text-accent">
              Evidencia abierta en {openedEvidence.editorName}.
            </p>}
          </div>
        </>
      )}
    </section>
  );
}
