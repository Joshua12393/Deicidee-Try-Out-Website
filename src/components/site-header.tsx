"use client";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { useFormStatus } from "react-dom";

import { usePathname, useSearchParams } from "next/navigation";
function LogoutButton() {
  const { pending } = useFormStatus();
  return <button className="button button-small secondary" disabled={pending}>{pending ? "Logging out…" : "Logout"}</button>;
}
export function SiteHeader({ officer }: { officer: { name: string; role: "admin" | "staff" } | null }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = pathname === "/tryouts" && search.get("tab") === "requirements" ? "/tryouts?tab=requirements" : pathname;
  return <header className="site-header"><div className="shell header-inner">
    <Link className="wordmark" href="/" aria-label="Deicidee home">DEICIDEE</Link>
    <nav aria-label="Main navigation">{[["/", "Home"], ["/tryouts", "Tryouts"], ["/tryouts?tab=requirements", "Requirements"], ["/faq", "FAQ"], ["/community", "Community"], ["/apply", "Recruitment status"]].map(([href, label]) => <Link key={href} href={href} className={current === href ? "current" : ""} aria-current={current === href ? "page" : undefined}>{label}</Link>)}</nav>
    {officer ? <div className="header-account"><Link href="/admin" className="officer-identity"><span className="signed-in-dot" aria-hidden="true" /><span><strong>{officer.name}</strong><small>{officer.role === "admin" ? "Admin" : "Staff"} · signed in</small></span></Link><form action={logout}><LogoutButton /></form></div> : <a href="/admin/login" className="button button-small">Staff login <span aria-hidden="true">↗</span></a>}
  </div></header>;
}
