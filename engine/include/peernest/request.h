// request.h - Collaboration request handled by the RequestScheduler.
#pragma once

#include <cstdint>
#include <string>

namespace peernest {

struct Request {
    std::string id;             // unique, non-empty
    std::string fromStudentId;
    std::string toStudentId;
    std::string title;
    std::string message;
    int priority = 2;           // 1 = high (urgent), 2 = medium, 3 = low
    std::uint64_t sequence = 0; // assigned by the scheduler, strictly increasing
};

}  // namespace peernest
