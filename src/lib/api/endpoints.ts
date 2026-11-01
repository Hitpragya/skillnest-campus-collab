import { apiRequest } from "./client";
import type {
  AuthCredentials,
  AuthSession,
  CollaborationRequest,
  CollaborationRequirement,
  HealthStatus,
  Recommendation,
  RegistrationPayload,
  RequestStatus,
  SendRequestPayload,
  Student,
  StudentSearchQuery,
} from "./types";

// Each function maps 1:1 to a route of the Node.js API in /server (mounted at /api,
// so VITE_PEERNEST_API_URL must end with /api).
export const healthApi = {
  /** API + C++ worker status. The API answers 503 when the engine is down. */
  check: () => apiRequest<HealthStatus>("/health"),
};

export const authApi = {
  login: (body: AuthCredentials) =>
    apiRequest<AuthSession>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body: RegistrationPayload) =>
    apiRequest<AuthSession>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => apiRequest<Student>("/auth/me"),
};

export const studentsApi = {
  /** Skill search via the C++ StudentStore (unordered_map skill index + vector scan for filters). */
  search: (query: StudentSearchQuery) =>
    apiRequest<Student[]>("/students", { query: query as Record<string, unknown> }),
  get: (id: string) => apiRequest<Student>(`/students/${encodeURIComponent(id)}`),
  /** C++ score: 10 x shared skills + 1 x shared interests. */
  recommendations: () => apiRequest<Recommendation[]>("/students/me/recommendations"),
};

export const collaborationsApi = {
  createRequirement: (body: CollaborationRequirement) =>
    apiRequest<CollaborationRequirement>("/requirements", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  /** Pending requests ordered by the C++ scheduler: priority_queue (urgent) first, then FIFO queue. */
  listRequests: (status?: RequestStatus) =>
    apiRequest<CollaborationRequest[]>("/requests", { query: { status } }),
  sendRequest: (toStudentId: string, message: string, extra: Omit<SendRequestPayload, "toStudentId" | "message"> = {}) =>
    apiRequest<CollaborationRequest>("/requests", {
      method: "POST",
      body: JSON.stringify({ toStudentId, message, ...extra }),
    }),
  respond: (id: string, status: Exclude<RequestStatus, "pending">) =>
    apiRequest<CollaborationRequest>(`/requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
