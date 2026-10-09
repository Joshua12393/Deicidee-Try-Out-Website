"use server";

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOfficer } from "@/lib/officer-auth";
import { parseSettingsSubmission } from "@/lib/recruitment-config";
import { submissionsConfigured } from "@/lib/supabase/submission";

export type LoginState = { message: string };
export type SettingsState = { message: string; revision: number; success?: boolean; requestKey?: string };
export type IntakeState = { message: string; version: number; open: boolean };

export async function setIntake(_previous: IntakeState, form: FormData): Promise<IntakeState> {
  const raw = form.get("version"), next = form.get("open");
  const version = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
  const fail = (message: string): IntakeState => ({ message, version: Number.isSafeInteger(version) ? version : 0, open: next === "false" });
  if (!Number.isSafeInteger(version) || version < 0 || version > 2147483647 || (next !== "true" && next !== "false")) return fail("Reload to review current intake settings.");
  try {
    const officer = await getOfficer();
    if (!officer || officer.profile.role !== "admin") return fail("An active admin account is required.");
    if (next === "true" && !submissionsConfigured()) return fail("Configure the server submission service before opening intake.");
    const { data, error } = await officer.supabase.rpc("set_recruitment_intake", { p_open: next === "true", p_expected_version: version });
    if (error) return fail(error.code === "40001" ? "Another admin changed intake. Reload and review before saving." : error.code === "22023" ? "Publish the application fields, retention policy, correction contact, Discord invite and requirements, and at least one ready mode first." : "Intake was not changed. Check your connection and admin access.");
    if (!Number.isSafeInteger(data)) return fail("Could not verify the change. Reload to check intake.");
    revalidatePath("/", "layout");
    return { message: next === "true" ? "Applications are now open." : "Applications are now closed.", version: data, open: next === "true" };
  } catch { return fail("Intake was not changed. Try again later."); }
}

export async function login(_previous: LoginState, form: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { message: "Connect Supabase before signing in." };
  const parsed = z.object({ email: z.string().trim().pipe(z.email().max(254)), password: z.string().min(1).max(256) })
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
  const submission = parseSettingsSubmission(form);
  const requestKey = z.uuid().safeParse(form.get("request_key"));
  const fail = (message: string): SettingsState => ({ message, revision: submission.revision, success: false, requestKey: requestKey.success ? requestKey.data : undefined });
  if (!submission.success) return fail(submission.message);
  const { revision, intent: action, content } = submission;
  try {
    const officer = await getOfficer();
    if (!officer) return fail("Active officer access is required. Sign in again if your session expired.");
    if (officer.profile.role === "staff") {
      if (action !== "draft" && action !== "request") return fail("Staff publication requires an admin review. Use Submit for review.");
      const key = z.uuid().safeParse(form.get("request_key"));
      const base = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(2147483647)).safeParse(form.get("base_revision"));
      if (!key.success || !base.success) return fail("Reload to review the latest settings.");
      const { data, error } = await officer.supabase.rpc("save_officer_configuration_draft", {
        p_content: content, p_revision: revision, p_base_revision: base.data, p_submit: action === "request", p_key: key.data,
      });
      if (error) return fail(error.code === "40001" ? "Your draft or the clan settings changed. Keep a copy of your edits, reload, and start from the latest settings before requesting publication." : error.code === "23505" ? "A request is already awaiting review, or this request key was used. Check your request history before submitting again." : "Your changes could not be saved. Keep your edits and retry.");
      if (!Number.isSafeInteger(data)) return fail("Could not verify the save. Check your draft and requests before retrying.");
      revalidatePath("/admin", "layout");
      return { success: true, revision: data, requestKey: randomUUID(), message: action === "request" ? "Submitted for admin review. The public guide has not changed." : "Your private draft was saved." };
    }
    if (action === "request") return fail("Admins can publish directly or review a staff request.");
    const { data, error } = await officer.supabase.rpc("save_recruitment_configuration", {
      p_content: content,
      p_expected_revision: revision, p_action: action,
    });
    if (error) return fail(error.code === "40001" ? "Another admin saved newer settings. Keep a copy of your edits, then reload and review before saving." : "Settings were not saved. Check your connection and admin access, then retry.");
    if (!Number.isSafeInteger(data)) return fail("The save could not be verified. Reload to check the current revision.");
    revalidatePath("/", "layout");
    return { success: true, revision: data, message: action === "publish" ? "Settings published. Applications are paused; review intake before reopening." : action === "unpublish" ? "Public settings withdrawn and applications paused. Your saved draft is retained." : "Draft saved. Public pages still use the last published version." };
  } catch { return fail("Settings were not saved. The service may be unavailable; your edits remain in this form."); }
}
