#include "protocol.h"

#include <exception>

#include "nlohmann/json.hpp"
#include "peernest/request_scheduler.h"
#include "peernest/student_store.h"

using nlohmann::json;

namespace peernest {
namespace {

std::string str(const json& j, const char* key) {
    if (!j.contains(key) || j[key].is_null()) return "";
    return j.at(key).get<std::string>();
}

int num(const json& j, const char* key, int fallback) {
    if (!j.contains(key) || j[key].is_null()) return fallback;
    return j.at(key).get<int>();
}

std::vector<std::string> strList(const json& j, const char* key) {
    if (!j.contains(key) || j[key].is_null()) return {};
    return j.at(key).get<std::vector<std::string>>();
}

Student studentFromJson(const json& j) {
    Student s;
    s.id = str(j, "id");
    s.name = str(j, "name");
    s.department = str(j, "department");
    s.year = num(j, "year", 1);
    s.skills = strList(j, "skills");
    s.interests = strList(j, "interests");
    s.availability = str(j, "availability");
    s.hoursPerWeek = num(j, "hoursPerWeek", 0);
    return s;
}

json studentToJson(const Student& s) {
    return {{"id", s.id},           {"name", s.name},           {"department", s.department},
            {"year", s.year},       {"skills", s.skills},       {"interests", s.interests},
            {"availability", s.availability}, {"hoursPerWeek", s.hoursPerWeek}};
}

StudentStore loadStore(const json& in) {
    StudentStore store;
    for (const auto& j : in.at("students")) store.addStudent(studentFromJson(j));
    return store;
}

json searchStudents(const json& in) {
    StudentStore store = loadStore(in);
    StudentFilters f;
    if (in.contains("filters") && in["filters"].is_object()) {
        const json& j = in["filters"];
        f.q = str(j, "q");
        f.skills = strList(j, "skills");
        const std::string mode = str(j, "mode");
        if (mode == "all") f.mode = SearchMode::All;
        else if (mode.empty() || mode == "any") f.mode = SearchMode::Any;
        else throw std::invalid_argument("mode must be 'any' or 'all'");
        f.department = str(j, "department");
        f.year = num(j, "year", 0);
        f.availability = str(j, "availability");
        f.interest = str(j, "interest");
    }
    json out = json::array();
    for (const auto& s : store.searchStudents(f)) out.push_back(studentToJson(s));
    return out;
}

json recommendStudents(const json& in) {
    StudentStore store = loadStore(in);
    const int limit = num(in, "limit", 10);
    if (limit < 0) throw std::invalid_argument("limit must be >= 0");
    json out = json::array();
    for (const auto& r : store.recommendStudents(str(in, "studentId"), static_cast<std::size_t>(limit)))
        out.push_back({{"student", studentToJson(r.student)}, {"score", r.score}, {"sharedSkills", r.sharedSkills}});
    return out;
}

json orderRequests(const json& in) {
    // Input must already be in persisted arrival order (ascending SQL sequence);
    // the scheduler re-assigns 1..n sequences in that same order.
    RequestScheduler scheduler;
    for (const auto& j : in.at("requests")) {
        Request r;
        r.id = str(j, "id");
        r.fromStudentId = str(j, "fromStudentId");
        r.toStudentId = str(j, "toStudentId");
        r.title = str(j, "title");
        r.message = str(j, "message");
        r.priority = num(j, "priority", 0);
        scheduler.submit(r);
    }
    json out = json::array();
    for (const auto& r : scheduler.listPending())
        out.push_back({{"id", r.id}, {"priority", r.priority}, {"sequence", r.sequence},
                       {"queue", r.priority == 1 ? "urgent" : "normal"}});
    return out;
}

}  // namespace

std::string handleProtocolLine(const std::string& line) {
    try {
        const json in = json::parse(line);
        if (!in.is_object()) throw std::invalid_argument("request must be a JSON object");
        const std::string action = str(in, "action");
        json data;
        if (action == "ping") data = "pong";
        else if (action == "searchStudents") data = searchStudents(in);
        else if (action == "recommendStudents") data = recommendStudents(in);
        else if (action == "orderRequests") data = orderRequests(in);
        else throw std::invalid_argument("unknown action: " + action);
        return json{{"ok", true}, {"data", data}}.dump();
    } catch (const std::exception& e) {
        return json{{"ok", false}, {"error", e.what()}}.dump();
    }
}

}  // namespace peernest
