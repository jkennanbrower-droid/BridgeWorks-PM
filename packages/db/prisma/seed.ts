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

const pool = new pg.Pool({
  connectionString: directUrl,
  ssl:
    directUrl.includes("sslmode=require") || directUrl.includes(".neon.tech")
      ? { rejectUnauthorized: false }
      : undefined,
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  await prisma.test.create({
    data: {
      createdBy: "seed",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
