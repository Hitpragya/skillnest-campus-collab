// Tests for StudentStore::searchStudents and the JSON-lines worker protocol.
#include <iostream>
#include <string>

#include "../server/protocol.h"
#include "nlohmann/json.hpp"
#include "peernest/student_store.h"

using nlohmann::json;
using namespace peernest;

static int failures = 0;
#define CHECK(cond)                                                              \
    do {                                                                         \
        if (!(cond)) {                                                           \
            ++failures;                                                          \
            std::cerr << __FILE__ << ":" << __LINE__ << " FAILED: " #cond "\n"; \
        }                                                                        \
    } while (0)

static Student make(std::string id, std::string name, std::string dept, int year,
                    std::vector<std::string> skills, std::vector<std::string> interests,
                    std::string availability) {
    Student s;
    s.id = std::move(id);
    s.name = std::move(name);
    s.department = std::move(dept);
    s.year = year;
    s.skills = std::move(skills);
    s.interests = std::move(interests);
    s.availability = std::move(availability);
    return s;
}

static std::vector<std::string> ids(const std::vector<Student>& v) {
    std::vector<std::string> out;
    for (const auto& s : v) out.push_back(s.id);
    return out;
}
using Ids = std::vector<std::string>;

static void testSearchFilters() {
    StudentStore st;
    st.addStudent(make("a", "Asha", "CSE", 3, {"React", "Node"}, {"hackathon"}, "available"));
    st.addStudent(make("b", "Bala", "ECE", 2, {"react"}, {"study"}, "busy"));
    st.addStudent(make("c", "Chen", "cse", 3, {"Python"}, {"hackathon", "project"}, "available"));

    StudentFilters f;
    CHECK(ids(st.searchStudents(f)) == (Ids{"a", "b", "c"}));
    f.department = "CSE";
    CHECK(ids(st.searchStudents(f)) == (Ids{"a", "c"}));
    f.skills = {"REACT"};
    CHECK(ids(st.searchStudents(f)) == Ids{"a"});

    StudentFilters y; y.year = 2;
    CHECK(ids(st.searchStudents(y)) == Ids{"b"});
    StudentFilters av; av.availability = "Available";
    CHECK(ids(st.searchStudents(av)) == (Ids{"a", "c"}));
    StudentFilters in; in.interest = "project";
    CHECK(ids(st.searchStudents(in)) == Ids{"c"});
    StudentFilters qn; qn.q = "  BAL ";
    CHECK(ids(st.searchStudents(qn)) == Ids{"b"});
    StudentFilters qs; qs.q = "pyth";  // matches a skill
    CHECK(ids(st.searchStudents(qs)) == Ids{"c"});
    StudentFilters all; all.skills = {"react", "node"}; all.mode = SearchMode::All;
    CHECK(ids(st.searchStudents(all)) == Ids{"a"});
}

static json call(const json& in) { return json::parse(handleProtocolLine(in.dump())); }

static void testProtocol() {
    json students = json::array({
        {{"id", "a"}, {"name", "Asha"}, {"department", "CSE"}, {"year", 3}, {"skills", {"react", "node"}}, {"interests", {"hackathon"}}, {"availability", "available"}},
        {{"id", "b"}, {"name", "Bala"}, {"department", "ECE"}, {"year", 2}, {"skills", {"React"}}, {"interests", {"hackathon"}}, {"availability", "busy"}},
    });

    json r = call({{"action", "searchStudents"}, {"students", students}, {"filters", {{"skills", {"react"}}, {"mode", "any"}}}});
    CHECK(r["ok"] == true && r["data"].size() == 2 && r["data"][0]["id"] == "a");

    r = call({{"action", "recommendStudents"}, {"students", students}, {"studentId", "a"}, {"limit", 5}});
    CHECK(r["ok"] == true && r["data"].size() == 1);
    CHECK(r["data"][0]["student"]["id"] == "b" && r["data"][0]["score"] == 11);

    json reqs = json::array({
        {{"id", "n1"}, {"priority", 2}}, {{"id", "u1"}, {"priority", 1}},
        {{"id", "n2"}, {"priority", 3}}, {{"id", "u2"}, {"priority", 1}},
    });
    r = call({{"action", "orderRequests"}, {"requests", reqs}});
    CHECK(r["ok"] == true && r["data"].size() == 4);
    if (r["data"].size() == 4) {
        CHECK(r["data"][0]["id"] == "u1" && r["data"][1]["id"] == "u2");
        CHECK(r["data"][2]["id"] == "n1" && r["data"][3]["id"] == "n2");
        CHECK(r["data"][0]["queue"] == "urgent" && r["data"][2]["queue"] == "normal");
    }

    CHECK(call({{"action", "orderRequests"}, {"requests", {{{"id", "x"}, {"priority", 9}}}}})["ok"] == false);
    CHECK(call({{"action", "nope"}})["ok"] == false);
    CHECK(json::parse(handleProtocolLine("{not json"))["ok"] == false);
    CHECK(json::parse(handleProtocolLine("[1,2]"))["ok"] == false);
    CHECK(call({{"action", "searchStudents"}, {"students", students}, {"filters", {{"mode", "bad"}}}})["ok"] == false);
    CHECK(call({{"action", "ping"}})["data"] == "pong");
}

int main() {
    testSearchFilters();
    testProtocol();
    if (failures) {
        std::cerr << failures << " check(s) failed\n";
        return 1;
    }
    std::cout << "All PeerNest protocol tests passed\n";
    return 0;
}
