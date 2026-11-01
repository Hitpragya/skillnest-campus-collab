// Standard TanStack Start + Vite + Nitro configuration (no platform wrapper).
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Build target is picked from the environment:
// - Vercel (VERCEL / VERCEL_URL set)        -> Nitro "vercel" preset (.vercel/output)
// - Lovable editor/publish sandbox          -> Cloudflare Worker bundle in dist/ (its hosting deploys dist/)
// - anywhere else                           -> plain Node server (node .output/server/index.mjs)
const env = process.env;
const isVercel = Boolean(env["VERCEL"] || env["VERCEL_URL"]);
const isLovableHost = env["LOVABLE_SANDBOX"] === "1" || Boolean(env["DEV_SERVER__PROJECT_PATH"]);

const nitroOptions = isVercel
  ? { preset: "vercel" }
  : isLovableHost
    ? {
        preset: "cloudflare-module",
        output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
        cloudflare: { nodeCompat: true, deployConfig: true },
      }
    : { preset: "node-server" };

export default defineConfig({
  plugins: [
    // src/server.ts is our SSR error wrapper around the default TanStack entry.
    tanstackStart({ server: { entry: "server" } }),
    nitro(nitroOptions),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
  server: { host: "0.0.0.0", port: 8080, strictPort: true },
  preview: { host: "0.0.0.0", port: 8080, strictPort: true },
});
