"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveProfileDetails,
  saveProfileServices,
  submitDescription,
} from "@/app/actions/portal-profile";
import type { ActionState } from "@/app/actions/admin-content";
import { IMAGE_ACCEPT } from "@/components/admin/MediaField";
import { IdListEditor, RepeatableEditor } from "@/components/admin/RepeatableEditor";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function Result({ state }: { state: ActionState }) {
  if (state.status === "ok") {
    return (
      <p className="form-success">
        <Check size={18} />
        {state.message}
      </p>
    );
  }
  if (state.status === "error") return <p className="form-error">{state.message}</p>;
  return null;
}

export type ProfileDetails = {
  phone: string;
  website: string;
  email: string;
  addressLine: string;
  postalCode: string;
  licenseNumber: string;
  insured: boolean;
  hours: Record<string, string>[];
};

export function DetailsForm({ businessId, details }: { businessId: string; details: ProfileDetails }) {
  const [state, action, pending] = useActionState(saveProfileDetails, initial);

  return (
    <form action={action}>
      <input type="hidden" name="businessId" value={businessId} />
      <Result state={state} />

      <div className="field-row">
        <div className="field">
          <label htmlFor="pf-phone">Phone</label>
          <input id="pf-phone" name="phone" type="tel" defaultValue={details.phone} />
        </div>
        <div className="field">
          <label htmlFor="pf-email">Public email</label>
          <input id="pf-email" name="email" type="email" defaultValue={details.email} />
          <p className="field__hint">Shown on your profile. Leads still go to your account email.</p>
        </div>
      </div>

      <div className="field">
        <label htmlFor="pf-website">Website</label>
        <input id="pf-website" name="website" type="text" placeholder="example.com" defaultValue={details.website} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="pf-address">Address</label>
          <input id="pf-address" name="addressLine" type="text" defaultValue={details.addressLine} />
        </div>
        <div className="field">
          <label htmlFor="pf-postal">Postal code</label>
          <input id="pf-postal" name="postalCode" type="text" defaultValue={details.postalCode} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="pf-licence">Licence number</label>
          <input id="pf-licence" name="licenseNumber" type="text" defaultValue={details.licenseNumber} />
        </div>
        <label className="radio-row" style={{ padding: "10px 14px", alignSelf: "end" }}>
          <input type="checkbox" name="insured" defaultChecked={details.insured} />
          <span>
            <strong>Insured</strong>
            <span>Tick only if you hold current liability insurance.</span>
          </span>
        </label>
      </div>

      <fieldset className="fieldset">
        <legend>Opening hours</legend>
        <RepeatableEditor
          name="hours"
          summaryKey="day"
          addLabel="Add a day"
          emptyLabel="No hours on your profile."
          fields={[
            {
              key: "day",
              label: "Day",
              type: "select",
              width: "half",
              options: DAYS.map((day) => ({ value: day, label: day })),
            },
            {
              key: "closed",
              label: "Closed",
              type: "select",
              width: "half",
              options: [
                { value: "no", label: "Open" },
                { value: "yes", label: "Closed all day" },
              ],
            },
            { key: "opens", label: "Opens", width: "half", placeholder: "07:00" },
            { key: "closes", label: "Closes", width: "half", placeholder: "18:00" },
          ]}
          initial={details.hours}
        />
      </fieldset>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

type Option = { id: string; label: string; group?: string };

export function ServicesForm({
  businessId,
  serviceOptions,
  areaOptions,
  services,
  areas,
}: {
  businessId: string;
  serviceOptions: Option[];
  areaOptions: Option[];
  services: string[];
  areas: string[];
}) {
  const [state, action, pending] = useActionState(saveProfileServices, initial);

  return (
    <form action={action}>
      <input type="hidden" name="businessId" value={businessId} />
      <Result state={state} />
      <IdListEditor
        name="services"
        label="Services you offer"
        options={serviceOptions}
        initial={services}
        hint="Decides which service pages list you."
      />
      <IdListEditor
        name="areas"
        label="Areas you serve"
        options={areaOptions}
        initial={areas}
        hint="The first one you tick is your main area. Need a place that isn't listed? Email us."
      />
      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save services and areas"}
      </button>
    </form>
  );
}

export function DescriptionForm({
  businessId,
  current,
  draft,
}: {
  businessId: string;
  current: string;
  draft: string;
}) {
  const [state, action, pending] = useActionState(submitDescription, initial);

  return (
    <form action={action}>
      <input type="hidden" name="businessId" value={businessId} />
      <Result state={state} />
      <div className="field">
        <label htmlFor="pf-description">Description</label>
        <textarea id="pf-description" name="description" rows={9} defaultValue={draft || current} />
        <p className="field__hint">
          What you do, where, and for whom. An editor reads it before it goes live.
        </p>
      </div>
      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Sending…" : "Send for review"}
      </button>
    </form>
  );
}

/** Posts one image to the owner upload route, which attaches it to the listing. */
export function UploadButton({
  businessId,
  target,
  label,
}: {
  businessId: string;
  target: "photo" | "logo";
  label: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("businessId", businessId);
        body.append("target", target);
        const response = await fetch("/api/portal/media/", { method: "POST", body });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setError(result.error ?? "The upload failed.");
          break;
        }
      } catch {
        setError("The upload failed. Check the connection and try again.");
        break;
      }
      if (target === "logo") break;
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple={target === "photo"}
        hidden
        onChange={(event) => upload(event.target.files)}
      />
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? "Uploading…" : label}
      </button>
      <p className="field__hint">JPEG, PNG, WebP, AVIF or GIF, up to 20 MB.</p>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
