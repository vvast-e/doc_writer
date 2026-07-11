"use client";

const mockDevices = [
    {
        id: "dev-1",
        name: "MacBook Pro 14”",
        os: "macOS 14 Sonoma",
        type: "Ноутбук",
        location: "Москва, Россия",
        activatedAt: "03.03.2025 · 14:21",
    },
    {
        id: "dev-2",
        name: "Домашний ПК",
        os: "Windows 11",
        type: "Desktop",
        location: "Реутов, Россия",
        activatedAt: "20.02.2025 · 19:03",
    },
];

export function DevicesList() {
    return (
        <div className="grid gap-3 text-[13px] md:text-[14px]">
            {mockDevices.map((d) => (
                <div
                    key={d.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-main)]/60 px-4 py-3.5"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-[14px] md:text-[15px] font-semibold text-white">
                                {d.name}
                            </p>
                            <p className="text-[12px] text-[var(--text-muted)]">
                                {d.os} · {d.type}
                            </p>
                            <p className="text-[12px] text-[var(--text-muted)]">
                                {d.location}
                            </p>
                        </div>
                        <div className="text-right text-[11px] md:text-[12px] text-[var(--text-muted)]">
                            <p>Активировано:</p>
                            <p>{d.activatedAt}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
