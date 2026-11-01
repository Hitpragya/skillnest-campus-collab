// Cross-platform wrapper: configure, build and test the C++ engine with CMake.
// Usage: npm run build:engine  (extra args are passed to the configure step, e.g. -G Ninja)
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const engineDir = path.resolve(here, "..", "..", "engine");
const buildDir = path.join(engineDir, "build");

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.error) {
    console.error(`Could not run ${cmd}: ${r.error.message}. Is CMake installed and on PATH?`);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("cmake", ["-S", engineDir, "-B", buildDir, "-DCMAKE_BUILD_TYPE=Release", ...process.argv.slice(2)]);
run("cmake", ["--build", buildDir, "--config", "Release"]);
run("ctest", ["--test-dir", buildDir, "--output-on-failure", "-C", "Release"]);
