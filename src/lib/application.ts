import { z } from "zod";
import type { RecruitmentConfig } from "./recruitment-config";

const optional = (max: number) => z.string().trim().max(max);
export const applicationSchema = z.object({
  ign: z.string().trim().min(1, "Enter your IGN.").max(100),
  first_name: optional(100), last_name: optional(100), rank: optional(100), previous_clan: optional(150),
  facebook_url: optional(500).refine(value => {
    if (!value) return true;
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password &&
      ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com"].includes(url.hostname) && (!url.port || url.port === "443"); } catch { return false; }
  }, "Use an HTTPS Facebook link."),
  discord_name: z.string().trim().min(1, "Enter your Discord contact.").max(100),
  reason: z.string().trim().min(1, "Tell us why you want to join.").max(2000),
  mode: z.enum(["tdm", "zm_hmx", "escape"], { error: "Choose one tryout mode." }),
  selected_map: optional(100), consent: z.literal(true, { error: "Read and accept the privacy and live-sharing acknowledgement." }),
}).strict();
export type ApplicationInput = z.infer<typeof applicationSchema>;
const applicantFields = ["ign", "first_name", "last_name", "rank", "previous_clan", "facebook_url", "discord_name", "reason", "mode", "selected_map"] as const;

// Preserve repeated fields as arrays so schema validation rejects ambiguous requests.
export function readApplicationForm(form: FormData) {
  const raw = Object.fromEntries(applicantFields.map(name => {
    const entries = form.getAll(name);
    return [name, entries.length > 1 ? entries : entries[0] ?? ""];
  }));
  return { ...raw, consent: form.getAll("consent").length === 1 && form.get("consent") === "on" };
}

export function preserveApplicationForm(form: FormData) {
  const values: Record<string, string> = {};
  for (const name of applicantFields) {
    const value = form.get(name);
    values[name] = typeof value === "string" ? value.slice(0, name === "reason" ? 2000 : name === "facebook_url" ? 500 : name === "previous_clan" ? 150 : 100) : "";
  }
  if (!["tdm", "zm_hmx", "escape"].includes(values.mode)) values.mode = "";
  const key = z.uuid().safeParse(form.get("submission_key"));
  const rawRevision = form.get("revision");
  const revision = typeof rawRevision === "string" && /^\d+$/.test(rawRevision) ? Number(rawRevision) : NaN;
  return { values, consent: form.get("consent") === "on",
    submissionKey: key.success ? key.data : undefined,
    revision: Number.isSafeInteger(revision) && revision >= 0 && revision <= 2147483647 ? revision : undefined };
}
export function validateApplication(raw: unknown, config: RecruitmentConfig) {
  return applicationSchema.superRefine((data, ctx) => {
    const mode = config.modes[data.mode];
    if (!mode.approved) ctx.addIssue({ code: "custom", path: ["mode"], message: "This mode is not available." });
    if (data.mode === "tdm" ? data.selected_map !== "" : !mode.maps.includes(data.selected_map)) {
      ctx.addIssue({ code: "custom", path: ["selected_map"], message: data.mode === "tdm" ? "TDM does not require a map." : "Choose an approved map." });
    }
  }).safeParse(raw);
}
export type ApplicationState = { message: string; errors?: Record<string, string>; reference?: string; values?: Record<string, string>; consent?: boolean; submissionKey?: string; revision?: number };
