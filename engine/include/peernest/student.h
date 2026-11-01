// student.h - Student record stored by the PeerNest engine.
#pragma once

#include <string>
#include <vector>

namespace peernest {

struct Student {
    std::string id;                      // unique, non-empty
    std::string name;
    std::string department;
    int year = 1;
    std::vector<std::string> skills;     // normalized (trim + lowercase) when stored
    std::vector<std::string> interests;  // e.g. "project", "hackathon", "study", "placement"
    std::string availability;            // "available" | "limited" | "busy"
    int hoursPerWeek = 0;
};

// Trim surrounding whitespace and convert to lowercase.
// " React " -> "react". Used for every skill before indexing or searching.
std::string normalizeSkill(const std::string& raw);

}  // namespace peernest
