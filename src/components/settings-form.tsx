"use client";
import { useActionState, useState } from "react";
import { saveSettings } from "@/app/admin/actions";
import { configTextFields, type RecruitmentConfig } from "@/lib/recruitment-config";
import { tryoutModes } from "@/lib/clan";

export function SettingsForm({ initial, revision, readOnly = false }: { initial: RecruitmentConfig; revision: number; readOnly?: boolean }) {
  const [content, setContent] = useState(initial);
  const [state, action, pending] = useActionState(saveSettings, { message: "", revision });
  const disabled = readOnly || pending;
  return <form action={action} className="admin-form">
    <input type="hidden" name="content" value={JSON.stringify(content)} />
    <input type="hidden" name="revision" value={state.revision} />
    <p className="muted">All text below is intended for public pages after publication. Keep private applicant information out of these settings. Blank fields appear as awaiting confirmation.</p>
    <fieldset disabled={disabled}><legend>Community & recruitment policies</legend><div className="form-grid">{configTextFields.map(([key, label]) => <label className="field" key={key} htmlFor={key}>{label}{key === "serverRegion" || key.endsWith("Url") ? <input id={key} type={key.endsWith("Url") ? "url" : "text"} maxLength={key.endsWith("Url") ? 500 : 120} value={content[key]} onChange={event => setContent({ ...content, [key]: event.target.value })} /> : <textarea id={key} maxLength={2000} value={content[key]} onChange={event => setContent({ ...content, [key]: event.target.value })} />}</label>)}</div></fieldset>
    {tryoutModes.map(mode => <fieldset key={mode.id} disabled={disabled}><legend>{mode.name}</legend><label className="field check-field"><input type="checkbox" checked={content.modes[mode.id].approved} onChange={event => setContent({ ...content, modes: { ...content.modes, [mode.id]: { ...content.modes[mode.id], approved: event.target.checked } } })} />Rules approved for publication</label><div className="form-grid">{([['description', 'Mode introduction'], ['rules', 'Evaluation rules and score thresholds']] as const).map(([key, label]) => <label className="field" key={key}>{label}<textarea maxLength={2000} value={content.modes[mode.id][key]} onChange={event => setContent({ ...content, modes: { ...content.modes, [mode.id]: { ...content.modes[mode.id], [key]: event.target.value } } })} /></label>)}<label className="field">Approved maps (one per line)<textarea maxLength={3030} value={content.modes[mode.id].maps.join("\n")} onChange={event => setContent({ ...content, modes: { ...content.modes, [mode.id]: { ...content.modes[mode.id], maps: event.target.value.split("\n") } } })} /></label></div><p className="muted">Unapproved mode rules and maps stay hidden from visitors. Enter only confirmed CrossFire information.</p></fieldset>)}
    <div aria-live="polite" aria-atomic="true">{state.message && <p className="form-message" role={state.success ? "status" : "alert"}>{state.message}</p>}</div>
    {!readOnly && <div className="sticky-actions"><p className="muted">Revision {state.revision}. Publishing updates the site immediately. Saving a draft does not change public content.</p><div className="actions"><button className="button secondary" name="intent" value="draft" disabled={pending}>Save draft</button><button className="button" name="intent" value="publish" disabled={pending}>Save & publish</button><button className="button secondary" name="intent" value="unpublish" disabled={pending}>Unpublish settings</button></div>{pending && <p role="status">Saving settings…</p>}</div>}
  </form>;
}
