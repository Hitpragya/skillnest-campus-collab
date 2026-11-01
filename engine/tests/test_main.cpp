// Dependency-free tests. Exit code 0 = all passed.
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

#include "peernest/request_scheduler.h"
#include "peernest/student_store.h"

using namespace peernest;

static int failures = 0;
#define CHECK(cond)                                                              \
    do {                                                                         \
        if (!(cond)) {                                                           \
            ++failures;                                                          \
            std::cerr << __FILE__ << ":" << __LINE__ << " FAILED: " #cond "\n"; \
        }                                                                        \
    } while (0)

template <typename F>
static bool throwsInvalid(F f) {
    try { f(); } catch (const std::invalid_argument&) { return true; }
    return false;
}

static std::vector<std::string> ids(const std::vector<Student>& v) {
    std::vector<std::string> out;
    for (const auto& s : v) out.push_back(s.id);
    return out;
}
static std::vector<std::string> ids(const std::vector<Request>& v) {
    std::vector<std::string> out;
    for (const auto& r : v) out.push_back(r.id);
    return out;
}
using Ids = std::vector<std::string>;

static Student make(std::string id, std::string name, std::vector<std::string> skills,
                    std::vector<std::string> interests = {}) {
    Student s;
    s.id = std::move(id);
    s.name = std::move(name);
    s.skills = std::move(skills);
    s.interests = std::move(interests);
    return s;
}

static void testAddAndGet() {
    StudentStore st;
    st.addStudent(make("s1", "Asha", {"C++"}));
    auto s = st.getStudentById("s1");
    CHECK(s.has_value() && s->name == "Asha");
    CHECK(!st.getStudentById("nope").has_value());
    CHECK(throwsInvalid([&] { st.addStudent(make("s1", "Dup", {})); }));
    CHECK(throwsInvalid([&] { st.addStudent(make("", "Empty", {})); }));
}

static void testNormalization() {
    StudentStore st;
    st.addStudent(make("s1", "Asha", {"  ReAcT ", "react", "C++"}));
    CHECK(st.getStudentById("s1")->skills == (Ids{"react", "c++"}));
    CHECK(ids(st.searchBySkills({"REACT"}, SearchMode::Any)) == Ids{"s1"});
    CHECK(ids(st.searchBySkills({" c++\t"}, SearchMode::All)) == Ids{"s1"});
    CHECK(st.indexedSkillCount() == 2);
}

static void testSearchAllAny() {
    StudentStore st;
    st.addStudent(make("s1", "Asha", {"react", "node"}));
    st.addStudent(make("s2", "Bala", {"react"}));
    st.addStudent(make("s3", "Chen", {"python"}));
    CHECK(ids(st.searchBySkills({"react", "node"}, SearchMode::All)) == Ids{"s1"});
    CHECK(ids(st.searchBySkills({"react", "python"}, SearchMode::Any)) == (Ids{"s1", "s2", "s3"}));
    CHECK(st.searchBySkills({"rust"}, SearchMode::Any).empty());
    CHECK(st.searchBySkills({}, SearchMode::All).empty());
}

static void testRecommendations() {
    StudentStore st;
    st.addStudent(make("me", "Me", {"react", "node", "c++"}, {"hackathon", "project"}));
    st.addStudent(make("b", "Zed", {"react", "node"}, {}));            // 20
    st.addStudent(make("a", "Amy", {"react"}, {"hackathon", "project"})); // 12
    st.addStudent(make("d", "Bob", {"c++"}, {"hackathon"}));           // 11
    st.addStudent(make("c", "Bob", {"node"}, {"project"}));            // 11, same name -> id
    st.addStudent(make("x", "Xen", {"python"}, {"hackathon"}));        // no shared skill
    auto recs = st.recommendStudents("me", 10);
    CHECK(recs.size() == 4);
    if (recs.size() == 4) {
        CHECK(recs[0].student.id == "b" && recs[0].score == 20);
        CHECK(recs[0].sharedSkills == (Ids{"node", "react"}));
        CHECK(recs[1].student.id == "a" && recs[1].score == 12);
        CHECK(recs[2].student.id == "c" && recs[2].score == 11);
        CHECK(recs[3].student.id == "d" && recs[3].score == 11);
    }
    CHECK(st.recommendStudents("me", 2).size() == 2);
    CHECK(st.recommendStudents("unknown", 5).empty());
}

