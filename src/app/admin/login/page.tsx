import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { PageIntro } from "@/components/public-content";
import { getOfficer } from "@/lib/officer-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
export const metadata: Metadata = { title: "Officer Sign-in | Deicidee" };
export default async function Login() {
  const configured = isSupabaseConfigured();
  if (configured && await getOfficer()) redirect("/admin");
  return <><PageIntro eyebrow="Restricted access" title="Officer sign-in.">For assigned Deicidee admins and staff.</PageIntro>{!configured && <p className="notice">Supabase has not been connected. Sign-in is unavailable until setup is complete.</p>}<div className="section"><LoginForm configured={configured} /></div><p><Link className="text-link" href="/admin">Dashboard setup ↗</Link></p></>;
}
