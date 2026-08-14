import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const client = connectionString
  ? postgres(connectionString, {
      prepare: false,
      ssl: process.env.DATABASE_SSL === 'true' || connectionString.includes('sslmode=require') ? 'require' : undefined
    })
  : postgres({
      user: process.env.SQL_USER || "postgres",
      password: process.env.SQL_PASSWORD || "",
      host: process.env.SQL_HOST || "localhost",
      port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
      database: process.env.SQL_DB_NAME || "postgres",
      prepare: false,
      ssl: process.env.DATABASE_SSL === 'true' ? 'require' : undefined
    });

export const db = drizzle(client, { schema });

