import type { Metadata } from "next";
import Link from "next/link";
import { ClosedNotice, PageIntro } from "@/components/public-content";
import { tryoutModes } from "@/lib/clan";
export const metadata: Metadata = { title: "Application Status | Deicidee" };
export default function Apply() {
  return <><PageIntro eyebrow="Recruitment / not yet open" title="Your next chapter.">Get familiar with the process while we prepare recruitment.</PageIntro><ClosedNotice /><section className="panel section"><h2>Choose your focus.</h2><p>Each application will be for exactly one mode. Read the published requirements before choosing.</p><div className="grid-three">{tryoutModes.map(mode => <Link className="panel mode-card" href={`/tryouts#${mode.id}`} key={mode.id}><h3>{mode.shortName}</h3><span className="text-link">Read the guide ↗</span></Link>)}</div><p className="muted">The application form will become available when submission and officer processing are ready. There is nothing to submit on this page.</p><div className="actions"><Link className="button secondary" href="/tryouts?tab=requirements">Requirements</Link><Link className="text-link" href="/privacy">Privacy notice ↗</Link></div></section></>;
}
