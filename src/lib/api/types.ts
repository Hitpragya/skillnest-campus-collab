// Shared contract between the PeerNest frontend and the Node.js API that
// wraps the C++ DSA engine. Keep these in sync with the backend.

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type CollaborationType = "project" | "hackathon" | "study" | "placement";

export type Availability = "available" | "limited" | "busy";

export interface Skill {
  name: string;
  level: SkillLevel;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  year: number;
  bio?: string | undefined;
  skills: Skill[];
  interests: CollaborationType[];
  availability: Availability;
  hoursPerWeek?: number | undefined;
}

export interface Recommendation {
  student: Student;
  /** Score computed by the C++ matching engine. */
  matchScore: number;
  sharedSkills: string[];
}

export interface StudentSearchQuery {
  q?: string | undefined;
  skills?: string[] | undefined;
  department?: string | undefined;
  year?: number | undefined;
  availability?: Availability | undefined;
  interest?: CollaborationType | undefined;
}

export interface CollaborationRequirement {
  id?: string | undefined;
  title: string;
  type: CollaborationType;
  description: string;
  requiredSkills: string[];
  teamSize: number;
  deadline?: string | undefined;
  priority: 1 | 2 | 3;
}

export type RequestStatus = "pending" | "accepted" | "rejected";

export interface CollaborationRequest {
  id: string;
  from: Pick<Student, "id" | "name" | "department">;
  to: Pick<Student, "id" | "name" | "department">;
  requirementTitle: string;
  type: CollaborationType;
  message?: string | undefined;
  status: RequestStatus;
  /** Priority assigned by the C++ priority queue. */
  priority: number;
  createdAt: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegistrationPayload extends AuthCredentials {
  name: string;
  department: string;
  year: number;
  skills: Skill[];
}

export interface AuthSession {
  token: string;
  student: Student;
}
