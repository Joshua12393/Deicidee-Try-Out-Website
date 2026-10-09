"use server";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {getOfficer} from "@/lib/officer-auth";
import {privilegedClient,privilegedConfigured} from "@/lib/supabase/privileged";
export type AccountState={message:string;success?:boolean;name?:string;email?:string;reason?:string;confirmation?:string;role?:"admin"|"staff"};
function preserved(form:FormData,name:string,max:number){const value=form.get(name);return typeof value==="string"?value.slice(0,max):"";}
export async function createStaff(_previous:AccountState,form:FormData):Promise<AccountState>{
 const result=await processCreateStaff(form);
 return {...result,name:preserved(form,"name",100),email:preserved(form,"email",254),role:form.get("role")==="admin"?"admin":"staff"};
}
async function processCreateStaff(form:FormData):Promise<AccountState>{
 const parsed=z.object({name:z.string().trim().min(1).max(100),email:z.string().trim().pipe(z.email().max(254)),password:z.string().min(12).max(72),role:z.enum(["admin","staff"])}).safeParse({name:form.get("name"),email:form.get("email"),password:form.get("password"),role:form.get("role")});
 if(!parsed.success)return {message:"Enter a display name, valid email, and a password of 12–72 characters."};
 try{
  const officer=await getOfficer();if(!officer||officer.profile.role!=="admin")return {message:"An active admin account is required."};
  if(!privilegedConfigured())return {message:"Configure the server key before creating staff accounts."};
  const service=privilegedClient();
  const {data,error}=await service.auth.admin.createUser({email:parsed.data.email,password:parsed.data.password,email_confirm:true});
  if(error||!data.user)return {message:"Could not create or verify the login. Check whether the email is already registered and whether the password meets the project policy before retrying."};
  // The user-scoped RPC checks admin access again after the external Auth request.
  const provision=await officer.supabase.rpc("provision_officer",{p_id:data.user.id,p_name:parsed.data.name,p_role:parsed.data.role});
  if(provision.error){
   const cleanup=await service.auth.admin.deleteUser(data.user.id);
   return {message:cleanup.error?"Login created without officer access; cleanup failed. Ask the Supabase project administrator to remove the unassigned login before retrying.":"Staff access was not assigned. The new login was removed; check admin access and retry."};
  }
  revalidatePath("/admin","layout");return {success:true,message:"Officer account created. Share the email and initial password privately with the intended officer."};
 }catch{return {message:"Could not confirm account creation. Check the account list and Supabase Auth before retrying; do not reuse an existing email blindly."};}
}
export async function manageAccount(_previous:AccountState,form:FormData):Promise<AccountState>{
 const result=await processAccount(form);
 return {...result,reason:preserved(form,"reason",1000),confirmation:preserved(form,"confirmation",100)};
}
async function processAccount(form:FormData):Promise<AccountState>{
 const p=z.object({id:z.uuid(),version:z.coerce.number().int().min(1).max(2147483647),intent:z.enum(["suspend","activate","delete","role"]),reason:z.string().trim().min(1).max(1000),confirmation:z.string().max(100)}).safeParse(Object.fromEntries(["id","version","intent","reason","confirmation"].map(name=>[name,form.get(name)??""])));
 if(!p.success)return {message:"Enter a reason and valid action."};
 try{
  const officer=await getOfficer(); if(!officer||officer.profile.role!=="admin")return {message:"An active admin account is required."};
  if(p.data.intent==="role"){
   const role=z.enum(["admin","staff"]).safeParse(form.get("role"));
   if(!role.success)return {message:"Choose admin or staff."};
   const {error}=await officer.supabase.rpc("change_officer_role",{p_id:p.data.id,p_version:p.data.version,p_role:role.data,p_reason:p.data.reason});
   if(error)return {message:error.code==="40001"?"This officer changed. Reload before changing the role.":"Role change was blocked. Check admin access and account status; your own account and the last active admin are protected."};
   revalidatePath("/","layout");return {success:true,message:"Officer role updated."};
  }
  if(p.data.intent==="delete"&&!privilegedConfigured())return {message:"Configure the server key before deleting login accounts."};
  if(p.data.intent==="delete"&&form.get("confirm_delete")!=="on")return {message:"Confirm permanent login-account deletion first."};
  const {data,error}=await officer.supabase.rpc("manage_officer",{p_id:p.data.id,p_version:p.data.version,p_action:p.data.intent,p_reason:p.data.reason,p_confirmation:p.data.confirmation});
  if(error)return {message:error.code==="40001"?"This officer changed. Reload and review the account before trying again.":error.code==="22023"?"The action was blocked. Check the typed display name; your own account and the last active admin are protected.":"Could not verify the change. Reload to check the account state before retrying."};
  let message="Officer access updated.";
  if(p.data.intent==="delete"){
   // Database revokes access first. A failed Auth request remains safely disabled and retryable.
   if(data?.auth_user_id){
    const target=z.uuid().safeParse(data.auth_user_id);
    if(!target.success||target.data!==p.data.id)return {message:"Access revoked; account identity could not be verified. Contact your project administrator."};
    const result=await privilegedClient().auth.admin.deleteUser(target.data);
    if(result.error&&result.error.code!=="user_not_found"){
     revalidatePath("/admin","layout");return {message:"Access revoked, but login-account deletion did not complete. Reload and retry deletion."};
    }
   }
   message="Login account deleted. Historical officer actions are retained.";
  }
  revalidatePath("/admin","layout");return {message,success:true};
 }catch{return {message:"The service is unavailable. Reload to check the account state before retrying."};}
}
