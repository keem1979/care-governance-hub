"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { StructuredTableEditor } from "@/components/structured-table-editor";
import {
  EVIDENCE_SOURCES, LINKED_RECORD_CHECKS, REVIEW_DOMAINS, REVIEW_TYPES,
  RISK_LEVELS, RM_ASSURANCE_TESTS, WORKFLOW_STATUSES, defaultDueDate,
  type ReviewActionInput,
} from "@/lib/care-plan-reviews";
import {
  agreedChangeTableColumns,
  competencyTableColumns,
  escalationTableColumns,
  outcomeTableColumns,
  readUnderstoodTableColumns,
  supervisionTableColumns,
} from "@/lib/care-plan-review-tables";
import type { UkLocalAuthority } from "@/lib/uk-local-authorities";

type Option = { id: string; name: string };
type Initial = {
  id: string; reference: string; clientId: string; locationId: string; ownerId: string;
  riskLevel: string; status: string; data: Record<string, unknown>; evidenceIds: string[];
};

const STEPS = [
  ["Review details", ["carePlanReference", "reviewType", "reviewDueDate", "reasonForReview", "mainDecisionRequired"]],
  ["Evidence and source control", []],
  ["Involvement, capacity and consent", ["personInvolved"]],
  ["Person-centred review", ["whatWorkingWell", "whatChanged", "importantNow"]],
  ["Needs and risk domains", []],
  ["Clinical escalation", ["baselinePresentation", "warningSigns", "redFlags"]],
  ["Medication", ["medicationApplies"]],
  ["Safeguarding and rights", ["safeguardingConcern", "restrictivePractice"]],
  ["Care-package sufficiency", ["packageOverall"]],
  ["Outcomes", ["overallProgress", "overallProgressReason"]],
  ["Agreed changes", ["changesRequired"]],
  ["Actions and evidence", []],
  ["Staff implementation", ["materialChange"]],
  ["Supporting evidence", []],
  ["RM assurance and sign-off", ["rmDecision"]],
] as const;

const MEDICATION_CHECKS = [
  "Current MAR/eMAR verified", "Current prescription verified", "Pharmacy label verified",
  "Allergies confirmed", "Discontinued medicines removed", "PRN protocols current",
  "Administration responsibility clear", "Self-administration assessment current",
  "Family / third-party arrangement recorded", "Medication storage reviewed",
  "Stock availability reviewed", "Time-critical medicines identified",
  "Controlled drug requirements reviewed where applicable", "Care plan matches MAR",
];

const COMMUNICATION_SUPPORT = ["Easy Read", "Interpreter", "Hearing support", "Visual support", "Advocate", "Family / representative", "Communication aid", "Additional processing time", "Mental-health support", "Other"];
const STAFF_GROUPS = ["All assigned carers", "Named carers", "Team leader", "Care coordinator", "Medication team", "Complex-care team", "Scheduler", "On-call", "Live-in staff", "Other"];

