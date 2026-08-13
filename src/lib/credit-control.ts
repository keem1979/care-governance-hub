export const CREDIT_PAYER_TYPES = ["LOCAL_AUTHORITY", "NHS_ICB", "PRIVATE_SELF_FUNDER", "FAMILY_THIRD_PARTY", "CHARITY", "OTHER"] as const;
export const CREDIT_INVOICE_STATUSES = ["OPEN", "PART_PAID", "DISPUTED", "PAYMENT_PLAN", "PAID", "WRITTEN_OFF", "CANCELLED"] as const;
export const CREDIT_RISK_RATINGS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const CREDIT_CONTACT_METHODS = ["PHONE", "EMAIL", "PAYER_PORTAL", "LETTER", "MEETING", "OTHER"] as const;
export type CreditMetricInvoice = { amountPence: number; invoiceDate: Date; dueDate: Date; status: string; payments: { amountPence: number; receivedAt: Date }[] };

export function outstandingPence(invoice: CreditMetricInvoice) { return Math.max(0, invoice.amountPence - invoice.payments.reduce((sum, item) => sum + item.amountPence, 0)); }
export function ageingBucket(dueDate: Date, now = new Date()): "CURRENT" | "1_30" | "31_60" | "61_90" | "90_PLUS" {
  const days = Math.floor((start(now).getTime() - start(dueDate).getTime()) / 86_400_000);
  if (days <= 0) return "CURRENT"; if (days <= 30) return "1_30"; if (days <= 60) return "31_60"; if (days <= 90) return "61_90"; return "90_PLUS";
}
export function creditMetrics(invoices: CreditMetricInvoice[], now = new Date()) {
  const active = invoices.filter((item) => !["CANCELLED", "WRITTEN_OFF"].includes(item.status));
  const ageing = { CURRENT: 0, "1_30": 0, "31_60": 0, "61_90": 0, "90_PLUS": 0 };
  for (const invoice of active) ageing[ageingBucket(invoice.dueDate, now)] += outstandingPence(invoice);
  const outstanding = Object.values(ageing).reduce((sum, value) => sum + value, 0);
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 90);
  const sales90 = active.filter((item) => item.invoiceDate >= cutoff && item.invoiceDate <= now).reduce((sum, item) => sum + item.amountPence, 0);
  const dso = sales90 > 0 ? Math.round((outstanding / sales90) * 90) : null;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const collectedThisMonth = active.flatMap((item) => item.payments).filter((item) => item.receivedAt >= monthStart && item.receivedAt <= now).reduce((sum, item) => sum + item.amountPence, 0);
  return { ageing, outstanding, dso, collectedThisMonth };
}
export function riskFlag(input: { overdueDays: number; riskRating: string; disputed: boolean; continuityRisk: boolean }) { if (input.continuityRisk || input.riskRating === "CRITICAL" || input.overdueDays > 90) return "CRITICAL"; if (input.riskRating === "HIGH" || input.disputed || input.overdueDays > 60) return "HIGH"; if (input.overdueDays > 30 || input.riskRating === "MEDIUM") return "MEDIUM"; return "LOW"; }
function start(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
