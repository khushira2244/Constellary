import path from "node:path";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      env,
      environment: "node",
      include: ["tests/backend-block-1.integration.test.ts"],
      fileParallelism: false,
    },
  };
});
