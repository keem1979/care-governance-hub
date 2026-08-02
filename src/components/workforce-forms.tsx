"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  STAFF_COMPLIANCE_OUTCOMES,
  STAFF_COMPLIANCE_TYPES,
  STAFF_STATUSES,
  STAFF_LEAVE_TYPES,
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-semibold">Staff number and reference</p><p className="mt-1 text-slate-600">QCGMS assigns the next staff number when you save this record.</p></div>
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
        <label className="text-sm font-medium">Contracted working days per week<input className={field} name="contractedDaysPerWeek" type="number" min="0" max="7" step="0.5" defaultValue="5" /></label>
        <label className="text-sm font-medium">Annual leave entitlement (days)<input className={field} name="annualLeaveEntitlementDays" type="number" min="0" max="366" step="0.5" defaultValue="28" /></label>
        <label className="text-sm font-medium">Leave carried into this year (days)<input className={field} name="annualLeaveCarryOverDays" type="number" min="0" max="366" step="0.5" defaultValue="0" /></label>
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

export function StaffComplianceForm({ staffId, courses = [] }: { staffId: string; courses?: Array<{ id: string; title: string; suggestedRenewalMonths: number | null }> }) {
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
        <label className="text-sm font-medium md:col-span-2">Training catalogue <span className="font-normal text-slate-500">(use for training or competency records)</span><select className={field} name="trainingCourseId" defaultValue=""><option value="">Not linked to a catalogue course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}{course.suggestedRenewalMonths ? ` · suggested review ${course.suggestedRenewalMonths} months` : ""}</option>)}</select></label>
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

async function postForm(url: string, form: HTMLFormElement) {
  const response = await fetch(url, { method: "POST", body: new FormData(form) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "We couldn’t save this record.");
  return result;
}

export function StaffPhotoForm({ staffId }: { staffId: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); try { await postForm(`/api/workforce/${staffId}/photo`, event.currentTarget); router.refresh(); } catch (value) { setError(value instanceof Error ? value.message : "Could not upload the profile picture."); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="space-y-3"><label className="block text-sm font-medium">Profile picture<input className={field} name="photo" type="file" required accept="image/jpeg,image/png,image/webp" /></label><p className="text-xs text-slate-500">JPG, PNG or WebP, up to 2 MB. The picture is private and visible only to authorised workforce users.</p>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{busy ? "Uploading…" : "Upload picture"}</button></form>;
}

export function StaffDocumentForm({ staffId }: { staffId: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); try { await postForm(`/api/workforce/${staffId}/documents`, event.currentTarget); event.currentTarget.reset(); router.refresh(); } catch (value) { setError(value instanceof Error ? value.message : "Could not upload the staff document."); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Document category<select className={field} name="category" defaultValue="Recruitment"><option>Recruitment</option><option>Training</option><option>Competencies</option><option>Supervision</option><option>Certificates</option><option>Other</option></select></label><label className="text-sm font-medium">Review or expiry date<input className={field} name="reviewExpiryDate" type="date" /></label><label className="text-sm font-medium md:col-span-2">Document title<input className={field} name="title" required maxLength={180} placeholder="For example, Right to work check" /></label><label className="text-sm font-medium md:col-span-2">Private document<input className={field} name="document" required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" /></label></div><p className="text-xs text-slate-500">The upload is saved once, linked to this profile and shown automatically in the Evidence Library as restricted evidence.</p>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<button disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">{busy ? "Uploading…" : "Upload and link evidence"}</button></form>;
}

export function StaffLeaveForm({ staffId }: { staffId: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); try { await postForm(`/api/workforce/${staffId}/leave`, event.currentTarget); event.currentTarget.reset(); router.refresh(); } catch (value) { setError(value instanceof Error ? value.message : "Could not save the leave request."); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Leave or absence type<select className={field} name="type" defaultValue="ANNUAL">{STAFF_LEAVE_TYPES.map((type) => <option key={type} value={type}>{workforceLabel(type)}</option>)}</select></label><label className="text-sm font-medium">Decision<select className={field} name="status" defaultValue="PENDING"><option value="PENDING">Pending review</option><option value="APPROVED">Approved</option><option value="DECLINED">Declined</option></select></label><label className="text-sm font-medium">Start date<input className={field} name="startDate" type="date" required /></label><label className="text-sm font-medium">End date<input className={field} name="endDate" type="date" required /></label><label className="text-sm font-medium">Working days requested <span className="font-normal text-slate-500">(optional; weekdays calculated if blank)</span><input className={field} name="requestedDays" type="number" min="0.5" max="366" step="0.5" /></label><label className="text-sm font-medium">Reason or context<input className={field} name="reason" maxLength={500} /></label><label className="text-sm font-medium md:col-span-2">Manager decision note<textarea className={`${field} min-h-20`} name="managerNote" maxLength={1000} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="fitNoteReceived" /> Fit note received, where applicable</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="returnToWorkCompleted" /> Return-to-work conversation completed</label></div><p className="text-xs text-slate-500">This records the organisation’s decision and balance. It does not calculate statutory pay or determine legal entitlement.</p>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<button disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">{busy ? "Saving…" : "Save leave record"}</button></form>;
}

export function TrainingAssignmentForm({ staff, courses }: { staff: Array<{ id: string; name: string }>; courses: Array<{ id: string; title: string }> }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); try { await postForm("/api/workforce/training/assignments", event.currentTarget); event.currentTarget.reset(); router.refresh(); } catch (value) { setError(value instanceof Error ? value.message : "Could not assign training."); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]"><label className="text-sm font-medium">Staff member<select className={field} name="staffMemberId" required defaultValue=""><option value="">Choose worker</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-medium">Course or competency<select className={field} name="trainingCourseId" required defaultValue=""><option value="">Choose requirement</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-sm font-medium">Required by<input className={field} name="requiredBy" type="date" /></label><button disabled={busy} className="mt-6 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">{busy ? "Assigning…" : "Assign"}</button>{error ? <p role="alert" className="text-sm text-red-700 md:col-span-4">{error}</p> : null}</form>;
}
