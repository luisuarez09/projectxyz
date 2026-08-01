import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(rootDirectory, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    env: {
      DATABASE_URL:
        "postgresql://proyectoxyz_app:local_app_password@localhost:55432/proyectoxyz",
      DIRECT_DATABASE_URL:
        "postgresql://proyectoxyz_migrator:local_migrator_password@localhost:55432/proyectoxyz",
      S3_ENDPOINT: "http://localhost:8333",
      S3_REGION: "us-east-1",
      S3_BUCKET: "proyectoxyz-private",
      S3_ACCESS_KEY_ID: "local_s3_access_key",
      S3_SECRET_ACCESS_KEY: "local_s3_secret_key",
      CLAMAV_HOST: "localhost",
      CLAMAV_PORT: "3310",
    },
  },
});
