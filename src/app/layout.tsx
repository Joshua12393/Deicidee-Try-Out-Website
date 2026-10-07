import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deicidee | CrossFire Clan",
  description: "Deicidee CrossFire clan. Prove your skill. Earn your place.",
  robots: { index: false, follow: false },
  icons: { icon: "/deicidee-logo.png", apple: "/deicidee-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="shell">{children}</main>
        <footer className="site-footer shell"><div><Link className="wordmark" href="/" aria-label="Deicidee home">DEICIDEE</Link><p>© {new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Manila" }).format(new Date())} Deicidee · CrossFire clan</p></div><nav aria-label="Footer navigation"><Link href="/community">Community</Link><Link href="/faq">FAQ</Link><Link href="/privacy">Privacy</Link><Link href="/admin">Officer access</Link></nav></footer>
      </body>
    </html>
  );
}
