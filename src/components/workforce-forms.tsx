"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  STAFF_COMPLIANCE_OUTCOMES,
  STAFF_COMPLIANCE_TYPES,
  STAFF_STATUSES,
  workforceLabel,
} from "@/lib/workforce";
import { FormPurpose } from "@/components/form-purpose";

type Option = { id: string; name: string };

const field =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";

export function StaffMemberForm({ locations }: { locations: Option[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/workforce", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not add the staff record.");
      setBusy(false);
      return;
    }
    router.push(`/workforce/${result.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <FormPurpose title="Staff compliance profile" description="Create one workforce profile using an internal employee reference. Add recruitment checks, training, competencies, supervision and appraisal records after saving." steps={["Identify the worker and role", "Assign their service and manager", "Add dated compliance records"]} />
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">
          Employee reference
          <input className={field} name="employeeReference" required maxLength={40} />
        </label>
        <label className="text-sm font-medium">
          Service location
          <select className={field} name="locationId" defaultValue="">
            <option value="">Organisation-wide</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          First name
          <input className={field} name="firstName" required maxLength={80} />
        </label>
        <label className="text-sm font-medium">
          Last name
          <input className={field} name="lastName" required maxLength={80} />
        </label>
        <label className="text-sm font-medium">
          Preferred name
          <input className={field} name="preferredName" maxLength={80} />
        </label>
        <label className="text-sm font-medium">
          Work email
          <input className={field} name="workEmail" type="email" maxLength={160} />
        </label>
        <label className="text-sm font-medium">
          Work phone
          <input className={field} name="workPhone" type="tel" maxLength={40} />
        </label>
        <label className="text-sm font-medium">
          Job title
          <input className={field} name="jobTitle" required maxLength={120} />
        </label>
        <label className="text-sm font-medium">
          Department
          <input className={field} name="department" maxLength={120} />
        </label>
        <label className="text-sm font-medium">
          Employment type
          <select className={field} name="employmentType" defaultValue="Permanent"><option>Permanent</option><option>Fixed-term</option><option>Bank</option><option>Agency</option><option>Volunteer</option><option>Other</option></select>
        </label>
        <label className="text-sm font-medium">
          Start date
          <input className={field} name="startDate" type="date" />
        </label>
        <label className="text-sm font-medium">
          Employment status
          <select className={field} name="employmentStatus" defaultValue="ACTIVE">
            {STAFF_STATUSES.map((status) => (
              <option key={status} value={status}>
                {workforceLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Line manager
          <input className={field} name="lineManager" maxLength={120} />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Notes
          <textarea className={`${field} min-h-24`} name="notes" maxLength={2000} />
        </label>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Keep this record proportionate. Do not enter copies of identity documents,
        health details or other unnecessary personal information in notes.
      </p>
      <button
        disabled={busy}
        className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Add staff record"}
      </button>
    </form>
  );
}

export function StaffComplianceForm({ staffId }: { staffId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const response = await fetch(`/api/workforce/${staffId}/records`, {
      method: "POST",
      body: new FormData(form),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Could not add the compliance record.");
      setBusy(false);
      return;
    }
    form.reset();
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormPurpose title="Dated staff compliance record" description="Add one real check, course, competency observation, supervision or appraisal result. Use its actual completion, expiry and next-due dates." steps={["Choose the exact record type", "Record outcome and source", "Set expiry or next review"]} />
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">
          Record type
          <select className={field} name="type" defaultValue="TRAINING">
            {STAFF_COMPLIANCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {workforceLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Outcome
          <select className={field} name="outcome" defaultValue="VALID">
            {STAFF_COMPLIANCE_OUTCOMES.map((outcome) => (
              <option key={outcome} value={outcome}>
                {workforceLabel(outcome)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Title
          <input
            className={field}
            name="title"
            required
            minLength={3}
            placeholder="e.g. Moving and handling competency"
          />
        </label>
        <label className="text-sm font-medium">
          Certificate or check reference
          <input className={field} name="reference" maxLength={120} />
        </label>
        <label className="text-sm font-medium">
          Assessor or issuing body
          <input className={field} name="assessor" maxLength={120} />
        </label>
        <label className="text-sm font-medium">
          Completed or checked date
          <input className={field} name="completedDate" type="date" />
        </label>
        <label className="text-sm font-medium">
          Expiry date
          <input className={field} name="expiryDate" type="date" />
        </label>
        <label className="text-sm font-medium">
          Next supervision, appraisal or assessment
          <input className={field} name="nextDueDate" type="date" />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Notes and development action
          <textarea className={`${field} min-h-20`} name="notes" maxLength={2000} />
        </label>
      </div>
      <button
        disabled={busy}
        className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Add compliance record"}
      </button>
    </form>
  );
}
