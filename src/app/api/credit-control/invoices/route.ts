import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { CREDIT_INVOICE_STATUSES, CREDIT_PAYER_TYPES, CREDIT_RISK_RATINGS } from "@/lib/credit-control";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), form = await request.formData(), db = createDb();
  try {
    const payerName = text(form, "payerName"), accountReference = text(form, "accountReference"), payerType = text(form, "payerType"), invoiceNumber = text(form, "invoiceNumber"), ownerId = text(form, "ownerId"), locationId = text(form, "locationId") || null;
    const invoiceDate = parseOptionalDate(form.get("invoiceDate")), dueDate = parseOptionalDate(form.get("dueDate")), amountPence = money(form, "amount");
    const riskRating = text(form, "riskRating") || "LOW", status = text(form, "status") || "OPEN";
    if (!payerName || !accountReference || !invoiceNumber || !invoiceDate || !dueDate || !ownerId || amountPence <= 0) throw new Error("Enter the payer, account, invoice, owner, dates and a positive invoice amount.");
    if (!CREDIT_PAYER_TYPES.includes(payerType as never) || !CREDIT_RISK_RATINGS.includes(riskRating as never) || !CREDIT_INVOICE_STATUSES.includes(status as never)) throw new Error("Choose valid credit-control values.");
    if (locationId && !context.locations.some((item) => item.id === locationId)) throw new Error("Choose an authorised service location.");
    if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE", accessMode: "STANDARD" } }))) throw new Error("Choose an active operational owner.");
    const invoice = await db.$transaction(async (tx) => {
      const account = await tx.creditAccount.upsert({ where: { organisationId_accountReference: { organisationId: context.organisation.id, accountReference } }, update: { payerName, payerType: payerType as never, locationId, contactName: optional(form, "contactName"), contactEmail: optional(form, "contactEmail"), contactPhone: optional(form, "contactPhone"), paymentTermsDays: whole(form, "paymentTermsDays", 30), creditLimitPence: optionalMoney(form, "creditLimit"), riskRating: riskRating as never, riskReason: optional(form, "riskReason"), portalOrRoute: optional(form, "portalOrRoute"), active: true }, create: { organisationId: context.organisation.id, payerName, accountReference, payerType: payerType as never, locationId, contactName: optional(form, "contactName"), contactEmail: optional(form, "contactEmail"), contactPhone: optional(form, "contactPhone"), paymentTermsDays: whole(form, "paymentTermsDays", 30), creditLimitPence: optionalMoney(form, "creditLimit"), riskRating: riskRating as never, riskReason: optional(form, "riskReason"), portalOrRoute: optional(form, "portalOrRoute") } });
      const created = await tx.creditInvoice.create({ data: { organisationId: context.organisation.id, locationId, accountId: account.id, invoiceNumber, serviceReference: optional(form, "serviceReference"), servicePeriodStart: parseOptionalDate(form.get("servicePeriodStart")), servicePeriodEnd: parseOptionalDate(form.get("servicePeriodEnd")), invoiceDate, dueDate, amountPence, status: status as never, disputeReason: optional(form, "disputeReason"), purchaseOrderRef: optional(form, "purchaseOrderRef"), ownerId, nextActionDate: parseOptionalDate(form.get("nextActionDate")), nextAction: optional(form, "nextAction"), continuityRisk: form.get("continuityRisk") === "true", createdById: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "CreditInvoice", recordId: created.id, summary: `Added credit-control invoice ${invoiceNumber} for ${payerName}`, afterValue: { payerType, amountPence, dueDate, status, riskRating } } });
      return created;
    });
    return NextResponse.json({ id: invoice.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add the invoice." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function optional(form: FormData, key: string) { return text(form, key) || null; }
function money(form: FormData, key: string) { const value = Number(form.get(key)); return Number.isFinite(value) ? Math.round(value * 100) : 0; }
function optionalMoney(form: FormData, key: string) { return text(form, key) ? money(form, key) : null; }
function whole(form: FormData, key: string, fallback: number) { const value = Number(form.get(key)); return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback; }
