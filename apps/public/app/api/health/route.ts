import { createHealthHandler } from "shared/health";

export const runtime = "nodejs";

export const GET = createHealthHandler("public");
