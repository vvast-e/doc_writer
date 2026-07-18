import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HumanType – AI text, human typing",
  description: "HumanType делает ИИ‑текст похожим на настоящий человеческий набор в онлайн-редакторах.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] antialiased`}
      >
        <Header />

        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="border-t border-[var(--border)] bg-[var(--bg-main)]/95 py-10">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
            <div className="flex items-center gap-0.5 text-lg font-semibold text-white">
              <span className="text-[var(--accent)]">Human</span>
              <span className="text-[var(--primary)]">Type</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-[var(--text-muted)]">
              <Link
                className="rounded-md px-2 py-1 transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                href="/privacy"
              >
                Privacy
              </Link>
              <Link
                className="rounded-md px-2 py-1 transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                href="/oferta"
              >
                Terms
              </Link>
              <Link
                className="rounded-md px-2 py-1 transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                href="/contacts"
              >
                Support
              </Link>
            </div>
            <p className="text-center text-sm text-[var(--text-muted)] md:text-right">
              © 2026 HumanType. Все права защищены.
              <br />
              ИНН 505204469403
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
