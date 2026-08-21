import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { encryptMfaSecret } from "@/lib/auth/mfa";
import { hashRateLimitKey } from "@/lib/auth/rate-limit";
import { createDb } from "@/lib/db";

export const runtime = "nodejs";

function hasValidSetupRequest(request: Request) {
  const setupToken = process.env.E2E_SETUP_TOKEN;
  return (
    process.env.NODE_ENV !== "production" &&
    Boolean(setupToken) &&
    request.headers.get("x-e2e-setup-token") === setupToken
  );
}

async function removeGeneratedFixtures(db: ReturnType<typeof createDb>, organisationId: string) {
  const risks = await db.risk.findMany({
    where: { organisationId, reference: { startsWith: "E2E-RSK-" } },
    select: { id: true },
  });
  const riskIds = risks.map(({ id }) => id);
  if (riskIds.length === 0) return { risks: 0, actions: 0 };

  const actions = await db.action.findMany({
    where: {
      organisationId,
      sourceType: "RISK",
      sourceRecordId: { in: riskIds },
    },
    select: { id: true },
  });
  const actionIds = actions.map(({ id }) => id);

  await db.$transaction(async (transaction) => {
    await transaction.activityLog.deleteMany({
      where: {
        organisationId,
        recordId: { in: [...riskIds, ...actionIds] },
      },
    });
    if (actionIds.length > 0) {
      await transaction.action.deleteMany({ where: { id: { in: actionIds }, organisationId } });
    }
    await transaction.risk.deleteMany({ where: { id: { in: riskIds }, organisationId } });
  });

  return { risks: riskIds.length, actions: actionIds.length };
}

export async function DELETE(request: Request) {
  if (!hasValidSetupRequest(request)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const db = createDb();
  try {
    const organisation = await db.organisation.findFirst({
      where: { slug: "meadow-view-home-care", isDemo: true },
      select: { id: true },
    });
    if (!organisation) {
      return NextResponse.json({ error: "The fictional demo tenant was not found." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, removed: await removeGeneratedFixtures(db, organisation.id) });
  } finally {
    await db.$disconnect();
  }
}

export async function POST(request: Request) {
  const email = process.env.E2E_USER_EMAIL;
  const name = process.env.E2E_USER_NAME;
  const password = process.env.E2E_USER_PASSWORD;
  const mfaSecret = process.env.E2E_MFA_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;

  // This route is included in source so the real application runtime can create
  // fixtures. It is unavailable unless Playwright explicitly enables it and is
  // always unavailable in a production process.
  if (
    !hasValidSetupRequest(request) ||
    !email ||
    !name ||
    !password ||
    !mfaSecret ||
    !sessionSecret
  ) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const db = createDb();
  try {
    const organisation = await db.organisation.findFirst({
      where: { slug: "meadow-view-home-care", isDemo: true },
      select: { id: true },
    });
    if (!organisation) {
      return NextResponse.json(
        { error: "The fictional Meadow View demo tenant must be seeded before E2E tests run." },
        { status: 409 },
      );
    }
    await removeGeneratedFixtures(db, organisation.id);
    const role = await db.role.findUnique({ where: { key: "organisation-owner" }, select: { id: true } });
    if (!role) return NextResponse.json({ error: "The organisation-owner role is missing." }, { status: 409 });

    const passwordHash = await hash(password, 12);
    const user = await db.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        isActive: true,
        mfaSecretCiphertext: encryptMfaSecret(mfaSecret, process.env.MFA_ENCRYPTION_KEY ?? sessionSecret),
        mfaEnabledAt: new Date(),
        mfaRecoveryCodeHashes: [],
      },
      create: {
        name,
        email,
        passwordHash,
        isActive: true,
        mfaSecretCiphertext: encryptMfaSecret(mfaSecret, process.env.MFA_ENCRYPTION_KEY ?? sessionSecret),
        mfaEnabledAt: new Date(),
        mfaRecoveryCodeHashes: [],
      },
      select: { id: true },
    });
    await db.organisationMembership.upsert({
      where: { organisationId_userId: { organisationId: organisation.id, userId: user.id } },
      update: { roleId: role.id, status: "ACTIVE", allLocations: true, deactivatedAt: null },
      create: {
        organisationId: organisation.id,
        userId: user.id,
        roleId: role.id,
        status: "ACTIVE",
        allLocations: true,
        joinedAt: new Date(),
      },
    });
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.authRateLimit.deleteMany({
      where: {
        keyHash: {
          in: ["local", "127.0.0.1", "::1"].map((address) => hashRateLimitKey(`${address}:${email}`, sessionSecret)),
        },
      },
    });

    const sourceReference = "E2E-SRC-001";
    const existingEvidence = await db.evidence.findFirst({
      where: { organisationId: organisation.id, sourceReference },
      select: { id: true },
    });
    const evidence = existingEvidence
      ? await db.evidence.update({
          where: { id: existingEvidence.id },
          data: {
            title: "E2E verified governance source",
            category: "Audits",
            evidenceType: "Record",
            ownerId: user.id,
            uploadedById: user.id,
            relatedModule: "E2EFixture",
            sourceType: "INTERNAL_RECORD",
            sourceName: "Fictional E2E fixture",
            sourceReference,
            status: "ACTIVE",
            archivedAt: null,
            reviewExpiryDate: null,
            provenanceNote: "Created only for authenticated browser testing in the fictional demo tenant.",
          },
          select: { id: true },
        })
      : await db.evidence.create({
          data: {
            organisationId: organisation.id,
            title: "E2E verified governance source",
            description: "Fictional governed source used to test source linking and closure assurance.",
            category: "Audits",
            evidenceType: "Record",
            ownerId: user.id,
            uploadedById: user.id,
            relatedModule: "E2EFixture",
            sourceType: "INTERNAL_RECORD",
            sourceName: "Fictional E2E fixture",
            sourceReference,
            provenanceNote: "Created only for authenticated browser testing in the fictional demo tenant.",
          },
          select: { id: true },
        });
    await db.evidenceVerification.deleteMany({ where: { evidenceId: evidence.id } });
    await db.evidenceVerification.create({
      data: {
        organisationId: organisation.id,
        evidenceId: evidence.id,
        outcome: "VERIFIED",
        relevance: "Supports the fictional E2E Risk workflow.",
        currencyAssessment: "Current for this test run.",
        authenticityCheck: "Provisioned by guarded demo-only E2E setup.",
        verifiedById: user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } finally {
    await db.$disconnect();
  }
}
