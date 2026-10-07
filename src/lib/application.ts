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
export function validateApplication(raw: unknown, config: RecruitmentConfig) {
  return applicationSchema.superRefine((data, ctx) => {
    const mode = config.modes[data.mode];
    if (!mode.approved) ctx.addIssue({ code: "custom", path: ["mode"], message: "This mode is not available." });
    if (data.mode === "tdm" ? data.selected_map !== "" : !mode.maps.includes(data.selected_map)) {
      ctx.addIssue({ code: "custom", path: ["selected_map"], message: data.mode === "tdm" ? "TDM does not require a map." : "Choose an approved map." });
    }
  }).safeParse(raw);
}
export type ApplicationState = { message: string; errors?: Record<string, string>; reference?: string; values?: Record<string, string>; consent?: boolean };
