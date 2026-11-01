import { useQuery } from "@tanstack/react-query";
import { collaborationsApi, studentsApi } from "./endpoints";
import { ApiNotConfiguredError } from "./client";
import type { RequestStatus, StudentSearchQuery } from "./types";

const retry = (n: number, e: unknown) => !(e instanceof ApiNotConfiguredError) && n < 2;

export const isNotConfigured = (e: unknown) => e instanceof ApiNotConfiguredError;

export const useStudentSearch = (q: StudentSearchQuery) =>
  useQuery({ queryKey: ["students", q], queryFn: () => studentsApi.search(q), retry });

export const useStudent = (id: string) =>
  useQuery({ queryKey: ["student", id], queryFn: () => studentsApi.get(id), retry });

export const useRecommendations = () =>
  useQuery({ queryKey: ["recommendations"], queryFn: studentsApi.recommendations, retry });

export const useRequests = (status?: RequestStatus) =>
  useQuery({ queryKey: ["requests", status], queryFn: () => collaborationsApi.listRequests(status), retry });
