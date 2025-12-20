import { NextResponse } from "next/server";
import { getPrisma } from "db";

const PORTFOLIO_TYPES = new Set([
  "Residential",
  "Commercial",
  "HOA/Association",
  "Student",
  "Affordable",
  "Mixed-Use",
  "Other",
]);

const CURRENT_SOFTWARE = new Set([
  "AppFolio",
  "Buildium",
  "Yardi",
  "RealPage",
  "Rent Manager",
  "Other",
  "None",
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toTrimmedString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parseOptionalInt(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return "invalid";
  }
  return parsed;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const orgName = toTrimmedString(
    (payload as Record<string, unknown>).orgName
  );
  const contactName = toTrimmedString(
    (payload as Record<string, unknown>).contactName
  );
  const contactEmail = toTrimmedString(
    (payload as Record<string, unknown>).contactEmail
  );
  const contactPhone = toTrimmedString(
    (payload as Record<string, unknown>).contactPhone
  );
  const companyWebsite = toTrimmedString(
    (payload as Record<string, unknown>).companyWebsite
  );

  if (companyWebsite) {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  if (!orgName) {
    return NextResponse.json(
      { error: "Organization name is required." },
      { status: 400 }
    );
  }

  if (!contactEmail || !emailPattern.test(contactEmail)) {
    return NextResponse.json(
      { error: "A valid work email is required." },
      { status: 400 }
    );
  }

  const approxProperties = parseOptionalInt(
    (payload as Record<string, unknown>).approxProperties
  );
  const approxUnits = parseOptionalInt(
    (payload as Record<string, unknown>).approxUnits
  );

  if (approxProperties === "invalid" || approxUnits === "invalid") {
    return NextResponse.json(
      { error: "Approximate counts must be positive whole numbers." },
      { status: 400 }
    );
  }

  const portfolioTypesRaw = (payload as Record<string, unknown>).portfolioTypes;
  const portfolioTypes = Array.isArray(portfolioTypesRaw)
    ? portfolioTypesRaw
        .map((value) => toTrimmedString(value))
        .filter((value) => PORTFOLIO_TYPES.has(value))
    : [];
  const portfolioTypesJson =
    portfolioTypes.length > 0 ? JSON.stringify(portfolioTypes) : null;

  const currentSoftwareRaw = toTrimmedString(
    (payload as Record<string, unknown>).currentSoftware
  );
  const currentSoftware = CURRENT_SOFTWARE.has(currentSoftwareRaw)
    ? currentSoftwareRaw
    : null;

  const notes = toTrimmedString((payload as Record<string, unknown>).notes);

  try {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO onboarding_applications (
        org_name,
        contact_name,
        contact_email,
        contact_phone,
        portfolio_types,
        approx_properties,
        approx_units,
        current_software,
        notes
      ) VALUES (
        ${orgName},
        ${contactName || null},
        ${contactEmail},
        ${contactPhone || null},
        ${portfolioTypesJson}::jsonb,
        ${approxProperties},
        ${approxUnits},
        ${currentSoftware},
        ${notes || null}
      )
      RETURNING id;
    `;

    const id = rows?.[0]?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Unable to create application." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to submit application right now." },
      { status: 500 }
    );
  }
}
