// Standard TanStack Start + Vite + Nitro configuration (no platform wrapper).
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Vercel sets VERCEL=1 (and VERCEL_URL) during its builds; everywhere else we
// produce a plain Node server (`node .output/server/index.mjs`).
const isVercel = Boolean(process.env["VERCEL"] || process.env["VERCEL_URL"]);

export default defineConfig({
  plugins: [
    // src/server.ts is our SSR error wrapper around the default TanStack entry.
    tanstackStart({ server: { entry: "server" } }),
    nitro({ preset: isVercel ? "vercel" : "node-server" }),
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
