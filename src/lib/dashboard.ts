import { z } from "zod";
export const applicationStatuses = ["pending_review", "scheduled", "under_evaluation", "passed", "failed", "retry_requested", "withdrawn", "closed"] as const;
export const modeLabels = { tdm: "TDM", zm_hmx: "ZM HMX", escape: "Escape" };
export const statusLabel = (status: string) => status.replaceAll("_", " ");
export const manilaDate = (date: string) => new Intl.DateTimeFormat("en-PH", {dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Manila"}).format(new Date(date));
export const dashboardFilters = z.object({
 q: z.string().trim().max(100).catch(""), status: z.enum(applicationStatuses).optional().catch(undefined),
 mode: z.enum(["tdm","zm_hmx","escape"]).optional().catch(undefined),
 page: z.coerce.number().int().min(1).max(100000).catch(1),
});
export type Officer = { supabase: Awaited<ReturnType<typeof import("./supabase/server").createClient>>; profile: {id:string;display_name:string;role:"admin"|"staff";active:boolean} };
