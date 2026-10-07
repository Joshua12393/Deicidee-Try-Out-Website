"use server";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { z } from "zod";
import { applicationSchema, validateApplication, type ApplicationState } from "@/lib/application";
import { getPublicConfig } from "@/lib/public-config";
import { submissionClient, submissionsConfigured } from "@/lib/supabase/submission";

export async function submitApplication(_previous: ApplicationState, form: FormData): Promise<ApplicationState> {
  const result = await processApplication(form);
  if (result.reference) return result;
  // Preserve applicant-owned input even when the browser submits before hydration.
  const values: Record<string, string> = {};
  for (const name of ["ign", "first_name", "last_name", "rank", "previous_clan", "facebook_url", "discord_name", "reason", "mode", "selected_map"]) {
    const value = form.get(name);
    values[name] = typeof value === "string" ? value.slice(0, name === "reason" ? 2000 : name === "facebook_url" ? 500 : name === "previous_clan" ? 150 : 100) : "";
  }
  if (!["tdm", "zm_hmx", "escape"].includes(values.mode)) values.mode = "";
  return { ...result, values, consent: form.get("consent") === "on" };
}

async function processApplication(form: FormData): Promise<ApplicationState> {
  if (!submissionsConfigured()) return { message: "Applications are unavailable. Your details have not been sent." };
  if (form.get("website")) return { message: "We could not accept this application." };
  const key = z.uuid().safeParse(form.get("submission_key"));
  const rawRevision = form.get("revision");
  const revision = typeof rawRevision === "string" && /^\d+$/.test(rawRevision) ? Number(rawRevision) : NaN;
  if (!key.success || !Number.isInteger(revision) || revision < 0 || revision > 2147483647) return { message: "Refresh the form before submitting." };
  // Explicitly extract only applicant-owned fields. Status, outcome and actor are never accepted.
  const raw = Object.fromEntries(["ign", "first_name", "last_name", "rank", "previous_clan", "facebook_url", "discord_name", "reason", "mode", "selected_map"].map(name => [name, form.get(name) ?? ""]));
  const config = await getPublicConfig();
  const payload = { ...raw, consent: form.get("consent") === "on" };
  // Old-version retries may recover an already saved receipt after settings are withdrawn.
  // The database validates the current mode/maps/revision before every new insert.
  const parsed = config.state === "published" && config.revision === revision
    ? validateApplication(payload, config.content) : applicationSchema.safeParse(payload);
  if (!parsed.success) return { message: "Check the highlighted fields.", errors: Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])) };
  try {
    const requestHeaders = await headers();
    const ip = process.env.VERCEL === "1" ? requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() : "local-development";
    if (process.env.NODE_ENV === "production" && process.env.VERCEL !== "1") return { message: "Submission hosting is not configured." };
    if (!ip || (process.env.VERCEL === "1" && !isIP(ip))) return { message: "Could not verify this request. Try again later." };
    const bucket = createHmac("sha256", process.env.APPLICATION_RATE_LIMIT_SECRET!).update(ip).digest("hex");
    const { data, error } = await submissionClient().rpc("submit_application", {
      p_key: key.data, p_revision: revision, p_payload: parsed.data, p_bucket: bucket,
    });
    if (error) return { message: error.code === "P0001" ? "Recruitment is currently closed. Your details have not been sent." :
      error.code === "40001" ? "The published requirements changed. Keep a copy of your details, refresh, and review before submitting." :
      error.code === "P0002" ? "Too many applications from this connection. Wait ten minutes before trying again." :
      error.code === "23505" ? "This submission was already saved with different details. Keep your reference and contact an officer." :
      "We could not save your application. Your input is preserved; retry with the same submission key." };
    const reference = z.uuid().safeParse(data);
    if (!reference.success) return { message: "We could not confirm the save. Retry with the same submission key." };
    return { reference: reference.data, message: "Application received. An officer will review your details." };
  } catch { return { message: "The service is unavailable. Your input is preserved; retry with the same submission key." }; }
}
