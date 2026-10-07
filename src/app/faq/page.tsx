import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/public-content";
import { getPublicConfig } from "@/lib/public-config";
export const metadata: Metadata = { title: "Recruitment FAQ | Deicidee" };
export default async function FAQ() {
  const { content, open } = await getPublicConfig();
  const questions = [
    ["Can I apply now?", open ? "Applications are open. Review the requirements and apply for exactly one ready mode." : "Applications are closed. You can review the form and guide, but submission is disabled."],
    ["Do I need a website account?", "No applicant account is planned. Officer accounts are separate and are provisioned by the clan administrator."],
    ["Can I choose more than one mode?", "Choose exactly one: TDM, ZM HMX, or Escape. A retry is another attempt in that selected mode; a mode change must be arranged with an officer."],
    ["How is my tryout scheduled?", "Once applications open, an officer will coordinate arrangements manually through your Discord contact. Scheduled times will be shown in Asia/Manila. There is no promised response time."],
    ["Do I need Discord or a recording?", content.discordRequirement || "Discord gameplay-sharing details are awaiting confirmation. Live sharing does not mean uploading recordings: this website has no gameplay-video or voice-recording storage."],
    ["What if I fail, miss my schedule, or need a retry?", content.retryPolicy || "An officer will record the outcome. Retry limits and missed-tryout arrangements are awaiting confirmation; retries are not guaranteed."],
    ["Does passing make me a member?", "Passing a tryout and joining the clan are separate steps. An officer must confirm the after-passing requirements before recording Joined."],
    ["How can I correct or remove my details?", content.correctionContact || "This website is not collecting applications yet. The official correction contact will be published before intake opens."],
  ];
  return <><PageIntro eyebrow="Before you enter" title="Questions, answered.">Understand the process before your first tryout.</PageIntro><div className="faq-list">{questions.map(([q, a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p className="preserve-lines">{a}</p></details>)}</div><div className="actions section"><Link href="/tryouts?tab=requirements" className="button">View requirements ↗</Link><Link href="/privacy" className="button secondary">Privacy notice</Link></div></>;
}
