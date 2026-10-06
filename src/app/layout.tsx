import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deicidee | CrossFire Clan",
  description: "Deicidee CrossFire clan. Prove your skill. Earn your place.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
