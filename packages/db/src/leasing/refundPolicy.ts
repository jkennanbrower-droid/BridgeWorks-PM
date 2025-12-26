import type { PaymentIntentType, PrismaClient } from "../../generated/prisma";
import type { RefundPolicySnapshot } from "./types";

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

export function pickActiveRefundPolicy(
  policies: RefundPolicySnapshot[],
  input: {
    jurisdictionCode?: string | null;
    paymentType?: PaymentIntentType | null;
    asOfDate: Date;
  },
): RefundPolicySnapshot | null {
  const active = policies.filter(
    (p) => p.isActive && isEffectiveAsOf(p, input.asOfDate),
  );
  if (active.length === 0) return null;

  const scored = active
    .filter((p) => {
      if (input.jurisdictionCode && p.jurisdictionCode !== null) {
        return p.jurisdictionCode === input.jurisdictionCode;
      }
      return true;
    })
    .sort((left, right) => {
      const leftJurisdictionMatch =
        input.jurisdictionCode && left.jurisdictionCode === input.jurisdictionCode ? 2 : 0;
      const rightJurisdictionMatch =
        input.jurisdictionCode && right.jurisdictionCode === input.jurisdictionCode ? 2 : 0;
      const leftJurisdictionFallback = left.jurisdictionCode === null ? 1 : 0;
      const rightJurisdictionFallback = right.jurisdictionCode === null ? 1 : 0;
      const leftJurisdictionScore = leftJurisdictionMatch + leftJurisdictionFallback;
      const rightJurisdictionScore = rightJurisdictionMatch + rightJurisdictionFallback;
      if (leftJurisdictionScore !== rightJurisdictionScore) {
        return rightJurisdictionScore - leftJurisdictionScore;
      }

      const leftPaymentMatch =
        input.paymentType && left.paymentType === input.paymentType ? 2 : 0;
      const rightPaymentMatch =
        input.paymentType && right.paymentType === input.paymentType ? 2 : 0;
      const leftPaymentFallback = left.paymentType === null ? 1 : 0;
      const rightPaymentFallback = right.paymentType === null ? 1 : 0;
      const leftPaymentScore = leftPaymentMatch + leftPaymentFallback;
      const rightPaymentScore = rightPaymentMatch + rightPaymentFallback;
      if (leftPaymentScore !== rightPaymentScore) {
        return rightPaymentScore - leftPaymentScore;
      }

      return byVersionThenEffectiveThenIdDesc(left, right);
    });

  return scored[0] ?? null;
}

export async function getActiveRefundPolicy(
  prisma: PrismaClient,
  input: {
    orgId: string;
    jurisdictionCode?: string | null;
    paymentType?: PaymentIntentType | null;
    asOfDate: Date;
  },
): Promise<RefundPolicySnapshot | null> {
  const rows = await prisma.refundPolicy.findMany({
    where: {
      orgId: input.orgId,
      isActive: true,
      effectiveAt: { lte: input.asOfDate },
      OR: [{ expiredAt: null }, { expiredAt: { gt: input.asOfDate } }],
      ...(input.jurisdictionCode
        ? { jurisdictionCode: { in: [input.jurisdictionCode, null] } }
        : undefined),
      ...(input.paymentType ? { paymentType: { in: [input.paymentType, null] } } : undefined),
    },
    orderBy: [{ version: "desc" }, { effectiveAt: "desc" }, { id: "asc" }],
  });

  return pickActiveRefundPolicy(
    rows.map((p) => ({
      id: p.id,
      version: p.version,
      orgId: p.orgId,
      policyType: p.policyType,
      jurisdictionCode: p.jurisdictionCode,
      paymentType: p.paymentType,
      refundPercentage: p.refundPercentage,
      refundWindowHours: p.refundWindowHours,
      conditions: p.conditions as any,
      isActive: p.isActive,
      effectiveAt: p.effectiveAt,
      expiredAt: p.expiredAt,
    })),
    {
      jurisdictionCode: input.jurisdictionCode ?? null,
      paymentType: input.paymentType ?? null,
      asOfDate: input.asOfDate,
    },
  );
}

