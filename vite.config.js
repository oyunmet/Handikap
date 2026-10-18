import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";

let worldBuildHash = "dev";
try {
  worldBuildHash = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  // Local source archives can build without a .git directory.
}

export default defineConfig({
  define: {
    __WORLD_BUILD_HASH__: JSON.stringify(worldBuildHash),
  },
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
      },
      "/socket.io": {
        target: "http://127.0.0.1:3001",
        ws: true,
      },
    },
  },
});
