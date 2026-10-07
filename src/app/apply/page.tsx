import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { PageIntro } from "@/components/public-content";
import { ApplicationForm } from "@/components/application-form";
import { getPublicConfig } from "@/lib/public-config";
import { submissionsConfigured } from "@/lib/supabase/submission";
export const metadata: Metadata = { title: "Apply for a Tryout | Deicidee" };
export default async function Apply() {
  const config = await getPublicConfig();
  const enabled = config.state === "published" && config.open && submissionsConfigured();
  return <><PageIntro eyebrow={`Recruitment / ${enabled ? "open" : "closed"}`} title="Your next chapter.">Apply for exactly one tryout mode. Review the rules and privacy notice before submitting.</PageIntro><ApplicationForm config={config.content} revision={config.revision} submissionKey={randomUUID()} enabled={enabled} /></>;
}
