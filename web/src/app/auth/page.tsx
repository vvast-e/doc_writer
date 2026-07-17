"use client";

import Link from "next/link";
import { useState } from "react";
import { FaGoogle, FaVk, FaYandex } from "react-icons/fa";

export default function AuthPage() {
    const [mode, setMode] = useState<"login" | "register">("login");

    return (
        <div className="flex w-full flex-col items-center px-4 py-16">
            <div className="mx-auto flex w-full max-w-md flex-col gap-8">
                <div className="text-center space-y-3">

                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                        {mode === "login" ? "Войти в аккаунт HumanType" : "Создать аккаунт HumanType"}
                    </h1>
                    <p className="text-xs md:text-sm text-[var(--text-muted)]">
                        Вход без пароля — достаточно аккаунта в одном из сервисов.
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-surface)_92%,black)]/95 p-5 md:p-6 shadow-xl">
                    {/* Tabs */}
                    <div className="mb-5 grid grid-cols-2 rounded-xl bg-[var(--bg-main)]/80 p-1 text-xs md:text-sm">
                        <button
                            type="button"
                            onClick={() => setMode("login")}
                            className={`rounded-lg px-3 py-2 font-semibold transition ${mode === "login"
                                ? "bg-[var(--primary)] text-white shadow-sm"
                                : "text-[var(--text-muted)] hover:text-white"
                                }`}
                        >
                            Вход
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("register")}
                            className={`rounded-lg px-3 py-2 font-semibold transition ${mode === "register"
                                ? "bg-[var(--accent)] text-white shadow-sm"
                                : "text-[var(--text-muted)] hover:text-white"
                                }`}
                        >
                            Регистрация
                        </button>
                    </div>

                    {/* OAuth */}
                    <div className="space-y-2.5 mb-4">
                        <a
                            href="/api/user/oauth/yandex"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-main)]/80 px-3 py-2.5 text-xs md:text-sm font-medium text-[var(--text-main)] hover:border-[#FC3F1D] hover:text-white transition"
                        >
                            <FaYandex className="text-base md:text-lg text-[#FC3F1D]" />
                            {mode === "login" ? "Войти через Яндекс" : "Продолжить через Яндекс"}
                        </a>

                        <a
                            href="/api/user/oauth/vk"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-main)]/80 px-3 py-2.5 text-xs md:text-sm font-medium text-[var(--text-main)] hover:border-[#0077FF] hover:text-white transition"
                        >
                            <FaVk className="text-base md:text-lg text-[#0077FF]" />
                            {mode === "login" ? "Войти через VK ID" : "Продолжить через VK ID"}
                        </a>

                        <a
                            href="/api/user/oauth/google"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-main)]/80 px-3 py-2.5 text-xs md:text-sm font-medium text-[var(--text-main)] hover:border-[#FFFFFF] hover:text-white transition"
                        >
                            <FaGoogle className="text-base md:text-lg text-[#FFFFFF]" />
                            {mode === "login" ? "Войти через Google" : "Продолжить через Google"}
                        </a>
                    </div>

                    <p className="mt-4 text-center text-[11px] md:text-xs text-[var(--text-muted)]">
                        Нажимая кнопку, ты соглашаешься с{" "}
                        <Link
                            href="/terms"
                            className="underline underline-offset-2 hover:text-[var(--accent)]"
                        >
                            условиями использования
                        </Link>{" "}
                        и{" "}
                        <Link
                            href="/privacy"
                            className="underline underline-offset-2 hover:text-[var(--accent)]"
                        >
                            политикой конфиденциальности
                        </Link>
                        .
                    </p>
                </div>

                <div className="text-[10px] md:text-xs text-center text-[var(--text-muted)]">
                    <p>
                        Сейчас доступен вход только через Яндекс, VK и Google.
                    </p>
                    <p>
                        Позже добавим авторизацию по почте и паролю.
                    </p>
                </div>
            </div>
        </div>
    );
}
