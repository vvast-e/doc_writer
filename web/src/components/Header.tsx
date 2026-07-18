"use client";

import Link from "next/link";
import { useState } from "react";
import { MdPerson } from "react-icons/md";

export function Header() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-main)_90%,black)]/90 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
                {/* Лого */}
                <Link
                    href="/"
                    className="flex items-center gap-2 text-xl font-bold text-white transition-transform duration-200 hover:scale-[1.02]"
                >
                    <span className="flex items-center gap-0.5">
                        <span className="text-[var(--accent)]">Human</span>
                        <span className="text-[var(--primary)]">Type</span>
                    </span>
                </Link>

                {/* Десктоп навигация */}
                <nav className="hidden items-center gap-6 text-sm text-[var(--text-muted)] md:flex">
                    <Link
                        className="rounded-md px-2 py-1 transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                        href="/"
                    >
                        Главная
                    </Link>
                    <Link
                        className="rounded-md px-2 py-1 transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                        href="/download"
                    >
                        Скачать
                    </Link>
                    <Link
                        className="rounded-md px-2 py-1 transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                        href="/payment"
                    >
                        Оплата
                    </Link>
                    <Link
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                        href="/profile"
                    >
                        <MdPerson className="text-base" />
                        ЛК
                    </Link>
                </nav>

                {/* Справа: CTA + бургер */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/download"
                        className="hidden items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--primary-hover)] hover:shadow-lg md:inline-flex"
                    >
                        Попробовать
                    </Link>

                    {/* Бургер только на мобиле */}
                    <button
                        type="button"
                        aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
                        onClick={() => setMobileOpen((v) => !v)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] shadow-sm ring-1 ring-[var(--border)] md:hidden"
                    >
                        <span className="sr-only">
                            {mobileOpen ? "Закрыть меню" : "Открыть меню"}
                        </span>
                        <div className="relative h-4 w-5">
                            <span
                                className={`absolute inset-x-0 top-0 h-0.5 rounded-full bg-[var(--text-main)] transition-transform duration-200 ${mobileOpen ? "translate-y-1.5 rotate-45" : ""
                                    }`}
                            />
                            <span
                                className={`absolute inset-x-0 top-1.5 h-0.5 rounded-full bg-[var(--text-main)] transition-opacity duration-200 ${mobileOpen ? "opacity-0" : "opacity-100"
                                    }`}
                            />
                            <span
                                className={`absolute inset-x-0 top-3 h-0.5 rounded-full bg-[var(--text-main)] transition-transform duration-200 ${mobileOpen ? "-translate-y-1.5 -rotate-45" : ""
                                    }`}
                            />
                        </div>
                    </button>
                </div>
            </div>

            {/* Мобильное меню */}
            {mobileOpen && (
                <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-main)]/98">
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-3 text-sm">
                        <Link
                            href="/"
                            onClick={() => setMobileOpen(false)}
                            className="rounded-lg px-2 py-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                        >
                            Главная
                        </Link>
                        <Link
                            href="/download"
                            onClick={() => setMobileOpen(false)}
                            className="rounded-lg px-2 py-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                        >
                            Скачать
                        </Link>
                        <Link
                            href="/payment"
                            onClick={() => setMobileOpen(false)}
                            className="rounded-lg px-2 py-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                        >
                            Оплата
                        </Link>
                        <Link
                            href="/profile"
                            onClick={() => setMobileOpen(false)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                        >
                            <MdPerson className="text-base" />
                            ЛК
                        </Link>
                        <Link
                            href="/auth"
                            onClick={() => setMobileOpen(false)}
                            className="mt-2 inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--primary-hover)] hover:shadow-lg"
                        >
                            Попробовать
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
