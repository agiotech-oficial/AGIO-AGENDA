import { defineConfig } from "drizzle-kit";

const connectionString = 
  process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL_NON_POOLING;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/drizzle",
  dbCredentials: connectionString
    ? { url: connectionString }
    : {
        user: process.env.POSTGRES_USER || process.env.SQL_USER || "postgres",
        password: process.env.POSTGRES_PASSWORD || process.env.SQL_PASSWORD || "",
        host: process.env.POSTGRES_HOST || process.env.SQL_HOST || "localhost",
        port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : (process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432),
        database: process.env.POSTGRES_DATABASE || process.env.SQL_DB_NAME || "postgres",
        ssl: process.env.DATABASE_SSL === "true",
      },
});


