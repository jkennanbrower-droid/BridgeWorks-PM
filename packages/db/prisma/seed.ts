import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { Prisma, PrismaClient, UserStatus } from "../generated/prisma";
import { getPrisma } from "../src/prisma";
import { getPool } from "../src/pool";

function loadDotEnvFile(filePath: string, opts?: { override?: boolean }): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (!key) continue;
    if (!opts?.override && key in process.env) continue;
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function findRepoRoot(startDir: string): string {
  let current = startDir;
  for (let i = 0; i < 8; i++) {
    const pkgJson = path.join(current, "package.json");
    const packagesDb = path.join(current, "packages", "db");
    if (fs.existsSync(pkgJson) && fs.existsSync(packagesDb)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return startDir;
}

function loadEnvForSeed(): void {
  const repoRoot = findRepoRoot(process.cwd());

  // Highest priority: packages/db env (db package owns its connection).
  loadDotEnvFile(path.join(repoRoot, "packages", "db", ".env"), { override: true });
  loadDotEnvFile(path.join(repoRoot, "packages", "db", ".env.local"), { override: true });

  // Lower priority: repo root env (only fills missing vars like PB_*).
  loadDotEnvFile(path.join(repoRoot, ".env.local"), { override: false });
  loadDotEnvFile(path.join(repoRoot, ".env"), { override: false });

  // Prefer direct for seeding if available.
  if (process.env.DATABASE_URL_DIRECT) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_DIRECT;
  }
}

function nowPlusDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function token(prefix: string, value: string): string {
  return sha256(`${prefix}:${value}`);
}

function bytes(prefix: string, value: string): Buffer {
  return crypto.createHash("sha256").update(`${prefix}:${value}`).digest();
}

type SeedUser = {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone?: string;
  status?: UserStatus;
  marketingOptIn?: boolean;
  theme?: string;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

const users: SeedUser[] = [
  {
    email: "kenny@example.com",
    username: "kenny",
    firstName: "Kenny",
    lastName: "Brower",
    displayName: "Kenny Brower",
    phone: "+13035550101",
    status: "ACTIVE",
    theme: "dark",
    marketingOptIn: true,
  },
  {
    email: "alex@example.com",
    username: "alex",
    firstName: "Alex",
    lastName: "Morgan",
    displayName: "Alex Morgan",
    phone: "+13035550102",
    status: "ACTIVE",
    theme: "system",
  },
  {
    email: "sam@example.com",
    username: "sam",
    firstName: "Sam",
    lastName: "Lee",
    displayName: "Sam Lee",
    phone: "+13035550103",
    status: "INVITED",
    theme: "light",
  },
  {
    email: "jordan@example.com",
    username: "jordan",
    firstName: "Jordan",
    lastName: "Taylor",
    displayName: "Jordan Taylor",
    status: "ACTIVE",
  },
  {
    email: "riley@example.com",
    username: "riley",
    firstName: "Riley",
    lastName: "Cooper",
    displayName: "Riley Cooper",
    status: "ACTIVE",
  },
  {
    email: "maria@example.com",
    username: "maria",
    firstName: "Maria",
    lastName: "Santos",
    displayName: "Maria Santos",
    status: "ACTIVE",
  },
  {
    email: "jamie@example.com",
    username: "jamie",
    firstName: "Jamie",
    lastName: "Nguyen",
    displayName: "Jamie Nguyen",
    status: "ACTIVE",
  },
  {
    email: "taylor@example.com",
    username: "taylor",
    firstName: "Taylor",
    lastName: "Patel",
    displayName: "Taylor Patel",
    status: "SUSPENDED",
  },
  {
    email: "casey@example.com",
    username: "casey",
    firstName: "Casey",
    lastName: "Howard",
    displayName: "Casey Howard",
    status: "ACTIVE",
  },
  {
    email: "micah@example.com",
    username: "micah",
    firstName: "Micah",
    lastName: "Reed",
    displayName: "Micah Reed",
    status: "ACTIVE",
  },
  {
    email: "avery@example.com",
    username: "avery",
    firstName: "Avery",
    lastName: "King",
    displayName: "Avery King",
    status: "ACTIVE",
  },
  {
    email: "quinn@example.com",
    username: "quinn",
    firstName: "Quinn",
    lastName: "Rivera",
    displayName: "Quinn Rivera",
    status: "ACTIVE",
  },
  {
    email: "devon@example.com",
    username: "devon",
    firstName: "Devon",
    lastName: "Campbell",
    displayName: "Devon Campbell",
    status: "ACTIVE",
  },
  {
    email: "skylar@example.com",
    username: "skylar",
    firstName: "Skylar",
    lastName: "Brooks",
    displayName: "Skylar Brooks",
    status: "ACTIVE",
  },
  {
    email: "chris@example.com",
    username: "chris",
    firstName: "Chris",
    lastName: "Diaz",
    displayName: "Chris Diaz",
    status: "ACTIVE",
  },
];

async function seedOne(prisma: DbClient, user: SeedUser): Promise<void> {
  const normalizedEmail = user.email.trim().toLowerCase();
  const status: UserStatus = user.status ?? "ACTIVE";

  const upserted = await prisma.user.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      username: user.username,
      status,
      emailVerifiedAt: status === "ACTIVE" ? new Date() : null,
      lastLoginAt: status === "ACTIVE" ? new Date() : null,
    },
    update: {
      username: user.username,
      status,
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: upserted.id },
    create: {
      userId: upserted.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      phone: user.phone ?? null,
      avatarUrl: `https://example.com/avatars/${encodeURIComponent(user.username)}.png`,
      bio: `Seed user ${user.displayName} for local development.`,
      timezone: "America/Denver",
      locale: "en-US",
    },
    update: {
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      phone: user.phone ?? null,
      timezone: "America/Denver",
      locale: "en-US",
    },
  });

  await prisma.userSettings.upsert({
    where: { userId: upserted.id },
    create: {
      userId: upserted.id,
      theme: user.theme ?? "system",
      marketingOptIn: user.marketingOptIn ?? false,
      preferences: {
        notifications: { email: true, sms: false },
        density: "comfortable",
      },
    },
    update: {
      theme: user.theme ?? "system",
      marketingOptIn: user.marketingOptIn ?? false,
      preferences: {
        notifications: { email: true, sms: false },
        density: "comfortable",
      },
    },
  });

  await prisma.authAccount.deleteMany({
    where: { userId: upserted.id },
  });

  await prisma.authAccount.create({
    data: {
      userId: upserted.id,
      provider: "EMAIL_PASSWORD",
      providerAccountId: null,
      passwordHash: `seed:${token("pwd", normalizedEmail)}`,
      passwordUpdatedAt: new Date(),
      lastUsedAt: new Date(),
    },
  });

  if (status === "ACTIVE" && ["alex", "jamie", "quinn"].includes(user.username)) {
    await prisma.authAccount.create({
      data: {
        userId: upserted.id,
        provider: "GOOGLE",
        providerAccountId: `google:${user.username}`,
        accessToken: `seed:${token("oauth_access", normalizedEmail)}`,
        refreshToken: `seed:${token("oauth_refresh", normalizedEmail)}`,
        expiresAt: nowPlusDays(30),
        lastUsedAt: new Date(),
      },
    });
  }

  await prisma.session.deleteMany({
    where: { userId: upserted.id },
  });

  await prisma.session.createMany({
    data: [
      {
        userId: upserted.id,
        tokenHash: token("session", `${normalizedEmail}:primary`),
        expiresAt: nowPlusDays(7),
        ip: "127.0.0.1",
        userAgent: "seed-script",
        deviceId: `device:${user.username}`,
      },
      {
        userId: upserted.id,
        tokenHash: token("session", `${normalizedEmail}:secondary`),
        expiresAt: nowPlusDays(3),
        ip: "127.0.0.1",
        userAgent: "seed-script",
        deviceId: `device:${user.username}:2`,
      },
    ],
  });

  await prisma.userToken.deleteMany({
    where: { userId: upserted.id },
  });

  await prisma.userToken.createMany({
    data: [
      {
        userId: upserted.id,
        purpose: "EMAIL_VERIFICATION",
        tokenHash: token("verify", normalizedEmail),
        expiresAt: nowPlusDays(2),
        data: { email: normalizedEmail },
      },
      {
        userId: upserted.id,
        purpose: "PASSWORD_RESET",
        tokenHash: token("reset", normalizedEmail),
        expiresAt: nowPlusDays(1),
        data: { email: normalizedEmail },
      },
      {
        userId: upserted.id,
        purpose: "MAGIC_LINK_SIGNIN",
        tokenHash: token("magic", normalizedEmail),
        expiresAt: nowPlusDays(1),
        data: { email: normalizedEmail, userAgent: "seed-script" },
      },
    ],
  });

  await prisma.userDevice.upsert({
    where: {
      userId_deviceHash: { userId: upserted.id, deviceHash: token("device", user.username) },
    },
    create: {
      userId: upserted.id,
      label: `${user.displayName}'s dev device`,
      deviceHash: token("device", user.username),
      lastSeenAt: new Date(),
    },
    update: {
      lastSeenAt: new Date(),
      label: `${user.displayName}'s dev device`,
    },
  });

  await prisma.loginAttempt.createMany({
    data: [
      {
        userId: upserted.id,
        emailTried: normalizedEmail,
        success: status === "ACTIVE",
        ip: "127.0.0.1",
        userAgent: "seed-script",
        reason: status === "ACTIVE" ? null : "seeded_non_active",
      },
      {
        userId: upserted.id,
        emailTried: normalizedEmail,
        success: false,
        ip: "127.0.0.1",
        userAgent: "seed-script",
        reason: "bad_password",
      },
    ],
  });

  await prisma.userAuditEvent.createMany({
    data: [
      {
        userId: upserted.id,
        action: "USER_CREATED",
        ip: "127.0.0.1",
        userAgent: "seed-script",
        meta: { seed: true, username: user.username },
      },
      {
        userId: upserted.id,
        action: "LOGIN_SUCCESS",
        ip: "127.0.0.1",
        userAgent: "seed-script",
        meta: { seed: true },
      },
    ],
  });

  // Add a richer security footprint for a few users.
  if (status === "ACTIVE" && ["kenny", "alex", "jamie"].includes(user.username)) {
    await prisma.mfaFactor.deleteMany({ where: { userId: upserted.id } });
    await prisma.mfaFactor.create({
      data: {
        userId: upserted.id,
        type: "TOTP",
        name: "Authenticator",
        totpSecretEnc: `seed:${token("totp", normalizedEmail)}`,
        enabledAt: new Date(),
      },
    });

    await prisma.webauthnCredential.deleteMany({ where: { userId: upserted.id } });
    await prisma.webauthnCredential.create({
      data: {
        userId: upserted.id,
        credentialId: bytes("webauthn_cred", normalizedEmail),
        publicKey: bytes("webauthn_pub", normalizedEmail),
        counter: 1,
        transports: ["usb"],
        aaguid: "00000000-0000-0000-0000-000000000000",
        name: "YubiKey (seed)",
        lastUsedAt: new Date(),
      },
    });

    await prisma.recoveryCode.deleteMany({ where: { userId: upserted.id } });
    await prisma.recoveryCode.createMany({
      data: Array.from({ length: 8 }).map((_, index) => ({
        userId: upserted.id,
        codeHash: token("recovery", `${normalizedEmail}:${index}`),
      })),
    });

    await prisma.apiToken.deleteMany({ where: { userId: upserted.id } });
    await prisma.apiToken.create({
      data: {
        userId: upserted.id,
        name: "Dev token",
        tokenHash: token("api", normalizedEmail),
        scopes: ["users:read", "users:write"],
        lastUsedAt: new Date(),
      },
    });
  }
}

