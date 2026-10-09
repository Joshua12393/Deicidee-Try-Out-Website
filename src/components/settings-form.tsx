"use client";
import { useActionState, useState } from "react";
import { saveSettings, type SettingsState } from "@/app/admin/actions";
import { configTextFields, type RecruitmentConfig } from "@/lib/recruitment-config";
import { tryoutModes } from "@/lib/clan";

const groups = [
  { title: "Community & eligibility", description: "Official links, server and rank requirements.", keys: ["serverRegion", "rankScheme", "discordUrl", "facebookUrl"] },
  { title: "Application & privacy", description: "What applicants share and how their information is handled.", keys: ["applicationFields", "discordRequirement", "retentionPolicy", "correctionContact"] },
  { title: "Retries & joining", description: "After-tryout steps, clan names and Facebook requirements.", keys: ["retryPolicy", "ccnRequirement", "mainFacebookRequirement"] },
] as const;

export function SettingsForm({ initial, revision, readOnly = false, staff = false, baseRevision = 0, latestRevision = 0, latest, requestKey = "" }: { initial: RecruitmentConfig; revision: number; readOnly?: boolean; staff?: boolean; baseRevision?: number; latestRevision?: number; latest?: RecruitmentConfig; requestKey?: string }) {
  const [content, setContent] = useState(initial);
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, { message: "", revision });
  const [base, setBase] = useState(baseRevision);
  const [identity] = useState(state.requestKey ?? requestKey);
  const disabled = readOnly || pending;
  return <form action={action} className="admin-form settings-editor">
    <input type="hidden" name="content" value={JSON.stringify(content)} />
    <input type="hidden" name="revision" value={state.revision} />
    {staff && <><input type="hidden" name="base_revision" value={base} /><input type="hidden" name="request_key" value={state.requestKey ?? identity} /><p className="notice">Staff can edit and save a private draft. Publication requires an admin to review and approve your request.</p>{latest && <div className="draft-refresh"><p className="muted">{base !== latestRevision ? "The clan settings changed since this draft started." : "Need a fresh starting point?"} Keep a copy of any edits you want to retain.</p><button type="button" className="button secondary button-small" disabled={pending} onClick={() => { setContent(latest); setBase(latestRevision); }}>Replace draft with latest settings</button></div>}</>}
    <div className="settings-intro"><div><h2>{readOnly ? "Recruitment requirements" : "Edit recruitment rules"}</h2><p>{readOnly ? "Browse the saved settings. An admin manages changes and publication." : "Choose a section below. Save a draft to continue later, or publish when the rules are ready."}</p></div><span className="settings-badge">{readOnly ? "View only" : "Draft editor"}</span></div>
    <p className="muted">These are saved settings; the public guide uses the last published version. Keep private applicant details out of this editor.</p>
    <h3 className="settings-group-title">Tryout modes</h3>
    {tryoutModes.map((mode, index) => <details className="settings-section" key={mode.id} open={index === 0}>
      <summary><span><strong>{mode.name}</strong><small>Introduction, evaluation rules and approved maps</small></span><span className="settings-badge">{content.modes[mode.id].approved ? "Approved in draft" : "Not approved"}</span></summary>
      <fieldset disabled={disabled}><legend className="sr-only">{mode.name} settings</legend>
        <label className="check-field approval-field"><input type="checkbox" checked={content.modes[mode.id].approved} onChange={event => setContent({ ...content, modes: { ...content.modes, [mode.id]: { ...content.modes[mode.id], approved: event.target.checked } } })} /><span>Rules approved for publication<small>Unapproved rules and maps stay hidden from visitors.</small></span></label>
        <div className="form-grid">{([['description', 'Mode introduction'], ['rules', 'Evaluation rules and score thresholds']] as const).map(([key, label]) => <label className={`field ${key === 'rules' ? 'rules-field' : ''}`} key={key}>{label}<textarea maxLength={2000} value={content.modes[mode.id][key]} onChange={event => setContent({ ...content, modes: { ...content.modes, [mode.id]: { ...content.modes[mode.id], [key]: event.target.value } } })} /></label>)}<label className="field">Approved maps<textarea maxLength={3030} value={content.modes[mode.id].maps.join("\n")} onChange={event => setContent({ ...content, modes: { ...content.modes, [mode.id]: { ...content.modes[mode.id], maps: event.target.value.split("\n") } } })} /><span className="muted">One confirmed map per line.{mode.id === "tdm" && " TDM applicants do not need to select a map."}</span></label></div>
      </fieldset>
    </details>)}
    <h3 className="settings-group-title">Community & policies</h3>
    {groups.map(group => <details className="settings-section" key={group.title}>
      <summary><span><strong>{group.title}</strong><small>{group.description}</small></span></summary>
      <fieldset disabled={disabled}><legend className="sr-only">{group.title}</legend><div className="form-grid">{configTextFields.filter(([key]) => (group.keys as readonly string[]).includes(key)).map(([key, label]) => <label className="field" key={key} htmlFor={key}>{label}{key === "serverRegion" || key.endsWith("Url") ? <input id={key} type={key.endsWith("Url") ? "url" : "text"} maxLength={key.endsWith("Url") ? 500 : 120} value={content[key]} onChange={event => setContent({ ...content, [key]: event.target.value })} /> : <textarea id={key} maxLength={2000} value={content[key]} onChange={event => setContent({ ...content, [key]: event.target.value })} />}</label>)}</div></fieldset>
    </details>)}
    <div aria-live="polite" aria-atomic="true">{state.message && <p className="form-message" role={state.success ? "status" : "alert"}>{state.message}</p>}</div>
    {!readOnly && <><div className="settings-save"><p>{staff ? "Save privately, then submit a fixed copy for admin review. Editing your draft later will not change that request." : "Drafts stay private. Publishing updates the public guide and pauses applications."}</p><div className="actions"><button className="button secondary" name="intent" value="draft" disabled={pending}>Save draft</button><button className="button" name="intent" value={staff ? "request" : "publish"} disabled={pending || (staff && base !== latestRevision)}>{staff ? "Submit for review" : "Save & publish"}</button></div>{pending && <p role="status">Saving settings…</p>}</div>{!staff && <details className="settings-withdraw"><summary>Remove the published guide</summary><p>Your saved draft is retained. Visitors will see that requirements are awaiting publication, and applications will close.</p><button className="button secondary" name="intent" value="unpublish" formNoValidate disabled={pending}>Unpublish settings</button></details>}</>}
  </form>;
}