function stored(data: Record<string, unknown>, key: string) { return String(data[key] ?? ""); }
function storedArray(data: Record<string, unknown>, key: string) { return Array.isArray(data[key]) ? data[key].map(String) : []; }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function CarePlanReviewForm({
  organisationName, locations, owners, clients, evidence, initial, defaultClientId = "", sourceCarePlan,
}: {
  organisationName: string; locations: Option[]; owners: Option[]; clients: Option[];
  evidence: { id: string; title: string }[]; initial?: Initial; defaultClientId?: string;
  sourceCarePlan?: { id:string; versionId:string; reference:string; versionNumber:number; snapshot:Record<string,unknown>; reviewDefaults:Record<string,unknown> };
}) {
  const router = useRouter();
  const data = initial?.data ?? sourceCarePlan?.reviewDefaults ?? {};
  const [step, setStep] = useState(0);
  const [live, setLive] = useState<Record<string,string>>(() => ({
    ...Object.fromEntries(Object.entries(data).filter((item): item is [string,string] => typeof item[1] === "string")),
    clientId: initial?.clientId || defaultClientId,
    locationId: initial?.locationId || "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [domains, setDomains] = useState<string[]>(storedArray(data, "domains"));
  const [actions, setActions] = useState<ReviewActionInput[]>(() => {
    const saved = data.reviewActions;
    return Array.isArray(saved) ? saved as ReviewActionInput[] : [];
  });

  function value(key: string) {
    return live[key] ?? stored(data, key);
  }
  function isComplete(index: number) {
    const required = STEPS[index][1];
    return required.length === 0
      ? index < step
      : required.every((key) => value(key).trim());
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { schemaVersion: 2, domains, reviewActions: actions, ...(sourceCarePlan ? { carePlanId: sourceCarePlan.id, carePlanVersionId: sourceCarePlan.versionId, carePlanSnapshot: sourceCarePlan.snapshot } : {}) };
    const multi = new Set<string>();
    for (const [rawKey] of form.entries()) if (rawKey.startsWith("reviewData.") && rawKey.endsWith("[]")) multi.add(rawKey);
    for (const key of multi) payload[key.slice(11, -2)] = form.getAll(key).map(String);
    for (const [rawKey, rawValue] of form.entries()) {
      if (!rawKey.startsWith("reviewData.") || rawKey.endsWith("[]")) continue;
      payload[rawKey.slice(11)] = String(rawValue);
    }
    form.set("carePlanReviewData", JSON.stringify(payload));
    const url = initial ? `/api/care-plan-reviews/${initial.id}` : "/api/care-plan-reviews";
    const response = await fetch(url, { method: initial ? "PATCH" : "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not save the care-plan review."); setBusy(false); return; }
    router.push(`/registers/care-plan-reviews/${initial?.id ?? result.id}`);
    router.refresh();
  }

  const risk = value("currentRisk") || initial?.riskLevel || "LOW";
  const workflow = value("workflowStatus") || "Draft";
  function capture(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!target.name || target.name.endsWith("[]") || (target instanceof HTMLInputElement && target.type === "checkbox")) return;
    const key = target.name.startsWith("reviewData.") ? target.name.slice(11) : target.name;
    setLive((current) => current[key] === target.value ? current : { ...current, [key]: target.value });
  }

  return <form onSubmit={submit} onInput={capture} onChange={capture} className="space-y-5">
    {sourceCarePlan ? <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950"><strong>Live Care Plan {sourceCarePlan.reference} v{sourceCarePlan.versionNumber} loaded.</strong><p className="mt-1">This review uses a controlled snapshot. Only changed sections will become proposed amendments; the live plan remains unchanged until authorised publication.</p></div> : null}
    <div className="sticky top-0 z-20 rounded-2xl border border-slate-300 bg-slate-950 p-4 text-white shadow-xl print:hidden">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <HeaderFact label="Reference" value={initial?.reference || "Generated on save"}/>
        <HeaderFact label="Person" value={clients.find((item)=>item.id===live.clientId)?.name || "Not selected"}/>
        <HeaderFact label="Care plan" value={value("carePlanReference") || "Not recorded"}/>
        <HeaderFact label="Service" value={locations.find((item)=>item.id===live.locationId)?.name || "Not selected"}/>
        <HeaderFact label="Review due" value={value("reviewDueDate") || "Not set"}/>
        <HeaderFact label="Current risk" value={risk}/>
        <HeaderFact label="Status" value={workflow}/>
      </div>
    </div>

    {error ? <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}

    <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
      <nav className="space-y-1 rounded-2xl border border-slate-200 bg-white p-3 xl:sticky xl:top-28 xl:self-start">
        <p className="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-emerald-700">Review pathway</p>
        {STEPS.map(([title], index) => <button type="button" key={title} onClick={() => setStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold ${step === index ? "bg-emerald-800 text-white" : "hover:bg-slate-100"}`}>
          <span className={`grid size-6 shrink-0 place-items-center rounded-full ${isComplete(index) ? "bg-emerald-100 text-emerald-800" : step === index ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{isComplete(index) ? <CheckCircle2 size={14}/> : index + 1}</span>{title}
        </button>)}
      </nav>

      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <section className="mb-7 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/60" aria-label="Assurance summary">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 px-4 py-3">
            <div><h2 className="text-sm font-bold text-emerald-950">Assurance summary</h2><p className="text-xs text-emerald-800">Live review indicators · {organisationName}</p></div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-900 shadow-sm">{workflow}</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-emerald-200 sm:grid-cols-3 lg:grid-cols-5">
            <SummaryCard label="Current risk" value={risk}/>
            <SummaryCard label="Person involved" value={value("personInvolved") || "Not recorded"}/>
            <SummaryCard label="Evidence position" value={value("evidenceConflict") === "Yes" ? "Conflict identified" : "No conflict recorded"}/>
            <SummaryCard label="Critical / High actions" value={`${actions.filter((item)=>item.priority==="CRITICAL"&&!item.actionId).length} / ${actions.filter((item)=>item.priority==="HIGH"&&!item.actionId).length}`}/>
            <SummaryCard label="RM assurance" value={value("rmDecision") || "Outstanding"}/>
          </div>
        </section>
        <StepPanel active={step === 0} number={1} title="Review details" description="Establish why this review is taking place, the decision required and immediate safety position.">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="reference" label="Review reference" defaultValue={initial?.reference} placeholder="Generated automatically if blank" readOnly={Boolean(initial)}/>
            <DirectorySelect name="clientId" label="Person" options={clients} initialId={initial?.clientId || defaultClientId} onSelect={(id)=>setLive((current)=>({...current,clientId:id}))} required/>
            <TextField name="reviewData.personReference" label="Person reference" defaultValue={stored(data,"personReference")} help="Auto-populate from the Client Directory where available."/>
            <SelectField name="locationId" label="Service location" defaultValue={initial?.locationId} options={locations} required/>
            <TextField name="reviewData.carePlanReference" label="Current care plan" defaultValue={stored(data,"carePlanReference")} required/>
            <TextField name="reviewData.carePlanVersion" label="Care-plan version" defaultValue={stored(data,"carePlanVersion")}/>
            <SelectField name="reviewData.reviewType" label="Review type" defaultValue={stored(data,"reviewType")} values={[...REVIEW_TYPES]} required/>
            <TextField name="reviewData.reviewDueDate" label="Review due date" type="date" defaultValue={stored(data,"reviewDueDate")} required/>
            <TextField name="reviewData.reviewCompletedAt" label="Review completed date/time" type="datetime-local" defaultValue={stored(data,"reviewCompletedAt")}/>
            <SelectField name="ownerId" label="Lead reviewer" defaultValue={initial?.ownerId} options={owners} required/>
            <TextField name="reviewData.otherProfessionals" label="Other professionals / staff involved" defaultValue={stored(data,"otherProfessionals")}/>
            <LocalAuthoritySearch initial={stored(data,"localAuthorityCode") ? { code: stored(data,"localAuthorityCode"), name: stored(data,"localAuthorityName"), nation: stored(data,"localAuthorityNation") as UkLocalAuthority["nation"], authorityType: stored(data,"localAuthorityType"), status: stored(data,"localAuthorityStatus") === "historic" ? "historic" : "current", effectiveFrom: stored(data,"localAuthorityStatus") === "historic" ? "Historic ONS snapshot" : "2025-04-01", effectiveTo: null } : undefined}/>
            <TextField name="reviewData.otherCommissioner" label="Other commissioner / funder" defaultValue={stored(data,"otherCommissioner")} placeholder="NHS body, ICB, private funder, self-funded or other"/>
            <SelectField name="reviewData.workflowStatus" label="Review status" defaultValue={stored(data,"workflowStatus") || "Draft"} values={[...WORKFLOW_STATUSES]} required/>
            <SelectField name="reviewData.currentRisk" label="Current risk" defaultValue={stored(data,"currentRisk") || initial?.riskLevel || "LOW"} values={[...RISK_LEVELS]} required/>
            <TextArea name="reviewData.reasonForReview" label="Reason for review" defaultValue={stored(data,"reasonForReview")} placeholder="Provide a concise factual explanation of what triggered this review." required wide/>
            <TextArea name="reviewData.mainDecisionRequired" label="Main decision required" defaultValue={stored(data,"mainDecisionRequired")} placeholder="What question must this review resolve about the person's care, risks, outcomes or support?" required wide/>
            <YesNo name="reviewData.immediateRisk" label="Immediate risk identified?" defaultValue={stored(data,"immediateRisk")}/>
          </div>
          {value("immediateRisk") === "Yes" ? <AlertPanel title="Urgent escalation and immediate control">
            <div className="grid gap-4 md:grid-cols-2"><TextArea name="reviewData.immediateConcern" label="Immediate concern" defaultValue={stored(data,"immediateConcern")} required wide/><SelectField name="reviewData.immediateRiskLevel" label="Risk level" defaultValue={stored(data,"immediateRiskLevel") || risk} values={[...RISK_LEVELS]}/><TextArea name="reviewData.immediateActionTaken" label="Immediate action taken" defaultValue={stored(data,"immediateActionTaken")} required wide/><YesNo name="reviewData.personMadeSafe" label="Person made safe?" defaultValue={stored(data,"personMadeSafe")}/><TextField name="reviewData.managerInformed" label="Manager informed" defaultValue={stored(data,"managerInformed")}/><TextField name="reviewData.clinicianContacted" label="Clinician contacted" defaultValue={stored(data,"clinicianContacted")}/><TextField name="reviewData.emergencyServiceContacted" label="Emergency service contacted" defaultValue={stored(data,"emergencyServiceContacted")}/><YesNo name="reviewData.safeguardingRequired" label="Safeguarding required?" defaultValue={stored(data,"safeguardingRequired")}/><TextField name="reviewData.immediateActionOwner" label="Action owner" defaultValue={stored(data,"immediateActionOwner")}/><TextArea name="reviewData.immediateAdvice" label="Advice received" defaultValue={stored(data,"immediateAdvice")} wide/><TextArea name="reviewData.immediateRiskOutcome" label="Outcome" defaultValue={stored(data,"immediateRiskOutcome")} wide/><TextArea name="reviewData.rmInterimControlDecision" label="RM interim-control decision" defaultValue={stored(data,"rmInterimControlDecision")} wide/></div>
          </AlertPanel> : null}
        </StepPanel>

        <StepPanel active={step === 1} number={2} title="Evidence and source control" description="Record the information reviewed, its currency and how it influenced the decision.">
          <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-xs"><thead><tr className="bg-slate-100"><th className="p-2">Evidence source</th><th className="p-2">Reviewed?</th><th className="p-2">Document / reference</th><th className="p-2">Date / version</th><th className="p-2">Finding / relevance</th><th className="p-2">Current?</th></tr></thead><tbody>{EVIDENCE_SOURCES.map((source) => { const id=slug(source); return <tr key={source} className="border-t"><td className="p-2 font-semibold">{source}</td><td className="p-2"><input type="checkbox" name="reviewData.evidenceReviewed[]" value={source} defaultChecked={storedArray(data,"evidenceReviewed").includes(source)}/></td><td className="p-2"><input name={`reviewData.evidence_${id}_reference`} defaultValue={stored(data,`evidence_${id}_reference`)} className="w-full rounded border p-2"/></td><td className="p-2"><input name={`reviewData.evidence_${id}_dateVersion`} defaultValue={stored(data,`evidence_${id}_dateVersion`)} className="w-full rounded border p-2"/></td><td className="p-2"><input name={`reviewData.evidence_${id}_finding`} defaultValue={stored(data,`evidence_${id}_finding`)} className="w-full rounded border p-2"/></td><td className="p-2"><select name={`reviewData.evidence_${id}_current`} defaultValue={stored(data,`evidence_${id}_current`)} className="rounded border p-2"><option value="">—</option><option>Yes</option><option>No</option><option>Unknown</option></select></td></tr>})}</tbody></table></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2"><YesNo name="reviewData.evidenceConflict" label="Evidence conflict identified?" defaultValue={stored(data,"evidenceConflict")}/>{value("evidenceConflict") === "Yes" ? <><TextArea name="reviewData.conflictingRecords" label="Conflicting records / instructions" defaultValue={stored(data,"conflictingRecords")} required wide/><YesNo name="reviewData.authoritativeSourceConfirmed" label="Authoritative source confirmed?" defaultValue={stored(data,"authoritativeSourceConfirmed")}/><TextField name="reviewData.authoritativeSource" label="Authoritative source" defaultValue={stored(data,"authoritativeSource")}/><TextField name="reviewData.evidenceVerifiedBy" label="Verified by" defaultValue={stored(data,"evidenceVerifiedBy")}/><TextArea name="reviewData.recordsForReconciliation" label="Records requiring reconciliation" defaultValue={stored(data,"recordsForReconciliation")} wide/></> : null}</div>
        </StepPanel>

        <StepPanel active={step === 2} number={3} title="Person involvement, capacity and consent" description="Evidence meaningful involvement, lawful decision-making and consent to revised arrangements.">
          <div className="grid gap-4 md:grid-cols-2"><SelectField name="reviewData.personInvolved" label="Person involved in review?" defaultValue={stored(data,"personInvolved")} values={["Yes","Partially","No"]} required/>{["Partially","No"].includes(value("personInvolved")) ? <><TextArea name="reviewData.involvementReason" label="Reason" defaultValue={stored(data,"involvementReason")} required wide/><TextArea name="reviewData.involvementSupport" label="What was done to enable involvement?" defaultValue={stored(data,"involvementSupport")} required wide/></> : null}<Checklist name="reviewData.communicationSupport[]" label="Communication support" items={COMMUNICATION_SUPPORT} selected={storedArray(data,"communicationSupport")} wide/><YesNo name="reviewData.representativeInvolved" label="Representative involved?" defaultValue={stored(data,"representativeInvolved")}/><TextField name="reviewData.representativeName" label="Representative name" defaultValue={stored(data,"representativeName")}/><TextField name="reviewData.representativeRelationship" label="Relationship" defaultValue={stored(data,"representativeRelationship")}/><TextField name="reviewData.representativeContact" label="Contact" defaultValue={stored(data,"representativeContact")}/><SelectField name="reviewData.representativeAuthority" label="Authority type" defaultValue={stored(data,"representativeAuthority")} values={["Family / informal representative","Health & Welfare LPA","Property & Finance LPA","Court-appointed Deputy","Advocate","IMCA","Appointee","Other"]}/><SelectField name="reviewData.authorityVerified" label="Authority verified?" defaultValue={stored(data,"authorityVerified")} values={["Yes","No","Not required"]}/><SelectField name="reviewData.capacityConcern" label="Reason to doubt capacity for a specific decision?" defaultValue={stored(data,"capacityConcern")} values={["No","Yes","Existing assessment applies"]}/><TextArea name="reviewData.capacityDecision" label="Decision requiring assessment" defaultValue={stored(data,"capacityDecision")} wide/><TextArea name="reviewData.capacityOutcome" label="Capacity / best-interest outcome and least-restrictive decision" defaultValue={stored(data,"capacityOutcome")} wide/><SelectField name="reviewData.consentPosition" label="Consent to revised care arrangements" defaultValue={stored(data,"consentPosition")} values={["Given","Partially agreed","Declined","Best-interest decision","Authorised representative","Other lawful basis"]}/><TextArea name="reviewData.personComments" label="Person's comments in own words" defaultValue={stored(data,"personComments")} wide/><TextArea name="reviewData.whatIWantStaffToKnow" label="WHAT I WANT STAFF TO KNOW" defaultValue={stored(data,"whatIWantStaffToKnow")} wide highlight/></div>
        </StepPanel>

        <StepPanel active={step === 3} number={4} title="What matters to me" description="Keep the review grounded in the person's priorities, preferences and independence.">
          <div className="grid gap-4 md:grid-cols-2"><TextArea name="reviewData.whatWorkingWell" label="What is working well for me?" defaultValue={stored(data,"whatWorkingWell")} required/><TextArea name="reviewData.whatNotWorking" label="What is not working well for me?" defaultValue={stored(data,"whatNotWorking")}/><TextArea name="reviewData.whatChanged" label="What has changed since my last review?" defaultValue={stored(data,"whatChanged")} required/><TextArea name="reviewData.importantNow" label="What is important to me now?" defaultValue={stored(data,"importantNow")} required/><TextArea name="reviewData.independence" label="What do I want to remain independent with?" defaultValue={stored(data,"independence")}/><TextArea name="reviewData.supportHelps" label="What support helps me most?" defaultValue={stored(data,"supportHelps")}/><TextArea name="reviewData.distressTriggers" label="What makes me anxious, distressed or uncomfortable?" defaultValue={stored(data,"distressTriggers")}/><TextArea name="reviewData.communicationPreference" label="How I want staff to communicate with me" defaultValue={stored(data,"communicationPreference")}/><TextArea name="reviewData.staffMustNot" label="What I do NOT want staff to do" defaultValue={stored(data,"staffMustNot")} wide/><Checklist name="reviewData.preferences[]" label="Preferences reviewed" items={["Preferred name","Routines","Personal care","Food / drink","Culture","Religion / faith","Gender preference","Privacy","Relationships","Sleep","Activities","Community access","Pets","Home environment","Other"]} selected={storedArray(data,"preferences")} wide/></div>
        </StepPanel>

        <StepPanel active={step === 4} number={5} title="Needs and risk domain review" description="Select only applicable domains, then record change, evidence, controls and outcomes for each.">
          <div className="flex flex-wrap gap-2">{REVIEW_DOMAINS.map((domain) => <button type="button" key={domain} onClick={() => setDomains((current) => current.includes(domain) ? current.filter((item) => item !== domain) : [...current, domain])} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${domains.includes(domain) ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white"}`}>{domain}</button>)}</div>
          <div className="mt-5 space-y-4">{domains.map((domain) => { const id=slug(domain); return <article key={domain} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5"><h3 className="text-lg font-bold text-emerald-950">{domain}</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><TextArea name={`reviewData.domain_${id}_currentNeed`} label="Current need" defaultValue={stored(data,`domain_${id}_currentNeed`)}/><TextArea name={`reviewData.domain_${id}_previousPosition`} label="Previous position" defaultValue={stored(data,`domain_${id}_previousPosition`)}/><SelectField name={`reviewData.domain_${id}_change`} label="Change since last review" defaultValue={stored(data,`domain_${id}_change`)} values={["Improved","Stable","Deteriorated","New need","No longer applicable"]}/><SelectField name={`reviewData.domain_${id}_risk`} label="Current risk" defaultValue={stored(data,`domain_${id}_risk`) || "LOW"} values={[...RISK_LEVELS]}/><SelectField name={`reviewData.domain_${id}_controlsEffective`} label="Existing controls effective?" defaultValue={stored(data,`domain_${id}_controlsEffective`)} values={["Yes","Partially","No"]}/><TextArea name={`reviewData.domain_${id}_controls`} label="Current and amended controls" defaultValue={stored(data,`domain_${id}_controls`)}/><TextArea name={`reviewData.domain_${id}_personView`} label="Person's view" defaultValue={stored(data,`domain_${id}_personView`)}/><TextArea name={`reviewData.domain_${id}_evidence`} label="Evidence reviewed" defaultValue={stored(data,`domain_${id}_evidence`)}/><TextField name={`reviewData.domain_${id}_referral`} label="Professional referral / escalation trigger" defaultValue={stored(data,`domain_${id}_referral`)}/><TextArea name={`reviewData.domain_${id}_staffResponse`} label="Staff response" defaultValue={stored(data,`domain_${id}_staffResponse`)}/><TextArea name={`reviewData.domain_${id}_outcome`} label="Outcome sought and success measure" defaultValue={stored(data,`domain_${id}_outcome`)} wide/></div></article>})}</div>
        </StepPanel>

        <StepPanel active={step === 5} number={6} title="Clinical deterioration and escalation" description="Give staff unambiguous warning signs, escalation routes, timescales and closed-loop outcomes.">
          <div className="grid gap-4 md:grid-cols-2"><TextArea name="reviewData.baselinePresentation" label="Normal / baseline presentation" defaultValue={stored(data,"baselinePresentation")} required/><TextArea name="reviewData.warningSigns" label="Known warning signs" defaultValue={stored(data,"warningSigns")} required/><TextArea name="reviewData.redFlags" label="Known red flags" defaultValue={stored(data,"redFlags")} required/><StructuredTableEditor name="reviewData.escalationTable" label="Escalation plan" description="Define each trigger, the required response, who must be contacted and the evidence that confirms the outcome." columns={escalationTableColumns} defaultValue={data.escalationTable} addLabel="Add escalation trigger"/><YesNo name="reviewData.escalationRequired" label="Was escalation required during this review?" defaultValue={stored(data,"escalationRequired")}/><TextArea name="reviewData.escalationConcern" label="Concern, advice, action and outcome" defaultValue={stored(data,"escalationConcern")} wide/><SelectField name="reviewData.escalationOutcomeStatus" label="Outcome status" defaultValue={stored(data,"escalationOutcomeStatus")} values={["Outcome confirmed","Awaiting External Response","Not required"]}/></div>
        </StepPanel>

        <StepPanel active={step === 6} number={7} title="Medication assurance" description="Reconcile medicines and prevent discrepancies from being closed without authorised review.">
          <div className="grid gap-4 md:grid-cols-2"><YesNo name="reviewData.medicationApplies" label="Medication support applies?" defaultValue={stored(data,"medicationApplies")}/><SelectField name="reviewData.medicationResponsibility" label="Medication responsibility" defaultValue={stored(data,"medicationResponsibility")} values={["Provider administers","Provider prompts","Person self-administers","Family administers","Mixed arrangement","Other"]}/><SelectField name="reviewData.medicationChanged" label="Medication changed since previous review?" defaultValue={stored(data,"medicationChanged")} values={["No","Yes","Unknown"]}/><Checklist name="reviewData.medicationChecks[]" label="Medication reconciliation checklist" items={MEDICATION_CHECKS} selected={storedArray(data,"medicationChecks")} wide/><YesNo name="reviewData.medicationDiscrepancy" label="Medication discrepancy?" defaultValue={stored(data,"medicationDiscrepancy")}/><TextArea name="reviewData.medicationDiscrepancyDetail" label="Medication, discrepancy, risk, immediate action and clinical advice" defaultValue={stored(data,"medicationDiscrepancyDetail")} wide/></div>
        </StepPanel>

        <StepPanel active={step === 7} number={8} title="Safeguarding, restrictions and rights" description="Evidence protection, lawful authority, proportionality and the least-restrictive approach.">
          <div className="grid gap-4 md:grid-cols-2"><YesNo name="reviewData.safeguardingConcern" label="Safeguarding concern identified?" defaultValue={stored(data,"safeguardingConcern")}/><TextArea name="reviewData.safeguardingDetail" label="Concern, protection, referral, notifications, outcome and controls" defaultValue={stored(data,"safeguardingDetail")} wide/><YesNo name="reviewData.restrictivePractice" label="Restrictive practice identified?" defaultValue={stored(data,"restrictivePractice")}/><TextArea name="reviewData.restrictionDetail" label="Restriction, purpose, capacity, legal authority, proportionality and alternatives" defaultValue={stored(data,"restrictionDetail")} wide/><Checklist name="reviewData.rightsReviewed[]" label="Rights reviewed" items={["Dignity","Privacy","Equality / protected characteristics","Reasonable adjustments","Autonomy","Choice","Community access"]} selected={storedArray(data,"rightsReviewed")} wide/></div>
        </StepPanel>

        <StepPanel active={step === 8} number={9} title="Care-package sufficiency" description="Compare commissioned support with actual delivery, risk, skill mix and continuity.">
          <div className="grid gap-4 md:grid-cols-2"><TextArea name="reviewData.commissionedPackage" label="Current commissioned package" defaultValue={stored(data,"commissionedPackage")}/><TextArea name="reviewData.actualSupport" label="Current actual support being delivered" defaultValue={stored(data,"actualSupport")}/><TextField name="reviewData.callsPerDay" label="Calls per day" type="number" defaultValue={stored(data,"callsPerDay")}/><TextField name="reviewData.commissionedHours" label="Commissioned hours" type="number" defaultValue={stored(data,"commissionedHours")}/><Checklist name="reviewData.deliveryExceptions[]" label="Delivery exceptions" items={["Recurring overruns","Recurring short visits","Recurring lateness","Missed / not-started calls","Unplanned additional support","Family providing regular additional care"]} selected={storedArray(data,"deliveryExceptions")} wide/><SelectField name="reviewData.visitDurationSufficient" label="Visit durations sufficient?" defaultValue={stored(data,"visitDurationSufficient")} values={["Yes","No","Review required"]}/><YesNo name="reviewData.skillMixSufficient" label="Staff skill mix sufficient?" defaultValue={stored(data,"skillMixSufficient")}/><YesNo name="reviewData.continuitySufficient" label="Continuity sufficient?" defaultValue={stored(data,"continuitySufficient")}/><SelectField name="reviewData.packageOverall" label="Overall package" defaultValue={stored(data,"packageOverall")} values={["Safe and sufficient","Sufficient with monitoring","Review required","Insufficient / unsafe"]} required/><TextArea name="reviewData.packageInterimControls" label="Commissioner review, owner, interim safety controls and outcome" defaultValue={stored(data,"packageInterimControls")} wide/></div>
        </StepPanel>

        <StepPanel active={step === 9} number={10} title="Outcome review" description="Show whether agreed outcomes are being achieved and what evidence supports the judgement.">
          <StructuredTableEditor name="reviewData.outcomeTable" label="Outcome review table" description="Review one person-centred outcome per row and record the evidence, the person’s view and the accountable next decision." columns={outcomeTableColumns} defaultValue={data.outcomeTable} addLabel="Add outcome"/>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><SelectField name="reviewData.overallProgress" label="Overall progress" defaultValue={stored(data,"overallProgress")} values={["Improving","Stable","Mixed","Deteriorating","Unable to determine"]} required/><TextArea name="reviewData.overallProgressReason" label="Reason for overall assessment" defaultValue={stored(data,"overallProgressReason")} required/></div>
        </StepPanel>

        <StepPanel active={step === 10} number={11} title="Agreed care-plan changes" description="Control the revised plan, linked-record updates, version history and communication.">
          <div className="grid gap-4 md:grid-cols-2"><YesNo name="reviewData.changesRequired" label="Changes required?" defaultValue={stored(data,"changesRequired")}/>{value("changesRequired") === "No" ? <TextArea name="reviewData.currentPlanSuitableReason" label="Why does the current plan remain suitable?" defaultValue={stored(data,"currentPlanSuitableReason")} required wide/> : <StructuredTableEditor name="reviewData.agreedChanges" label="Agreed care-plan changes" description="Record the previous and agreed position separately so staff can see exactly what changed, why, when and who authorised it." columns={agreedChangeTableColumns} defaultValue={data.agreedChanges} addLabel="Add agreed change"/>}<Checklist name="reviewData.linkedRecordChecks[]" label="Linked-record assurance" items={[...LINKED_RECORD_CHECKS]} selected={storedArray(data,"linkedRecordChecks")} wide/><TextField name="reviewData.previousPlanVersion" label="Previous version" defaultValue={stored(data,"previousPlanVersion")}/><TextField name="reviewData.newPlanVersion" label="New version" defaultValue={stored(data,"newPlanVersion")}/><TextField name="reviewData.planEffectiveFrom" label="Effective from" type="date" defaultValue={stored(data,"planEffectiveFrom")}/><YesNo name="reviewData.previousPlanArchived" label="Previous plan archived?" defaultValue={stored(data,"previousPlanArchived")}/></div>
        </StepPanel>

        <StepPanel active={step === 11} number={12} title="RM action and evidence tracker" description="Every action needs an accountable owner, deadline, evidence requirement and effectiveness check.">
          <div className="space-y-4">{actions.map((action,index) => <article key={action.id ?? index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><h3 className="font-bold">Action {index+1}</h3><button type="button" onClick={() => setActions((current) => current.filter((_,i)=>i!==index))} aria-label={`Remove action ${index+1}`} className="rounded-lg p-2 text-red-700"><Trash2 size={16}/></button></div><div className="mt-3 grid gap-3 md:grid-cols-2"><ActionSelect label="Priority" value={action.priority} values={["CRITICAL","HIGH","MEDIUM","LOW"]} onChange={(value)=>updateAction(setActions,index,{priority:value as ReviewActionInput["priority"],dueDate:defaultDueDate(value)})}/><ActionInput label="Finding / action" value={action.finding} onChange={(value)=>updateAction(setActions,index,{finding:value})}/><ActionSelect label="Action owner" value={action.ownerId} options={owners} onChange={(value)=>updateAction(setActions,index,{ownerId:value})}/><ActionInput label="Due date" type="date" value={action.dueDate} onChange={(value)=>updateAction(setActions,index,{dueDate:value})}/><ActionInput label="Evidence required" value={action.evidenceRequired} onChange={(value)=>updateAction(setActions,index,{evidenceRequired:value})}/><ActionInput label="Expected outcome" value={action.expectedOutcome} onChange={(value)=>updateAction(setActions,index,{expectedOutcome:value})}/><ActionInput label="How success will be measured" value={action.successMeasure} onChange={(value)=>updateAction(setActions,index,{successMeasure:value})}/>{action.actionId ? <p className="rounded-lg bg-emerald-100 p-3 text-xs font-semibold text-emerald-900">Linked to central Follow-up Action</p> : null}</div></article>)}</div>
          <button type="button" onClick={() => setActions((current)=>[...current,{id:crypto.randomUUID(),priority:"MEDIUM",finding:"",ownerId:initial?.ownerId || "",dueDate:defaultDueDate("MEDIUM"),evidenceRequired:"",expectedOutcome:"",successMeasure:""}])} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/> Add accountable action</button>
        </StepPanel>

        <StepPanel active={step === 12} number={13} title="Staff implementation" description="Identify who must know, acknowledge, demonstrate competence or receive supervision.">
          <div className="grid gap-4 md:grid-cols-2"><Checklist name="reviewData.staffGroups[]" label="Who needs to know?" items={STAFF_GROUPS} selected={storedArray(data,"staffGroups")} wide/><YesNo name="reviewData.materialChange" label="Material change?" defaultValue={stored(data,"materialChange")}/><YesNo name="reviewData.readUnderstoodRequired" label="Staff Read & Understood required?" defaultValue={stored(data,"readUnderstoodRequired") || (value("materialChange") === "Yes" ? "Yes" : "No")}/><StructuredTableEditor name="reviewData.readUnderstoodTable" label="Read-and-understood tracker" description="Track each staff member separately. Tick the stages completed and record any outstanding support or follow-up." columns={readUnderstoodTableColumns} defaultValue={data.readUnderstoodTable} addLabel="Add staff member"/><YesNo name="reviewData.competencyRequired" label="Competency required?" defaultValue={stored(data,"competencyRequired")}/><StructuredTableEditor name="reviewData.competencyTable" label="Competency tracker" description="Record the skill assessed, assessment method, accountable assessor, outcome and supporting evidence for each worker." columns={competencyTableColumns} defaultValue={data.competencyTable} addLabel="Add competency check"/><YesNo name="reviewData.supervisionRequired" label="Supervision required?" defaultValue={stored(data,"supervisionRequired")}/><StructuredTableEditor name="reviewData.supervisionTable" label="Supervision tracker" description="Record the supervision discussion, agreed support, deadline, completion and follow-up for each worker." columns={supervisionTableColumns} defaultValue={data.supervisionTable} addLabel="Add supervision record"/></div>
        </StepPanel>

        <StepPanel active={step === 13} number={14} title="Supporting evidence" description="Select controlled Evidence Library items that support the review and its decisions.">
          <label className="block text-sm font-semibold">Linked evidence<select multiple name="evidenceIds" defaultValue={initial?.evidenceIds ?? []} className="mt-2 min-h-64 w-full rounded-xl border border-slate-300 p-3">{evidence.map((item)=><option key={item.id} value={item.id}>{item.title}</option>)}</select><span className="mt-2 block text-xs font-normal text-slate-500">Use Ctrl or Command to select more than one item. New documents can be uploaded in the Evidence Library after saving.</span></label>
          <TextArea name="reviewData.evidenceIndexNotes" label="Evidence relevance / verification notes" defaultValue={stored(data,"evidenceIndexNotes")} wide/>
        </StepPanel>

        <StepPanel active={step === 14} number={15} title="Registered Manager assurance test" description="Software summarises the checks; final professional judgement remains with the Registered Manager.">
          <div className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-5"><div className="flex items-center gap-3"><ShieldCheck className="text-emerald-800"/><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Registered Manager assurance standard</p><h3 className="text-xl font-bold">REGISTERED MANAGER ASSURANCE TEST</h3></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="bg-emerald-900 text-white"><th className="p-3 text-left">Assurance test</th><th className="p-3 text-left">Result</th><th className="p-3 text-left">Comment</th></tr></thead><tbody>{RM_ASSURANCE_TESTS.map((test) => { const id=slug(test); return <tr key={test} className="border-t border-emerald-200 bg-white"><td className="p-3 font-semibold">{test}</td><td className="p-3"><select name={`reviewData.assurance_${id}_result`} defaultValue={stored(data,`assurance_${id}_result`)} className="rounded-lg border p-2"><option value="">Choose</option>{["MET","PARTIAL","NOT MET","N/A"].map((v)=><option key={v}>{v}</option>)}</select></td><td className="p-3"><input name={`reviewData.assurance_${id}_comment`} defaultValue={stored(data,`assurance_${id}_comment`)} className="w-full rounded-lg border p-2"/></td></tr>})}</tbody></table></div></div>
          {risk === "CRITICAL" || actions.some((action)=>action.priority === "CRITICAL" && !action.actionId) ? <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-800"><AlertTriangle/>Critical assurance issues remain open.</div> : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2"><SelectField name="reviewData.rmDecision" label="Final RM decision" defaultValue={stored(data,"rmDecision")} values={["APPROVED","APPROVED WITH ACTIONS","RETURNED FOR ACTION","URGENT REVIEW REQUIRED"]} required/><TextArea name="reviewData.rmRationale" label="RM rationale" defaultValue={stored(data,"rmRationale")} required wide/><TextArea name="reviewData.outstandingActions" label="Outstanding actions" defaultValue={stored(data,"outstandingActions")} wide/><TextArea name="reviewData.interimSafetyControls" label="Interim safety controls" defaultValue={stored(data,"interimSafetyControls")} wide/><TextField name="reviewData.nextReviewDate" label="Next review date" type="date" defaultValue={stored(data,"nextReviewDate")} required/><TextField name="reviewData.rmName" label="Registered Manager name" defaultValue={stored(data,"rmName")}/><TextField name="reviewData.rmSignOffAt" label="Electronic sign-off date/time" type="datetime-local" defaultValue={stored(data,"rmSignOffAt")}/>{initial && stored(data,"rmSignOffAt") ? <TextArea name="reviewData.reopenReason" label="Reason for reopening this signed review" defaultValue={stored(data,"reopenReason")} required wide/> : null}</div>
        </StepPanel>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-5"><button type="button" disabled={step===0} onClick={()=>setStep((n)=>Math.max(0,n-1))} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-40"><ChevronLeft size={16}/> Previous</button><p className="text-xs font-semibold text-slate-500">Step {step+1} of {STEPS.length}</p>{step<STEPS.length-1?<button type="button" onClick={()=>setStep((n)=>Math.min(STEPS.length-1,n+1))} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Next <ChevronRight size={16}/></button>:<button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Saving…":initial?"Save care-plan review":"Create care-plan review"}</button>}</div>
      </div>

    </div>
  </form>;
}

function HeaderFact({label,value}:{label:string;value:string}) { return <div><p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p><p className="mt-0.5 truncate text-xs font-bold">{value}</p></div>; }
function SummaryCard({label,value}:{label:string;value:string}) { return <div className="min-w-0 bg-white px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-xs font-bold text-slate-950">{value}</p></div>; }
function StepPanel({active,number,title,description,children}:{active:boolean;number:number;title:string;description:string;children:React.ReactNode}) { return <section className={active?"":"hidden"}><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Section {number}</p><h2 className="mt-1 text-2xl font-bold">{title}</h2><p className="mb-6 mt-1 text-sm leading-6 text-slate-600">{description}</p>{children}</section>; }
function AlertPanel({title,children}:{title:string;children:React.ReactNode}) { return <div className="mt-5 rounded-2xl border-2 border-red-300 bg-red-50 p-5"><h3 className="flex items-center gap-2 font-bold text-red-900"><AlertTriangle size={18}/>{title}</h3><div className="mt-4">{children}</div></div>; }
const control="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";
function TextField({name,label,defaultValue="",type="text",placeholder,help,required,readOnly}:{name:string;label:string;defaultValue?:string;type?:string;placeholder?:string;help?:string;required?:boolean;readOnly?:boolean}) { return <label className="text-sm font-semibold">{label}{required?" *":""}<input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} readOnly={readOnly} className={`${control} ${readOnly?"bg-slate-100":""}`}/>{help?<span className="mt-1 block text-xs font-normal text-slate-500">{help}</span>:null}</label>; }
function TextArea({name,label,defaultValue="",placeholder,required,wide,highlight}:{name:string;label:string;defaultValue?:string;placeholder?:string;required?:boolean;wide?:boolean;highlight?:boolean}) { return <label className={`text-sm font-semibold ${wide?"md:col-span-2":""}`}>{label}{required?" *":""}<textarea name={name} defaultValue={defaultValue} placeholder={placeholder} className={`${control} min-h-28 ${highlight?"border-amber-400 bg-amber-50 text-lg font-semibold":""}`}/></label>; }
function SelectField({name,label,defaultValue="",values,options,required}:{name:string;label:string;defaultValue?:string;values?:string[];options?:Option[];required?:boolean}) { return <label className="text-sm font-semibold">{label}{required?" *":""}<select name={name} defaultValue={defaultValue} className={control}><option value="">Choose an option</option>{values?.map((value)=><option key={value} value={value}>{value}</option>)}{options?.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>; }
function YesNo(props:{name:string;label:string;defaultValue?:string}) { return <SelectField {...props} values={["No","Yes"]}/>; }
function Checklist({name,label,items,selected,wide}:{name:string;label:string;items:readonly string[];selected:string[];wide?:boolean}) { return <fieldset className={`rounded-xl border border-slate-200 p-4 ${wide?"md:col-span-2":""}`}><legend className="px-1 text-sm font-bold">{label}</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map((item)=><label key={item} className="flex items-start gap-2 text-xs"><input type="checkbox" name={name} value={item} defaultChecked={selected.includes(item)} className="mt-0.5"/><span>{item}</span></label>)}</div></fieldset>; }
function DirectorySelect({name,label,options,initialId,required,onSelect}:{name:string;label:string;options:Option[];initialId:string;required?:boolean;onSelect?:(id:string)=>void}) { const initial=options.find((item)=>item.id===initialId); const [text,setText]=useState(initial?.name??""); const match=options.find((item)=>item.name===text); const listId=`${name}-list`; return <label className="text-sm font-semibold">{label}{required?" *":""}<input value={text} onChange={(event)=>{const next=event.target.value;setText(next);onSelect?.(options.find((item)=>item.name===next)?.id??"");}} list={listId} className={control} placeholder="Search by name or internal reference"/><input type="hidden" name={name} value={match?.id??""}/><datalist id={listId}>{options.map((item)=><option key={item.id} value={item.name}/>)}</datalist>{text&&!match?<span className="mt-1 block text-xs text-amber-700">Choose an exact directory match.</span>:null}</label>; }
function LocalAuthoritySearch({initial}:{initial?:UkLocalAuthority}) { const [query,setQuery]=useState(initial?.name??""); const [selected,setSelected]=useState<UkLocalAuthority|undefined>(initial); const [results,setResults]=useState<UkLocalAuthority[]>([]); const [busy,setBusy]=useState(false); const [includeHistoric,setIncludeHistoric]=useState(initial?.status==="historic"); async function search(){if(query.trim().length<2)return;setBusy(true);const response=await fetch(`/api/local-authorities?q=${encodeURIComponent(query)}&includeHistoric=${includeHistoric}`);const body=await response.json().catch(()=>({}));setResults(response.ok?body.authorities??[]:[]);setBusy(false);} return <div className="md:col-span-2 rounded-xl border border-slate-200 p-4"><label className="text-sm font-semibold">Commissioning / responsible local authority <span className="font-normal text-slate-500">(optional)</span></label><div className="mt-2 flex gap-2"><input value={query} onChange={(event)=>{setQuery(event.target.value);setSelected(undefined);}} placeholder="Search authority name or GSS code" className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm"/><button type="button" onClick={search} className="rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">{busy?"Searching…":"Search"}</button></div><label className="mt-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={includeHistoric} onChange={(event)=>setIncludeHistoric(event.target.checked)}/> Include historic authorities</label>{results.length&&!selected?<div className="mt-2 max-h-44 overflow-y-auto rounded-xl border bg-white">{results.map((item)=><button type="button" key={item.code} onClick={()=>{setSelected(item);setQuery(item.name);setResults([]);}} className="block w-full border-b p-3 text-left text-sm hover:bg-emerald-50"><strong>{item.name}</strong><span className="ml-2 text-xs text-slate-500">{item.nation} · {item.code} · {item.status}</span></button>)}</div>:null}{selected?<div className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm"><strong>{selected.name}</strong><p className="text-xs text-emerald-800">{selected.nation} · {selected.authorityType} · GSS {selected.code} · {selected.status}</p></div>:null}<input type="hidden" name="reviewData.localAuthorityCode" value={selected?.code??""}/><input type="hidden" name="reviewData.localAuthorityName" value={selected?.name??""}/><input type="hidden" name="reviewData.localAuthorityNation" value={selected?.nation??""}/><input type="hidden" name="reviewData.localAuthorityType" value={selected?.authorityType??""}/><input type="hidden" name="reviewData.localAuthorityStatus" value={selected?.status??""}/><p className="mt-2 text-xs text-slate-500">Current and optional historic authority names and nine-character GSS codes are searched from official ONS Open Geography snapshots. Other commissioners can be recorded separately.</p></div>; }
function ActionInput({label,value,onChange,type="text"}:{label:string;value:string;onChange:(value:string)=>void;type?:string}) { return <label className="text-xs font-semibold">{label}<input type={type} value={value} onChange={(event)=>onChange(event.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>; }
function ActionSelect({label,value,onChange,values,options}:{label:string;value:string;onChange:(value:string)=>void;values?:string[];options?:Option[]}) { return <label className="text-xs font-semibold">{label}<select value={value} onChange={(event)=>onChange(event.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="">Choose</option>{values?.map((item)=><option key={item}>{item}</option>)}{options?.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>; }
function updateAction(setter:React.Dispatch<React.SetStateAction<ReviewActionInput[]>>,index:number,patch:Partial<ReviewActionInput>){setter((current)=>current.map((item,i)=>i===index?{...item,...patch}:item));}
