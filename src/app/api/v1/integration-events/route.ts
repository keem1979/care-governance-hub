import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIntegrationToken } from "@/lib/connected-governance";
import { createDb } from "@/lib/db";
import { reconciliationReference } from "@/lib/identity-reconciliation";

const eventSchema = z.object({ event_id: z.string().trim().min(3).max(160), entity_type: z.enum(["CLIENT", "STAFF_MEMBER", "SERVICE_LOCATION", "EXTERNAL_PARTY"]), operation: z.enum(["CREATE", "UPDATE", "UPSERT", "DELETE"]), external_id: z.string().trim().min(1).max(160), occurred_at: z.iso.datetime(), payload: z.record(z.string(), z.unknown()) });

export async function POST(request: Request) {
  const db = createDb();
  let failureContext: { organisationId: string; connectionId: string; locationId: string | null; connectionName: string } | null = null;
  try {
    const rawToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
    if (!rawToken.startsWith("qcgms_live_") || rawToken.length < 50) return NextResponse.json({ error: "Valid bearer token required." }, { status: 401 });
    const tokenPrefix = rawToken.slice(0, 24), tokenHash = await hashIntegrationToken(rawToken), now = new Date();
    const credential = await db.integrationCredential.findFirst({ where: { tokenPrefix, tokenHash, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], scopes: { has: "events:write" }, connection: { status: "ACTIVE", direction: { in: ["INBOUND", "BIDIRECTIONAL"] }, archivedAt: null } }, include: { connection: true } });
    if (!credential) return NextResponse.json({ error: "Token is invalid, expired or revoked." }, { status: 401 });
    failureContext = { organisationId: credential.organisationId, connectionId: credential.connectionId, locationId: credential.connection.locationId, connectionName: credential.connection.name };
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 262_144) throw new Error("PAYLOAD_TOO_LARGE");
    const raw = await request.text();
    if (raw.length > 262_144) throw new Error("PAYLOAD_TOO_LARGE");
    const input = eventSchema.parse(JSON.parse(raw)), existing = await db.integrationEvent.findUnique({ where: { connectionId_externalEventId: { connectionId: credential.connectionId, externalEventId: input.event_id } } });
    if (existing) return NextResponse.json({ id: existing.id, status: existing.status, duplicate: true }, { status: 200 });
    const exact = await db.externalIdentifier.findUnique({ where: { organisationId_sourceSystem_entityType_externalId: { organisationId: credential.organisationId, sourceSystem: credential.connection.key, entityType: input.entity_type, externalId: input.external_id } } }), payloadChecksum = await hashIntegrationToken(raw);
    const event = await db.$transaction(async (tx) => {
      let reconciliationCaseId: string | null = null;
      if (!exact) {
        const fingerprint = await hashIntegrationToken(`${credential.organisationId}:${credential.connectionId}:${input.entity_type}:${input.external_id}`);
        const counter = await tx.referenceCounter.upsert({ where: { organisationId_key: { organisationId: credential.organisationId, key: "DATA_QUALITY" } }, create: { organisationId: credential.organisationId, key: "DATA_QUALITY", currentValue: 1 }, update: { currentValue: { increment: 1 } } });
        const reconciliation = await tx.reconciliationCase.upsert({ where: { organisationId_fingerprint: { organisationId: credential.organisationId, fingerprint } }, create: { organisationId: credential.organisationId, locationId: credential.connection.locationId, reference: reconciliationReference(counter.currentValue), fingerprint, entityType: input.entity_type, reason: "MISSING_IDENTITY", candidateRecordIds: [], candidateLabels: [], matchSignals: ["Unrecognised external identifier"], summary: `Incoming ${input.entity_type.toLowerCase().replaceAll("_", " ")} event cannot be linked safely. Human reconciliation is required.` }, update: { status: "OPEN", reviewedAt: null, resolvedAt: null } });
        reconciliationCaseId = reconciliation.id;
      }
      const created = await tx.integrationEvent.create({ data: { organisationId: credential.organisationId, locationId: credential.connection.locationId, connectionId: credential.connectionId, externalEventId: input.event_id, entityType: input.entity_type, operation: input.operation, externalId: input.external_id, occurredAt: new Date(input.occurred_at), payload: input.payload as never, payloadChecksum, status: exact ? "MATCHED" : "QUARANTINED", matchedRecordId: exact?.recordId ?? null, reconciliationCaseId, processedAt: now } });
      await tx.integrationCredential.update({ where: { id: credential.id }, data: { lastUsedAt: now } });
      await tx.integrationConnection.update({ where: { id: credential.connectionId }, data: { lastSuccessAt: now, health: "HEALTHY", consecutiveFailures: 0 } });
      await tx.activityLog.create({ data: { organisationId: credential.organisationId, locationId: credential.connection.locationId, action: "CREATE", recordType: "IntegrationEvent", recordId: created.id, summary: `Received ${input.operation.toLowerCase()} event from ${credential.connection.name}`, afterValue: { entityType: input.entity_type, status: created.status, payloadChecksum, automaticCanonicalChanges: 0 } } });
      return created;
    });
    return NextResponse.json({ id: event.id, status: event.status, duplicate: false }, { status: 202 });
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "PAYLOAD_TOO_LARGE";
    if (failureContext) {
      const failureCode = tooLarge ? "PAYLOAD_TOO_LARGE" : error instanceof z.ZodError ? "CONTRACT_VALIDATION" : "EVENT_REJECTED";
      await db.$transaction([
        db.integrationConnection.update({ where: { id: failureContext.connectionId }, data: { health: "FAILED", lastFailureAt: new Date(), consecutiveFailures: { increment: 1 } } }),
        db.activityLog.create({ data: { organisationId: failureContext.organisationId, locationId: failureContext.locationId, action: "STATUS_CHANGE", recordType: "IntegrationConnection", recordId: failureContext.connectionId, summary: `Rejected inbound event from ${failureContext.connectionName}`, afterValue: { failureCode, payloadStored: false, canonicalChanges: 0 } } }),
      ]).catch(() => undefined);
    }
    return NextResponse.json({ error: tooLarge ? "Payload exceeds 256 KB." : error instanceof z.ZodError ? "Payload does not match the controlled event contract." : "Event could not be accepted." }, { status: tooLarge ? 413 : 400 });
  } finally { await db.$disconnect(); }
}
