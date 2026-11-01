// request_scheduler.h - Orders pending collaboration requests.
//
// Policy:
//   priority 1        -> std::priority_queue (urgent)
//   priority 2 and 3  -> std::queue (normal, strict FIFO; 3 is only a label)
// Pending order: every urgent request first (lower priority number first,
// earlier sequence breaks ties), then normal requests in arrival order.
#pragma once

#include <cstddef>
#include <cstdint>
#include <queue>
#include <string>
#include <unordered_set>
#include <vector>

#include "peernest/request.h"

namespace peernest {

// std::priority_queue keeps the element for which the comparator says
// "nothing is greater" on top. Returning true means "a has LOWER precedence
// than b", so b is served first. We serve the smaller priority number first,
// and for equal priority the smaller (earlier) sequence first.
struct UrgentComparator {
    bool operator()(const Request& a, const Request& b) const {
        if (a.priority != b.priority) return a.priority > b.priority;
        return a.sequence > b.sequence;
    }
};

class RequestScheduler {
public:
    // Validates and stores the request. Assigns and returns its sequence number.
    // Throws std::invalid_argument for empty id, duplicate id (including ids
    // already resolved) or priority outside 1..3.
    std::uint64_t submit(Request request);

    // Lazy deletion: the id is marked resolved; the queues are not touched.
    // Returns false if the id is unknown or already resolved.
    bool resolveRequest(const std::string& requestId);

    // Non-destructive: works on copies of both queues.
    std::vector<Request> listPending() const;

    std::size_t pendingCount() const { return pendingIds_.size(); }

    // Drops resolved entries from the real queues (O(n log n)). Called
    // automatically when more than half of the stored entries are resolved.
    void compact();

private:
    std::size_t storedCount() const { return urgent_.size() + normal_.size(); }

    std::priority_queue<Request, std::vector<Request>, UrgentComparator> urgent_;
    std::queue<Request> normal_;
    std::unordered_set<std::string> knownIds_;    // every id ever submitted
    std::unordered_set<std::string> pendingIds_;  // submitted and not resolved
    std::uint64_t nextSequence_ = 1;
};

}  // namespace peernest
