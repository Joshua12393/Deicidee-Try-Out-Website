"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { submitApplication } from "@/app/apply/actions";
import type { RecruitmentConfig } from "@/lib/recruitment-config";
import type { ApplicationState } from "@/lib/application";

const fields = [
  ["ign", "In-game name (IGN)", true, 100], ["discord_name", "Discord contact", true, 100],
  ["first_name", "First name (optional)", false, 100], ["last_name", "Last name (optional)", false, 100],
  ["rank", "CrossFire rank (optional)", false, 100], ["previous_clan", "Previous clan (optional; None allowed)", false, 150],
  ["facebook_url", "Main Facebook link (optional)", false, 500], ["reason", "Why do you want to join?", true, 2000],
] as const;
const labels = { tdm: "TDM", zm_hmx: "ZM HMX", escape: "Escape" };
export function ApplicationForm({ config, revision, submissionKey, enabled }: { config: RecruitmentConfig; revision: number; submissionKey: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<ApplicationState, FormData>(submitApplication, { message: "" });
  const [values, setValues] = useState<Record<string, string>>(state.values ?? { mode: "", selected_map: "" });
  const [consent, setConsent] = useState(state.consent ?? false);
  // A server rerender must not turn an uncertain save into a new submission.
  const [identity] = useState({ submissionKey: state.submissionKey ?? submissionKey, revision: state.revision ?? revision });
  const mode = values.mode as keyof typeof labels;
  const update = (name: string, value: string) => setValues(current => ({ ...current, [name]: value }));
  const error = (name: string) => state.errors?.[name] ? <span id={`error-${name}`} className="field-error">{state.errors[name]}</span> : null;
  if (state.reference) return <section className="panel section" role="status"><p className="eyebrow">Application received</p><h2>Keep your reference.</h2><p className="application-reference">{state.reference}</p><p>Your application was saved. Save this reference and contact the clan through Discord for coordination. An application does not guarantee a tryout or membership.</p>{config.discordUrl && <a className="button" href={config.discordUrl} target="_blank" rel="noopener noreferrer">Open Discord ↗</a>}</section>;
  return <section className="panel section"><h2>Choose your tryout.</h2><p>Required: IGN, Discord contact, reason, one mode, and acknowledgement. Other player details are optional.</p>
    {!enabled && <p className="notice">Applications are closed. You can review this form, but submission is disabled.</p>}
    <form action={action} className="application-form">
      <input type="hidden" name="submission_key" value={identity.submissionKey} /><input type="hidden" name="revision" value={identity.revision} />
      <label className="form-trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <fieldset disabled={pending}><legend>Player details</legend><div className="form-grid">{fields.map(([name, label, required, max]) => <label className="field" key={name}>{label}{required && " *"}
        {name === "reason" ? <textarea name={name} value={values[name] ?? ""} onChange={event => update(name, event.target.value)} required maxLength={max} aria-invalid={Boolean(state.errors?.[name])} aria-describedby={state.errors?.[name] ? `error-${name}` : undefined} /> : <input name={name} type={name === "facebook_url" ? "url" : "text"} value={values[name] ?? ""} onChange={event => update(name, event.target.value)} required={required} maxLength={max} aria-invalid={Boolean(state.errors?.[name])} aria-describedby={state.errors?.[name] ? `error-${name}` : undefined} />}{error(name)}</label>)}</div></fieldset>
      <fieldset disabled={pending} aria-describedby={state.errors?.mode ? "error-mode" : undefined}><legend>Exactly one mode *</legend><div className="grid-three">{Object.entries(labels).map(([id, label]) => {
        const available = config.modes[id as keyof typeof labels].approved && (id === "tdm" || config.modes[id as keyof typeof labels].maps.length > 0);
        return <label className="mode-choice" key={id}><input type="radio" name="mode" value={id} checked={values.mode === id} disabled={!available} required onChange={() => setValues(current => ({ ...current, mode: id, selected_map: "" }))} /><span>{label}{!available && <small>Awaiting published maps / approval</small>}</span></label>;
      })}</div>{error("mode")}
      {mode && mode !== "tdm" ? <label className="field">Choose an approved map *<select name="selected_map" value={values.selected_map} required onChange={event => update("selected_map", event.target.value)} aria-invalid={Boolean(state.errors?.selected_map)} aria-describedby={state.errors?.selected_map ? "error-selected_map" : undefined}><option value="">Select a map</option>{config.modes[mode].maps.map(map => <option key={map} value={map}>{map}</option>)}</select>{error("selected_map")}</label> : <input type="hidden" name="selected_map" value="" />}
      {mode && <p className="preserve-lines">{config.modes[mode].rules}</p>}</fieldset>
      <fieldset disabled={pending}><legend>Before submitting</legend><p className="preserve-lines">{config.discordRequirement || "Discord sharing requirements await publication."}</p><p className="preserve-lines">{config.retentionPolicy || "Retention policy awaits publication."}</p><p className="preserve-lines">{config.correctionContact || "Correction and deletion contact awaits publication."}</p><label className="check-field"><input type="checkbox" name="consent" checked={consent} onChange={event => setConsent(event.target.checked)} required aria-invalid={Boolean(state.errors?.consent)} aria-describedby={state.errors?.consent ? "error-consent" : undefined} /><span>I have read the <Link href="/privacy" className="text-link" target="_blank">privacy notice ↗</Link> and selected mode rules, and agree to live Discord gameplay sharing during my tryout. *</span></label>{error("consent")}</fieldset>
      {state.message && <p className="form-message" role="status" aria-live="polite">{state.message}</p>}<button className="button" disabled={pending || !enabled}>{pending ? "Submitting…" : "Submit application ↗"}</button>
    </form></section>;
}
