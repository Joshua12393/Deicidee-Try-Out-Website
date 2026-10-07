import type { Metadata } from "next";
import { CommunityLinks, PageIntro } from "@/components/public-content";
import { getPublicConfig } from "@/lib/public-config";
export const metadata: Metadata = { title: "Community | Deicidee" };
export default async function Community() {
  const { content } = await getPublicConfig();
  return <><PageIntro eyebrow="Stay connected" title="Find your squad.">Official Deicidee community channels will appear here when published by the clan administrator.</PageIntro><section className="panel"><h2>Meet us off the battlefield.</h2><p>Discord is the planned channel for arranging tryouts and receiving officer updates. Use the official links below when available.</p><CommunityLinks content={content} /></section><section className="section prose"><h2>Need to correct your information?</h2><p className="preserve-lines">{content.correctionContact || "The official contact is awaiting publication. Applications are still closed and no applicant details are collected here."}</p></section></>;
}
