// peernest_worker - long-running JSON-lines process used by the Node.js API.
// Reads one JSON object per stdin line, writes one JSON object per stdout line.
#include <iostream>
#include <string>

#include "protocol.h"

int main() {
    std::ios::sync_with_stdio(false);
    std::string line;
    while (std::getline(std::cin, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();  // Windows line endings
        if (line.empty()) continue;
        std::cout << peernest::handleProtocolLine(line) << '\n' << std::flush;
    }
    return 0;
}
