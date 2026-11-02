import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const HISTORY_LIMIT = 150;

export function useRuntimeMetrics(projectIds, enabled) {
  const queryClient = useQueryClient();
  const stableProjectIds = [...new Set(projectIds)].sort();
  const queryKey = ["runtime-metrics", stableProjectIds.join(",")];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const previousHistory = queryClient.getQueryData(queryKey)?.history || [];
      const metrics = (await Promise.all(stableProjectIds.map(async (projectId) => (
        (await api.projectMetrics(projectId)).map((metric) => ({ ...metric, projectId }))
      )))).flat();
      const sampleSignature = stableProjectIds.map((projectId) => {
        const projectMetrics = metrics.filter((metric) => metric.projectId === projectId);
        return `${projectId}:${projectMetrics
          .map((metric) => `${metric.serviceId}@${metric.capturedAt}`)
          .sort()
          .join(",")}`;
      }).join("|");
      if (!metrics.length || previousHistory.at(-1)?.signature === sampleSignature) {
        return { metrics, history: previousHistory };
      }

      const projects = Object.fromEntries(stableProjectIds.map((projectId) => {
        const projectMetrics = metrics.filter((metric) => metric.projectId === projectId);
        const cpuValues = projectMetrics.map((metric) => metric.cpuPercent).filter(Number.isFinite);
        const memoryValues = projectMetrics.map((metric) => metric.memMb).filter(Number.isFinite);
        return [projectId, {
          cpu: cpuValues.length ? cpuValues.reduce((sum, value) => sum + value, 0) : null,
          memory: memoryValues.length ? memoryValues.reduce((sum, value) => sum + value, 0) : null,
        }];
      }));
      const latestTimestamp = Math.max(...metrics.map((metric) => new Date(metric.capturedAt).getTime())
        .filter(Number.isFinite));
      const allCpuValues = metrics.map((metric) => metric.cpuPercent).filter(Number.isFinite);
      const allMemoryValues = metrics.map((metric) => metric.memMb).filter(Number.isFinite);
      const sample = {
        at: Number.isFinite(latestTimestamp) ? new Date(latestTimestamp).toISOString() : new Date().toISOString(),
        signature: sampleSignature,
        all: {
          cpu: allCpuValues.length ? allCpuValues.reduce((sum, value) => sum + value, 0) : null,
          memory: allMemoryValues.length ? allMemoryValues.reduce((sum, value) => sum + value, 0) : null,
        },
        projects,
      };
      return { metrics, history: [...previousHistory, sample].slice(-HISTORY_LIMIT) };
    },
    enabled: enabled && stableProjectIds.length > 0,
    refetchInterval: enabled && stableProjectIds.length > 0 ? 2000 : false,
    retry: false,
  });
}
