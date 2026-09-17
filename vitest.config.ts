import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The suite talks to the same SQLite file the dev server uses, so the
    // database-backed tests run one at a time rather than fighting each other.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The server modules guard themselves with `server-only`, which throws
      // outside a server component. Under test there is no client to protect,
      // so it resolves to nothing. Same trick as scripts/_server-only-stub.cjs.
      "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
    },
  },
});
