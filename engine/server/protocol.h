// protocol.h - JSON-lines translation layer for the engine worker.
//
// One JSON object in -> one JSON object out. This layer only converts JSON to
// and from StudentStore / RequestScheduler; it contains no DSA logic.
#pragma once

#include <string>

namespace peernest {

// Never throws. Malformed input returns {"ok":false,"error":"..."}.
std::string handleProtocolLine(const std::string& line);

}  // namespace peernest
