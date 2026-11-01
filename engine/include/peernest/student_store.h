// student_store.h - In-memory student storage and skill index.
//
// Core structures (professor-approved proposal):
//   std::vector<Student>                                   students_
//   std::unordered_map<std::string, std::size_t>           idIndex_     (id -> position in students_)
//   std::unordered_map<std::string, std::vector<std::string>> skillIndex_ (normalized skill -> student IDs)
//
// Lifetime rule: every public method returns COPIES (std::optional<Student>,
// std::vector<Student>), never references or pointers into students_. The
// vector may reallocate or reorder on add/remove, so references would dangle.
#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "peernest/student.h"

namespace peernest {

enum class SearchMode {
    All,  // student must have every requested skill (intersection)
    Any   // student must have at least one requested skill (union)
};

// Optional filters for searchStudents. Empty string / 0 / empty vector = "no filter".
struct StudentFilters {
    std::string q;                    // case-insensitive substring of name OR any skill
    std::vector<std::string> skills;  // resolved through skillIndex_
    SearchMode mode = SearchMode::Any;
    std::string department;           // case-insensitive exact match
    int year = 0;                     // exact match when > 0
    std::string availability;         // case-insensitive exact match
    std::string interest;             // student must list this interest
};

struct Recommendation {
    Student student;
    int score = 0;
    std::vector<std::string> sharedSkills;  // sorted alphabetically
};

class StudentStore {
public:
    // Score weights, documented so results can be reproduced by hand:
    //   score = SHARED_SKILL_WEIGHT * (#shared skills) + INTEREST_BONUS * (#shared interests)
    static constexpr int SHARED_SKILL_WEIGHT = 10;
    static constexpr int INTEREST_BONUS = 1;

    // Throws std::invalid_argument if id is empty or already exists.
    void addStudent(Student student);

    // Replaces the record with the same id. Throws std::invalid_argument if not found.
    void updateStudent(Student student);

    // Returns false if the id does not exist.
    bool removeStudent(const std::string& id);

    std::optional<Student> getStudentById(const std::string& id) const;

    // Results sorted by name, then id. Empty skill list -> empty result.
    std::vector<Student> searchBySkills(const std::vector<std::string>& skills,
                                        SearchMode mode) const;

    // Combined directory search. If skills are given, candidates come from
    // skillIndex_ (same rules as searchBySkills); otherwise every student in the
    // vector is a candidate. Metadata filters are then checked by a linear scan
    // over the candidates. Results sorted by name, then id.
    std::vector<Student> searchStudents(const StudentFilters& filters) const;

    // Candidates are found through skillIndex_ (only students sharing >= 1 skill).
    // Sorted by score desc, then name asc, then id asc. Unknown id -> empty.
    std::vector<Recommendation> recommendStudents(const std::string& currentStudentId,
                                                  std::size_t limit) const;

    std::size_t size() const { return students_.size(); }

    // Number of distinct skills in the index (useful for tests / debugging).
    std::size_t indexedSkillCount() const { return skillIndex_.size(); }

private:
    static void normalizeStudent(Student& s);
    void indexSkills(const Student& s);
    void unindexSkills(const Student& s);

    std::vector<Student> students_;
    std::unordered_map<std::string, std::size_t> idIndex_;
    std::unordered_map<std::string, std::vector<std::string>> skillIndex_;
};

}  // namespace peernest
