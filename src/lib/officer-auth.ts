import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const getOfficer = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await supabase.from("officer_profiles")
    .select("id, display_name, role, active").eq("id", user.id).eq("active", true).maybeSingle();
  if (profileError) throw new Error("Officer access is temporarily unavailable. Try again later.");
  if (!profile || !["admin", "staff"].includes(profile.role)) return null;
  return { supabase, profile: profile as { id: string; display_name: string; role: "admin" | "staff"; active: boolean } };
});

export async function requireOfficer() {
  const officer = await getOfficer();
  if (!officer) redirect("/admin/login");
  return officer;
}
