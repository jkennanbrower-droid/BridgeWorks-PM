import { Pool } from "pg";

let sharedPool: Pool | undefined;

function shouldUseSsl(connectionString: string): boolean {
  return connectionString.includes("sslmode=require") || connectionString.includes(".neon.tech");
}

function resolveDatabaseUrl(): string {
  const pooled = process.env.DATABASE_URL;
  if (pooled) return pooled;

  const direct = process.env.DATABASE_URL_DIRECT ?? process.env.DIRECT_URL;
  if (direct) return direct;

  throw new Error("DATABASE_URL is not set (set DATABASE_URL or DATABASE_URL_DIRECT)");
}

export function getPool(): Pool {
  const url = resolveDatabaseUrl();

  if (!sharedPool) {
    sharedPool = new Pool({
      connectionString: url,
      ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined,
    });
  }

  return sharedPool;
}