async function main(): Promise<void> {
  loadEnvForSeed();

  const prisma = getPrisma();

  for (const user of users) {
    await prisma.$transaction(async (tx) => {
      await seedOne(tx, user);
    });
  }

  const count = await prisma.user.count();
  console.log(`Seeded users: ${users.length} (total users in DB: ${count})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Prisma adapter uses a shared pg Pool; closing Prisma doesn't end the pool.
    try {
      await getPrisma().$disconnect();
    } catch {
      // ignore
    }
    try {
      await getPool().end();
    } catch {
      // ignore
    }
  });

  // Note: Prisma schema definitions (enum/model) don't belong in this TypeScript file.
  // If you meant to add these, move them to `packages/db/prisma/schema.prisma`.
  /*

  createdAt    DateTime     @default(now())
  acceptedAt   DateTime?
  revokedAt    DateTime?

  org          Org          @relation(fields: [orgId], references: [id], onDelete: Cascade)
  createdBy    User?        @relation("OrgInviteCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  acceptedBy   User?        @relation("OrgInviteAcceptedBy", fields: [acceptedById], references: [id], onDelete: SetNull)

  @@index([orgId])
  @@index([email])
  @@index([status])
  @@index([expiresAt])
}

model PropertyMember {
  propertyId String
  userId     String
  role       OrgRole
  createdAt  DateTime @default(now())

  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([propertyId, userId])
  @@index([userId])
}

//
// Amenities + property/unit metadata
//

enum AmenityType {
  PROPERTY
  UNIT
}

model Amenity {
  id        String     @id @default(uuid())
  orgId     String
  type      AmenityType
  code      String
  name      String
  createdAt DateTime   @default(now())

  org       Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  propertyLinks PropertyAmenity[]
  unitLinks     UnitAmenity[]

  @@unique([orgId, type, code])
  @@index([orgId])
  @@index([type])
}

model PropertyAmenity {
  propertyId String
  amenityId  String

  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  amenity    Amenity  @relation(fields: [amenityId], references: [id], onDelete: Cascade)

  @@id([propertyId, amenityId])
}

model UnitAmenity {
  unitId    String
  amenityId String

  unit      Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  amenity   Amenity  @relation(fields: [amenityId], references: [id], onDelete: Cascade)

  @@id([unitId, amenityId])
}

model PropertySettings {
  propertyId String @id
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  // flexible settings: hours, after-hours instructions, portals, etc.
  settings   Json?

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

//
// Applications (case worker workflow)
//

enum ApplicationStatus {
  DRAFT
  SUBMITTED
  IN_REVIEW
  APPROVED
  REJECTED
  WITHDRAWN
}

model Application {
  id            String            @id @default(uuid())
  orgId         String
  propertyId    String?

  applicantUserId String?
  applicantEmail  String?
  applicantPhone  String?

  desiredUnitType UnitType?
  desiredMoveInAt DateTime?

  status        ApplicationStatus @default(DRAFT)
  submittedAt   DateTime?
  reviewedAt    DateTime?
  reviewedById  String?

  data          Json?             // full application payload (safe, flexible)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  org           Org               @relation(fields: [orgId], references: [id], onDelete: Cascade)
  property      Property?         @relation(fields: [propertyId], references: [id], onDelete: SetNull)
  applicantUser User?             @relation("ApplicationApplicantUser", fields: [applicantUserId], references: [id], onDelete: SetNull)
  reviewedBy    User?             @relation("ApplicationReviewedBy", fields: [reviewedById], references: [id], onDelete: SetNull)

  notes         ApplicationNote[]
  events        ApplicationEvent[]
  documents     ApplicationDocument[]

  @@index([orgId])
  @@index([propertyId])
  @@index([status])
  @@index([submittedAt])
}

model ApplicationNote {
  id            String   @id @default(uuid())
  applicationId String
  authorId      String?
  body          String
  createdAt     DateTime @default(now())

  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  author        User?       @relation(fields: [authorId], references: [id], onDelete: SetNull)

  @@index([applicationId])
  @@index([createdAt])
}

enum ApplicationEventType {
  STATUS_CHANGED
  COMMENT_ADDED
  DOCUMENT_ADDED
  ASSIGNED
}

model ApplicationEvent {
  id            String               @id @default(uuid())
  applicationId String
  type          ApplicationEventType
  actorId       String?
  meta          Json?
  createdAt     DateTime             @default(now())

  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  actor         User?       @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([applicationId])
  @@index([createdAt])
}

//
// Leases + ledger (rent, fees, payments)
//

enum LeaseStatus {
  DRAFT
  ACTIVE
  ENDED
  TERMINATED
}

enum LeasePartyRole {
  PRIMARY_TENANT
  OCCUPANT
  GUARDIAN
  EMERGENCY_CONTACT
}

model Lease {
  id            String      @id @default(uuid())
  orgId         String
  propertyId    String
  unitId        String

  status        LeaseStatus @default(DRAFT)
  startDate     DateTime
  endDate       DateTime?

  rentCents     Int
  depositCents  Int?

  // flexible: rules, subsidies, addendums, etc.
  terms         Json?

  createdById   String?
  signedAt      DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  org           Org         @relation(fields: [orgId], references: [id], onDelete: Cascade)
  property      Property    @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  unit          Unit        @relation(fields: [unitId], references: [id], onDelete: Cascade)
  createdBy     User?       @relation("LeaseCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  parties       LeaseParty[]
  schedules     ChargeSchedule[]
  charges       Charge[]
  payments      Payment[]

  @@index([orgId])
  @@index([propertyId])
  @@index([unitId])
  @@index([status])
  @@index([startDate])
}

model LeaseParty {
  id        String         @id @default(uuid())
  leaseId   String
  role      LeasePartyRole

  userId    String?        // if they have an account
  name      String?
  email     String?
  phone     String?

  createdAt DateTime @default(now())

  lease     Lease @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  user      User?  @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([leaseId])
  @@index([userId])
  @@index([role])
}

enum RecurringInterval {
  WEEKLY
  BIWEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}

enum ChargeType {
  RENT
  LATE_FEE
  NSF_FEE
  UTILITIES
  PET_RENT
  PARKING
  DEPOSIT
  OTHER
}

model ChargeSchedule {
  id          String            @id @default(uuid())
  orgId       String
  leaseId     String
  type        ChargeType
  amountCents Int
  interval    RecurringInterval @default(MONTHLY)
  dayOfMonth  Int?              // for monthly charges: 1..28
  startsAt    DateTime
  endsAt      DateTime?

  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  lease       Lease             @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  org         Org               @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([leaseId])
  @@index([type])
}

model Charge {
  id          String     @id @default(uuid())
  orgId       String
  leaseId     String
  scheduleId  String?

  type        ChargeType
  amountCents Int
  description String?

  dueDate     DateTime
  postedAt    DateTime   @default(now())
  voidedAt    DateTime?

  lease       Lease      @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  schedule    ChargeSchedule? @relation(fields: [scheduleId], references: [id], onDelete: SetNull)
  org         Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)

  allocations PaymentAllocation[]

  @@index([orgId])
  @@index([leaseId])
  @@index([dueDate])
  @@index([type])
}

enum PaymentMethod {
  CASH
  CHECK
  ACH
  CARD
  OTHER
}

model Payment {
  id          String        @id @default(uuid())
  orgId       String
  leaseId     String

  amountCents Int
  method      PaymentMethod
  receivedAt  DateTime      @default(now())

  reference   String?
  note        String?
  postedById  String?

  reversedAt  DateTime?

  lease       Lease         @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  org         Org           @relation(fields: [orgId], references: [id], onDelete: Cascade)
  postedBy    User?         @relation("PaymentPostedBy", fields: [postedById], references: [id], onDelete: SetNull)

  allocations PaymentAllocation[]

  @@index([orgId])
  @@index([leaseId])
  @@index([receivedAt])
  @@index([method])
}

model PaymentAllocation {
  paymentId   String
  chargeId    String
  amountCents Int

  payment     Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  charge      Charge  @relation(fields: [chargeId], references: [id], onDelete: Cascade)

  @@id([paymentId, chargeId])
}

//
// Maintenance / Work Orders
//

enum WorkOrderStatus {
  NEW
  TRIAGE
  SCHEDULED
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CLOSED
  CANCELLED
}

enum WorkOrderPriority {
  LOW
  NORMAL
  HIGH
  EMERGENCY
}

enum WorkOrderCategory {
  PLUMBING
  ELECTRICAL
  HVAC
  APPLIANCE
  PEST
  GENERAL
  SAFETY
  OTHER
}

model WorkOrder {
  id            String            @id @default(uuid())
  orgId         String
  propertyId    String
  unitId        String?

  status        WorkOrderStatus   @default(NEW)
  priority      WorkOrderPriority @default(NORMAL)
  category      WorkOrderCategory @default(GENERAL)

  title         String
  description   String?

  requestedById String?
  assignedToId  String?

  allowEntry    Boolean           @default(false)
  preferredTimes String[]         // lightweight availability hints
  meta          Json?

  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  closedAt      DateTime?

  org           Org               @relation(fields: [orgId], references: [id], onDelete: Cascade)
  property      Property          @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  unit          Unit?             @relation(fields: [unitId], references: [id], onDelete: SetNull)

  requestedBy   User?             @relation("WorkOrderRequestedBy", fields: [requestedById], references: [id], onDelete: SetNull)
  assignedTo    User?             @relation("WorkOrderAssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)

  events        WorkOrderEvent[]
  lineItems     WorkOrderLineItem[]
  appointments  WorkOrderAppointment[]

  @@index([orgId])
  @@index([propertyId])
  @@index([unitId])
  @@index([status])
  @@index([priority])
  @@index([createdAt])
}

enum WorkOrderEventType {
  CREATED
  STATUS_CHANGED
  COMMENT
  ASSIGNED
  SCHEDULED
  COMPLETED
  CLOSED
}

model WorkOrderEvent {
  id          String           @id @default(uuid())
  workOrderId String
  type        WorkOrderEventType
  actorId     String?
  message     String?
  meta        Json?
  createdAt   DateTime         @default(now())

  workOrder   WorkOrder        @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  actor       User?            @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([workOrderId])
  @@index([createdAt])
}

model WorkOrderLineItem {
  id          String   @id @default(uuid())
  workOrderId String

  label       String
  qty         Int      @default(1)
  unitCostCents Int?
  notes       String?

  createdAt   DateTime @default(now())

  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)

  @@index([workOrderId])
}

model WorkOrderAppointment {
  id          String   @id @default(uuid())
  workOrderId String

  startsAt    DateTime
  endsAt      DateTime?
  notes       String?

  createdAt   DateTime @default(now())

  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)

  @@index([workOrderId])
  @@index([startsAt])
}

//
// Vendors + bills (future accounting)
//

enum VendorType {
  PLUMBER
  ELECTRICIAN
  HVAC
  GENERAL_CONTRACTOR
  CLEANING
  PEST
  OTHER
}

model Vendor {
  id          String     @id @default(uuid())
  orgId       String
  name        String
  type        VendorType @default(OTHER)

  phone       String?
  email       String?
  website     String?

  address1    String?
  address2    String?
  city        String?
  state       String?
  postalCode  String?

  meta        Json?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  org         Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  bills       VendorBill[]

  @@index([orgId])
  @@index([type])
}

enum VendorBillStatus {
  DRAFT
  SUBMITTED
  APPROVED
  PAID
  VOIDED
}

model VendorBill {
  id          String          @id @default(uuid())
  orgId       String
  vendorId    String
  propertyId  String?

  status      VendorBillStatus @default(DRAFT)
  invoiceNumber String?
  amountCents Int?
  dueDate     DateTime?

  createdById String?
  approvedById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  paidAt      DateTime?
  voidedAt    DateTime?

  org         Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  vendor      Vendor   @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  property    Property? @relation(fields: [propertyId], references: [id], onDelete: SetNull)

  createdBy   User?    @relation("VendorBillCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  approvedBy  User?    @relation("VendorBillApprovedBy", fields: [approvedById], references: [id], onDelete: SetNull)

  lines       VendorBillLine[]

  @@index([orgId])
  @@index([vendorId])
  @@index([propertyId])
  @@index([status])
  @@index([dueDate])
}

model VendorBillLine {
  id          String   @id @default(uuid())
  billId      String

  label       String
  amountCents Int

  meta        Json?
  createdAt   DateTime @default(now())

  bill        VendorBill @relation(fields: [billId], references: [id], onDelete: Cascade)

  @@index([billId])
}

//
// Inspections (turns, move-in/move-out, annual, etc.)
//

enum InspectionStatus {
  DRAFT
  SCHEDULED
  IN_PROGRESS
  SUBMITTED
  REVIEWED
  CLOSED
}

enum InspectionItemType {
  CHECKBOX
  TEXT
  NUMBER
  PHOTO
  SIGNATURE
}

model InspectionTemplate {
  id        String   @id @default(uuid())
  orgId     String
  name      String
  version   Int      @default(1)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  org       Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  items     InspectionTemplateItem[]

  @@unique([orgId, name, version])
  @@index([orgId])
}

model InspectionTemplateItem {
  id          String            @id @default(uuid())
  templateId  String
  label       String
  type        InspectionItemType
  required    Boolean           @default(false)
  order       Int               @default(0)
  meta        Json?

  template    InspectionTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@index([templateId])
}

model Inspection {
  id           String           @id @default(uuid())
  orgId        String
  templateId   String?
  propertyId   String
  unitId       String?

  status       InspectionStatus @default(DRAFT)

  scheduledAt  DateTime?
  startedAt    DateTime?
  submittedAt  DateTime?
  reviewedAt   DateTime?

  inspectorId  String?
  reviewerId   String?

  notes        String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  org          Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  template     InspectionTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  property     Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  unit         Unit?    @relation(fields: [unitId], references: [id], onDelete: SetNull)

  inspector    User?    @relation("InspectionInspector", fields: [inspectorId], references: [id], onDelete: SetNull)
  reviewer     User?    @relation("InspectionReviewer", fields: [reviewerId], references: [id], onDelete: SetNull)

  responses    InspectionResponse[]

  @@index([orgId])
  @@index([propertyId])
  @@index([unitId])
  @@index([status])
  @@index([scheduledAt])
}

model InspectionResponse {
  id           String   @id @default(uuid())
  inspectionId String
  itemId       String?  // if from a template
  label        String
  type         InspectionItemType
  valueText    String?
  valueNumber  Float?
  valueBool    Boolean?
  meta         Json?
  createdAt    DateTime @default(now())

  inspection   Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)

  @@index([inspectionId])
}

//
// Documents (R2 metadata) + typed links (no polymorphic FKs needed)
//

enum DocumentVisibility {
  INTERNAL
  TENANT_VISIBLE
}

model Document {
  id          String   @id @default(uuid())
  orgId       String

  r2Key       String   @unique
  fileName    String
  mimeType    String?
  sizeBytes   Int?

  visibility  DocumentVisibility @default(INTERNAL)

  uploadedById String?
  createdAt   DateTime @default(now())

  org         Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  uploadedBy  User?    @relation(fields: [uploadedById], references: [id], onDelete: SetNull)

  links       DocumentLink[]

  @@index([orgId])
  @@index([createdAt])
}

model DocumentLink {
  id            String @id @default(uuid())
  documentId    String

  orgId         String

  propertyId    String?
  unitId        String?
  leaseId       String?
  workOrderId   String?
  applicationId String?
  inspectionId  String?
  vendorBillId  String?

  createdAt     DateTime @default(now())

  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  org           Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Optional typed relations (safe; these models exist in this expansion pack)
  property      Property?    @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  unit          Unit?        @relation(fields: [unitId], references: [id], onDelete: Cascade)
  lease         Lease?       @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  workOrder     WorkOrder?   @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  application   Application? @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  inspection    Inspection?  @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  vendorBill    VendorBill?  @relation(fields: [vendorBillId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([documentId])
  @@index([propertyId])
  @@index([unitId])
  @@index([leaseId])
  @@index([workOrderId])
}

//
// Messaging (tenant/staff communications)
//

enum ConversationType {
  PROPERTY
  UNIT
  LEASE
  WORK_ORDER
  GENERAL
}

model Conversation {
  id         String          @id @default(uuid())
  orgId      String
  type       ConversationType @default(GENERAL)

  propertyId String?
  unitId     String?
  leaseId    String?
  workOrderId String?

  title      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  org        Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)

  participants ConversationParticipant[]
  messages      Message[]

  @@index([orgId])
  @@index([type])
  @@index([propertyId])
  @@index([unitId])
  @@index([leaseId])
  @@index([workOrderId])
}

model ConversationParticipant {
  conversationId String
  userId         String
  joinedAt       DateTime @default(now())
  lastReadAt     DateTime?

  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([conversationId, userId])
  @@index([userId])
}

model Message {
  id             String   @id @default(uuid())
  conversationId String
  senderId       String?

  body           String?
  meta           Json?

  createdAt      DateTime @default(now())

  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender         User?        @relation(fields: [senderId], references: [id], onDelete: SetNull)

  @@index([conversationId])
  @@index([createdAt])
}

//
// Notifications (in-app; email/sms can be derived from events later)
//

enum NotificationType {
  SYSTEM
  RENT_DUE
  WORK_ORDER_UPDATE
  APPLICATION_UPDATE
  MESSAGE
  INSPECTION
  LEASE
}

model Notification {
  id         String           @id @default(uuid())
  orgId      String
  userId     String

  type       NotificationType
  title      String
  body       String?

  data       Json?
  createdAt  DateTime @default(now())
  readAt     DateTime?

  org        Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([userId])
  @@index([type])
  @@index([readAt])
}

model NotificationPreference {
  id        String @id @default(uuid())
  userId    String
  orgId     String

  // flexible per-event preferences (email/sms/push toggles)
  prefs     Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  org       Org  @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId])
  @@index([orgId])
}

//
// Tasks (general workflow / turns / case worker)
//

enum TaskStatus {
  TODO
  IN_PROGRESS
  BLOCKED
  DONE
  CANCELLED
}

enum TaskPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

model Task {
  id          String       @id @default(uuid())
  orgId       String

  title       String
  description String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(NORMAL)

  dueAt       DateTime?

  createdById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?

  // optional links
  propertyId  String?
  unitId      String?
  leaseId     String?
  workOrderId String?
  applicationId String?

  org         Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  createdBy   User?    @relation("TaskCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  property    Property?    @relation(fields: [propertyId], references: [id], onDelete: SetNull)
  unit        Unit?        @relation(fields: [unitId], references: [id], onDelete: SetNull)
  lease       Lease?       @relation(fields: [leaseId], references: [id], onDelete: SetNull)
  workOrder   WorkOrder?   @relation(fields: [workOrderId], references: [id], onDelete: SetNull)
  application Application? @relation(fields: [applicationId], references: [id], onDelete: SetNull)

  assignees   TaskAssignment[]
  comments    TaskComment[]

  @@index([orgId])
  @@index([status])
  @@index([priority])
  @@index([dueAt])
}

model TaskAssignment {
  taskId String
  userId String

  task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([taskId, userId])
  @@index([userId])
}

model TaskComment {
  id        String   @id @default(uuid())
  taskId    String
  authorId  String?
  body      String
  createdAt DateTime @default(now())

  task      Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author    User? @relation(fields: [authorId], references: [id], onDelete: SetNull)

  @@index([taskId])
  @@index([createdAt])
}

//
// Integrations + webhooks (future)
//

enum IntegrationProvider {
  STRIPE
  PLAID
  TWILIO
  SENDGRID
  MICROSOFT_365
  GOOGLE_WORKSPACE
  OTHER
}

model Integration {
  id          String              @id @default(uuid())
  orgId       String
  provider    IntegrationProvider
  name        String?
  enabled     Boolean             @default(true)

  // store minimal config; secrets go in env/KMS or encrypted fields later
  config      Json?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  org         Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, provider])
  @@index([orgId])
}

enum WebhookEvent {
  APPLICATION_UPDATED
  LEASE_UPDATED
  PAYMENT_POSTED
  WORK_ORDER_UPDATED
  MESSAGE_CREATED
}

model WebhookEndpoint {
  id        String   @id @default(uuid())
  orgId     String
  url       String
  secretEnc String?  // encrypted signing secret
  events    WebhookEvent[]

  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  org       Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  deliveries WebhookDelivery[]

  @@index([orgId])
  @@index([enabled])
}

enum WebhookDeliveryStatus {
  PENDING
  SUCCESS
  FAILED
}

model WebhookDelivery {
  id          String                @id @default(uuid())
  endpointId  String
  event       WebhookEvent
  status      WebhookDeliveryStatus @default(PENDING)

  payload     Json
  responseCode Int?
  responseBody String?

  attempts    Int                   @default(0)
  nextAttemptAt DateTime?
  createdAt   DateTime              @default(now())
  deliveredAt DateTime?

  endpoint    WebhookEndpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([endpointId])
  @@index([status])
  @@index([createdAt])
}
*/
