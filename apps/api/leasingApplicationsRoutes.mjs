import express from "express";
import { z } from "zod";

import {
  autosaveDraftSession,
  inviteParty,
  resumeApplication,
  startApplication,
  submitApplication,
  withdrawApplication,
} from "./leasingApplicationsRepo.mjs";
import {
  confirmApplicationFeePayment,
  createApplicationFeeIntent,
  listApplicationFeePaymentAttempts,
} from "./leasePaymentsRepo.mjs";
import {
  executeAssistantAction,
  getAssistantSummary,
} from "./leasingAssistantRepo.mjs";
import {
  createRefundRequest,
  failRefundRequest,
  listRefundRequests,
  processRefundRequest,
  reviewRefundRequest,
} from "./leasingRefundsRepo.mjs";
import {
  attachDocument,
  createInfoRequest,
  generateRequirementItems,
  respondToInfoRequest,
  updateDocumentVerification,
} from "./leasingRequirementsRepo.mjs";
import {
  getApplicationDetail,
  listInfoRequests,
  listRequirements,
} from "./leasingDetailsRepo.mjs";
import { createMockApplication } from "./leasingDemoRepo.mjs";
import {
  createApplicationScore,
  createNote,
  deleteNote,
  listApplicationQueue,
  listLeaseApplicationFilterOptions,
  listNotes,
  makeDecision,
  requestPriorityOverride,
  reviewPriorityOverride,
  updateNote,
} from "./leasingDecisioningRepo.mjs";
import {
  expireDraftApplications,
  expireSubmittedApplications,
  markCoApplicantAbandonment,
} from "./leasingJobsRepo.mjs";
import { releaseReservation } from "./unitReservationsRepo.mjs";
import { parseQueueQuery } from "./leasingQueueQuery.mjs";

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

  router.post("/mock", async (req, res) => {
    const schema = z.object({
      orgId: z.string().optional(),
      propertyId: z.string().optional(),
      unitId: z.string().optional(),
      scenario: z.enum(["draft", "submitted", "needs_info", "decisioned"]).optional(),
      paymentOutcome: z.enum(["succeed", "decline"]).optional(),
      email: z.string().email().optional(),
      firstName: z.string().trim().optional(),
      lastName: z.string().trim().optional(),
      phone: z.string().trim().optional(),
      amountCents: z.number().int().positive().optional(),
    });

    if (process.env.NODE_ENV === "production") {
      return errorJson(res, 404, "Not found.");
    }

    try {
      const body = schema.parse(req.body ?? {});
      const result = await createMockApplication(pool, body);
      if (!result.ok) return errorJson(res, 400, "Unable to create mock application.");
      return res.status(201).json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      logger?.error?.({ err: e }, "POST /lease-applications/mock failed");
      return errorJson(res, 500, "Failed to seed demo application.");
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

  router.get("/filter-options", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      propertyId: z.string().trim().optional(),
    });

    try {
      const query = schema.parse(req.query);
      const result = await listLeaseApplicationFilterOptions(pool, query);
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /lease-applications/filter-options failed");
      return errorJson(res, 500, hint ?? "Failed to load filter options.");
    }
  });

  router.get("/queue", async (req, res) => {
    try {
      const query = parseQueueQuery(req.query);
      const result = await listApplicationQueue(pool, query);
      if (!result.ok) {
        const status = result.errorCode === "UNIT_TYPE_UNAVAILABLE" ? 400 : 400;
        return res.status(status).json({
          ok: false,
          error: result.errorCode === "UNIT_TYPE_UNAVAILABLE"
            ? "Unit type filtering is unavailable."
            : "Invalid request.",
        });
      }
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /lease-applications/queue failed");
      return errorJson(res, 500, hint ?? "Failed to load application queue.");
    }
  });

  router.get("/:applicationId/detail", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      actorId: z.string().trim().optional(),
      source: z.string().trim().optional(),
    });

    try {
      const query = schema.parse(req.query);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await getApplicationDetail(pool, { ...query, applicationId });
      if (!result.ok) {
        const status = result.errorCode === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json(result);
      }
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /lease-applications/:id/detail failed");
      return errorJson(res, 500, hint ?? "Failed to load application detail.");
    }
  });

  router.get("/:applicationId/assistant", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
    });

    try {
      const query = schema.parse(req.query);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await getAssistantSummary(pool, { ...query, applicationId });
      if (!result.ok) {
        const status = result.errorCode === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json(result);
      }
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /lease-applications/:id/assistant failed");
      return errorJson(res, 500, hint ?? "Failed to load assistant recommendations.");
    }
  });

  router.post("/:applicationId/assistant/actions/:actionKey/execute", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      actorId: z.string().min(1).optional(),
      actorType: z.string().trim().optional(),
      reasonCode: z.string().min(1),
      reason: z.string().trim().optional(),
      templateKey: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      const actionKey = String(req.params.actionKey || "");
      if (!applicationId || !actionKey) {
        return errorJson(res, 400, "Missing applicationId or actionKey.");
      }

      const result = await executeAssistantAction(pool, {
        ...body,
        applicationId,
        actionKey,
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "UNSUPPORTED_ACTION"
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
      logger?.error?.({ err: e }, "POST /lease-applications/:id/assistant/actions/:actionKey/execute failed");
      return errorJson(res, 500, hint ?? "Failed to execute assistant action.");
    }
  });

  router.get("/:applicationId", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      actorId: z.string().trim().optional(),
      source: z.string().trim().optional(),
    });

    try {
      const query = schema.parse(req.query);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await getApplicationDetail(pool, { ...query, applicationId });
      if (!result.ok) {
        const status = result.errorCode === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json(result);
      }
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /lease-applications/:id failed");
      return errorJson(res, 500, hint ?? "Failed to load application.");
    }
  });

  router.post("/:applicationId/withdraw", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      withdrawnById: z.string().min(1).optional(),
      reasonCode: z.string().trim().optional(),
      reason: z.string().trim().optional(),
      jurisdictionCode: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await withdrawApplication(pool, {
        ...body,
        applicationId,
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "ALREADY_CLOSED"
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
      logger?.error?.({ err: e }, "POST /lease-applications/:id/withdraw failed");
      return errorJson(res, 500, hint ?? "Failed to withdraw application.");
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

  router.get("/:applicationId/requirements", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
    });

    try {
      const query = schema.parse(req.query);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await listRequirements(pool, { ...query, applicationId });
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /lease-applications/:id/requirements failed");
      return errorJson(res, 500, hint ?? "Failed to list requirements.");
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

  router.get("/:applicationId/info-requests", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
    });

    try {
      const query = schema.parse(req.query);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await listInfoRequests(pool, { ...query, applicationId });
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /lease-applications/:id/info-requests failed");
      return errorJson(res, 500, hint ?? "Failed to list info requests.");
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

  router.post("/:applicationId/decisions", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      decidedById: z.string().min(1),
      outcome: z.enum(["APPROVED", "APPROVED_WITH_CONDITIONS", "DENIED", "PENDING_REVIEW"]),
      criteriaVersion: z.number().int().optional(),
      structuredReasonCodes: z.any().optional(),
      incomeData: z
        .object({
          method: z.enum(["GROSS_MONTHLY", "NET_MONTHLY", "ANNUAL_GROSS"]).optional(),
          verifiedMonthlyCents: z.number().int().nonnegative().optional(),
          verifiedAnnualCents: z.number().int().nonnegative().optional(),
          passed: z.boolean().optional(),
          notes: z.string().trim().optional(),
        })
        .optional(),
      criminalData: z
        .object({
          status: z.string().trim().optional(),
          summary: z.any().optional(),
          notes: z.string().trim().optional(),
          reviewedAt: z.string().datetime().optional(),
          reviewedById: z.string().trim().optional(),
        })
        .optional(),
      optionalConditions: z.any().optional(),
      notes: z.string().trim().optional(),
      riskAssessmentId: z.string().trim().optional(),
      overrideRequestId: z.string().trim().optional(),
      previousDecisionId: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await makeDecision(pool, {
        ...body,
        applicationId,
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "INVALID_STATUS"
              ? 409
              : result.errorCode === "HOLD_CONFLICT"
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
      logger?.error?.({ err: e }, "POST /lease-applications/:id/decisions failed");
      return errorJson(res, 500, hint ?? "Failed to create decision.");
    }
  });

  router.post("/:applicationId/scores", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      scoreType: z.string().trim().optional(),
      scoreValue: z.number().int().optional(),
      maxScore: z.number().int().optional(),
      factors: z.record(z.any()).optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await createApplicationScore(pool, {
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
      logger?.error?.({ err: e }, "POST /lease-applications/:id/scores failed");
      return errorJson(res, 500, hint ?? "Failed to create application score.");
    }
  });

  // queue route moved earlier to avoid conflicting with :applicationId

  router.post("/:applicationId/notes", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      authorId: z.string().min(1),
      actorType: z.enum(["staff", "applicant", "party"]).optional(),
      visibility: z
        .enum([
          "INTERNAL_STAFF_ONLY",
          "SHARED_WITH_APPLICANT",
          "SHARED_WITH_PARTIES",
          "PUBLIC",
        ])
        .optional(),
      content: z.string().trim().min(1),
      isPinned: z.boolean().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await createNote(pool, { ...body, applicationId });
      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "VISIBILITY_NOT_ALLOWED"
              ? 403
              : 400;
        return res.status(status).json(result);
      }

      return res.status(201).json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/:id/notes failed");
      return errorJson(res, 500, hint ?? "Failed to create note.");
    }
  });

  router.get("/:applicationId/notes", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      viewerType: z.enum(["staff", "applicant", "party"]).optional(),
    });

    try {
      const query = schema.parse(req.query);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await listNotes(pool, { ...query, applicationId });
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /lease-applications/:id/notes failed");
      return errorJson(res, 500, hint ?? "Failed to list notes.");
    }
  });

  router.patch("/:applicationId/notes/:noteId", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      actorId: z.string().min(1),
      actorType: z.enum(["staff", "applicant", "party"]).optional(),
      visibility: z
        .enum([
          "INTERNAL_STAFF_ONLY",
          "SHARED_WITH_APPLICANT",
          "SHARED_WITH_PARTIES",
          "PUBLIC",
        ])
        .optional(),
      content: z.string().trim().optional(),
      isPinned: z.boolean().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      const noteId = String(req.params.noteId || "");
      if (!applicationId || !noteId) return errorJson(res, 400, "Missing applicationId or noteId.");

      const result = await updateNote(pool, { ...body, noteId });
      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "FORBIDDEN"
              ? 403
              : result.errorCode === "VISIBILITY_NOT_ALLOWED"
                ? 403
                : 400;
        return res.status(status).json(result);
      }

      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "PATCH /lease-applications/:id/notes/:noteId failed");
      return errorJson(res, 500, hint ?? "Failed to update note.");
    }
  });

  router.delete("/:applicationId/notes/:noteId", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      actorId: z.string().min(1),
      actorType: z.enum(["staff", "applicant", "party"]).optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      const noteId = String(req.params.noteId || "");
      if (!applicationId || !noteId) return errorJson(res, 400, "Missing applicationId or noteId.");

      const result = await deleteNote(pool, { ...body, noteId });
      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "FORBIDDEN"
              ? 403
              : 400;
        return res.status(status).json(result);
      }

      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "DELETE /lease-applications/:id/notes/:noteId failed");
      return errorJson(res, 500, hint ?? "Failed to delete note.");
    }
  });

  router.post("/:applicationId/priority-overrides", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      requestedById: z.string().min(1),
      requestedPriority: z.enum(["STANDARD", "PRIORITY", "EMERGENCY"]),
      justification: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const applicationId = String(req.params.applicationId || "");
      if (!applicationId) return errorJson(res, 400, "Missing applicationId.");

      const result = await requestPriorityOverride(pool, { ...body, applicationId });
      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "NO_CHANGE"
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
      logger?.error?.({ err: e }, "POST /lease-applications/:id/priority-overrides failed");
      return errorJson(res, 500, hint ?? "Failed to request priority override.");
    }
  });

  router.post("/priority-overrides/:overrideRequestId/review", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      reviewerId: z.string().min(1),
      status: z.enum(["APPROVED", "DENIED"]),
      reviewNotes: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const overrideRequestId = String(req.params.overrideRequestId || "");
      if (!overrideRequestId) return errorJson(res, 400, "Missing overrideRequestId.");

      const result = await reviewPriorityOverride(pool, {
        ...body,
        overrideRequestId,
      });

      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "INVALID_TYPE"
              ? 409
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
      logger?.error?.({ err: e }, "POST /lease-applications/priority-overrides/:id/review failed");
      return errorJson(res, 500, hint ?? "Failed to review priority override.");
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

  router.post("/refund-requests", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      paymentIntentId: z.string().min(1),
      requestedById: z.string().min(1),
      requestedAmountCents: z.number().int().positive().optional(),
      reason: z.string().trim().optional(),
      jurisdictionCode: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const result = await createRefundRequest(pool, body);
      if (!result.ok) {
        const status =
          result.errorCode === "NOT_FOUND"
            ? 404
            : result.errorCode === "NOT_ELIGIBLE"
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
      logger?.error?.({ err: e }, "POST /lease-applications/refund-requests failed");
      return errorJson(res, 500, hint ?? "Failed to create refund request.");
    }
  });

  router.post("/refund-requests/:refundRequestId/review", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      reviewerId: z.string().min(1),
      status: z.enum(["APPROVED", "DENIED"]),
      approvedAmountCents: z.number().int().positive().optional(),
      reviewNotes: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const refundRequestId = String(req.params.refundRequestId || "");
      if (!refundRequestId) return errorJson(res, 400, "Missing refundRequestId.");

      const result = await reviewRefundRequest(pool, {
        ...body,
        refundRequestId,
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
      logger?.error?.({ err: e }, "POST /lease-applications/refund-requests/:id/review failed");
      return errorJson(res, 500, hint ?? "Failed to review refund request.");
    }
  });

  router.post("/refund-requests/:refundRequestId/process", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      providerRefundId: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const refundRequestId = String(req.params.refundRequestId || "");
      if (!refundRequestId) return errorJson(res, 400, "Missing refundRequestId.");

      const result = await processRefundRequest(pool, {
        ...body,
        refundRequestId,
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
      logger?.error?.({ err: e }, "POST /lease-applications/refund-requests/:id/process failed");
      return errorJson(res, 500, hint ?? "Failed to process refund request.");
    }
  });

  router.post("/refund-requests/:refundRequestId/fail", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      failureReason: z.string().trim().optional(),
    });

    try {
      const body = schema.parse(req.body);
      const refundRequestId = String(req.params.refundRequestId || "");
      if (!refundRequestId) return errorJson(res, 400, "Missing refundRequestId.");

      const result = await failRefundRequest(pool, {
        ...body,
        refundRequestId,
      });

      if (!result.ok) {
        const status = result.errorCode === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json(result);
      }

      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "POST /lease-applications/refund-requests/:id/fail failed");
      return errorJson(res, 500, hint ?? "Failed to fail refund request.");
    }
  });

  router.get("/refund-requests", async (req, res) => {
    const schema = z.object({
      orgId: z.string().min(1),
      status: z.string().trim().optional(),
    });

    try {
      const query = schema.parse(req.query);
      const result = await listRefundRequests(pool, query);
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      const hint = hintForDbError(e);
      logger?.error?.({ err: e }, "GET /lease-applications/refund-requests failed");
      return errorJson(res, 500, hint ?? "Failed to list refund requests.");
    }
  });

  router.post("/jobs/expire-drafts", async (req, res) => {
    const schema = z.object({
      ttlDays: z.number().int().min(1).max(365).optional(),
    });

    try {
      const body = schema.parse(req.body ?? {});
      const result = await expireDraftApplications(pool, body);
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      logger?.error?.({ err: e }, "POST /lease-applications/jobs/expire-drafts failed");
      return errorJson(res, 500, "Failed to expire drafts.");
    }
  });

  router.post("/jobs/expire-submitted", async (req, res) => {
    try {
      const result = await expireSubmittedApplications(pool);
      return res.json(result);
    } catch (e) {
      logger?.error?.({ err: e }, "POST /lease-applications/jobs/expire-submitted failed");
      return errorJson(res, 500, "Failed to expire submitted applications.");
    }
  });

  router.post("/jobs/abandon-co-applicants", async (req, res) => {
    const schema = z.object({
      inactivityDays: z.number().int().min(1).max(60).optional(),
    });

    try {
      const body = schema.parse(req.body ?? {});
      const result = await markCoApplicantAbandonment(pool, body);
      return res.json(result);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return errorJson(res, 400, e.issues[0]?.message ?? "Invalid input.");
      }
      logger?.error?.({ err: e }, "POST /lease-applications/jobs/abandon-co-applicants failed");
      return errorJson(res, 500, "Failed to mark co-applicants abandoned.");
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
