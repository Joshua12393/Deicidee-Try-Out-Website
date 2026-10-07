import Link from "next/link";
import {randomUUID} from "node:crypto";
import {notFound} from "next/navigation";
import {z} from "zod";
import {requireOfficer} from "@/lib/officer-auth";
import {PageIntro} from "@/components/public-content";
import {ApplicationReviewForm} from "@/components/application-review-form";
import {manilaDate,modeLabels,statusLabel} from "@/lib/dashboard";
import {recruitmentConfigSchema} from "@/lib/recruitment-config";
export const metadata={title:"Application Review | Deicidee"};
export default async function ApplicationDetail({params}: {params:Promise<{id:string}>}){
 const {supabase,profile}=await requireOfficer(); const {id}=await params; if(!z.uuid().safeParse(id).success)notFound();
 const {data:app,error}=await supabase.from("applications").select("id,reference,ign,first_name,last_name,rank,previous_clan,facebook_url,discord_name,reason,mode,selected_map,status,onboarding,version,acknowledgement_version,acknowledged_at,created_at,submission_snapshot").eq("id",id).maybeSingle();
 if(error)throw new Error("Could not load this application.");if(!app)notFound();
 const [{data:notes,error:notesError},{data:history,error:historyError}]=await Promise.all([
  supabase.from("application_notes").select("id,body,created_at,actor:officer_profiles!actor_id(display_name)").eq("application_id",id).order("created_at",{ascending:false}).limit(100),
  supabase.from("status_history").select("id,old_status,new_status,reason,created_at,actor:officer_profiles!actor_id(display_name)").eq("application_id",id).order("created_at",{ascending:false}).limit(100)
 ]);
 if(notesError||historyError)throw new Error("Could not load notes/history. Try again later.");
 const fields=[["IGN",app.ign],["Discord",app.discord_name],["Name",[app.first_name,app.last_name].filter(Boolean).join(" ")],["Rank",app.rank],["Previous clan",app.previous_clan],["Facebook",app.facebook_url],["Mode",modeLabels[app.mode as keyof typeof modeLabels]],["Map",app.selected_map],["Status",statusLabel(app.status)],["Joining",statusLabel(app.onboarding)],["Submitted",manilaDate(app.created_at)],["Acknowledgement",`${app.acknowledgement_version} · ${manilaDate(app.acknowledged_at)}`]];
 const actorName=(actor:unknown)=>{const parsed=z.object({display_name:z.string()}).safeParse(actor);return parsed.success?parsed.data.display_name:"System / applicant";};
 const snapshot=recruitmentConfigSchema.safeParse(app.submission_snapshot);
 return <><PageIntro eyebrow="Private application review" title={app.ign}>Reference: <span className="application-reference">{app.reference}</span></PageIntro><Link className="text-link" href="/admin?tab=applications">← Applications</Link><div className="grid-two section"><section className="panel prose"><h2>Applicant details</h2><dl>{fields.map(([name,value])=><div key={name}><dt>{name}</dt><dd className="preserve-lines">{value||"Not provided"}</dd></div>)}</dl><h2>Reason for joining</h2><p className="preserve-lines">{app.reason}</p></section><div><ApplicationReviewForm id={id} version={app.version} status={app.status} admin={profile.role==="admin"} noteKey={randomUUID()}/>{app.submission_snapshot&&<details className="panel section"><summary>Rules and privacy at submission</summary><h3>Selected mode rules</h3><p className="preserve-lines">{snapshot.success?snapshot.data.modes[app.mode as keyof typeof modeLabels].rules:"Rules are unavailable for this older record."}</p>{snapshot.success&&<><h3>Discord sharing</h3><p className="preserve-lines">{snapshot.data.discordRequirement}</p><h3>Privacy and retention</h3><p className="preserve-lines">{snapshot.data.applicationFields}</p><p className="preserve-lines">{snapshot.data.retentionPolicy}</p><p className="preserve-lines">{snapshot.data.correctionContact}</p></>}</details>}</div></div><div className="grid-two section"><section className="panel"><h2>Private notes</h2>{!notes.length&&<p>No officer notes yet.</p>}{notes.map(note=><article className="history-item" key={note.id}><p className="muted">{actorName(note.actor)} · {manilaDate(note.created_at)}</p><p className="preserve-lines">{note.body}</p></article>)}{notes.length===100&&<p className="muted">Showing the latest 100 notes.</p>}</section><section className="panel"><h2>Status history</h2>{!history.length&&<p>No status events recorded.</p>}{history.map(event=><article className="history-item" key={event.id}><p>{event.old_status?`${statusLabel(event.old_status)} → `:""}{statusLabel(event.new_status)}</p><p className="muted">{actorName(event.actor)} · {manilaDate(event.created_at)}</p><p className="preserve-lines">{event.reason}</p></article>)}{history.length===100&&<p className="muted">Showing the latest 100 status events.</p>}</section></div></>;
}
