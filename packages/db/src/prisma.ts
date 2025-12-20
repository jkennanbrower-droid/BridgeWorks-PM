import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..", "..");

dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

let prisma: PrismaClient | undefined;

export function getPrisma() {
  if (!prisma) {
    const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Missing DATABASE_URL_DIRECT or DATABASE_URL");
    }

    const pool = new pg.Pool({
      connectionString: url,
      ssl:
        url.includes("sslmode=require") || url.includes(".neon.tech")
          ? { rejectUnauthorized: false }
          : undefined,
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return prisma;
}
