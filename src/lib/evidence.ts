export const EVIDENCE_CATEGORIES = [
  "Registration", "Insurance", "Policies", "Recruitment", "Training", "Supervision",
  "Competencies", "Audits", "Governance meetings", "Complaints", "Safeguarding",
  "Incidents", "Medicines", "Health and safety", "Infection control", "Business continuity",
  "Service-user feedback", "Staff feedback", "Quality improvement", "CQC notifications",
  "Certificates", "Other",
] as const;

export const EVIDENCE_TYPES = [
  "Certificate", "Report", "Record", "Photograph", "Form", "Correspondence",
  "Meeting record", "Audit evidence", "Other",
] as const;

export const EVIDENCE_CONFIDENTIALITY = ["INTERNAL", "CONFIDENTIAL", "RESTRICTED"] as const;
export const EVIDENCE_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 10;
export const ALLOWED_EVIDENCE_FILE_TYPES = new Set([
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv", "image/jpeg", "image/png",
]);

export function evidenceDisplayStatus(status: string, expiry: Date | null, now = new Date()): string {
  if (status === "ARCHIVED") return "Archived";
  if (!expiry) return "Current";
  if (expiry < now) return "Expired";
  const soon = new Date(now); soon.setDate(soon.getDate() + 30);
  return expiry <= soon ? "Expiring soon" : "Current";
}

export function validateEvidenceFile(file: File): void {
  if (!file.size) throw new Error("Choose at least one evidence file.");
  if (file.size > MAX_EVIDENCE_FILE_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
  if (!ALLOWED_EVIDENCE_FILE_TYPES.has(file.type)) {
    throw new Error(`${file.name} is not an accepted PDF, Office, CSV, JPG or PNG file.`);
  }
}

export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 180) || "Evidence item";
}

export function evidenceScopeWhere(context: { organisation: { id: string }; allLocations: boolean; locations: { id: string }[] }) {
  return {
    organisationId: context.organisation.id,
    ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }),
  };
}
