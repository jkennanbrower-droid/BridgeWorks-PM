import type {
  DocumentType,
  PartyRole,
  PaymentIntentType,
  RefundPolicyType,
  RelocationStatus,
  RequirementType,
} from "../../generated/prisma";

export type JurisdictionCode = string;

export enum IncomeCalculationMethod {
  GROSS_MONTHLY = "GROSS_MONTHLY",
  NET_MONTHLY = "NET_MONTHLY",
  ANNUAL_GROSS = "ANNUAL_GROSS",
}

export type WorkflowConfigData = {
  fastTrack?: {
    enabled?: boolean;
    criteria?: Array<{
      id: string;
      when?: Record<string, string | number | boolean | null>;
    }>;
  };
  requirements?: {
    items?: Array<{
      id?: string;
      name: string;
      description?: string;
      requirementType?: RequirementType;
      documentType?: DocumentType;
      partyRoles?: PartyRole[];
      relocationStatuses?: RelocationStatus[];
      alternatives?: unknown;
      isRequired?: boolean;
      sortOrder?: number;
      metadata?: Record<string, unknown>;
    }>;
  };
  incomeCalculation?: {
    method?: IncomeCalculationMethod;
  };
  submit?: {
    ttlDays?: number;
    jointRequiredCoApplicants?: number;
  };
  unitIntake?: {
    mode?: "OPEN" | "LOCK_ON_SUBMIT" | "CAP_N_SUBMITS";
    capSubmits?: number;
  };
};

export type EffectiveDated = {
  effectiveAt: Date;
  expiredAt: Date | null;
};

export type RefundPolicySnapshot = {
  id: string;
  version: number;
  orgId: string;
  policyType: RefundPolicyType;
  jurisdictionCode: string | null;
  paymentType: PaymentIntentType | null;
  refundPercentage: number | null;
  refundWindowHours: number | null;
  conditions: unknown | null;
  isActive: boolean;
  effectiveAt: Date;
  expiredAt: Date | null;
};

export type WorkflowConfigSnapshot = {
  id: string;
  version: number;
  orgId: string;
  propertyId: string | null;
  jurisdictionCode: string | null;
  config: WorkflowConfigData;
  effectiveAt: Date;
  expiredAt: Date | null;
};

export type RefundEligibilityDecision = {
  eligible: boolean;
  decisionReasonCode:
    | "NO_POLICY"
    | "POLICY_NOT_EFFECTIVE"
    | "POLICY_INACTIVE"
    | "PAYMENT_NOT_SUCCEEDED"
    | "PAYMENT_NOT_PAID"
    | "OUTSIDE_REFUND_WINDOW"
    | "POLICY_NO_REFUND"
    | "MISSING_REFUND_PERCENTAGE"
    | "ELIGIBLE";
  policyVersion: number | null;
  policyId: string | null;
  eligibleAmountCents: number | null;
};

export type FastTrackDecision = {
  allowed: boolean;
  matchedCriteriaIds: string[];
  decisionReasonCode: "DISABLED" | "MATCHED" | "NO_MATCH";
  configVersion: number | null;
  configId: string | null;
};

export type SeasonalPolicyResolution = {
  appliedPolicyId: string | null;
  seasonStart: Date | null;
  seasonEnd: Date | null;
  isSeasonActive: boolean;
};
