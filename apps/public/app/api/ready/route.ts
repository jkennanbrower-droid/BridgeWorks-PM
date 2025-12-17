import { createDbReadyHandler } from "db/ready";

export const runtime = "nodejs";

export const GET = createDbReadyHandler("public");
