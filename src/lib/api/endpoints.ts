import { apiRequest } from "./client";
import type {
  AuthCredentials,
  AuthSession,
  CollaborationRequest,
  CollaborationRequirement,
  Recommendation,
  RegistrationPayload,
  RequestStatus,
  Student,
  StudentSearchQuery,
} from "./types";

// Each function maps 1:1 to a Node.js route backed by the C++ engine.
export const authApi = {
  login: (body: AuthCredentials) =>
    apiRequest<AuthSession>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body: RegistrationPayload) =>
    apiRequest<AuthSession>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => apiRequest<Student>("/auth/me"),
};

export const studentsApi = {
  /** Skill index lookup (hash map + trie) in C++. */
  search: (query: StudentSearchQuery) =>
    apiRequest<Student[]>("/students", { query: query as Record<string, unknown> }),
  get: (id: string) => apiRequest<Student>(`/students/${encodeURIComponent(id)}`),
  /** Graph-based matching in C++. */
  recommendations: () => apiRequest<Recommendation[]>("/students/me/recommendations"),
};

export const collaborationsApi = {
  createRequirement: (body: CollaborationRequirement) =>
    apiRequest<CollaborationRequirement>("/requirements", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  /** Ordered by the C++ priority queue. */
  listRequests: (status?: RequestStatus) =>
    apiRequest<CollaborationRequest[]>("/requests", { query: { status } }),
  sendRequest: (toStudentId: string, message: string) =>
    apiRequest<CollaborationRequest>("/requests", {
      method: "POST",
      body: JSON.stringify({ toStudentId, message }),
    }),
  respond: (id: string, status: Exclude<RequestStatus, "pending">) =>
    apiRequest<CollaborationRequest>(`/requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
