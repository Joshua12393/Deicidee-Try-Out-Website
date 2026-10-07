import "server-only";
import {createClient} from "@supabase/supabase-js";
import {getSupabaseConfig} from "./config";
export function privilegedConfigured(){return Boolean(process.env.SUPABASE_SECRET_KEY?.startsWith("sb_secret_"));}
export function privilegedClient(){
 if(!privilegedConfigured())throw new Error("Server key is not configured.");
 return createClient(getSupabaseConfig().url,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store",signal:AbortSignal.timeout(10000)})}});
}
