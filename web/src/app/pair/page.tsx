"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PairPage() {
    const router = useRouter();
    const [code, setCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [remaining, setRemaining] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const requestCode = useCallback(async () => {
        setLoading(true);
        setError(null);
        setCode(null);
        try {
            const res = await fetch("/api/device/pair", { method: "POST" });
            if (res.status === 401) {
                router.replace("/auth");
                return;
            }
            const json = await res.json();
            if (!res.ok || !json.ok) {
                setError(json.error?.message ?? "Не удалось получить код");
                return;
            }
            setCode(json.data.code);
            setExpiresAt(new Date(json.data.expiresAt).getTime());
        } catch {
            setError("Не удалось связаться с сервером");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        requestCode();
    }, [requestCode]);

    useEffect(() => {
        if (!expiresAt) return;
        const tick = () => setRemaining(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    const expired = expiresAt !== null && remaining <= 0;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return (
        <div className="flex w-full flex-col items-center px-4 py-16">
            <div className="mx-auto flex w-full max-w-md flex-col gap-6 text-center">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Привязка устройства</h1>
                    <p className="text-xs md:text-sm text-[var(--text-muted)]">
                        Введи этот код в приложении HumanType, чтобы завершить вход.
                    </p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-surface)_92%,black)]/95 p-8 shadow-xl flex flex-col items-center gap-4 min-h-[160px] justify-center">
                    {loading && <p className="text-sm text-[var(--text-muted)]">Генерируем код...</p>}

                    {!loading && error && (
                        <>
                            <p className="text-sm text-red-400">{error}</p>
                            <button
                                type="button"
                                onClick={requestCode}
                                className="rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 px-5 py-2.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition"
                            >
                                Попробовать снова
                            </button>
                        </>
                    )}

                    {!loading && !error && code && !expired && (
                        <>
                            <span className="text-5xl font-bold tracking-[0.3em] text-white font-mono">
                                {code}
                            </span>
                            <p className="text-xs text-[var(--text-muted)]">
                                Код действует ещё {minutes}:{seconds.toString().padStart(2, "0")}
                            </p>
                        </>
                    )}

                    {!loading && !error && expired && (
                        <>
                            <p className="text-sm text-[var(--text-muted)]">Код истёк</p>
                            <button
                                type="button"
                                onClick={requestCode}
                                className="rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 px-5 py-2.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition"
                            >
                                Обновить код
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
