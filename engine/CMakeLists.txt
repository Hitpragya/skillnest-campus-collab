cmake_minimum_required(VERSION 3.16)
project(peernest_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Core DSA library (no third-party dependencies).
add_library(peernest_core
    src/student_store.cpp
    src/request_scheduler.cpp
)
target_include_directories(peernest_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)

if(MSVC)
    target_compile_options(peernest_core PUBLIC /W4)
else()
    target_compile_options(peernest_core PUBLIC -Wall -Wextra -Wpedantic)
endif()

add_executable(peernest_demo cli/main.cpp)
target_link_libraries(peernest_demo PRIVATE peernest_core)

add_executable(peernest_tests tests/test_main.cpp)
target_link_libraries(peernest_tests PRIVATE peernest_core)

# JSON-lines protocol used by the Node.js API.
# nlohmann/json v3.11.3 single header is vendored in third_party/ (MIT licence),
# so the build needs no network access. Marked SYSTEM to keep our warnings clean.
add_library(peernest_protocol server/protocol.cpp)
target_include_directories(peernest_protocol SYSTEM PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/third_party)
target_include_directories(peernest_protocol PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/server)
target_link_libraries(peernest_protocol PUBLIC peernest_core)

add_executable(peernest_worker server/main.cpp)
target_link_libraries(peernest_worker PRIVATE peernest_protocol)

add_executable(peernest_protocol_tests tests/test_protocol.cpp)
target_link_libraries(peernest_protocol_tests PRIVATE peernest_protocol)

enable_testing()
add_test(NAME peernest_tests COMMAND peernest_tests)
add_test(NAME peernest_protocol_tests COMMAND peernest_protocol_tests)
