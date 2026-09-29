import { StrictMode } from "react";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { SetupPage } from "./pages/SetupPage";
import { RecoverPage } from "./pages/RecoverPage";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { LogsPage } from "./pages/LogsPage";
import { AutomationPage } from "./pages/AutomationPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { DockerPage } from "./pages/DockerPage";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5000 } } });
createRoot(document.getElementById("root")).render(
  <StrictMode><QueryClientProvider client={queryClient}><AuthProvider><BrowserRouter><Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/recover" element={<RecoverPage />} />
    <Route element={<RequireAuth><AppShell /></RequireAuth>}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
      <Route path="/workspaces" element={<WorkspacesPage />} />
      <Route path="/docker" element={<DockerPage />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="/automation" element={<AutomationPage />} />
      <Route path="/monitoring" element={<MonitoringPage />} />
      <Route path="/settings" element={<ComingSoonPage title="Settings" note="Llega en la v1.0 (Resource y Environment)." />} />
    </Route>
  </Routes></BrowserRouter></AuthProvider></QueryClientProvider></StrictMode>
);