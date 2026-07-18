"use client";

interface Device {
    id: string;
    activatedAt: string;
    lastSeenAt: string | null;
}

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString("ru-RU");
}

export function DevicesList({ devices }: { devices: Device[] }) {
    if (devices.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-main)]/60 px-4 py-5 text-[13px] text-[var(--text-muted)]">
                Пока нет привязанных устройств.{" "}
                <a href="/pair" className="text-[var(--primary)] hover:underline">
                    Привязать приложение
                </a>{" "}
                кодом из личного кабинета.
            </div>
        );
    }

    return (
        <div className="grid gap-3 text-[13px] md:text-[14px]">
            {devices.map((d, i) => (
                <div
                    key={d.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-main)]/60 px-4 py-3.5"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-[14px] md:text-[15px] font-semibold text-white">
                                Устройство {i + 1}
                            </p>
                            <p className="text-[12px] text-[var(--text-muted)]">
                                ID: {d.id.slice(0, 8)}
                            </p>
                        </div>
                        <div className="text-right text-[11px] md:text-[12px] text-[var(--text-muted)] space-y-0.5">
                            <p>Активировано: {formatDateTime(d.activatedAt)}</p>
                            <p>
                                Последняя активность:{" "}
                                {d.lastSeenAt ? formatDateTime(d.lastSeenAt) : "—"}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
