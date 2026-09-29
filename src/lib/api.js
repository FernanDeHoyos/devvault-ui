// En desarrollo el servidor de Vite corre en 5050 y el backend aparte en 8080,
// así que hace falta la URL absoluta. En la preview empaquetada la UI y la API
// se sirven desde el mismo origen, y usar la URL fija de 8080 haría que la UI
// hablara con el backend equivocado o con ninguno.
const BASE_URL = import.meta.env.DEV ? "http://127.0.0.1:8080/api/v1" : "/api/v1";
let accessToken = sessionStorage.getItem("devvault.accessToken");
class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
function clearAccessToken() { accessToken = null; sessionStorage.removeItem("devvault.accessToken"); window.dispatchEvent(new Event("devvault:unauthorized")); }
async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (accessToken && !options.skipAuth) headers.Authorization = "Bearer " + accessToken;
  const fetchOptions = { ...options, headers }; delete fetchOptions.skipAuth;
  const response = await fetch(BASE_URL + path, fetchOptions);
  if (response.status === 401 && !path.endsWith("/auth/login")) clearAccessToken();
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new ApiError(response.status, body.message || ("Error " + response.status)); }
  if (response.status === 204 || response.status === 202) return null;
  const responseBody = await response.text(); return responseBody ? JSON.parse(responseBody) : null;
}
export function setAccessToken(token) { accessToken = token; if (token) sessionStorage.setItem("devvault.accessToken", token); else sessionStorage.removeItem("devvault.accessToken"); }
export const api = {
  authSetupStatus: () => request("/auth/setup-status", { skipAuth: true }),
  setupAdministrator: (username, password, recoveryKey) => request("/auth/setup", { method: "POST", body: JSON.stringify({ username, password, recoveryKey }), skipAuth: true }),
  recoverPassword: (username, recoveryKey, newPassword) => request("/auth/recover", { method: "POST", body: JSON.stringify({ username, recoveryKey, newPassword }), skipAuth: true }),
  login: (username, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }), skipAuth: true }),
  me: () => request("/auth/me"), logout: () => request("/auth/logout", { method: "POST" }),
  createWebSocketTicket: (projectId, serviceName) => request("/auth/ws-ticket", { method: "POST", body: JSON.stringify({ projectId, serviceName }) }),
  listWorkspaces: () => request("/workspaces"), listDirectories: (path) => request("/workspaces/directories" + (path ? "?path=" + encodeURIComponent(path) : "")),
  createWorkspace: (data) => request("/workspaces", { method: "POST", body: JSON.stringify(data) }), scanWorkspace: (id) => request("/workspaces/" + id + "/scan", { method: "POST" }), scanStatus: (id) => request("/workspaces/" + id + "/scan/status"),
  listProjects: (workspaceId) => request(workspaceId ? "/projects?workspaceId=" + workspaceId : "/projects"), getProject: (id) => request("/projects/" + id), deleteProject: (id) => request("/projects/" + id, { method: "DELETE" }),
  startProject: (id) => request("/projects/" + id + "/start", { method: "POST" }), stopProject: (id) => request("/projects/" + id + "/stop", { method: "POST" }), projectStatus: (id) => request("/projects/" + id + "/status"), projectServices: (id) => request("/projects/" + id + "/services"),
  activeRuntimes: () => request("/runtime/active"), listRules: () => request("/automation/rules"), getRule: (id) => request("/automation/rules/" + id), createRule: (data) => request("/automation/rules", { method: "POST", body: JSON.stringify(data) }),
  updateRule: (id, data) => request("/automation/rules/" + id, { method: "PATCH", body: JSON.stringify(data) }), deleteRule: (id) => request("/automation/rules/" + id, { method: "DELETE" }),
  projectMetrics: (id) => request("/projects/" + id + "/metrics"), projectRoutes: (id) => request("/projects/" + id + "/routes"), projectGit: (id) => request("/projects/" + id + "/git"), fetchGit: (id) => request("/projects/" + id + "/git/fetch", { method: "POST" }),
  listAlerts: ({ status, projectId } = {}) => { const query = new URLSearchParams(); if (status && status !== "ALL") query.set("status", status); if (projectId && projectId !== "ALL") query.set("projectId", projectId); const suffix = query.toString(); return request("/alerts" + (suffix ? "?" + suffix : "")); },
  resolveAlert: (id) => request("/alerts/" + id, { method: "PATCH", body: JSON.stringify({ resolved: true }) }),
  // El editor viaja como query param y no en el cuerpo: así el endpoint se
  // puede llamar sin argumentos cuando se quiere usar el editor configurado.
  listEditors: () => request("/editors"),
  openInEditor: (id, editorId) => request("/projects/" + id + "/open" + (editorId ? "?editorId=" + encodeURIComponent(editorId) : ""), { method: "POST" }),
};
export { ApiError };



