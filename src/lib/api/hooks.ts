import { useQuery } from "@tanstack/react-query";
import { authApi, collaborationsApi, healthApi, requirementsApi, studentsApi } from "./endpoints";
import { ApiError, ApiNotConfiguredError, isApiConfigured, isUnauthorized } from "./client";
import type { RequestStatus, StudentSearchQuery } from "./types";

// Never retry when the backend is unconfigured or the session is invalid.
const retry = (n: number, e: unknown) => !(e instanceof ApiNotConfiguredError) && !isUnauthorized(e) && n < 2;

export const isNotConfigured = (e: unknown) => e instanceof ApiNotConfiguredError;

export const useStudentSearch = (q: StudentSearchQuery) =>
  useQuery({ queryKey: ["students", q], queryFn: () => studentsApi.search(q), retry });

export const useStudent = (id: string) =>
  useQuery({ queryKey: ["student", id], queryFn: () => studentsApi.get(id), retry });

export const useRecommendations = () =>
  useQuery({ queryKey: ["recommendations"], queryFn: studentsApi.recommendations, retry });

export const useRequests = (status?: RequestStatus, box: "incoming" | "outgoing" = "incoming") =>
  useQuery({ queryKey: ["requests", box, status], queryFn: () => collaborationsApi.listRequests(status, box), retry });

export const useCurrentStudent = () =>
  useQuery({ queryKey: ["me"], queryFn: authApi.me, retry, staleTime: 60_000 });

export const useRequirements = (mine = false) =>
  useQuery({ queryKey: ["requirements", { mine }], queryFn: () => requirementsApi.list(mine), retry });

export type BackendState = "unconfigured" | "checking" | "unreachable" | "engine-down" | "healthy";

/** Polls GET /health every 30s. Status is never inferred from the env variable alone. */
export function useBackendHealth(): BackendState {
  const configured = isApiConfigured();
  const q = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    enabled: configured,
    retry: false,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  if (!configured) return "unconfigured";
  if (q.isPending) return "checking";
  if (q.data) return q.data.engine === "ok" ? "healthy" : "engine-down";
  if (q.error instanceof ApiError && q.error.status === 503) return "engine-down";
  return "unreachable";
}
