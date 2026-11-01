#include "peernest/request_scheduler.h"

#include <stdexcept>

namespace peernest {

std::uint64_t RequestScheduler::submit(Request request) {
    if (request.id.empty()) throw std::invalid_argument("request id must not be empty");
    if (request.priority < 1 || request.priority > 3)
        throw std::invalid_argument("priority must be 1, 2 or 3");
    if (knownIds_.count(request.id)) throw std::invalid_argument("duplicate request id: " + request.id);

    request.sequence = nextSequence_++;
    knownIds_.insert(request.id);
    pendingIds_.insert(request.id);
    const std::uint64_t seq = request.sequence;
    if (request.priority == 1) urgent_.push(std::move(request));
    else normal_.push(std::move(request));
    return seq;
}

bool RequestScheduler::resolveRequest(const std::string& requestId) {
    // Neither std::queue nor std::priority_queue can erase from the middle,
    // so we only forget the id here. listPending() skips ids not in pendingIds_.
    if (pendingIds_.erase(requestId) == 0) return false;
    if (storedCount() > 2 * pendingIds_.size()) compact();
    return true;
}

std::vector<Request> RequestScheduler::listPending() const {
    std::vector<Request> out;
    out.reserve(pendingIds_.size());

    auto urgentCopy = urgent_;  // copies: the real queues stay unchanged
    while (!urgentCopy.empty()) {
        if (pendingIds_.count(urgentCopy.top().id)) out.push_back(urgentCopy.top());
        urgentCopy.pop();
    }
    auto normalCopy = normal_;
    while (!normalCopy.empty()) {
        if (pendingIds_.count(normalCopy.front().id)) out.push_back(normalCopy.front());
        normalCopy.pop();
    }
    return out;
}

void RequestScheduler::compact() {
    decltype(urgent_) freshUrgent;
    while (!urgent_.empty()) {
        if (pendingIds_.count(urgent_.top().id)) freshUrgent.push(urgent_.top());
        urgent_.pop();
    }
    std::queue<Request> freshNormal;
    while (!normal_.empty()) {
        if (pendingIds_.count(normal_.front().id)) freshNormal.push(std::move(normal_.front()));
        normal_.pop();
    }
    urgent_ = std::move(freshUrgent);
    normal_ = std::move(freshNormal);
}

}  // namespace peernest
