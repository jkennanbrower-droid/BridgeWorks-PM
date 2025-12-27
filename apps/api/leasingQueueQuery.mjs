import { z } from "zod";

const UNIT_TYPES = new Set(["STUDIO", "ONE_BED", "TWO_BED"]);
const STATUSES = new Set(["SUBMITTED", "IN_REVIEW", "NEEDS_INFO", "DECISIONED", "CLOSED"]);
const PRIORITIES = new Set(["STANDARD", "PRIORITY", "EMERGENCY"]);
const SORT_OPTIONS = new Set([
  "activity_desc",
  "activity_asc",
  "submitted_desc",
  "submitted_asc",
  "sla_asc",
  "risk_desc",
]);

function splitCsv(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? ""),
  );
}

function parseCsvEnum(value, allowed, ctx, label) {
  if (!value) return undefined;
  const items = splitCsv(value);
  if (items.length === 0) return undefined;
  const invalid = items.filter((item) => !allowed.has(item));
  if (invalid.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid ${label} value.`,
    });
    return z.NEVER;
  }
  return items;
}

function parseCsvUuid(value, ctx, label) {
  if (!value) return undefined;
  const items = splitCsv(value);
  if (items.length === 0) return undefined;
  const invalid = items.filter((item) => !isUuid(item));
  if (invalid.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid ${label} value.`,
    });
    return z.NEVER;
  }
  return items;
}

function parseFlag(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

const queueQuerySchema = z.object({
  orgId: z.string().trim().min(1).uuid({ message: "Invalid orgId." }),
  propertyId: z
    .string()
    .optional()
    .transform((value, ctx) => parseCsvUuid(value, ctx, "propertyId")),
  unitType: z
    .string()
    .optional()
    .transform((value, ctx) => parseCsvEnum(value, UNIT_TYPES, ctx, "unitType")),
  status: z
    .string()
    .optional()
    .transform((value, ctx) => parseCsvEnum(value, STATUSES, ctx, "status")),
  priority: z
    .string()
    .optional()
    .transform((value, ctx) => parseCsvEnum(value, PRIORITIES, ctx, "priority")),
  q: z.string().optional(),
  sort: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      const normalized = String(value ?? "").trim();
      if (!SORT_OPTIONS.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid sort value.",
        });
        return z.NEVER;
      }
      return normalized;
    }),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).optional(),
  missingDocs: z.string().optional(),
  paymentIssue: z.string().optional(),
  duplicate: z.string().optional(),
  stale: z.string().optional(),
  highRisk: z.string().optional(),
  hasReservation: z.string().optional(),
});

export function parseQueueQuery(query) {
  const parsed = queueQuerySchema.parse(query);
  const trimmedQ = String(parsed.q ?? "").trim();
  const pageSizeRaw = parsed.pageSize ?? 25;
  const pageSize = Math.min(100, pageSizeRaw);
  return {
    orgId: parsed.orgId,
    propertyIds: parsed.propertyId,
    unitTypes: parsed.unitType,
    statuses: parsed.status,
    priorities: parsed.priority,
    q: trimmedQ.length > 0 ? trimmedQ : undefined,
    sort: parsed.sort,
    page: parsed.page ?? 1,
    pageSize,
    flags: {
      missingDocs: parseFlag(parsed.missingDocs),
      paymentIssue: parseFlag(parsed.paymentIssue),
      duplicate: parseFlag(parsed.duplicate),
      stale: parseFlag(parsed.stale),
      highRisk: parseFlag(parsed.highRisk),
      hasReservation: parseFlag(parsed.hasReservation),
    },
  };
}

export const leaseQueueEnums = {
  UNIT_TYPES,
  STATUSES,
  PRIORITIES,
  SORT_OPTIONS,
};
