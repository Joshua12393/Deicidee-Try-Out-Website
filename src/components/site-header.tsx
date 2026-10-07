"use client";
import Link from "next/link";

import { usePathname, useSearchParams } from "next/navigation";
export function SiteHeader() {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = pathname === "/tryouts" && search.get("tab") === "requirements" ? "/tryouts?tab=requirements" : pathname;
  return <header className="site-header"><div className="shell header-inner">
    <Link className="wordmark" href="/" aria-label="Deicidee home">DEICIDEE</Link>
    <nav aria-label="Main navigation">{[["/", "Home"], ["/tryouts", "Tryouts"], ["/tryouts?tab=requirements", "Requirements"], ["/faq", "FAQ"], ["/community", "Community"], ["/apply", "Recruitment status"]].map(([href, label]) => <Link key={href} href={href} className={current === href ? "current" : ""} aria-current={current === href ? "page" : undefined}>{label}</Link>)}</nav>
    <a href="/admin/login" className="button button-small">Staff login <span aria-hidden="true">↗</span></a>
  </div></header>;
}
