const BASE_URL = "http://localhost:8080/api/v1";
class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
async function request(path, options = {}) {
  const response = await fetch(BASE_URL + path, { headers: { "Content-Type": "application/json" }, ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message || ("Error " + response.status));
  }
  if (response.status === 204 || response.status === 202) return null;
  const responseBody = await response.text();
  return responseBody ? JSON.parse(responseBody) : null;
}
export const api = {
  listWorkspaces: () => request("/workspaces"),
  listDirectories: (path) => request("/workspaces/directories" + (path ? "?path=" + encodeURIComponent(path) : "")),
  createWorkspace: (data) => request("/workspaces", { method: "POST", body: JSON.stringify(data) }),
  scanWorkspace: (id) => request("/workspaces/" + id + "/scan", { method: "POST" }),
  scanStatus: (id) => request("/workspaces/" + id + "/scan/status"),
  listProjects: (workspaceId) => request(workspaceId ? "/projects?workspaceId=" + workspaceId : "/projects"),
  getProject: (id) => request("/projects/" + id),
  deleteProject: (id) => request("/projects/" + id, { method: "DELETE" }),
  startProject: (id) => request("/projects/" + id + "/start", { method: "POST" }),
  stopProject: (id) => request("/projects/" + id + "/stop", { method: "POST" }),
  projectStatus: (id) => request("/projects/" + id + "/status"),
  projectServices: (id) => request("/projects/" + id + "/services"),
  activeRuntimes: () => request("/runtime/active"),
  listRules: () => request("/automation/rules"),
  getRule: (id) => request("/automation/rules/" + id),
  createRule: (data) => request("/automation/rules", { method: "POST", body: JSON.stringify(data) }),
  updateRule: (id, data) => request("/automation/rules/" + id, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRule: (id) => request("/automation/rules/" + id, { method: "DELETE" }),
  projectMetrics: (projectId) => request("/projects/" + projectId + "/metrics"),
  projectRoutes: (projectId) => request("/projects/" + projectId + "/routes"),
  listAlerts: ({ status, projectId } = {}) => {
    const query = new URLSearchParams();
    if (status && status !== "ALL") query.set("status", status);
    if (projectId && projectId !== "ALL") query.set("projectId", projectId);
    const suffix = query.toString();
    return request("/alerts" + (suffix ? "?" + suffix : ""));
  },
  resolveAlert: (id) => request("/alerts/" + id, { method: "PATCH", body: JSON.stringify({ resolved: true }) }),
};
export { ApiError };
