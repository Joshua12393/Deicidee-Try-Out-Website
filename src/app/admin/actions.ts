"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOfficer } from "@/lib/officer-auth";
import { recruitmentConfigSchema } from "@/lib/recruitment-config";

export type LoginState = { message: string };
export type SettingsState = { message: string; revision: number; success?: boolean };

export async function login(_previous: LoginState, form: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { message: "Connect Supabase before signing in." };
  const parsed = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { message: "Enter a valid email and password." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { message: "Sign-in failed. Check your credentials or try again later." };
    const officer = await getOfficer();
    if (!officer) {
      await supabase.auth.signOut();
      return { message: "Sign-in is limited to assigned, active officers. Contact your administrator." };
    }
  } catch { return { message: "Officer access is unavailable. Try again later." }; }
  redirect("/admin");
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw new Error("Could not sign out. Please try again.");
  }
  redirect("/admin/login");
}

export async function saveSettings(_previous: SettingsState, form: FormData): Promise<SettingsState> {
  // Never trust the previous state or hidden inputs for authorization.
  const revision = Number(form.get("revision"));
  const fallback = Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
  const fail = (message: string): SettingsState => ({ message, revision: fallback, success: false });
  if (!Number.isSafeInteger(revision) || revision < 0) return fail("Invalid settings revision. Reload this page.");
  const action = form.get("intent");
  if (action !== "draft" && action !== "publish" && action !== "unpublish") return fail("Choose a valid save action.");
  try {
    const officer = await getOfficer();
    if (!officer || officer.profile.role !== "admin") return fail("An active admin account is required. Sign in again if your session expired.");
    const raw = form.get("content");
    if (typeof raw !== "string" || raw.length > 50000) return fail("Settings are too large or invalid.");
    let content;
    try { content = JSON.parse(raw); } catch { return fail("Invalid settings document."); }
    const parsed = recruitmentConfigSchema.safeParse(content);
    if (action !== "unpublish" && !parsed.success) {
      return fail(parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
    }
    const { data, error } = await officer.supabase.rpc("save_recruitment_configuration", {
      p_content: action === "unpublish" ? null : parsed.data,
      p_expected_revision: revision, p_action: action,
    });
    if (error) return fail(error.code === "40001" ? "Another admin saved newer settings. Keep a copy of your edits, then reload and review before saving." : "Settings were not saved. Check your connection and admin access, then retry.");
    if (!Number.isSafeInteger(data)) return fail("The save could not be verified. Reload to check the current revision.");
    revalidatePath("/", "layout");
    return { success: true, revision: data, message: action === "publish" ? "Settings published. The public pages now use this version. Applications remain closed." : action === "unpublish" ? "Public settings withdrawn. Your saved draft is retained." : "Draft saved. Public pages still use the last published version." };
  } catch { return fail("Settings were not saved. The service may be unavailable; your edits remain in this form."); }
}
