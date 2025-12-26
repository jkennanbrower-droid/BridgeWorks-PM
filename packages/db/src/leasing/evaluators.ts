import type { PaymentIntentStatus, PaymentIntentType, RefundPolicyType } from "../../generated/prisma";
import { IncomeCalculationMethod } from "./types";
import type {
  FastTrackDecision,
  RefundEligibilityDecision,
  RefundPolicySnapshot,
  SeasonalPolicyResolution,
  WorkflowConfigSnapshot,
} from "./types";

export function evaluateRefundEligibility(input: {
  paymentIntent: {
    paymentType: PaymentIntentType;
    status: PaymentIntentStatus;
    amountCents: number;
    paidAt: Date | null;
  };
  policy: RefundPolicySnapshot | null;
  asOfDate: Date;
}): RefundEligibilityDecision {
  const policy = input.policy;
  if (!policy) {
    return {
      eligible: false,
      decisionReasonCode: "NO_POLICY",
      policyVersion: null,
      policyId: null,
      eligibleAmountCents: null,
    };
  }

  if (!policy.isActive) {
    return {
      eligible: false,
      decisionReasonCode: "POLICY_INACTIVE",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: null,
    };
  }

  if (
    policy.effectiveAt.getTime() > input.asOfDate.getTime() ||
    (policy.expiredAt && policy.expiredAt.getTime() <= input.asOfDate.getTime())
  ) {
    return {
      eligible: false,
      decisionReasonCode: "POLICY_NOT_EFFECTIVE",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: null,
    };
  }

  if (input.paymentIntent.status !== "SUCCEEDED") {
    return {
      eligible: false,
      decisionReasonCode: "PAYMENT_NOT_SUCCEEDED",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: null,
    };
  }

  if (!input.paymentIntent.paidAt) {
    return {
      eligible: false,
      decisionReasonCode: "PAYMENT_NOT_PAID",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: null,
    };
  }

  if (policy.refundWindowHours !== null) {
    const msSincePaid = input.asOfDate.getTime() - input.paymentIntent.paidAt.getTime();
    const maxMs = policy.refundWindowHours * 60 * 60 * 1000;
    if (msSincePaid > maxMs) {
      return {
        eligible: false,
        decisionReasonCode: "OUTSIDE_REFUND_WINDOW",
        policyVersion: policy.version,
        policyId: policy.id,
        eligibleAmountCents: null,
      };
    }
  }

  const policyType = policy.policyType satisfies RefundPolicyType;
  if (policyType === "NO_REFUND") {
    return {
      eligible: false,
      decisionReasonCode: "POLICY_NO_REFUND",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: null,
    };
  }

  if (policyType === "FULL_REFUND") {
    return {
      eligible: true,
      decisionReasonCode: "ELIGIBLE",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: input.paymentIntent.amountCents,
    };
  }

  if (policyType === "PARTIAL_REFUND" || policyType === "TIME_BASED") {
    if (policy.refundPercentage === null) {
      return {
        eligible: false,
        decisionReasonCode: "MISSING_REFUND_PERCENTAGE",
        policyVersion: policy.version,
        policyId: policy.id,
        eligibleAmountCents: null,
      };
    }
    const eligibleAmountCents = Math.floor(
      (input.paymentIntent.amountCents * policy.refundPercentage) / 100,
    );
    return {
      eligible: eligibleAmountCents > 0,
      decisionReasonCode: eligibleAmountCents > 0 ? "ELIGIBLE" : "MISSING_REFUND_PERCENTAGE",
      policyVersion: policy.version,
      policyId: policy.id,
      eligibleAmountCents: eligibleAmountCents > 0 ? eligibleAmountCents : null,
    };
  }

  return {
    eligible: false,
    decisionReasonCode: "NO_POLICY",
    policyVersion: policy.version,
    policyId: policy.id,
    eligibleAmountCents: null,
  };
}

export function evaluateFastTrackEligibility(input: {
  config: WorkflowConfigSnapshot | null;
  context: Record<string, string | number | boolean | null | undefined>;
}): FastTrackDecision {
  const config = input.config;
  const fastTrack = config?.config.fastTrack;

  if (!config || !fastTrack?.enabled) {
    return {
      allowed: false,
      matchedCriteriaIds: [],
      decisionReasonCode: "DISABLED",
      configVersion: config?.version ?? null,
      configId: config?.id ?? null,
    };
  }

  const matchedCriteriaIds =
    fastTrack.criteria
      ?.filter((c) => {
        if (!c.when) return true;
        return Object.entries(c.when).every(([key, expected]) => input.context[key] === expected);
      })
      .map((c) => c.id) ?? [];

  return {
    allowed: matchedCriteriaIds.length > 0,
    matchedCriteriaIds,
    decisionReasonCode: matchedCriteriaIds.length > 0 ? "MATCHED" : "NO_MATCH",
    configVersion: config.version,
    configId: config.id,
  };
}

export function resolveIncomeCalculationMethod(input: {
  config: WorkflowConfigSnapshot | null;
}): IncomeCalculationMethod {
  return (
    input.config?.config.incomeCalculation?.method ??
    IncomeCalculationMethod.GROSS_MONTHLY
  );
}

export function resolveSeasonalPolicy(input: {
  policies: Array<{
    id: string;
    propertyId: string | null;
    isActive: boolean;
    startDate: Date;
    endDate: Date;
  }>;
  propertyId?: string | null;
  asOfDate: Date;
}): SeasonalPolicyResolution {
  const asOf = input.asOfDate.getTime();

  const candidates = input.policies
    .filter((p) => p.isActive)
    .filter((p) => {
      const start = p.startDate.getTime();
      const end = p.endDate.getTime();
      return start <= asOf && asOf <= end;
    })
    .filter((p) => {
      if (input.propertyId) return p.propertyId === input.propertyId || p.propertyId === null;
      return p.propertyId === null;
    })
    .sort((left, right) => {
      const leftPropertyMatch =
        input.propertyId && left.propertyId === input.propertyId ? 1 : 0;
      const rightPropertyMatch =
        input.propertyId && right.propertyId === input.propertyId ? 1 : 0;
      if (leftPropertyMatch !== rightPropertyMatch) {
        return rightPropertyMatch - leftPropertyMatch;
      }
      const leftStart = left.startDate.getTime();
      const rightStart = right.startDate.getTime();
      if (leftStart !== rightStart) return rightStart - leftStart;
      return left.id.localeCompare(right.id);
    });

  const applied = candidates[0] ?? null;
  if (!applied) {
    return {
      appliedPolicyId: null,
      seasonStart: null,
      seasonEnd: null,
      isSeasonActive: false,
    };
  }

  return {
    appliedPolicyId: applied.id,
    seasonStart: applied.startDate,
    seasonEnd: applied.endDate,
    isSeasonActive: true,
  };
}
