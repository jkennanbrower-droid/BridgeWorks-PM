const DEFAULT_POLICY = {
  enabled: true,
  reminderCadenceDays: 2,
  maxReminders: 3,
  staleAfterDays: 7,
  submittedTtlDays: 30,
  screeningTimeoutDays: 7,
  docExpiryDays: 30,
  slaHoursByPriority: {
    STANDARD: 48,
    PRIORITY: 24,
    EMERGENCY: 12,
  },
};

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizePolicy(config) {
  const automation = config?.automation ?? {};
  const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const slaHoursByPriority = {
    ...DEFAULT_POLICY.slaHoursByPriority,
    ...(automation.slaHoursByPriority ?? {}),
  };
  return {
    ...DEFAULT_POLICY,
    ...automation,
    enabled: typeof automation.enabled === "boolean" ? automation.enabled : DEFAULT_POLICY.enabled,
    reminderCadenceDays: toNumber(automation.reminderCadenceDays, DEFAULT_POLICY.reminderCadenceDays),
    maxReminders: toNumber(automation.maxReminders, DEFAULT_POLICY.maxReminders),
    staleAfterDays: toNumber(automation.staleAfterDays, DEFAULT_POLICY.staleAfterDays),
    submittedTtlDays: toNumber(automation.submittedTtlDays, DEFAULT_POLICY.submittedTtlDays),
    screeningTimeoutDays: toNumber(automation.screeningTimeoutDays, DEFAULT_POLICY.screeningTimeoutDays),
    docExpiryDays: toNumber(automation.docExpiryDays, DEFAULT_POLICY.docExpiryDays),
    slaHoursByPriority,
  };
}

function computeGates(snapshot) {
  const parties = Array.isArray(snapshot.parties) ? snapshot.parties : [];
  const requirements = Array.isArray(snapshot.requirements) ? snapshot.requirements : [];
  const payments = Array.isArray(snapshot.payments) ? snapshot.payments : [];
  const reservations = Array.isArray(snapshot.reservations) ? snapshot.reservations : [];
  const application = snapshot.application ?? {};

  const incompleteParties = parties.filter((party) => !["COMPLETE", "LOCKED"].includes(party.status));
  const docsMissing = requirements.filter((req) =>
    req.requirementType === "DOCUMENT" && req.isRequired !== false && !["APPROVED", "WAIVED"].includes(req.status),
  );
  const screeningMissing = requirements.filter((req) =>
    req.requirementType === "SCREENING" && !["APPROVED", "WAIVED"].includes(req.status),
  );
  const paid =
    application.applicationFeeStatus === "SUCCEEDED" ||
    payments.some((payment) => payment.status === "SUCCEEDED");
  const activeReservation = reservations.some((reservation) => reservation.status === "ACTIVE");

  return {
    partiesBlocked: incompleteParties.length > 0,
    docsBlocked: docsMissing.length > 0,
    screeningBlocked: screeningMissing.length > 0,
    paymentBlocked: !paid,
    reservationBlocked: application.unitId && !activeReservation,
    incompleteParties,
    docsMissing,
    screeningMissing,
  };
}

function computeNextAction({ status, gates }) {
  if (status === "NEEDS_INFO") {
    return { key: "WAITING_ON_APPLICANT", label: "Waiting on applicant", reasonCodes: [] };
  }
  if (["DECISIONED", "CONVERTED", "CLOSED"].includes(status)) {
    return { key: "NO_ACTION", label: "No action needed", reasonCodes: [] };
  }
  if (gates.partiesBlocked) {
    return { key: "COMPLETE_PARTIES", label: "Complete parties", reasonCodes: ["PARTIES_INCOMPLETE"] };
  }
  if (gates.docsBlocked) {
    return { key: "COLLECT_DOCUMENTS", label: "Collect documents", reasonCodes: ["MISSING_DOCS"] };
  }
  if (gates.screeningBlocked) {
    return { key: "COMPLETE_SCREENING", label: "Complete screening", reasonCodes: ["SCREENING_PENDING"] };
  }
  if (gates.paymentBlocked) {
    return { key: "COLLECT_PAYMENT", label: "Resolve payment", reasonCodes: ["PAYMENT_PENDING"] };
  }
  if (gates.reservationBlocked) {
    return { key: "RESERVE_UNIT", label: "Reserve unit", reasonCodes: ["RESERVATION_PENDING"] };
  }
  return { key: "REVIEW", label: "Review application", reasonCodes: [] };
}

