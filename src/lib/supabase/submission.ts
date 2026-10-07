import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

export function submissionsConfigured() {
  return Boolean(process.env.SUPABASE_SECRET_KEY?.startsWith("sb_secret_") && process.env.APPLICATION_RATE_LIMIT_SECRET && process.env.APPLICATION_RATE_LIMIT_SECRET.length >= 32);
}
export function submissionClient() {
  if (!submissionsConfigured()) throw new Error("Submission service is not configured.");
  return createClient(getSupabaseConfig().url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(10000) }) },
  });
}
