cmake_minimum_required(VERSION 3.16)
project(peernest_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

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

enable_testing()
add_test(NAME peernest_tests COMMAND peernest_tests)
