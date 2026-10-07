import type { Metadata } from "next";
import Link from "next/link";
import { tryoutModes } from "@/lib/clan";
import { getPublicConfig } from "@/lib/public-config";
import { ClosedNotice, PageIntro, RequirementsPanels } from "@/components/public-content";

export const metadata: Metadata = { title: "Tryouts & Requirements | Deicidee" };
export default async function Tryouts({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const requirements = (await searchParams).tab === "requirements";
  const { content, state } = await getPublicConfig();
  return <><PageIntro eyebrow="The recruitment guide" title="Tryout system.">Three ways to show your skill. Choose exactly one mode for your application.</PageIntro>
    <nav className="tabs" aria-label="Tryout sections"><Link href="/tryouts" aria-current={!requirements ? "page" : undefined}>Modes</Link><Link href="/tryouts?tab=requirements" aria-current={requirements ? "page" : undefined}>Requirements</Link></nav>
    {state === "unavailable" && <p className="notice">Published details are temporarily unavailable. Check again later; applications remain closed.</p>}
    {requirements ? <section className="panel prose"><p className="eyebrow">Before you apply</p><h2>Prepare for your tryout.</h2><dl><dt>Game</dt><dd>CrossFire</dd><dt>Server / region</dt><dd>{content.serverRegion || "Awaiting confirmation."}</dd><dt>Ranks and eligibility</dt><dd className="preserve-lines">{content.rankScheme || "The CrossFire rank scheme and eligibility requirements are awaiting confirmation."}</dd><dt>Mode selection</dt><dd>Choose exactly one: TDM, ZM HMX, or Escape.</dd><dt>Application details</dt><dd className="preserve-lines">{content.applicationFields || "Required fields will be confirmed before the application form opens. Never share game passwords or account credentials."}</dd><dt>Retries and scheduling changes</dt><dd className="preserve-lines">{content.retryPolicy || "Retry limits and rescheduling arrangements are awaiting confirmation. No retry is guaranteed."}</dd></dl><Link className="text-link" href="/privacy">Read the privacy notice ↗</Link></section> : <div className="mode-list">{tryoutModes.map((mode, index) => { const rules = content.modes[mode.id]; return <section className="panel mode-detail" id={mode.id} key={mode.id}><div><p className="eyebrow">0{index + 1} / {mode.shortName}</p><h2>{mode.name}</h2><span className={rules.approved ? "tag" : "tag pending"}>{rules.approved ? "Confirmed rules" : "Rules pending"}</span></div><div>{rules.approved ? <><p className="lede">{rules.description}</p><h3>How you are evaluated</h3><p className="preserve-lines">{rules.rules}</p>{(mode.id !== "tdm" || rules.maps.length > 0) && <><h3>Approved maps</h3>{rules.maps.length ? <ul className="map-list">{rules.maps.map(map => <li key={map}>{map}</li>)}</ul> : <p>Choose a map for your tryout. The available map list will be supplied by the clan.</p>}</>}</> : <><p className="lede">Rules for this mode are being prepared.</p><p>Scoring rules, evaluation criteria, and map choices are awaiting approval. Check back before applying.</p></>}</div></section>; })}</div>}
    <RequirementsPanels content={content} /><ClosedNotice /><div className="actions section"><Link className="button" href="/apply">Application status ↗</Link><Link className="button secondary" href="/faq">Read the FAQ</Link></div>
  </>;
}
