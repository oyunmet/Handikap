import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";

let worldBuildHash = "dev";
try {
  worldBuildHash = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  // Local source archives can build without a .git directory.
}

export default defineConfig(async ({ mode }) => {
  const plugins = [react()];
  if (mode !== "production" && process.env.REPL_ID) {
    const [{ cartographer }, { default: runtimeErrorModal }] = await Promise.all([
      import("@replit/vite-plugin-cartographer"),
      import("@replit/vite-plugin-runtime-error-modal"),
    ]);
    plugins.push(cartographer(), runtimeErrorModal());
  }

  return {
    define: {
      __WORLD_BUILD_HASH__: JSON.stringify(worldBuildHash),
      "import.meta.env.VITE_ADS_PROVIDER": JSON.stringify(
        process.env.VITE_ADS_PROVIDER ?? process.env.ADS_PROVIDER ?? "none",
      ),
    },
    plugins,
    build: {
      sourcemap: false,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "three",
                test: /node_modules[\\/]three[\\/]/,
                priority: 4,
              },
              {
                name: "react-three",
                test: /node_modules[\\/]@react-three[\\/]/,
                priority: 3,
              },
              {
                name: "react",
                test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
                priority: 3,
              },
              {
                name: "motion",
                test: /node_modules[\\/](?:framer-motion|motion-dom|motion-utils)[\\/]/,
                priority: 2,
              },
              {
                name: "vendor",
                test: /node_modules[\\/]/,
                priority: 1,
                minSize: 48 * 1024,
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
      },
    },
  };
});
