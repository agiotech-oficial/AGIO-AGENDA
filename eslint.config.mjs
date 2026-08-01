import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: ["dist/**/*", ".next/**/*", "node_modules/**/*"] },
]);
