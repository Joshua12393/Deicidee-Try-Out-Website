import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/public-content";
import { SettingsForm } from "@/components/settings-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireOfficer } from "@/lib/officer-auth";
import { initialRecruitmentConfig, recruitmentConfigSchema } from "@/lib/recruitment-config";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Recruitment Settings | Deicidee" };
export default async function Admin() {
  if (!isSupabaseConfigured()) return <><PageIntro eyebrow="Setup required" title="Recruitment settings.">The admin/staff dashboard is ready to connect to Supabase.</PageIntro><section className="notice"><div><strong>Configuration preview — no account is signed in.</strong><p>These are the owner-confirmed starting rules, shown read-only. Create a Supabase development project, apply the migration, configure the environment, and provision the first admin. See the project README and database setup guide.</p></div></section><div className="section grid-two"><section className="panel"><h2>Admin</h2><p>Edit rules, maps, requirements, policies, and official links. Save drafts, publish, or withdraw public content.</p></section><section className="panel"><h2>Staff</h2><p>Read recruitment settings. Settings publication and officer provisioning are restricted to administrators.</p></section></div><SettingsForm initial={initialRecruitmentConfig} revision={0} readOnly /></>;
  const { supabase, profile } = await requireOfficer();
  const { data, error } = await supabase.from("recruitment_configuration").select("draft_content, revision, published_at").eq("id", true).single();
  if (error || !data) throw new Error("Could not load settings. Check the database migration and try again.");
  const parsed = recruitmentConfigSchema.safeParse(data.draft_content ?? initialRecruitmentConfig);
  if (!parsed.success) throw new Error("The stored settings format is invalid. Ask your administrator to inspect the configuration.");
  const { data: history, error: historyError } = profile.role === "admin" ? await supabase.from("configuration_history").select("revision, action, created_at").order("revision", { ascending: false }).limit(5) : { data: null, error: null };
  return <><PageIntro eyebrow={`${profile.role} / ${profile.display_name}`} title="Recruitment settings.">Manage the information players see before their tryout.</PageIntro><div className="admin-top"><p className="tag">{profile.role === "admin" ? "Admin · can publish" : "Staff · read-only"}</p><form action={logout}><button className="button secondary">Sign out</button></form></div><p className="notice">Applications remain closed until submission and officer processing are implemented.</p><p className="muted">{data.published_at ? `Last published: ${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(data.published_at))} (Asia/Manila).` : "No public settings are currently published."} <Link className="text-link" href="/tryouts" target="_blank">View public guide ↗</Link></p><SettingsForm initial={parsed.data} revision={data.revision} readOnly={profile.role !== "admin"} />{historyError && <p className="notice">Recent publication history could not be loaded.</p>}{history && <section className="section panel"><h2>Recent changes</h2><ul>{history.map(item => <li key={item.revision}><p>Revision {item.revision} · {item.action} · {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(item.created_at))} (Asia/Manila)</p></li>)}</ul></section>}</>;
}
