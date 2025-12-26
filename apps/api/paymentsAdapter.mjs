import crypto from "node:crypto";

const PROVIDER = String(process.env.PAYMENTS_PROVIDER || "stub").toLowerCase();

function stubCreateIntent({ amountCents, currency, metadata }) {
  const id = `stub_pi_${crypto.randomUUID()}`;
  return {
    provider: "stub",
    providerReference: id,
    clientSecret: `stub_secret_${id}`,
    status: "REQUIRES_ACTION",
    response: {
      id,
      amountCents,
      currency,
      metadata,
      status: "requires_action",
    },
  };
}

function stubConfirmIntent({ providerReference, confirmation }) {
  const outcome = String(confirmation?.outcome || "succeed").toLowerCase();
  const declined = ["decline", "declined", "fail", "failed"].includes(outcome);
  if (declined) {
    return {
      status: "FAILED",
      failureCode: "card_declined",
      failureMessage: "Stub decline",
      response: {
        id: providerReference,
        status: "failed",
        outcome,
      },
    };
  }
  return {
    status: "SUCCEEDED",
    response: {
      id: providerReference,
      status: "succeeded",
      outcome,
    },
  };
}

function createStubAdapter() {
  return {
    provider: "stub",
    async createIntent(input) {
      return stubCreateIntent(input);
    },
    async confirmIntent(input) {
      return stubConfirmIntent(input);
    },
  };
}

export function getPaymentsAdapter() {
  if (PROVIDER === "stripe") {
    return {
      provider: "stripe",
      async createIntent() {
        throw new Error("Stripe adapter not implemented yet. TODO: wire Stripe SDK.");
      },
      async confirmIntent() {
        throw new Error("Stripe adapter not implemented yet. TODO: wire Stripe SDK.");
      },
    };
  }
  return createStubAdapter();
}

