import {PageIntro} from "@/components/public-content";
import Link from "next/link";
import {requireOfficer} from "@/lib/officer-auth";
import {RequirementsDashboard} from "@/components/requirements-dashboard";
import {ApplicationsDashboard} from "@/components/applications-dashboard";
import {logout} from "./actions";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {SettingsForm} from "@/components/settings-form";
import {initialRecruitmentConfig} from "@/lib/recruitment-config";
export const metadata={title:"Officer Dashboard | Deicidee"};
export default async function Admin({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 if(!isSupabaseConfigured())return <><PageIntro eyebrow="Setup required" title="Officer dashboard.">Connect Supabase to sign in and manage applications.</PageIntro><p className="notice">Read-only configuration preview. No account is signed in; private applications and account management are unavailable.</p><SettingsForm initial={initialRecruitmentConfig} revision={0} readOnly/></>;
 const officer=await requireOfficer();const params=await searchParams;const tab=params.tab==="applications"?"applications":"requirements";
 return <><PageIntro eyebrow={officer.profile.role+" / "+officer.profile.display_name} title="Officer dashboard.">Review recruitment requirements and manage private applications.</PageIntro><div className="admin-top"><p className="tag">{officer.profile.role==="admin"?"Admin · settings, accounts and reviews":"Staff · application reviews"}</p>{officer.profile.role==="admin"&&<Link className="button secondary" href="/admin?tab=requirements&accounts=open#officer-accounts">Manage accounts</Link>}<form action={logout}><button className="button secondary">Sign out</button></form></div><nav className="tabs dashboard-tabs" aria-label="Dashboard sections"><Link href="/admin?tab=requirements" aria-current={tab==="requirements"?"page":undefined}>Requirements</Link><Link href="/admin?tab=applications" aria-current={tab==="applications"?"page":undefined}>Applications</Link></nav>{tab==="requirements"?<RequirementsDashboard officer={officer} openAccounts={params.accounts==="open"}/>:<ApplicationsDashboard officer={officer} params={params}/>}</>;
}
