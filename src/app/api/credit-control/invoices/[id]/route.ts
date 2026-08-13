import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { CREDIT_CONTACT_METHODS, CREDIT_INVOICE_STATUSES } from "@/lib/credit-control";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const invoice = await db.creditInvoice.findFirst({ where: { id, organisationId: context.organisation.id, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }) }, include: { payments: true, account: true } });
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    const status = text(form, "status") || invoice.status, paymentPence = money(form, "paymentAmount"), paymentDate = parseOptionalDate(form.get("paymentDate")), outcome = text(form, "outcome"), method = text(form, "method");
    if (!CREDIT_INVOICE_STATUSES.includes(status as never)) throw new Error("Choose a valid invoice status.");
    if (paymentPence > 0 && !paymentDate) throw new Error("Enter the payment received date.");
    if (outcome && !CREDIT_CONTACT_METHODS.includes(method as never)) throw new Error("Choose the contact method.");
    const existingPaid = invoice.payments.reduce((sum, item) => sum + item.amountPence, 0);
    if (existingPaid + paymentPence > invoice.amountPence) throw new Error("Recorded payments cannot exceed the invoice amount.");
    const resolvedStatus = existingPaid + paymentPence >= invoice.amountPence ? "PAID" : paymentPence > 0 && status === "OPEN" ? "PART_PAID" : status;
    await db.$transaction(async (tx) => {
      if (paymentPence > 0 && paymentDate) await tx.creditPayment.create({ data: { organisationId: context.organisation.id, invoiceId: id, amountPence: paymentPence, receivedAt: paymentDate, reference: optional(form, "paymentReference"), recordedById: context.user.id } });
      if (outcome) await tx.creditContact.create({ data: { organisationId: context.organisation.id, invoiceId: id, contactedAt: parseOptionalDate(form.get("contactedAt")) ?? new Date(), method: method as never, outcome, promiseDate: parseOptionalDate(form.get("promiseDate")), promisePence: optionalMoney(form, "promiseAmount"), nextAction: optional(form, "nextAction"), recordedById: context.user.id } });
      await tx.creditInvoice.update({ where: { id }, data: { status: resolvedStatus as never, disputeReason: optional(form, "disputeReason"), nextActionDate: parseOptionalDate(form.get("nextActionDate")), nextAction: optional(form, "nextAction"), continuityRisk: form.get("continuityRisk") === "true" } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: invoice.locationId, userId: context.user.id, action: "UPDATE", recordType: "CreditInvoice", recordId: id, summary: `Updated credit-control invoice ${invoice.invoiceNumber}`, afterValue: { status: resolvedStatus, paymentPence, contactMethod: outcome ? method : null, nextActionDate: text(form, "nextActionDate") || null } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the invoice." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function optional(form: FormData, key: string) { return text(form, key) || null; }
function money(form: FormData, key: string) { const value = Number(form.get(key)); return Number.isFinite(value) ? Math.round(value * 100) : 0; }
function optionalMoney(form: FormData, key: string) { return text(form, key) ? money(form, key) : null; }
