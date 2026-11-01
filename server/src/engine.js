// Client for the C++ peernest_worker process (JSON lines over stdin/stdout).
// Calls are sent one at a time; each call waits for exactly one response line.
// This file contains NO search, scoring or ordering logic - it only transports data.
import { spawn } from "node:child_process";
import fs from "node:fs";
import readline from "node:readline";

export class EngineError extends Error {}

export class EngineClient {
  constructor(enginePath, { timeoutMs = 5000 } = {}) {
    this.enginePath = enginePath;
    this.timeoutMs = timeoutMs;
    this.proc = null;
    this.pending = null; // { resolve, reject, timer }
    this.chain = Promise.resolve();
  }

  start() {
    if (this.proc) return;
    if (!fs.existsSync(this.enginePath)) {
      throw new EngineError(`C++ engine not found at ${this.enginePath}. Run "npm run build:engine".`);
    }
    const proc = spawn(this.enginePath, [], { stdio: ["pipe", "pipe", "inherit"] });
    this.proc = proc;
    readline.createInterface({ input: proc.stdout }).on("line", (line) => this.#onLine(line));
    proc.on("exit", (code) => {
      this.proc = null;
      this.#fail(new EngineError(`C++ engine exited (code ${code})`));
    });
    proc.on("error", (err) => {
      this.proc = null;
      this.#fail(new EngineError(`C++ engine failed: ${err.message}`));
    });
  }

  #onLine(line) {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    clearTimeout(p.timer);
    try {
      const msg = JSON.parse(line);
      if (msg.ok) p.resolve(msg.data);
      else p.reject(new EngineError(msg.error || "engine error"));
    } catch {
      p.reject(new EngineError("engine returned invalid JSON"));
    }
  }

  #fail(err) {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    clearTimeout(p.timer);
    p.reject(err);
  }

  #send(payload) {
    return new Promise((resolve, reject) => {
      try {
        this.start(); // restarts automatically after a crash
      } catch (e) {
        reject(e);
        return;
      }
      const timer = setTimeout(() => {
        this.#fail(new EngineError("engine timed out"));
        this.proc?.kill();
      }, this.timeoutMs);
      this.pending = { resolve, reject, timer };
      this.proc.stdin.write(JSON.stringify(payload) + "\n");
    });
  }

  /** Queue a call so only one request is in flight at a time. */
  call(payload) {
    const run = this.chain.then(() => this.#send(payload));
    this.chain = run.catch(() => {});
    return run;
  }

  stop() {
    this.proc?.stdin.end();
    this.proc?.kill();
    this.proc = null;
  }
}
