export type IncidentForAction = {
  reference: string;
  title: string;
  summary: string;
  riskLevel: string;
  locationId: string | null;
  ownerId: string | null;
  eventDate: Date;
  data: unknown;
};

export function incidentActionPrefill(incident: IncidentForAction, fallbackOwnerId: string, oversightOwnerIds: Set<string>) {
  const data = record(incident.data);
  const ownerId = incident.ownerId ?? fallbackOwnerId;
  const oversightOwnerId = oversightOwnerIds.has(ownerId)
    ? ownerId
    : oversightOwnerIds.has(fallbackOwnerId)
      ? fallbackOwnerId
      : "";
  const immediate = text(data.immediateResponse);
  const learning = text(data.learning);
  return {
    title: `Complete and verify response to ${incident.reference}: ${incident.title}`.slice(0, 180),
    description: incident.summary,
    category: "Incidents and accidents",
    rootCause: text(data.rootCause) || "Confirm the root and contributing causes through the Incident investigation.",
    expectedOutcome: `The concern recorded in ${incident.reference} is controlled, required changes are completed and the person/service is protected from avoidable recurrence.`,
    successMeasure: "Completion Evidence is verified and subsequent monitoring demonstrates whether the control worked without repeat incident.",
    locationId: incident.locationId ?? "",
    ownerId,
    oversightOwnerId,
    priority: incident.riskLevel,
    dueDate: "",
    reviewDate: "",
    escalationRequired: incident.riskLevel === "CRITICAL",
    escalationReason: incident.riskLevel === "CRITICAL" ? "Critical Incident requires immediate senior oversight and documented control." : "",
    managementResponse: immediate ? `Immediate response recorded: ${immediate}` : "",
    progressNote: learning ? `Initial learning recorded: ${learning}` : "",
    issueKey: `incident-${incident.reference.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "")}`,
  };
}

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
