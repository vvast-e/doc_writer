"use client";

type ActionConfirmationModalProps = {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel: string | React.ReactNode;
    cancelLabel?: string | React.ReactNode;
    confirmContent?: React.ReactNode;
    cancelContent?: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
};

export function ActionConfirmationModal({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel = "Отмена",
    confirmContent,
    cancelContent,
    onConfirm,
    onCancel,
}: ActionConfirmationModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)]/97 px-6 py-6 md:px-7 md:py-7 shadow-2xl">
                <h3 className="text-base md:text-lg font-semibold text-white">
                    {title}
                </h3>
                {description && (
                    <p className="mt-3 text-[13px] md:text-[14px] leading-relaxed text-[var(--text-muted)]">
                        {description}
                    </p>
                )}

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--primary)]/10 px-4 py-2 text-[12px] md:text-[13px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition"
                    >
                        {cancelContent ?? cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="inline-flex items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 text-[12px] md:text-[13px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition"
                    >
                        {confirmContent ?? confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
