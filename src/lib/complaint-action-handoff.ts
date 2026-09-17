export type ComplaintForAction = {
  reference: string;
  title: string;
  summary: string;
  riskLevel: string;
  locationId: string | null;
  ownerId: string | null;
  data: unknown;
  complaintInvestigation?: { remedy: string | null; learning: string | null; investigationOutcome: string | null } | null;
  complaintIssues?: { id: string; sequence: number; category: string; concern: string; reasoning: string | null }[];
};

export function complaintActionPrefill(complaint: ComplaintForAction, fallbackOwnerId: string, oversightOwnerIds: Set<string>, issueId?: string) {
  const issue = complaint.complaintIssues?.find((item) => item.id === issueId) ?? complaint.complaintIssues?.find((item) => Boolean(item.concern));
  const ownerId = complaint.ownerId ?? fallbackOwnerId;
  const oversightOwnerId = oversightOwnerIds.has(ownerId) ? ownerId : oversightOwnerIds.has(fallbackOwnerId) ? fallbackOwnerId : "";
  const prefix = issue ? `Issue ${issue.sequence}: ${issue.concern}` : complaint.title;
  const remedy = complaint.complaintInvestigation?.remedy?.trim();
  return {
    title: `Complete and verify improvement from ${complaint.reference}: ${prefix}`.slice(0, 180),
    description: issue?.reasoning?.trim() || complaint.summary,
    category: "Complaints",
    rootCause: issue?.reasoning?.trim() || "Confirm the cause or governance gap established by the Complaint investigation.",
    expectedOutcome: remedy || `The concern recorded in ${complaint.reference} is addressed and the agreed improvement benefits the person or service.`,
    successMeasure: "Completion Evidence is verified and proportionate effectiveness follow-up demonstrates whether the improvement worked without avoidable recurrence.",
    locationId: complaint.locationId ?? "",
    ownerId,
    oversightOwnerId,
    priority: complaint.riskLevel,
    dueDate: "",
    reviewDate: "",
    escalationRequired: complaint.riskLevel === "CRITICAL",
    escalationReason: complaint.riskLevel === "CRITICAL" ? "Critical Complaint requires immediate senior oversight and documented control." : "",
    progressNote: complaint.complaintInvestigation?.learning ? `Complaint learning: ${complaint.complaintInvestigation.learning}` : "",
    issueKey: `complaint-${complaint.reference.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "")}${issue ? `-issue-${issue.sequence}` : ""}`,
  };
}
