import Link from "next/link";
import { randomUUID } from "node:crypto";
import { PublicationRequests } from "./publication-requests";
import { SettingsForm } from "@/components/settings-form";
import { IntakeControl } from "@/components/intake-control";
import { OfficerAccounts } from "@/components/officer-accounts";
import { initialRecruitmentConfig, recruitmentConfigSchema } from "@/lib/recruitment-config";
import { submissionsConfigured } from "@/lib/supabase/submission";
import { manilaDate, type Officer } from "@/lib/dashboard";
export async function RequirementsDashboard({officer:{supabase,profile},openAccounts=false}:{officer:Officer;openAccounts?:boolean}) {
 const {data,error}=await supabase.from("recruitment_configuration").select("draft_content,published_content,revision,published_at,intake_version,recruitment_open").eq("id",true).single();
 if(error||!data) throw new Error("Could not load recruitment settings.");
 const staff=profile.role==="staff";
 const {data:draft,error:draftError}=staff ? await supabase.from("officer_configuration_drafts").select("content,revision,base_revision").eq("officer_id",profile.id).maybeSingle():{data:null,error:null};
 if(draftError)throw new Error("Staff draft storage is unavailable. Ask an admin to apply the publication review migration.");
 const latest=recruitmentConfigSchema.safeParse(data.published_content??data.draft_content??initialRecruitmentConfig);
 if(!latest.success)throw new Error("Current settings are invalid.");
 const parsed=recruitmentConfigSchema.safeParse(staff ? draft?.content??latest.data : data.draft_content??initialRecruitmentConfig);
 if(!parsed.success) throw new Error("Stored requirements are invalid. Ask your administrator to inspect the settings.");
 const {data:history,error:historyError}=profile.role==="admin" ? await supabase.from("configuration_history").select("revision,action,created_at").order("revision",{ascending:false}).limit(5):{data:null,error:null};
 return <>{profile.role==="admin" ? <IntakeControl key={data.intake_version} version={data.intake_version} open={data.recruitment_open} ready={submissionsConfigured()} />:<p className="notice">Applications are {data.recruitment_open ? "open":"closed"}. You can edit your draft and request publication; an admin reviews it first.</p>}
 <p className="muted">{data.published_at ? `Published ${manilaDate(data.published_at)} (Asia/Manila).`:"No requirements published."} <Link className="text-link" href="/tryouts" target="_blank">View public guide ↗</Link></p>
 <PublicationRequests officer={{supabase,profile}} revision={data.revision} published={data.published_content ? latest.data : null} />
 <SettingsForm initial={parsed.data} revision={staff ? draft?.revision??0 : data.revision} staff={staff} baseRevision={draft?.base_revision??data.revision} latestRevision={data.revision} latest={latest.data} requestKey={randomUUID()} />
 {profile.role==="admin" && <details id="officer-accounts" open={openAccounts} className="panel section account-section"><summary>Team accounts · admin only</summary><OfficerAccounts officer={{supabase,profile}} /></details>}
 {historyError && <p className="notice">Publication history is unavailable.</p>}{history && <section className="panel section"><h2>Recent publications</h2>{history.map(item=><p key={item.revision}>Revision {item.revision} · {item.action} · {manilaDate(item.created_at)}</p>)}</section>}
 </>;
}
