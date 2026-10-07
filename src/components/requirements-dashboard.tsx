import Link from "next/link";
import { SettingsForm } from "@/components/settings-form";
import { IntakeControl } from "@/components/intake-control";
import { OfficerAccounts } from "@/components/officer-accounts";
import { initialRecruitmentConfig, recruitmentConfigSchema } from "@/lib/recruitment-config";
import { submissionsConfigured } from "@/lib/supabase/submission";
import { manilaDate, type Officer } from "@/lib/dashboard";
export async function RequirementsDashboard({officer:{supabase,profile},openAccounts=false}:{officer:Officer;openAccounts?:boolean}) {
 const {data,error}=await supabase.from("recruitment_configuration").select("draft_content,revision,published_at,intake_version,recruitment_open").eq("id",true).single();
 if(error||!data) throw new Error("Could not load recruitment settings.");
 const parsed=recruitmentConfigSchema.safeParse(data.draft_content??initialRecruitmentConfig);
 if(!parsed.success) throw new Error("Stored requirements are invalid. Ask your administrator to inspect the settings.");
 const {data:history,error:historyError}=profile.role==="admin" ? await supabase.from("configuration_history").select("revision,action,created_at").order("revision",{ascending:false}).limit(5):{data:null,error:null};
 return <>{profile.role==="admin" ? <IntakeControl key={data.intake_version} version={data.intake_version} open={data.recruitment_open} ready={submissionsConfigured()} />:<p className="notice">Requirements are read-only for staff. Applications are {data.recruitment_open ? "open":"closed"}.</p>}
 <p className="muted">{data.published_at ? `Published ${manilaDate(data.published_at)} (Asia/Manila).`:"No requirements published."} <Link className="text-link" href="/tryouts" target="_blank">View public guide ↗</Link></p>
 {profile.role==="admin" && <details id="officer-accounts" open={openAccounts} className="panel section account-section"><summary>Create / manage officer accounts · admin only</summary><OfficerAccounts officer={{supabase,profile}} /></details>}
 <SettingsForm initial={parsed.data} revision={data.revision} readOnly={profile.role!=="admin"} />
 {historyError && <p className="notice">Publication history is unavailable.</p>}{history && <section className="panel section"><h2>Recent publications</h2>{history.map(item=><p key={item.revision}>Revision {item.revision} · {item.action} · {manilaDate(item.created_at)}</p>)}</section>}
 </>;
}
