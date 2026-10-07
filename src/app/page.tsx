import Link from "next/link";
import Image from "next/image";
import { tryoutModes } from "@/lib/clan";
import { getPublicConfig } from "@/lib/public-config";
import { ClosedNotice } from "@/components/public-content";
export default async function Home() {
  const { content } = await getPublicConfig();
  return <>
    <section className="hero">
      <div><p className="eyebrow">CrossFire / Deicidee clan</p><h1>Prove your skill.<br /><span>Earn your place.</span></h1><p className="lede">Skill. Teamwork. Drive. Bring your best to the arena and find your place with Deicidee</p><div className="actions"><Link className="button" href="/tryouts">Explore tryouts ↗</Link><Link className="button secondary" href="/apply">Application status</Link></div><p className="hero-caption">THREE MODES. ONE CHOICE. YOUR NEXT CHALLENGE.</p></div>
      <div className="hero-art"><div className="art-corner" aria-hidden="true">DEICIDEE / CROSSFIRE</div><Image className="hero-logo" src="/deicidee-logo.png" alt="Official Deicidee clan logo" width={500} height={500} sizes="(max-width: 700px) 260px, (max-width: 1050px) 40vw, 450px" priority /><span className="art-caption" aria-hidden="true">SKILL · TEAMWORK · DRIVE</span></div>
    </section>
    <ClosedNotice />
    <section className="section"><div className="section-heading"><div><p className="eyebrow">The mindset</p><h2>More than a name.</h2></div><span className="muted">This is Deicidee</span></div><div className="grid-three">{[
      ["01", "Lethal skill", "Practice with purpose. Build precision, awareness, and confidence in every match."],
      ["02", "Iron teamwork", "Communicate clearly, trust your teammates, and make your individual skill count for the team."],
      ["03", "Relentless drive", "Learn from each round. Keep improving and bring that same effort to your next challenge."],
    ].map(([number, title, description]) => <article className="panel value-panel" key={number}><span className="index">{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
    <section className="section"><div className="section-heading"><div><p className="eyebrow">Choose your arena</p><h2>One mode. Your focus.</h2></div><Link className="text-link" href="/tryouts">View tryouts ↗</Link></div><div className="grid-three">{tryoutModes.map((mode, i) => <Link key={mode.id} className="panel mode-card" href={`/tryouts#${mode.id}`}><span className="eyebrow">0{i + 1} / {mode.shortName}</span><h3>{mode.name}</h3><p>{content.modes[mode.id].approved ? content.modes[mode.id].description : "Rules and approved maps will be published here before recruitment opens."}</p><span className="text-link">Explore mode ↗</span></Link>)}</div></section>
    <section className="section journey"><p className="eyebrow">Your path to the clan</p><h2>Know what comes next.</h2><ol>{[["Read the requirements", "Compare the modes and choose exactly one."], ["Apply when intake opens", "Send your details through the application form."], ["Attend your tryout", "Coordinate the schedule with an officer through Discord."], ["Receive a decision", "An officer records the outcome and confirms your joining steps."]].map(([title, description]) => <li key={title}><h3>{title}</h3><p>{description}</p></li>)}</ol></section>
  </>;
}
