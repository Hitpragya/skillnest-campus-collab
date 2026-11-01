#include "peernest/student_store.h"

#include <algorithm>
#include <cctype>
#include <stdexcept>
#include <unordered_set>

namespace peernest {

std::string normalizeSkill(const std::string& raw) {
    std::size_t begin = 0;
    std::size_t end = raw.size();
    while (begin < end && std::isspace(static_cast<unsigned char>(raw[begin]))) ++begin;
    while (end > begin && std::isspace(static_cast<unsigned char>(raw[end - 1]))) --end;
    std::string out = raw.substr(begin, end - begin);
    for (char& c : out) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    return out;
}

namespace {

bool byNameThenId(const Student& a, const Student& b) {
    if (a.name != b.name) return a.name < b.name;
    return a.id < b.id;
}

// Normalize, drop empties and remove duplicates while keeping first-seen order.
std::vector<std::string> normalizeList(const std::vector<std::string>& in) {
    std::vector<std::string> out;
    std::unordered_set<std::string> seen;
    for (const auto& raw : in) {
        std::string n = normalizeSkill(raw);
        if (!n.empty() && seen.insert(n).second) out.push_back(n);
    }
    return out;
}

}  // namespace

void StudentStore::normalizeStudent(Student& s) {
    s.skills = normalizeList(s.skills);
    s.interests = normalizeList(s.interests);
}

void StudentStore::indexSkills(const Student& s) {
    // Skills are already de-duplicated, so each id appears once per skill list.
    for (const auto& skill : s.skills) skillIndex_[skill].push_back(s.id);
}

void StudentStore::unindexSkills(const Student& s) {
    for (const auto& skill : s.skills) {
        auto it = skillIndex_.find(skill);
        if (it == skillIndex_.end()) continue;
        auto& ids = it->second;
        ids.erase(std::remove(ids.begin(), ids.end(), s.id), ids.end());
        // Remove empty keys so the index never reports skills nobody has.
        if (ids.empty()) skillIndex_.erase(it);
    }
}

void StudentStore::addStudent(Student student) {
    if (student.id.empty()) throw std::invalid_argument("student id must not be empty");
    if (idIndex_.count(student.id)) throw std::invalid_argument("duplicate student id: " + student.id);
    normalizeStudent(student);
    idIndex_[student.id] = students_.size();
    indexSkills(student);
    students_.push_back(std::move(student));
}

void StudentStore::updateStudent(Student student) {
    auto it = idIndex_.find(student.id);
    if (it == idIndex_.end()) throw std::invalid_argument("unknown student id: " + student.id);
    normalizeStudent(student);
    Student& current = students_[it->second];
    // Remove the OLD skills from the index before indexing the new ones,
    // otherwise searches would still find the student under removed skills.
    unindexSkills(current);
    indexSkills(student);
    current = std::move(student);
}

bool StudentStore::removeStudent(const std::string& id) {
    auto it = idIndex_.find(id);
    if (it == idIndex_.end()) return false;
    const std::size_t pos = it->second;
    unindexSkills(students_[pos]);
    idIndex_.erase(it);

    // O(1) removal: move the last element into the hole, then pop_back.
    // The moved student's position changed, so its idIndex_ entry is updated.
    // skillIndex_ stores ids (not positions), so it needs no change here.
    const std::size_t last = students_.size() - 1;
    if (pos != last) {
        students_[pos] = std::move(students_[last]);
        idIndex_[students_[pos].id] = pos;
    }
    students_.pop_back();
    return true;
}

std::optional<Student> StudentStore::getStudentById(const std::string& id) const {
    auto it = idIndex_.find(id);
    if (it == idIndex_.end()) return std::nullopt;
    return students_[it->second];  // copy
}

std::vector<Student> StudentStore::searchBySkills(const std::vector<std::string>& skills,
                                                  SearchMode mode) const {
    const std::vector<std::string> wanted = normalizeList(skills);
    std::vector<Student> result;
    if (wanted.empty()) return result;

    // Count how many of the wanted skills each student matches.
    std::unordered_map<std::string, std::size_t> hits;
    for (const auto& skill : wanted) {
        auto it = skillIndex_.find(skill);
        if (it == skillIndex_.end()) continue;
        for (const auto& id : it->second) ++hits[id];
    }

    for (const auto& [id, count] : hits) {
        if (mode == SearchMode::All && count != wanted.size()) continue;
        result.push_back(students_[idIndex_.at(id)]);
    }
    std::sort(result.begin(), result.end(), byNameThenId);
    return result;
}

std::vector<Recommendation> StudentStore::recommendStudents(const std::string& currentStudentId,
                                                            std::size_t limit) const {
    std::vector<Recommendation> out;
    auto self = idIndex_.find(currentStudentId);
    if (self == idIndex_.end() || limit == 0) return out;
    const Student& me = students_[self->second];

    // Step 1: candidates and shared skills, found only through the skill index.
    std::unordered_map<std::string, std::vector<std::string>> shared;
    for (const auto& skill : me.skills) {
        auto it = skillIndex_.find(skill);
        if (it == skillIndex_.end()) continue;
        for (const auto& id : it->second)
            if (id != me.id) shared[id].push_back(skill);
    }

    // Step 2: score = 10 * shared skills + 1 * shared interests.
    std::unordered_set<std::string> myInterests(me.interests.begin(), me.interests.end());
    for (auto& [id, skills] : shared) {
        const Student& other = students_[idIndex_.at(id)];
        int interestOverlap = 0;
        for (const auto& interest : other.interests)
            if (myInterests.count(interest)) ++interestOverlap;
        std::sort(skills.begin(), skills.end());
        Recommendation r;
        r.student = other;
        r.score = SHARED_SKILL_WEIGHT * static_cast<int>(skills.size()) + INTEREST_BONUS * interestOverlap;
        r.sharedSkills = skills;
        out.push_back(std::move(r));
    }

    // Step 3: deterministic order - score desc, name asc, id asc.
    std::sort(out.begin(), out.end(), [](const Recommendation& a, const Recommendation& b) {
        if (a.score != b.score) return a.score > b.score;
        return byNameThenId(a.student, b.student);
    });
    if (out.size() > limit) out.resize(limit);
    return out;
}

}  // namespace peernest
