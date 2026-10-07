import Link from "next/link";
import type { RecruitmentConfig } from "@/lib/recruitment-config";
export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><div className="lede">{children}</div></div>;
}
export function CommunityLinks({ content }: { content: RecruitmentConfig }) {
  return <div className="actions">
    {content.discordUrl ? <a className="button" href={content.discordUrl} target="_blank" rel="noopener noreferrer">Join Discord ↗</a> : <span className="pending-label">Discord invite awaiting publication</span>}
    {content.facebookUrl ? <a className="button secondary" href={content.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook ↗</a> : <span className="pending-label">Facebook link awaiting publication</span>}
  </div>;
}
export function RequirementsPanels({ content }: { content: RecruitmentConfig }) {
  return <div className="grid-two requirement-panels">
    <section className="panel"><p className="eyebrow">01 / During the tryout</p><h2>Stay connected.</h2><p className="preserve-lines">{content.discordRequirement || "Discord gameplay-sharing instructions will be published before applications open."}</p><p className="muted">Live sharing is separate from recording. This website does not upload or store gameplay or voice recordings.</p><Link className="text-link" href="/community">Community details ↗</Link></section>
    <section className="panel"><p className="eyebrow">02 / After passing</p><h2>Earn your place.</h2><p className="preserve-lines">{content.ccnRequirement || "The exact clan-name (CCN) format is awaiting confirmation."}</p><p className="preserve-lines">{content.mainFacebookRequirement || "Main Facebook requirements are awaiting confirmation."}</p><p className="muted">Passed and Joined are separate steps. An officer confirms completion of the joining requirements.</p></section>
  </div>;
}
export function ClosedNotice() {
  return <aside className="notice"><span className="status-dot" aria-hidden="true" /><div><strong>Applications are not open yet.</strong><p>Explore the tryouts while recruitment is being prepared. No application is submitted or saved from these pages.</p></div></aside>;
}
