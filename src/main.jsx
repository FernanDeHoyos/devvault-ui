import { StrictMode } from "react";
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

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5000 } } });
createRoot(document.getElementById("root")).render(
  <StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><Routes>
    <Route element={<AppShell />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
      <Route path="/workspaces" element={<WorkspacesPage />} />
      <Route path="/docker" element={<ComingSoonPage title="Docker" note="El control de Docker ya está disponible dentro del detalle de cada proyecto (Projects → abrir un proyecto)." />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="/automation" element={<AutomationPage />} />
      <Route path="/monitoring" element={<MonitoringPage />} />
      <Route path="/settings" element={<ComingSoonPage title="Settings" note="Llega en la v1.0 (Resource, Environment, autenticación real)." />} />
    </Route>
  </Routes></BrowserRouter></QueryClientProvider></StrictMode>
);
