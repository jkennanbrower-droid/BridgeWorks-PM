import { Pool } from "pg";

let sharedPool: Pool | undefined;

function shouldUseSsl(connectionString: string): boolean {
  return connectionString.includes("sslmode=require") || connectionString.includes(".neon.tech");
}

export function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  if (!sharedPool) {
    sharedPool = new Pool({
      connectionString: url,
      ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined,
    });
  }

  return sharedPool;
}