static void testUpdateReindexes() {
    StudentStore st;
    st.addStudent(make("s1", "Asha", {"react"}));
    Student u = make("s1", "Asha", {"Rust"});
    st.updateStudent(u);
    CHECK(st.searchBySkills({"react"}, SearchMode::Any).empty());
    CHECK(ids(st.searchBySkills({"rust"}, SearchMode::Any)) == Ids{"s1"});
    CHECK(st.indexedSkillCount() == 1);
    CHECK(throwsInvalid([&] { st.updateStudent(make("ghost", "G", {})); }));
}

static void testRemoveCleansIndexes() {
    StudentStore st;
    st.addStudent(make("s1", "Asha", {"react"}));
    st.addStudent(make("s2", "Bala", {"node"}));
    st.addStudent(make("s3", "Chen", {"react", "go"}));
    CHECK(st.removeStudent("s1"));     // s3 is moved into s1's slot
    CHECK(!st.removeStudent("s1"));
    CHECK(!st.getStudentById("s1").has_value());
    CHECK(st.getStudentById("s3")->name == "Chen");  // id index updated after move
    CHECK(ids(st.searchBySkills({"react"}, SearchMode::Any)) == Ids{"s3"});
    CHECK(st.removeStudent("s3"));
    CHECK(st.searchBySkills({"react", "go"}, SearchMode::Any).empty());
    CHECK(st.indexedSkillCount() == 1);  // only "node" left
    CHECK(st.size() == 1);
}

static Request req(std::string id, int priority) {
    Request r;
    r.id = std::move(id);
    r.priority = priority;
    return r;
}

static void testFifoNormals() {
    RequestScheduler s;
    s.submit(req("n1", 2));
    s.submit(req("n2", 3));
    s.submit(req("n3", 2));
    CHECK(ids(s.listPending()) == (Ids{"n1", "n2", "n3"}));
}

static void testUrgentFirstAndTieBreak() {
    RequestScheduler s;
    s.submit(req("n1", 2));
    s.submit(req("u1", 1));
    s.submit(req("n2", 3));
    s.submit(req("u2", 1));
    auto list = s.listPending();
    CHECK(ids(list) == (Ids{"u1", "u2", "n1", "n2"}));
    CHECK(list.size() == 4 && list[0].sequence < list[1].sequence);
}

static void testResolveAndNonDestructive() {
    RequestScheduler s;
    s.submit(req("u1", 1));
    s.submit(req("n1", 2));
    s.submit(req("n2", 2));
    CHECK(ids(s.listPending()) == (Ids{"u1", "n1", "n2"}));  // still all there
    CHECK(s.resolveRequest("n1"));
    CHECK(!s.resolveRequest("n1"));
    CHECK(!s.resolveRequest("missing"));
    CHECK(ids(s.listPending()) == (Ids{"u1", "n2"}));
    CHECK(s.resolveRequest("u1"));  // triggers compaction
    CHECK(ids(s.listPending()) == Ids{"n2"});
    CHECK(s.pendingCount() == 1);
}

static void testValidation() {
    RequestScheduler s;
    CHECK(throwsInvalid([&] { s.submit(req("a", 0)); }));
    CHECK(throwsInvalid([&] { s.submit(req("a", 4)); }));
    CHECK(throwsInvalid([&] { s.submit(req("", 2)); }));
    s.submit(req("a", 2));
    CHECK(throwsInvalid([&] { s.submit(req("a", 1)); }));
    s.resolveRequest("a");
    CHECK(throwsInvalid([&] { s.submit(req("a", 1)); }));  // resolved ids stay reserved
}

int main() {
    testAddAndGet();
    testNormalization();
    testSearchAllAny();
    testRecommendations();
    testUpdateReindexes();
    testRemoveCleansIndexes();
    testFifoNormals();
    testUrgentFirstAndTieBreak();
    testResolveAndNonDestructive();
    testValidation();
    if (failures) {
        std::cerr << failures << " check(s) failed\n";
        return 1;
    }
    std::cout << "All PeerNest engine tests passed\n";
    return 0;
}
