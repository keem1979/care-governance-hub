export const POLICY_CATEGORIES = [
  "Safeguarding",
  "Medicines",
  "Recruitment",
  "Workforce",
  "Health and safety",
  "Infection prevention and control",
  "Mental Capacity Act",
  "Complaints",
  "Whistleblowing",
  "Governance",
  "Information governance",
  "Equality and diversity",
  "Business continuity",
  "Care delivery",
  "Consent",
  "Duty of Candour",
] as const;

export const POLICY_STATUSES = ["DRAFT", "UNDER_REVIEW", "APPROVED", "ARCHIVED"] as const;
export const MAX_POLICY_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_POLICY_FILE_TYPES = new Map([
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
]);

export function policyDisplayStatus(
  status: string,
  nextReviewDate: Date | null,
  now = new Date(),
): string {
  if (status === "ARCHIVED") return "Archived";
  if (status !== "APPROVED" || !nextReviewDate) {
    return status === "UNDER_REVIEW"
      ? "Under review"
      : status.charAt(0) + status.slice(1).toLowerCase();
  }
  if (nextReviewDate < now) return "Overdue";
  const dueSoon = new Date(now);
  dueSoon.setDate(dueSoon.getDate() + 30);
  return nextReviewDate <= dueSoon ? "Due for review" : "Approved";
}

export function splitList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(`${text}T12:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) throw new Error("Enter a valid date.");
  return date;
}

export function validatePolicyFile(file: File): void {
  if (!file.size) throw new Error("Choose a policy document.");
  if (file.size > MAX_POLICY_FILE_BYTES) throw new Error("The document must be 10 MB or smaller.");
  if (!ALLOWED_POLICY_FILE_TYPES.has(file.type)) {
    throw new Error("Upload a PDF, DOC or DOCX file.");
  }
}

export function safeDownloadName(name: string): string {
  return name.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "policy-document";
}
