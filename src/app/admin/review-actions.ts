"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOfficer } from "@/lib/officer-auth";
export type ReviewState={message:string;success?:boolean;body?:string};
export async function reviewApplication(_previous:ReviewState,form:FormData):Promise<ReviewState> {
 const parsed=z.object({id:z.uuid(),key:z.uuid(),intent:z.enum(["note","closed","withdrawn","pending_review"]),version:z.coerce.number().int().min(1).max(2147483647),body:z.string().trim().min(1).max(5000)}).safeParse(Object.fromEntries(["id","key","intent","version","body"].map(name=>[name,form.get(name)])));
 const body=typeof form.get("body")==="string" ? String(form.get("body")).slice(0,5000):"";
 if(!parsed.success) return {message:"Choose an action and enter a note/reason (up to 5,000 characters).",body};
 try {
  const officer=await getOfficer();if(!officer) return {message:"Active officer access is required. Sign in again.",body};
  const p=parsed.data;
  const {error}=p.intent==="note" ? await officer.supabase.rpc("add_application_note",{p_id:p.id,p_key:p.key,p_body:p.body}):await officer.supabase.rpc("triage_application",{p_id:p.id,p_version:p.version,p_status:p.intent,p_reason:p.body});
  if(error) return {message:error.code==="40001" ? "Another officer updated this application. Keep your note, reload and review before acting.":error.code==="22023" ? "That transition is unavailable. Reload to review the current status.":"The action was not saved. Check your access and retry.",body};
  revalidatePath("/admin","layout");return {message:p.intent==="note" ? "Private note saved.":"Application status updated.",success:true};
 } catch {return {message:"The service is unavailable. Your note is preserved.",body};}
}
