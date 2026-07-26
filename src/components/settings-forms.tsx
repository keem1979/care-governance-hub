"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  PERMISSION_GROUPS,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/permissions";
import {
  MAX_LICENCE_SEATS,
  MEMBER_ACCESS_MODES,
  MEMBER_STATUSES,
  settingLabel,
} from "@/lib/settings";

type Option = { id: string; name: string };
type Role = Option & {
  key: string;
  permissionKeys: string[];
  description?: string;
};
type SubmitState = {
  submit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  busy: boolean;
  message: string;
};

function useSubmit(endpoint: string, method: "POST" | "PATCH") {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    const response = await fetch(endpoint, {
      method,
      body: new FormData(form),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error ?? "The change could not be saved.");
      setBusy(false);
      return;
    }
    if (method === "POST") form.reset();
    setMessage(result.message ?? "Saved.");
    router.refresh();
    setBusy(false);
  }

  return { submit, busy, message };
}

export function OrganisationForm({ name }: { name: string }) {
  const state = useSubmit("/api/settings/organisation", "PATCH");
  return (
    <form onSubmit={state.submit} className="space-y-3">
      <label className="block text-sm font-medium">
        Organisation name
        <input
          name="name"
          defaultValue={name}
          required
          minLength={3}
          className={field}
        />
      </label>
      <Save state={state} />
    </form>
  );
}

