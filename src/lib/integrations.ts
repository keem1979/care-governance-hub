export const NATIVE_DATA_FLOWS = [
  { name: "Governance records → Evidence Library", direction: "Internal, one way", data: "Audits, risks, actions, meetings, policies, registers and workforce assurance", control: "Source-linked evidence is generated and refreshed by QCGMS", href: "/evidence" },
  { name: "Operational records → KPI Suite", direction: "Internal, one way", data: "Register counts, actions, audits, workforce compliance and policy assurance", control: "User-triggered refresh preserves manually entered KPI results", href: "/kpis" },
  { name: "Governance records → Reports", direction: "Internal, read only", data: "Authorised cross-module records", control: "Location and role scope is enforced at report generation", href: "/reports" },
  { name: "System activity → Audit Trail", direction: "Internal, append only", data: "Access, changes, approvals, downloads and report generation", control: "Events are read-only in the application and sensitive values are redacted", href: "/activity" },
  { name: "CSV import and export", direction: "Controlled file exchange", data: "KPI imports and authorised module exports", control: "Permission checks, validation and export logging", href: "/kpis" },
] as const;

export const EXTERNAL_INTEGRATION_CANDIDATES = [
  { name: "Nourish", purpose: "Potential care-plan, incident, audit and service-delivery KPI exchange", direction: "Supplier discovery required", dataClass: "Special-category care data", risk: "High", ownerAction: "Confirm supported API, minimum dataset and controller/processor roles" },
  { name: "CareLens", purpose: "Potential care-monitoring and operational assurance exchange", direction: "Supplier discovery required", dataClass: "Care and operational data", risk: "High", ownerAction: "Confirm lawful basis, available endpoints and record-matching design" },
  { name: "CareNexus", purpose: "Potential care operations and selected compliance measures", direction: "Supplier discovery required", dataClass: "Care and compliance data", risk: "High", ownerAction: "Confirm product identity, API ownership and security documentation" },
  { name: "Microsoft 365", purpose: "Potential controlled documents, notifications and collaboration", direction: "Supplier discovery required", dataClass: "Identity and business records", risk: "Medium", ownerAction: "Define tenant, Entra consent, SharePoint scope and retention controls" },
  { name: "Payroll and HR", purpose: "Potential starter, leaver, absence and workforce assurance exchange", direction: "Supplier discovery required", dataClass: "Employment and absence data", risk: "High", ownerAction: "Select supplier and minimise fields before technical design" },
  { name: "Training platforms", purpose: "Potential course completion, expiry and competency exchange", direction: "Supplier discovery required", dataClass: "Workforce learning data", risk: "Medium", ownerAction: "Select supplier and agree worker identifier and reconciliation rules" },
  { name: "Finance systems", purpose: "Potential contract and financial assurance measures", direction: "Supplier discovery required", dataClass: "Commercial and financial data", risk: "High", ownerAction: "Select supplier and define aggregated measures; exclude unnecessary transactions" },
] as const;

export const INTEGRATION_APPROVAL_GATES = [
  ["1. Business need", "Named sponsor, purpose, expected benefit and success measure"],
  ["2. Data protection", "Data map, lawful basis, minimisation, DPIA decision, retention and individual rights"],
  ["3. Supplier assurance", "Contract, roles, sub-processors, hosting regions, incident terms and deletion evidence"],
  ["4. Security design", "Authentication, least privilege, secret storage, encryption, allowlisting and rate limits"],
  ["5. Technical mapping", "Authoritative source, field definitions, identifiers, validation and duplicate handling"],
  ["6. Safe testing", "Synthetic or minimised test data, acceptance criteria, failure scenarios and rollback"],
  ["7. Operations", "Named owner, monitoring, reconciliation, incident response and support route"],
  ["8. Approval and review", "DPO/IG, clinical or operational owner approval, go-live decision and review date"],
] as const;

export function integrationReviewCsv(): string {
  const header = ["Candidate", "Current status", "Potential purpose", "Potential direction", "Data classification", "Inherent risk", "Required next action"];
  const rows = EXTERNAL_INTEGRATION_CANDIDATES.map((item) => [item.name, "NOT CONNECTED", item.purpose, item.direction, item.dataClass, item.risk, item.ownerAction]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(csv).join(",")).join("\r\n")}`;
}

function csv(value: unknown): string { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
