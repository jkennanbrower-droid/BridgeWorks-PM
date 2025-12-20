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

const directUrl = process.env.DATABASE_URL_DIRECT;
if (!directUrl) {
  throw new Error("DATABASE_URL_DIRECT is not set");
}

let prisma;

export function getPrisma() {
  if (!prisma) {
    const pool = new pg.Pool({
      connectionString: directUrl,
      ssl:
        directUrl.includes("sslmode=require") || directUrl.includes(".neon.tech")
          ? { rejectUnauthorized: false }
          : undefined,
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return prisma;
}
