// Illustrative SAMPLE data used only to preview layouts while the backend is
// disconnected. It is never saved and always labelled "Sample preview" in the UI.
import type { CollaborationRequest, Recommendation, Student } from "./api/types";

export const sampleStudents: Student[] = [
  { id: "s1", name: "Aarav Mehta", email: "", department: "Computer Science", year: 3, bio: "Backend & systems. Loves competitive programming.", skills: [{ name: "C++", level: "advanced" }, { name: "Node.js", level: "intermediate" }, { name: "SQL", level: "intermediate" }], interests: ["hackathon", "placement"], availability: "available", hoursPerWeek: 10 },
  { id: "s2", name: "Diya Sharma", email: "", department: "Information Technology", year: 2, bio: "Frontend developer and UI designer.", skills: [{ name: "React", level: "advanced" }, { name: "TypeScript", level: "intermediate" }, { name: "Figma", level: "advanced" }], interests: ["project", "hackathon"], availability: "limited", hoursPerWeek: 6 },
  { id: "s3", name: "Kabir Rao", email: "", department: "Electronics", year: 4, bio: "ML enthusiast exploring computer vision.", skills: [{ name: "Python", level: "advanced" }, { name: "PyTorch", level: "intermediate" }, { name: "C++", level: "beginner" }], interests: ["project", "study"], availability: "available", hoursPerWeek: 8 },
  { id: "s4", name: "Meera Iyer", email: "", department: "Computer Science", year: 3, bio: "DSA mentor, preparing for SDE roles.", skills: [{ name: "Java", level: "advanced" }, { name: "DSA", level: "advanced" }, { name: "Spring", level: "beginner" }], interests: ["placement", "study"], availability: "busy", hoursPerWeek: 3 },
  { id: "s5", name: "Rohan Das", email: "", department: "Mechanical", year: 2, bio: "IoT tinkerer and hackathon regular.", skills: [{ name: "Arduino", level: "intermediate" }, { name: "Python", level: "intermediate" }], interests: ["hackathon", "project"], availability: "available", hoursPerWeek: 12 },
  { id: "s6", name: "Sana Khan", email: "", department: "Information Technology", year: 4, bio: "Cloud & DevOps, AWS certified.", skills: [{ name: "AWS", level: "advanced" }, { name: "Docker", level: "intermediate" }, { name: "Go", level: "beginner" }], interests: ["project", "placement"], availability: "limited", hoursPerWeek: 5 },
];

export const sampleRecommendations: Recommendation[] = [
  { student: sampleStudents[0], matchScore: 92, sharedSkills: ["C++", "SQL"] },
  { student: sampleStudents[1], matchScore: 85, sharedSkills: ["TypeScript"] },
  { student: sampleStudents[2], matchScore: 78, sharedSkills: ["Python"] },
];

export const sampleRequests: CollaborationRequest[] = [
  { id: "r1", from: sampleStudents[1], to: sampleStudents[0], requirementTitle: "Smart India Hackathon team", type: "hackathon", message: "Need a backend dev for our SIH idea.", status: "pending", priority: 1, createdAt: "2026-10-28" },
  { id: "r2", from: sampleStudents[3], to: sampleStudents[0], requirementTitle: "Mock interview partner", type: "placement", status: "pending", priority: 2, createdAt: "2026-10-27" },
  { id: "r3", from: sampleStudents[2], to: sampleStudents[0], requirementTitle: "CV final-year project", type: "project", status: "accepted", priority: 2, createdAt: "2026-10-20" },
  { id: "r4", from: sampleStudents[4], to: sampleStudents[0], requirementTitle: "IoT weekend build", type: "hackathon", status: "rejected", priority: 3, createdAt: "2026-10-15" },
];
