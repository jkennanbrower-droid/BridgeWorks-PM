import express from "express";
import { z } from "zod";

import {
  autosaveDraftSession,
  inviteParty,
  resumeApplication,
  startApplication,
  submitApplication,
} from "./leasingApplicationsRepo.mjs";
import {
  confirmApplicationFeePayment,
  createApplicationFeeIntent,
  listApplicationFeePaymentAttempts,
} from "./leasePaymentsRepo.mjs";
import {
  attachDocument,
  createInfoRequest,
  generateRequirementItems,
  respondToInfoRequest,
  updateDocumentVerification,
} from "./leasingRequirementsRepo.mjs";
import { releaseReservation } from "./unitReservationsRepo.mjs";

function errorJson(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function hintForDbError(err) {
  const message = err instanceof Error ? err.message : String(err);
  if (/relation \"lease_applications\"/i.test(message) && /does not exist/i.test(message)) {
    return "Leasing schema missing. Run `pnpm db:migrate`.";
  }
  return null;
}

function getRequestIp(req) {
  const header = req.headers["x-forwarded-for"];
  const raw = Array.isArray(header) ? header[0] : header;
  const forwarded = String(raw ?? "").split(",")[0]?.trim();
  return forwarded || req.ip || null;
}

const documentTypeSchema = z.enum([
  "GOVERNMENT_ID",
  "PROOF_OF_INCOME",
  "BANK_STATEMENT",
  "TAX_RETURN",
  "EMPLOYMENT_LETTER",
  "REFERENCE_LETTER",
  "PET_DOCUMENTATION",
  "VEHICLE_REGISTRATION",
  "INSURANCE_CERTIFICATE",
  "OTHER",
]);

const requirementTypeSchema = z.enum([
  "DOCUMENT",
  "SCREENING",
  "PAYMENT",
  "SIGNATURE",
  "VERIFICATION",
  "CUSTOM",
]);

export function registerLeasingApplicationRoutes({ app, pool, noStore, logger }) {
  const router = express.Router();

  router.use((req, res, next) => {
    noStore(res);
    next();
  });

  router.post("/start", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      propertyId: z.string().min(1),
      unitId: z.string().min(1).nullable().optional(),
      applicationType: z.enum(["INDIVIDUAL", "JOINT", "HOUSEHOLD_GROUP"]).optional(),
      primary: z.object({
        email: z.string().email(),
        firstName: z.string().trim().optional(),
        lastName: z.string().trim().optional(),
        phone: z.string().trim().optional(),
      }),
      lookbackDays: z.number().int().min(1).max(30).optional(),
      currentStep: z.string().trim().optional(),
      formData: z.record(z.any()).optional(),
      progressMap: z.record(z.any()).optional(),
    });

    try {
      const input = schema.parse(req.body);
      const result = await startApplication(pool, input);
      return res.status(result.deduped ? 200 : 201).json({ ok: true, ...result });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/start failed");
      return errorJson(res, 500, hint ?? "Failed to start application.");
    }
  });

  router.post("/resume", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      sessionToken: z.string().min(1),
    });

    try {
      const input = schema.parse(req.body);
      const result = await resumeApplication(pool, input);
      if (!result) return errorJson(res, 404, "Resume token invalid or expired.");
      return res.json({ ok: true, ...result });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/resume failed");
      return errorJson(res, 500, hint ?? "Failed to resume application.");
    }
  });

  router.patch("/:applicationId/draft-sessions/:sessionToken", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      formDataPatch: z.record(z.any()).optional(),
      progressMapPatch: z.record(z.any()).optional(),
      currentStep: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      const sessionToken = String(req.params.sessionToken || "");
      if (!applicationId || !sessionToken) {
        return errorJson(res, 400, "Missing applicationId or sessionToken.");
      }
      const updated = await autosaveDraftSession(pool, {
        ...body,
        applicationId,
        sessionToken,
      });
      if (!updated) return errorJson(res, 404, "Draft session not found.");
      return res.json({ ok: true, draftSession: updated });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "PATCH /lease-applications/:id/draft-sessions failed");
      return errorJson(res, 500, hint ?? "Failed to autosave draft.");
    }
  });

  router.post("/:applicationId/parties/invite", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      role: z.enum(["PRIMARY", "CO_APPLICANT", "OCCUPANT", "GUARANTOR"]),
      email: z.string().email(),
      firstName: z.string().trim().optional(),
      lastName: z.string().trim().optional(),
      phone: z.string().trim().optional(),
      currentStep: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await inviteParty(pool, {
        ...body,
        applicationId,
      });
      if (!result) return errorJson(res, 404, "Application not found.");
      return res.status(201).json({ ok: true, ...result });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/parties/invite failed");
      return errorJson(res, 500, hint ?? "Failed to invite party.");
    }
  });

  router.post("/:applicationId/submit", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      jurisdictionCode: z.string().trim().optional(),
      consent: z.object({
        partyId: z.string().min(1),
        signature: z.record(z.any()),
      }),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await submitApplication(pool, {
        ...body,
        applicationId,
        consent: {
          ...body.consent,
          ip: getRequestIp(req),
        },
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "UNIT_UNAVAILABLE"
              ? 409
              : result.errorCode === "RESERVATION_CONFLICT"
                ? 409
                : result.errorCode === "SUBMIT_CAP_REACHED"
                  ? 409
              : result.errorCode === "PARTIES_INCOMPLETE"
                ? 422
                : 400;
        return res.status(status).json(result);
      }

      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/submit failed");
      return errorJson(res, 500, hint ?? "Failed to submit application.");
    }
  });

  router.post("/:applicationId/payments/application-fee", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      amountCents: z.number().int().positive(),
      currency: z.string().trim().optional(),
      metadata: z.record(z.any()).optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await createApplicationFeeIntent(pool, {
        ...body,
        applicationId,
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "NOT_SUBMITTED"
              ? 409
              : 400;
        return res.status(status).json(result);
      }

      return res.status(201).json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/payments/application-fee failed");
      return errorJson(res, 500, hint ?? "Failed to create payment intent.");
    }
  });

  router.post("/:applicationId/requirements/generate", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      jurisdictionCode: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await generateRequirementItems(pool, {
        ...body,
        applicationId,
      });

      if (!result.ok) {
        const status = result.errorCode === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json(result);
      }

      return res.status(201).json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/requirements/generate failed");
      return errorJson(res, 500, hint ?? "Failed to generate requirements.");
    }
  });

  router.post("/:applicationId/parties/:partyId/documents", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      requirementItemId: z.string().min(1).optional(),
      documentType: documentTypeSchema,
      fileName: z.string().min(1),
      mimeType: z.string().min(1),
      sizeBytes: z.number().int().nonnegative(),
      storageKey: z.string().min(1).optional(),
      publicUrl: z.string().min(1).optional(),
      scanStatus: z.string().min(1).optional(),
      scanResult: z.record(z.any()).optional(),
      validFrom: z.string().datetime().optional(),
      validUntil: z.string().datetime().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      const partyId = String(req.params.partyId || "");
      if (!applicationId || !partyId) return errorJson(res, 400, "Missing applicationId or partyId.");

      const result = await attachDocument(pool, {
        ...body,
        applicationId,
        partyId,
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND" || result.errorCode === "PARTY_NOT_FOUND"
            ? 404
            : result.errorCode === "REQUIREMENT_NOT_FOUND"
              ? 404
            : result.errorCode === "REQUIREMENT_PARTY_MISMATCH"
                ? 409
            : 400;
        return res.status(status).json(result);
      }

      return res.status(201).json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/parties/:partyId/documents failed");
      return errorJson(res, 500, hint ?? "Failed to attach document.");
    }
  });

  router.post("/:applicationId/documents/:documentId/verify", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      action: z.enum(["VERIFY", "REJECT"]),
      reviewerId: z.string().min(1).optional(),
      rejectedReason: z.string().min(1).optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      const documentId = String(req.params.documentId || "");
      if (!applicationId || !documentId) return errorJson(res, 400, "Missing applicationId or documentId.");

      const result = await updateDocumentVerification(pool, {
        ...body,
        documentId,
        applicationId,
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "INVALID_STATUS"
              ? 409
            : 400;
        return res.status(status).json(result);
      }

      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/documents/:documentId/verify failed");
      return errorJson(res, 500, hint ?? "Failed to update document verification.");
    }
  });

  router.post("/:applicationId/info-requests", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      targetPartyId: z.string().min(1).optional(),
      message: z.string().trim().optional(),
      unlockScopes: z.array(z.string().min(1)).optional(),
      itemsToRequest: z
        .array(
          z.object({
            name: z.string().min(1),
            description: z.string().trim().optional(),
            requirementType: requirementTypeSchema.optional(),
            documentType: documentTypeSchema.optional(),
            partyId: z.string().min(1).optional(),
            isRequired: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
            metadata: z.record(z.any()).optional(),
            alternatives: z.any().optional(),
          }),
        )
        .optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await createInfoRequest(pool, {
        ...body,
        applicationId,
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND" || result.errorCode === "PARTY_NOT_FOUND"
            ? 404
            : result.errorCode === "INVALID_STATUS"
              ? 409
            : 400;
        return res.status(status).json(result);
      }

      return res.status(201).json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/info-requests failed");
      return errorJson(res, 500, hint ?? "Failed to create info request.");
    }
  });

  router.post("/:applicationId/info-requests/:infoRequestId/respond", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      const infoRequestId = String(req.params.infoRequestId || "");
      if (!applicationId || !infoRequestId) return errorJson(res, 400, "Missing applicationId or infoRequestId.");

      const result = await respondToInfoRequest(pool, {
        ...body,
        applicationId,
        infoRequestId,
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "INVALID_STATUS"
              ? 409
            : 400;
        return res.status(status).json(result);
      }

      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/info-requests/:infoRequestId/respond failed");
      return errorJson(res, 500, hint ?? "Failed to respond to info request.");
    }
  });

  router.post("/:applicationId/payments/application-fee/confirm", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      confirmation: z.record(z.any()).optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await confirmApplicationFeePayment(pool, {
        ...body,
        applicationId,
      });

      if (!result.ok && result.errorCode) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "NOT_SUBMITTED"
              ? 409
              : result.errorCode === "PAYMENT_FAILED"
                ? 402
                : 400;
        return res.status(status).json(result);
      }

      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/payments/application-fee/confirm failed");
      return errorJson(res, 500, hint ?? "Failed to confirm payment.");
    }
  });

  router.get("/:applicationId/payments/application-fee/history", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
    });

    try {
      const query = schema.parse({ orgId: req.query.orgId });
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const attempts = await listApplicationFeePaymentAttempts(pool, {
        ...query,
        applicationId,
      });

      return res.json({ ok: true, attempts });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /lease-applications/:id/payments/application-fee/history failed");
      return errorJson(res, 500, hint ?? "Failed to list payment history.");
    }
  });

  router.post("/:applicationId/reservations/:reservationId/release", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      releaseReasonCode: z.string().min(1),
      releaseReason: z.string().trim().optional(),
      releasedById: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      const reservationId = String(req.params.reservationId || "");
      if (!applicationId || !reservationId) {
        return errorJson(res, 400, "Missing applicationId or reservationId.");
      }

      const result = await releaseReservation(pool, {
        ...body,
        reservationId,
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "NOT_ACTIVE"
              ? 409
              : 400;
        return res.status(status).json(result);
      }

      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/reservations/:reservationId/release failed");
      return errorJson(res, 500, hint ?? "Failed to release reservation.");
    }
  });

  app.use("/lease-applications", router);
  app.use("/api/lease-applications", router);
}
