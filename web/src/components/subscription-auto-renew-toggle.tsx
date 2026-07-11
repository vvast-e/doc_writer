"use client";

type Props = {
    enabled: boolean;
    onToggle: (next: boolean) => void;
};

export function SubscriptionAutoRenewToggle({ enabled, onToggle }: Props) {
    return (
        <button
            type="button"
            onClick={() => onToggle(!enabled)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-main)]/80 px-4 py-2.5 text-[12px] md:text-[13px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition"
        >
            <span
                className={`inline-flex h-4 w-8 items-center rounded-full transition ${enabled ? "bg-[var(--accent-muted)]" : "bg-[var(--bg-surface)]"
                    }`}
            >
                <span
                    className={`h-4.5 w-4.5 rounded-full bg-white shadow-sm transform transition-transform ${enabled ? "translate-x-3.5" : "translate-x-0.5"
                        }`}
                />
            </span>
            <span
                className={enabled ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}
            >
                {enabled ? "Автопродление включено" : "Автопродление выключено"}
            </span>
        </button>
    );
}
