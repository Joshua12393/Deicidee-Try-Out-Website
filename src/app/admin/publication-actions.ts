"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOfficer } from "@/lib/officer-auth";
export type PublicationReviewState = { message: string; success?: boolean; note?: string };
export async function reviewPublication(_previous: PublicationReviewState, form: FormData): Promise<PublicationReviewState> {
  const note = typeof form.get("note") === "string" ? String(form.get("note")).slice(0, 1000) : "";
  const fail = (message: string) => ({ message, note });
  const parsed = z.object({ id: z.uuid(), intent: z.enum(["approve", "reject"]), revision: z.coerce.number().int().min(0).max(2147483647), note: z.string().trim().min(1).max(1000) }).safeParse({ id: form.get("id"), intent: form.get("intent"), revision: form.get("revision"), note });
  if (!parsed.success) return fail("Enter a review note before deciding.");
  try {
    const officer = await getOfficer();
    if (!officer || officer.profile.role !== "admin") return fail("An active admin account is required.");
    const { data, error } = await officer.supabase.rpc("review_publication_request", { p_id: parsed.data.id, p_approve: parsed.data.intent === "approve", p_expected_revision: parsed.data.revision, p_note: parsed.data.note });
    if (error) return fail(error.code === "40001" ? "This request or the settings changed. Reload and review; reject outdated requests so staff can submit a fresh draft." : error.code === "42501" ? "An active admin other than the author must review this request." : "Could not confirm the decision. Check the request status before retrying.");
    if (!Number.isSafeInteger(data)) return fail("Could not verify the decision. Check the request status before retrying.");
    revalidatePath("/", "layout");
    return { success: true, message: parsed.data.intent === "approve" ? "Request approved and published. Applications are paused." : "Request rejected. Your note is available to its author." };
  } catch { return fail("The service is unavailable. Your review note is preserved."); }
}
