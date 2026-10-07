import { z } from "zod";

function isPublicKey(key: string) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  const parts = key.split(".");
  if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) return false;
  try {
    // This checks key type, not token authenticity. Supabase verifies the key.
    const payload = JSON.parse(atob(parts[1].replaceAll("-", "+").replaceAll("_", "/")));
    return payload.role === "anon";
  } catch { return false; }
}

const configSchema = z.object({
  url: z.url().refine(value => {
    try {
      const url = new URL(value);
      return !url.username && !url.password && !url.search && !url.hash &&
        (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)));
    } catch { return false; }
  }),
  publishableKey: z.string().refine(isPublicKey),
});

export function isSupabaseConfigured() {
  return configSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }).success;
}

export function getSupabaseConfig() {
  const result = configSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    throw new Error("Set a valid Supabase URL and publishable or legacy anon key. Never use a secret or service-role key in NEXT_PUBLIC variables.");
  }

  return result.data;
}
