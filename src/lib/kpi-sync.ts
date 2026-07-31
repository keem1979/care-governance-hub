export const KPI_AUTO_SOURCES: Record<string, string> = {
  "missed-visits": "Missed visits register",
  "late-visits": "Late visits register",
  "medication-errors": "Medication errors register",
  falls: "Falls register",
  "pressure-damage": "Pressure damage register",
  "hospital-admissions": "Hospital admissions register",
  complaints: "Complaints register",
  compliments: "Compliments register",
  "safeguarding-referrals": "Safeguarding register",
  incidents: "Incidents register",
  "near-misses": "Near misses register",
  "training-compliance": "Staff training records",
  "supervision-compliance": "Staff supervision records",
  "appraisal-compliance": "Staff appraisal records",
  "spot-check-compliance": "Staff spot-check records",
  "open-actions": "Action Tracker",
  "overdue-actions": "Action Tracker",
  "audit-completion": "Audit Centre",
  "policy-compliance": "Policy Centre",
};

export const REGISTER_KPI_KEYS: Record<string, string> = {
  "missed-visits": "missed-visits",
  "late-visits": "late-visits",
  "medication-errors": "medicines-errors",
  falls: "falls",
  "pressure-damage": "pressure-damage",
  "hospital-admissions": "hospital-admissions",
  complaints: "complaints",
  compliments: "compliments",
  "safeguarding-referrals": "safeguarding",
  incidents: "incidents",
  "near-misses": "near-misses",
};

export const WORKFORCE_KPI_TYPES: Record<string, string> = {
  "training-compliance": "TRAINING",
  "supervision-compliance": "SUPERVISION",
  "appraisal-compliance": "APPRAISAL",
  "spot-check-compliance": "SPOT_CHECK",
};

export const AUTO_SYNC_NOTE_PREFIX = "[Auto-synced]";

export function compliancePercentage(current: number, total: number) {
  if (total <= 0) return null;
  return Math.round((current / total) * 1000) / 10;
}

export function isCurrentComplianceRecord(
  record: { outcome: string; expiryDate: Date | null; nextDueDate: Date | null },
  at: Date,
) {
  if (!["VALID", "COMPETENT"].includes(record.outcome)) return false;
  const due = record.expiryDate ?? record.nextDueDate;
  return !due || due >= at;
}
