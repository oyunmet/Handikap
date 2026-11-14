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
    "import.meta.env.VITE_ADS_PROVIDER": JSON.stringify(
      process.env.VITE_ADS_PROVIDER ?? process.env.ADS_PROVIDER ?? "none",
    ),
  },
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "motion",
              test: /node_modules[\\/](?:framer-motion|motion-dom|motion-utils)[\\/]/,
              priority: 2,
              maxSize: 512 * 1024,
              entriesAware: false,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
              priority: 1,
              minSize: 48 * 1024,
              maxSize: 420 * 1024,
              entriesAware: true,
            },
          ],
        },
      },
    },
  },
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
