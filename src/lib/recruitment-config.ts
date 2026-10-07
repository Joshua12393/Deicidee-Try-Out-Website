import { z } from "zod";

const copy = z.string().trim().max(2000);
const communityUrl = (hosts: string[]) => z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      hosts.includes(url.hostname.toLowerCase()) && (!url.port || url.port === "443");
  } catch { return false; }
}, "Use an HTTPS link on the official Discord or Facebook domain.");
const modeSchema = z.object({
  approved: z.boolean(), description: copy, rules: copy,
  maps: z.array(z.string().trim().max(100)).transform(maps => maps.filter(Boolean)).pipe(z.array(z.string().min(1).max(100)).max(30)),
}).strict().superRefine((mode, ctx) => {
  if (mode.approved && (!mode.rules || !mode.description)) {
    ctx.addIssue({ code: "custom", message: "Approved modes need a description and rules." });
  }
  if (new Set(mode.maps.map((map) => map.toLowerCase())).size !== mode.maps.length) {
    ctx.addIssue({ code: "custom", message: "Remove duplicate maps." });
  }
});
export const recruitmentConfigSchema = z.object({
  serverRegion: z.string().trim().max(120), rankScheme: copy,
  discordUrl: communityUrl(["discord.gg", "discord.com", "www.discord.com"]),
  facebookUrl: communityUrl(["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com"]),
  discordRequirement: copy, retryPolicy: copy, ccnRequirement: copy, mainFacebookRequirement: copy,
  applicationFields: copy, retentionPolicy: copy, correctionContact: copy,
  modes: z.object({ tdm: modeSchema, zm_hmx: modeSchema, escape: modeSchema }).strict(),
}).strict();
export type RecruitmentConfig = z.infer<typeof recruitmentConfigSchema>;

// Withdrawal must work even when the unsaved draft contains invalid input.
export function parseSettingsSubmission(form: FormData) {
  const rawRevision = form.get("revision");
  const revision = typeof rawRevision === "string" && /^\d+$/.test(rawRevision) ? Number(rawRevision) : NaN;
  const fallback = Number.isSafeInteger(revision) && revision >= 0 && revision <= 2147483647 ? revision : 0;
  const fail = (message: string) => ({ success: false as const, revision: fallback, message });
  if (!Number.isSafeInteger(revision) || revision < 0 || revision > 2147483647) return fail("Invalid settings revision. Reload this page.");
  const intent = form.get("intent");
  if (intent !== "draft" && intent !== "publish" && intent !== "unpublish") return fail("Choose a valid save action.");
  if (intent === "unpublish") return { success: true as const, revision, intent, content: null };
  const raw = form.get("content");
  if (typeof raw !== "string" || raw.length > 50000) return fail("Settings are too large or invalid.");
  let content: unknown;
  try { content = JSON.parse(raw); } catch { return fail("Invalid settings document."); }
  const parsed = recruitmentConfigSchema.safeParse(content);
  if (!parsed.success) return fail(parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
  return { success: true as const, revision, intent, content: parsed.data };
}
export const defaultRecruitmentConfig: RecruitmentConfig = {
  serverRegion: "", rankScheme: "", discordUrl: "", facebookUrl: "",
  discordRequirement: "", retryPolicy: "", ccnRequirement: "", mainFacebookRequirement: "",
  applicationFields: "", retentionPolicy: "", correctionContact: "",
  modes: {
    tdm: { approved: false, description: "Put your aim and match awareness to the test.", rules: "", maps: [] },
    zm_hmx: { approved: false, description: "Show your performance in ZM HMX.", rules: "", maps: [] },
    escape: { approved: false, description: "Bring your movement and Escape skills.", rules: "", maps: [] },
  },
};

// Owner-confirmed starting content. Empty defaults above remain the fail-closed
// response for an unavailable database or deliberately unpublished settings.
export const initialRecruitmentConfig: RecruitmentConfig = {
  ...defaultRecruitmentConfig,
  discordRequirement: "Discord is required to share your gameplay live during the tryout.",
  ccnRequirement: "CCN Format: Dc.*****",
  mainFacebookRequirement: "MAIN FB — use your main Facebook account.",
  modes: {
    tdm: {
      approved: true,
      description: "Complete a 1v1 against a Deicidee clan member or clanmate.",
      rules: "Finish the match. Win OR reach at least 85% of your opponent’s score.\nExample: 40 opponent kills × 85% = 34 — you need at least 34 kills. For whole-number scores, round the required score up (41 → 35).\n\nTDM TRYOUT LOADOUT\nCS GUN: HK, AK47, M4, M14EBR, TRG, AWM.\nAny pistol. Any melee.\nCS CHAR: SWAT.\nNo body armor. No head armor.\nAccessories are allowed.\nWeapon lang importante — follow the weapon list above.",
      maps: [],
    },
    zm_hmx: {
      approved: true,
      description: "Choose a map for your ZM HMX tryout.",
      rules: "Score at least 350.\nHindi lang sa score nagbabase — evaluation also depends on the rounds. Reaching the score alone is not the entire evaluation.",
      maps: [],
    },
    escape: {
      approved: true,
      description: "Choose a map for your Escape tryout.",
      rules: "Score at least 700 OR demonstrate that you know how to boost.\nThese are alternative ways to qualify; both are not required.",
      maps: [],
    },
  },
};
export const configTextFields = [
  ["serverRegion", "CrossFire server / region"], ["rankScheme", "Rank scheme and eligibility"],
  ["discordUrl", "Official Discord invite (HTTPS)"], ["facebookUrl", "Official Facebook page / group (HTTPS)"],
  ["discordRequirement", "Live Discord gameplay-sharing requirements"],
  ["retryPolicy", "Retries, missed tryouts, and rescheduling policy"],
  ["ccnRequirement", "After passing: exact clan-name / CCN format"],
  ["mainFacebookRequirement", "After passing: main Facebook requirement"],
  ["applicationFields", "Approved application fields and which are required"],
  ["retentionPolicy", "Data retention and deletion policy"],
  ["correctionContact", "Public contact / instructions for corrections and deletion"],
] as const;
