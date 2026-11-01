// peernest_demo - deterministic walkthrough of the engine for the evaluation.
#include <iostream>

#include "peernest/request_scheduler.h"
#include "peernest/student_store.h"

using namespace peernest;

static void printStudents(const std::vector<Student>& list) {
    for (const auto& s : list) std::cout << "  - " << s.name << " (" << s.id << ")\n";
    if (list.empty()) std::cout << "  (none)\n";
}

int main() {
    StudentStore store;
    store.addStudent({"s1", "Aarav", "CSE", 3, {"C++", " React ", "Node"}, {"hackathon", "project"}, "available", 10});
    store.addStudent({"s2", "Diya", "CSE", 2, {"react", "Figma"}, {"project"}, "limited", 6});
    store.addStudent({"s3", "Kabir", "ECE", 4, {"C++", "Node", "IoT"}, {"hackathon"}, "available", 8});
    store.addStudent({"s4", "Meera", "IT", 3, {"Python", "ML"}, {"study"}, "busy", 2});

    std::cout << "== Skill search (ALL of: react, c++) ==\n";
    printStudents(store.searchBySkills({"REACT", "c++"}, SearchMode::All));
    std::cout << "== Skill search (ANY of: react, python) ==\n";
    printStudents(store.searchBySkills({"react", "python"}, SearchMode::Any));

    std::cout << "== Recommendations for Aarav (score = 10*sharedSkills + 1*sharedInterests) ==\n";
    for (const auto& r : store.recommendStudents("s1", 5)) {
        std::cout << "  - " << r.student.name << " score=" << r.score << " shared=";
        for (std::size_t i = 0; i < r.sharedSkills.size(); ++i)
            std::cout << (i ? "," : "") << r.sharedSkills[i];
        std::cout << "\n";
    }

    RequestScheduler inbox;
    inbox.submit({"r1", "s2", "s1", "Portfolio site", "", 2});
    inbox.submit({"r2", "s3", "s1", "Hackathon tomorrow", "", 1});
    inbox.submit({"r3", "s4", "s1", "Study group", "", 3});
    inbox.submit({"r4", "s3", "s1", "Demo day fix", "", 1});

    auto show = [&inbox](const char* heading) {
        std::cout << heading << "\n";
        for (const auto& r : inbox.listPending())
            std::cout << "  - " << r.id << " P" << r.priority << " seq=" << r.sequence << " " << r.title << "\n";
    };
    show("== Pending requests (urgent heap first, then FIFO queue) ==");
    inbox.resolveRequest("r2");
    show("== After resolving r2 ==");
    return 0;
}
