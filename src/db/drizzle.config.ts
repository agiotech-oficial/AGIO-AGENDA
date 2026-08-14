import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/drizzle",
  dbCredentials: connectionString
    ? { url: connectionString }
    : {
        user: process.env.SQL_USER || "postgres",
        password: process.env.SQL_PASSWORD || "",
        host: process.env.SQL_HOST || "localhost",
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
        database: process.env.SQL_DB_NAME || "postgres",
        ssl: process.env.DATABASE_SSL === "true",
      },
});

