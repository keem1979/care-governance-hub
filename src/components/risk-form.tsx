"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { levelClasses, REVIEW_FREQUENCIES, RISK_CATEGORIES, RISK_STATUSES, riskLevel, riskScore, riskStatusLabel } from "@/lib/risks";
import { FormPurpose } from "@/components/form-purpose";

type Option = { id: string; name: string };
type Initial = {
  id: string; reference: string; title: string; description: string; category: string; locationId: string;
  existingControls: string; likelihood: number; impact: number; furtherControls: string; ownerId: string;
  targetDate: string; residualLikelihood: number; residualImpact: number; reviewFrequency: string;
  lastReviewDate: string; nextReviewDate: string; status: string; closureRationale: string;
  closureApprovedById: string; closureDate: string; evidenceIds: string[];
};

export function RiskForm({ locations, owners, evidence, initial }: { locations: Option[]; owners: Option[]; evidence: Option[]; initial?: Initial }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [likelihood, setLikelihood] = useState(initial?.likelihood ?? 3);
  const [impact, setImpact] = useState(initial?.impact ?? 3);
  const [residualLikelihood, setResidualLikelihood] = useState(initial?.residualLikelihood ?? 2);
  const [residualImpact, setResidualImpact] = useState(initial?.residualImpact ?? 2);
  const defaultNextReview = initial?.nextReviewDate ?? (() => { const date = new Date(); date.setMonth(date.getMonth() + 3); return date.toISOString().slice(0, 10); })();
  const initialScore = useMemo(() => riskScore(likelihood, impact), [likelihood, impact]);
  const residualScore = useMemo(() => riskScore(residualLikelihood, residualImpact), [residualLikelihood, residualImpact]);
  const cls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(initial ? `/api/risks/${initial.id}` : "/api/risks", { method: initial ? "PATCH" : "POST", body: new FormData(event.currentTarget) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Could not save risk."); setBusy(false); return; }
    router.push(`/risks/${initial?.id ?? result.id}`); router.refresh();
  }

  return <form onSubmit={submit} className="space-y-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <FormPurpose title="Organisational or service risk" description="Describe the uncertain event and possible harm, score it before controls, record what is already working and then score the remaining risk." steps={["Describe the risk and potential harm", "Score current likelihood and impact", "Assign controls, owner and review"]} />
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <Section title="Risk identification"><div className="grid gap-4 md:grid-cols-2">
      <Field label="Risk reference" hint="auto-generated if blank"><input name="reference" className={cls} defaultValue={initial?.reference} readOnly={Boolean(initial)} /></Field>
      <Field label="Category"><select name="category" className={cls} defaultValue={initial?.category ?? "Operational"}>{RISK_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Risk title" wide><input name="title" className={cls} defaultValue={initial?.title} minLength={3} required placeholder="For example, missed care visits during severe weather" /></Field>
      <Field label="What could happen, who could be harmed and what would the impact be?" wide><textarea name="description" className={`${cls} min-h-24`} defaultValue={initial?.description} required placeholder="Describe the uncertain event, possible cause, people or service affected and credible harm." /></Field>
      <Field label="Location"><select name="locationId" className={cls} defaultValue={initial?.locationId ?? ""}><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Risk owner"><select name="ownerId" className={cls} defaultValue={initial?.ownerId ?? ""}><option value="">Unassigned</option>{owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    </div></Section>
    <Section title="Initial assessment"><div className="grid gap-4 md:grid-cols-2">
      <Field label="Controls already in place and evidence they work" wide><textarea name="existingControls" className={`${cls} min-h-24`} defaultValue={initial?.existingControls} required placeholder="List current controls, who performs them, how often and the evidence reviewed." /></Field>
      <MatrixSelect label="Likelihood" name="likelihood" value={likelihood} setValue={setLikelihood} />
      <MatrixSelect label="Impact" name="impact" value={impact} setValue={setImpact} />
      <ScoreCard label="Initial risk" score={initialScore} level={riskLevel(initialScore)} />
    </div></Section>
    <Section title="Treatment and residual assessment"><div className="grid gap-4 md:grid-cols-2">
      <Field label="Further action needed to reduce the risk" wide><textarea name="furtherControls" className={`${cls} min-h-24`} defaultValue={initial?.furtherControls} placeholder="State the action, responsible person, expected result and evidence needed." /></Field>
      <Field label="Target date"><input name="targetDate" type="date" className={cls} defaultValue={initial?.targetDate} /></Field>
      <MatrixSelect label="Residual likelihood" name="residualLikelihood" value={residualLikelihood} setValue={setResidualLikelihood} />
      <MatrixSelect label="Residual impact" name="residualImpact" value={residualImpact} setValue={setResidualImpact} />
      <ScoreCard label="Residual risk" score={residualScore} level={riskLevel(residualScore)} />
    </div></Section>
    <Section title="Review and status"><div className="grid gap-4 md:grid-cols-2">
      <Field label="Review frequency"><select name="reviewFrequency" className={cls} defaultValue={initial?.reviewFrequency ?? "Quarterly"}>{REVIEW_FREQUENCIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Next review date"><input name="nextReviewDate" type="date" className={cls} defaultValue={defaultNextReview} required /></Field>
      <Field label="Last review date"><input name="lastReviewDate" type="date" className={cls} defaultValue={initial?.lastReviewDate} /></Field>
      <Field label="Status"><select name="status" className={cls} defaultValue={initial?.status ?? "OPEN"}>{RISK_STATUSES.map((item) => <option key={item} value={item}>{riskStatusLabel(item)}</option>)}</select></Field>
      <Field label="Closure rationale" wide><textarea name="closureRationale" className={`${cls} min-h-20`} defaultValue={initial?.closureRationale} /></Field>
      <Field label="Closure approved by"><select name="closureApprovedById" className={cls} defaultValue={initial?.closureApprovedById ?? ""}><option value="">Not approved</option>{owners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Closure date"><input name="closureDate" type="date" className={cls} defaultValue={initial?.closureDate} /></Field>
    </div></Section>
    <Section title="Supporting evidence"><p className="text-sm text-slate-500">Use Ctrl or Command to select more than one item.</p><select multiple name="evidenceIds" defaultValue={initial?.evidenceIds ?? []} className={`${cls} min-h-32`}>{evidence.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Section>
    <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : initial ? "Save risk" : "Add risk"}</button>
  </form>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="text-lg font-bold">{title}</h2><div className="mt-4">{children}</div></section>; }
function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) { return <label className={`${wide ? "md:col-span-2 " : ""}text-sm font-medium`}>{label} {hint && <span className="font-normal text-slate-500">({hint})</span>}{children}</label>; }
function MatrixSelect({ label, name, value, setValue }: { label: string; name: string; value: number; setValue: (value: number) => void }) { return <Field label={label}><select name={name} value={value} onChange={(event) => setValue(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">{[1,2,3,4,5].map((item) => <option key={item} value={item}>{item} — {item === 1 ? "Rare / negligible" : item === 2 ? "Unlikely / minor" : item === 3 ? "Possible / moderate" : item === 4 ? "Likely / major" : "Almost certain / severe"}</option>)}</select></Field>; }
function ScoreCard({ label, score, level }: { label: string; score: number; level: string }) { return <div className={`rounded-xl p-4 ${levelClasses(level)}`}><p className="text-xs font-bold uppercase tracking-wider">{label}</p><p className="mt-1 text-2xl font-black">{score} · {level}</p></div>; }
