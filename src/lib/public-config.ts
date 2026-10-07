import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import { defaultRecruitmentConfig, initialRecruitmentConfig, recruitmentConfigSchema } from "@/lib/recruitment-config";

// Public content only: no user cookies, private tables, or privileged key.
export const getPublicConfig = cache(async () => {
  if (!isSupabaseConfigured()) return { content: initialRecruitmentConfig, state: "setup" as const };
  try {
    const { url, publishableKey } = getSupabaseConfig();
    const supabase = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(5000) }) },
    });
    const { data, error } = await supabase.rpc("get_public_configuration");
    if (error) return { content: defaultRecruitmentConfig, state: "unavailable" as const };
    if (!data) return { content: defaultRecruitmentConfig, state: "draft" as const };
    const parsed = recruitmentConfigSchema.safeParse(data);
    if (!parsed.success) return { content: defaultRecruitmentConfig, state: "unavailable" as const };
    return { content: parsed.data, state: "published" as const };
  } catch { return { content: defaultRecruitmentConfig, state: "unavailable" as const }; }
});
