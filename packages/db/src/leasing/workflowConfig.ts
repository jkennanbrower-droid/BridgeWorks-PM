import type { PrismaClient } from "../../generated/prisma";
import type { WorkflowConfigSnapshot } from "./types";

function isEffectiveAsOf(
  record: { effectiveAt: Date; expiredAt: Date | null },
  asOfDate: Date,
) {
  return (
    record.effectiveAt.getTime() <= asOfDate.getTime() &&
    (record.expiredAt === null || record.expiredAt.getTime() > asOfDate.getTime())
  );
}

function byVersionThenEffectiveThenIdDesc(
  left: { version: number; effectiveAt: Date; id: string },
  right: { version: number; effectiveAt: Date; id: string },
) {
  if (left.version !== right.version) return right.version - left.version;
  const leftEffective = left.effectiveAt.getTime();
  const rightEffective = right.effectiveAt.getTime();
  if (leftEffective !== rightEffective) return rightEffective - leftEffective;
  return left.id.localeCompare(right.id);
}

export type EffectiveWorkflowConfigResult = {
  config: WorkflowConfigSnapshot | null;
  source: "property" | "org" | "jurisdiction" | "none";
};

export function pickEffectiveWorkflowConfig(
  configs: WorkflowConfigSnapshot[],
  input: {
    propertyId?: string | null;
    jurisdictionCode?: string | null;
    asOfDate: Date;
  },
): EffectiveWorkflowConfigResult {
  const active = configs.filter((c) => isEffectiveAsOf(c, input.asOfDate));

  if (input.propertyId) {
    const propertyCandidates = active
      .filter((c) => c.propertyId === input.propertyId)
      .sort((left, right) => {
        const leftJurisdictionMatch =
          input.jurisdictionCode && left.jurisdictionCode === input.jurisdictionCode
            ? 1
            : 0;
        const rightJurisdictionMatch =
          input.jurisdictionCode && right.jurisdictionCode === input.jurisdictionCode
            ? 1
            : 0;
        if (leftJurisdictionMatch !== rightJurisdictionMatch) {
          return rightJurisdictionMatch - leftJurisdictionMatch;
        }
        return byVersionThenEffectiveThenIdDesc(left, right);
      });
    if (propertyCandidates.length > 0) {
      return { config: propertyCandidates[0], source: "property" };
    }
  }

  const orgDefaultCandidates = active
    .filter((c) => c.propertyId === null && c.jurisdictionCode === null)
    .sort(byVersionThenEffectiveThenIdDesc);
  if (orgDefaultCandidates.length > 0) {
    return { config: orgDefaultCandidates[0], source: "org" };
  }

  if (input.jurisdictionCode) {
    const jurisdictionCandidates = active
      .filter((c) => c.propertyId === null && c.jurisdictionCode === input.jurisdictionCode)
      .sort(byVersionThenEffectiveThenIdDesc);
    if (jurisdictionCandidates.length > 0) {
      return { config: jurisdictionCandidates[0], source: "jurisdiction" };
    }
  }

  return { config: null, source: "none" };
}

export async function getEffectiveWorkflowConfig(
  prisma: PrismaClient,
  input: {
    orgId: string;
    propertyId?: string | null;
    jurisdictionCode?: string | null;
    asOfDate: Date;
  },
): Promise<EffectiveWorkflowConfigResult> {
  const configs = await prisma.workflowConfig.findMany({
    where: {
      orgId: input.orgId,
      effectiveAt: { lte: input.asOfDate },
      OR: [{ expiredAt: null }, { expiredAt: { gt: input.asOfDate } }],
      ...(input.propertyId
        ? { propertyId: { in: [input.propertyId, null] } }
        : { propertyId: null }),
      ...(input.jurisdictionCode
        ? { jurisdictionCode: { in: [input.jurisdictionCode, null] } }
        : undefined),
    },
    orderBy: [{ version: "desc" }, { effectiveAt: "desc" }, { id: "asc" }],
  });

  return pickEffectiveWorkflowConfig(
    configs.map((c) => ({
      id: c.id,
      version: c.version,
      orgId: c.orgId,
      propertyId: c.propertyId,
      jurisdictionCode: c.jurisdictionCode,
      config: c.config as any,
      effectiveAt: c.effectiveAt,
      expiredAt: c.expiredAt,
    })),
    {
      propertyId: input.propertyId ?? null,
      jurisdictionCode: input.jurisdictionCode ?? null,
      asOfDate: input.asOfDate,
    },
  );
}

