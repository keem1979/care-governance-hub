import { describe, expect, it } from "vitest";
import { ageingBucket, creditMetrics, outstandingPence, riskFlag } from "@/lib/credit-control";
const now = new Date("2026-08-13T12:00:00Z");
describe("credit control metrics", () => {
  it("calculates unpaid balance from immutable payments", () => expect(outstandingPence({ amountPence: 100000, invoiceDate: now, dueDate: now, status: "PART_PAID", payments: [{ amountPence: 25000, receivedAt: now }] })).toBe(75000));
  it("places debt into UK-style ageing buckets", () => expect(ageingBucket(new Date("2026-06-01"), now)).toBe("61_90"));
  it("calculates DSO and current-month receipts from held records", () => expect(creditMetrics([{ amountPence: 90000, invoiceDate: new Date("2026-07-01"), dueDate: new Date("2026-07-31"), status: "PART_PAID", payments: [{ amountPence: 30000, receivedAt: new Date("2026-08-03") }] }], now)).toMatchObject({ outstanding: 60000, dso: 60, collectedThisMonth: 30000 }));
  it("does not invent DSO without invoiced sales", () => expect(creditMetrics([], now).dso).toBeNull());
  it("prioritises continuity risk", () => expect(riskFlag({ overdueDays: 2, riskRating: "LOW", disputed: false, continuityRisk: true })).toBe("CRITICAL"));
});