export function LicenceForm({
  seats,
  activeUsers,
}: {
  seats: number;
  activeUsers: number;
}) {
  const state = useSubmit("/api/settings/licensing", "PATCH");
  const available = Math.max(0, seats - activeUsers);
  return (
    <form onSubmit={state.submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Purchased licences" value={seats} />
        <Stat label="Active users" value={activeUsers} />
        <Stat label="Available licences" value={available} />
      </div>
      <label className="block max-w-sm text-sm font-medium">
        Number of user licences
        <input
          className={field}
          defaultValue={seats}
          max={MAX_LICENCE_SEATS}
          min={Math.max(1, activeUsers)}
          name="licenceSeats"
          required
          type="number"
        />
      </label>
      <p className="max-w-3xl text-sm leading-6 text-slate-600">
        Every active user uses one licence. Increasing this number increases the
        subscription quantity; reducing it is only possible after enough users
        have been deactivated. Payment collection will be connected to the
        organisation’s billing provider before commercial launch.
      </p>
      <Save state={state} label="Update licence quantity" />
    </form>
  );
}

export function NewLocationForm() {
  const state = useSubmit("/api/settings/locations", "POST");
  return (
    <form onSubmit={state.submit} className="grid gap-3 md:grid-cols-2">
      <label className="text-sm font-medium">
        Location name
        <input name="name" required minLength={3} className={field} />
      </label>
      <label className="text-sm font-medium">
        Code
        <input name="code" required minLength={2} maxLength={16} className={field} />
      </label>
      <label className="text-sm font-medium md:col-span-2">
        Address
        <input name="addressLine1" className={field} />
      </label>
      <label className="text-sm font-medium">
        Town
        <input name="town" className={field} />
      </label>
      <label className="text-sm font-medium">
        Postcode
        <input name="postcode" className={field} />
      </label>
      <div className="md:col-span-2">
        <Save state={state} label="Add location" />
      </div>
    </form>
  );
}

export function LocationForm({
  location,
}: {
  location: {
    id: string;
    name: string;
    code: string;
    addressLine1: string | null;
    town: string | null;
    postcode: string | null;
    isActive: boolean;
  };
}) {
  const state = useSubmit(`/api/settings/locations/${location.id}`, "PATCH");
  return (
    <form onSubmit={state.submit} className="grid gap-3 md:grid-cols-2">
      <label className="text-sm font-medium">
        Name
        <input name="name" defaultValue={location.name} required className={field} />
      </label>
      <label className="text-sm font-medium">
        Code
        <input name="code" defaultValue={location.code} required className={field} />
      </label>
      <label className="text-sm font-medium md:col-span-2">
        Address
        <input
          name="addressLine1"
          defaultValue={location.addressLine1 ?? ""}
          className={field}
        />
      </label>
      <label className="text-sm font-medium">
        Town
        <input name="town" defaultValue={location.town ?? ""} className={field} />
      </label>
      <label className="text-sm font-medium">
        Postcode
        <input name="postcode" defaultValue={location.postcode ?? ""} className={field} />
      </label>
      <input type="hidden" name="intent" value="update" />
      <div className="flex items-center gap-4 md:col-span-2">
        <Save state={state} />
        <button
          type="button"
          disabled={state.busy}
          onClick={(event) => {
            const form = event.currentTarget.form!;
            (form.elements.namedItem("intent") as HTMLInputElement).value =
              location.isActive ? "archive" : "restore";
            form.requestSubmit();
          }}
          className="text-sm font-semibold text-red-700"
        >
          {location.isActive ? "Archive location" : "Restore location"}
        </button>
      </div>
    </form>
  );
}

export function NewMemberForm({
  roles,
  locations,
  managers,
  availableLicences,
}: {
  roles: Role[];
  locations: Option[];
  managers: Option[];
  availableLicences: number;
}) {
  const state = useSubmit("/api/settings/members", "POST");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const selectedRole = roles.find((role) => role.id === roleId);
  const [permissionKeys, setPermissionKeys] = useState<string[]>(
    selectedRole?.permissionKeys ?? [],
  );
  const [accessMode, setAccessMode] = useState<"STANDARD" | "READ_ONLY">(
    "STANDARD",
  );

  function chooseRole(nextRoleId: string) {
    setRoleId(nextRoleId);
    setPermissionKeys(
      roles.find((role) => role.id === nextRoleId)?.permissionKeys ?? [],
    );
  }

  return (
    <form onSubmit={state.submit} className="space-y-6">
      {availableLicences < 1 ? (
        <Notice>
          All purchased licences are in use. Increase the licence quantity before
          adding another active user.
        </Notice>
      ) : null}
      <StructureFields
        roles={roles}
        managers={managers}
        roleId={roleId}
        onRoleChange={chooseRole}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">
          Full name
          <input name="name" required minLength={2} className={field} />
        </label>
        <label className="text-sm font-medium">
          Email
          <input name="email" type="email" required className={field} />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Temporary password
          <input
            name="temporaryPassword"
            type="password"
            autoComplete="new-password"
            className={field}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Required only for a new account; at least 12 characters, mixed case
            and a number.
          </span>
        </label>
      </div>
      <AccessMode value={accessMode} onChange={setAccessMode} />
      <PermissionChecklist
        accessMode={accessMode}
        selected={permissionKeys}
        onChange={setPermissionKeys}
      />
      <LocationAccess locations={locations} />
      <input type="hidden" name="permissionsSubmitted" value="on" />
      <Save
        state={state}
        label="Add user"
        disabled={availableLicences < 1}
      />
    </form>
  );
}

export function MemberForm({
  membership,
  roles,
  locations,
  managers,
  currentUserId,
}: {
  membership: {
    id: string;
    user: { id: string; name: string; email: string };
    roleId: string;
    status: string;
    accessMode: "STANDARD" | "READ_ONLY";
    jobTitle: string | null;
    department: string | null;
    reportsToId: string | null;
    allLocations: boolean;
    locations: { locationId: string }[];
    permissionKeys: string[];
  };
  roles: Role[];
  locations: Option[];
  managers: Option[];
  currentUserId: string;
}) {
  const state = useSubmit(`/api/settings/members/${membership.id}`, "PATCH");
  const self = membership.user.id === currentUserId;
  const [roleId, setRoleId] = useState(membership.roleId);
  const [accessMode, setAccessMode] = useState(membership.accessMode);
  const [permissionKeys, setPermissionKeys] = useState(membership.permissionKeys);

  function chooseRole(nextRoleId: string) {
    setRoleId(nextRoleId);
    setPermissionKeys(
      roles.find((role) => role.id === nextRoleId)?.permissionKeys ?? [],
    );
  }

  return (
    <form onSubmit={state.submit} className="space-y-6">
      <input name="intent" type="hidden" value="update" />
      <input name="permissionsSubmitted" type="hidden" value="on" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">
            {membership.user.name}
            {self ? " (you)" : ""}
          </h3>
          <p className="text-sm text-slate-500">{membership.user.email}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            membership.status === "ACTIVE"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {settingLabel(membership.status)}
        </span>
      </div>
      <fieldset disabled={self || state.busy} className="space-y-6">
        <StructureFields
          roles={roles}
          managers={managers.filter(({ id }) => id !== membership.id)}
          roleId={roleId}
          onRoleChange={chooseRole}
          initial={{
            jobTitle: membership.jobTitle,
            department: membership.department,
            reportsToId: membership.reportsToId,
          }}
        />
        <label className="block max-w-sm text-sm font-medium">
          Account status
          <select name="status" defaultValue={membership.status} className={field}>
            {MEMBER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {settingLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <AccessMode value={accessMode} onChange={setAccessMode} />
        <PermissionChecklist
          accessMode={accessMode}
          selected={permissionKeys}
          onChange={setPermissionKeys}
        />
        <LocationAccess
          locations={locations}
          initialAll={membership.allLocations}
          initialLocationIds={membership.locations.map(({ locationId }) => locationId)}
        />
      </fieldset>
      {self ? (
        <>
          <input name="roleId" type="hidden" value={membership.roleId} />
          <input name="status" type="hidden" value={membership.status} />
          <input name="accessMode" type="hidden" value={membership.accessMode} />
          <input name="jobTitle" type="hidden" value={membership.jobTitle ?? ""} />
          <input name="department" type="hidden" value={membership.department ?? ""} />
          <input name="reportsToId" type="hidden" value={membership.reportsToId ?? ""} />
          {membership.permissionKeys.map((key) => (
            <input key={key} name="permissionKeys" type="hidden" value={key} />
          ))}
          {membership.allLocations ? (
            <input name="allLocations" type="hidden" value="on" />
          ) : null}
          {membership.locations.map(({ locationId }) => (
            <input key={locationId} name="locationIds" type="hidden" value={locationId} />
          ))}
        </>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <Save state={state} disabled={self} />
        {!self ? (
          <button
            className="text-sm font-semibold text-red-700 disabled:opacity-50"
            disabled={state.busy}
            type="button"
            onClick={(event) => {
              if (
                !window.confirm(
                  `Remove ${membership.user.name}’s access? Their audit history will be kept.`,
                )
              ) {
                return;
              }
              const form = event.currentTarget.form!;
              (form.elements.namedItem("intent") as HTMLInputElement).value =
                "remove";
              form.requestSubmit();
            }}
          >
            Remove user access
          </button>
        ) : null}
      </div>
    </form>
  );
}

function StructureFields({
  roles,
  managers,
  roleId,
  onRoleChange,
  initial,
}: {
  roles: Role[];
  managers: Option[];
  roleId: string;
  onRoleChange: (roleId: string) => void;
  initial?: {
    jobTitle: string | null;
    department: string | null;
    reportsToId: string | null;
  };
}) {
  return (
    <section>
      <div>
        <h4 className="font-bold">Organisation structure</h4>
        <p className="text-sm text-slate-600">
          Start with the person’s organisational role, then tailor their access.
        </p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">
          Structural role
          <select
            name="roleId"
            required
            className={field}
            value={roleId}
            onChange={(event) => onRoleChange(event.target.value)}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Reports to
          <select
            name="reportsToId"
            defaultValue={initial?.reportsToId ?? ""}
            className={field}
          >
            <option value="">No reporting manager selected</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Job title
          <input
            name="jobTitle"
            defaultValue={initial?.jobTitle ?? ""}
            placeholder="For example, Registered Manager"
            className={field}
          />
        </label>
        <label className="text-sm font-medium">
          Department or team
          <input
            name="department"
            defaultValue={initial?.department ?? ""}
            placeholder="For example, Quality and Compliance"
            className={field}
          />
        </label>
      </div>
    </section>
  );
}

function AccessMode({
  value,
  onChange,
}: {
  value: "STANDARD" | "READ_ONLY";
  onChange: (value: "STANDARD" | "READ_ONLY") => void;
}) {
  return (
    <fieldset>
      <legend className="font-bold">Access level</legend>
      <p className="text-sm text-slate-600">
        Read-only access automatically blocks every create, edit and
        administration permission.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {MEMBER_ACCESS_MODES.map((mode) => (
          <label
            key={mode}
            className={`rounded-xl border p-4 ${
              value === mode
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200"
            }`}
          >
            <span className="flex items-start gap-3">
              <input
                checked={value === mode}
                name="accessMode"
                onChange={() => onChange(mode)}
                type="radio"
                value={mode}
              />
              <span>
                <strong className="block">
                  {mode === "STANDARD" ? "Standard access" : "Read only"}
                </strong>
                <span className="mt-1 block text-sm text-slate-600">
                  {mode === "STANDARD"
                    ? "Uses the permissions selected below."
                    : "Can view permitted pages but cannot change records."}
                </span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PermissionChecklist({
  selected,
  onChange,
  accessMode,
}: {
  selected: string[];
  onChange: (keys: string[]) => void;
  accessMode: "STANDARD" | "READ_ONLY";
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const readOnlyKeys = new Set<string>([
    PERMISSIONS.GOVERNANCE_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
  ]);

  function toggle(key: PermissionKey, checked: boolean) {
    const next = new Set(selectedSet);
    if (checked) next.add(key);
    else next.delete(key);
    onChange([...next]);
  }

  return (
    <section>
      <div>
        <h4 className="font-bold">Permissions</h4>
        <p className="text-sm text-slate-600">
          Ticked means access is granted. Unticked means access is blocked.
        </p>
      </div>
      <div className="mt-3 grid gap-4 xl:grid-cols-3">
        {PERMISSION_GROUPS.map((group) => (
          <fieldset
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            key={group.name}
          >
            <legend className="px-1 font-bold">{group.name}</legend>
            <p className="mb-3 text-xs leading-5 text-slate-500">
              {group.description}
            </p>
            <div className="space-y-3">
              {group.items.map((item) => {
                const disabled =
                  accessMode === "READ_ONLY" && !readOnlyKeys.has(item.key);
                return (
                  <label
                    className={`flex items-start gap-3 rounded-lg border bg-white p-3 ${
                      disabled ? "opacity-55" : ""
                    }`}
                    key={item.key}
                  >
                    <input
                      checked={!disabled && selectedSet.has(item.key)}
                      disabled={disabled}
                      name="permissionKeys"
                      onChange={(event) => toggle(item.key, event.target.checked)}
                      type="checkbox"
                      value={item.key}
                    />
                    <span>
                      <strong className="block text-sm">{item.label}</strong>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {item.detail}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}

function LocationAccess({
  locations,
  initialAll = false,
  initialLocationIds = [],
}: {
  locations: Option[];
  initialAll?: boolean;
  initialLocationIds?: string[];
}) {
  return (
    <section>
      <h4 className="font-bold">Location access</h4>
      <label className="mt-3 flex items-center gap-2 text-sm font-medium">
        <input name="allLocations" type="checkbox" defaultChecked={initialAll} />
        Access all current and future locations
      </label>
      <fieldset className="mt-3">
        <legend className="text-sm font-medium">Assigned locations</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {locations.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <input
                name="locationIds"
                value={item.id}
                type="checkbox"
                defaultChecked={initialLocationIds.includes(item.id)}
              />
              {item.name}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

function Save({
  state,
  label = "Save changes",
  disabled = false,
}: {
  state: SubmitState;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        disabled={state.busy || disabled}
        className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.busy ? "Saving…" : label}
      </button>
      {state.message ? (
        <p
          role="status"
          className={`text-sm ${
            state.message === "Saved." ||
            state.message.toLowerCase().includes("updated")
              ? "text-emerald-700"
              : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
      {children}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

const field =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100";