function computeRecommendations(snapshot, gates, policy, now) {
  const recommendations = [];
  const status = snapshot.application?.status ?? "";
  const reservations = Array.isArray(snapshot.reservations) ? snapshot.reservations : [];
  const infoRequests = Array.isArray(snapshot.infoRequests) ? snapshot.infoRequests : [];
  const updatedAt = toDate(snapshot.application?.updatedAt);

  if (gates.partiesBlocked) {
    recommendations.push({
      actionKey: "SEND_REMINDER",
      label: "Send reminder",
      reason: "Household members still need to complete their sections.",
      severity: "medium",
    });
  }

  if (gates.docsBlocked) {
    recommendations.push({
      actionKey: "REQUEST_MISSING_DOCS",
      label: "Request missing documents",
      reason: "Required documents are still pending.",
      severity: "high",
    });
  }

  if (gates.paymentBlocked) {
    recommendations.push({
      actionKey: "RETRY_PAYMENT",
      label: "Retry application fee",
      reason: "Payment has not cleared yet.",
      severity: "high",
    });
  }

  if (status === "SUBMITTED") {
    recommendations.push({
      actionKey: "MARK_IN_REVIEW",
      label: "Mark in review",
      reason: "Application is ready for staff review.",
      severity: "low",
    });
  }

  if (status === "NEEDS_INFO" && infoRequests.length > 0) {
    recommendations.push({
      actionKey: "SEND_REMINDER",
      label: "Send reminder",
      reason: "Open info requests require applicant response.",
      severity: "medium",
    });
  }

  const expiredReservations = reservations.filter((reservation) => {
    if (reservation.status !== "ACTIVE") return false;
    const expiresAt = toDate(reservation.expiresAt);
    return expiresAt && expiresAt <= now;
  });

  if (expiredReservations.length > 0) {
    recommendations.push({
      actionKey: "RELEASE_EXPIRED_RESERVATION",
      label: "Release expired reservation",
      reason: "Reservation has expired and should be released.",
      severity: "medium",
    });
  }

  if (updatedAt) {
    const staleAt = new Date(now.getTime() - policy.staleAfterDays * 24 * 60 * 60 * 1000);
    if (updatedAt < staleAt) {
      recommendations.push({
        actionKey: "MARK_STALE",
        label: "Flag as stale",
        reason: "No recent activity detected on this application.",
        severity: "low",
      });
    }
  }

  return recommendations;
}

function computeAutomationEligible(recommendations, policy) {
  if (!policy.enabled) return [];
  const safeKeys = new Set([
    "SEND_REMINDER",
    "REQUEST_MISSING_DOCS",
    "RELEASE_EXPIRED_RESERVATION",
    "MARK_STALE",
  ]);
  return recommendations
    .filter((rec) => safeKeys.has(rec.actionKey))
    .map((rec) => rec.actionKey);
}

export function computeAssistantPlan(input) {
  const snapshot = input?.snapshot ?? {};
  const now = input?.now ? toDate(input.now) ?? new Date() : new Date();
  const policy = normalizePolicy(input?.workflowConfig ?? {});
  const gates = computeGates(snapshot);
  const status = snapshot.application?.status ?? "";

  const nextAction = computeNextAction({ status, gates });
  const recommendations = computeRecommendations(snapshot, gates, policy, now);
  const automationEligibleActions = computeAutomationEligible(recommendations, policy);

  return {
    nextAction,
    recommendations,
    automationEligibleActions,
  };
}

export const leasingAssistantDefaults = {
  DEFAULT_POLICY,
};
