import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Priority order for PostgreSQL connection strings (Supports Vercel Postgres, Neon, Supabase, and generic DATABASE_URL)
const connectionString = 
  process.env.POSTGRES_URL || 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL_NON_POOLING;

const isSslRequired = 
  process.env.DATABASE_SSL === 'true' || 
  (connectionString && (connectionString.includes('sslmode=require') || connectionString.includes('vercel-storage.com') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co')));

const client = connectionString
  ? postgres(connectionString, {
      prepare: false,
      max: process.env.NODE_ENV === 'production' ? 10 : 5,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: isSslRequired ? 'require' : undefined
    })
  : postgres({
      user: process.env.POSTGRES_USER || process.env.SQL_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || process.env.SQL_PASSWORD || "",
      host: process.env.POSTGRES_HOST || process.env.SQL_HOST || "localhost",
      port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : (process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432),
      database: process.env.POSTGRES_DATABASE || process.env.SQL_DB_NAME || "postgres",
      prepare: false,
      max: process.env.NODE_ENV === 'production' ? 10 : 5,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: process.env.DATABASE_SSL === 'true' ? 'require' : undefined
    });

export const db = drizzle(client, { schema });

