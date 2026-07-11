"use client";

import { useState } from "react";
import { MdCheck, MdArrowBack } from "react-icons/md";
import { ActionConfirmationModal } from "@/components/action-confirmation-modal";

type PlanKey = "monthly" | "student" | "yearly";

const plans = [
    {
        key: "monthly" as PlanKey,
        title: "Месячная",
        price: "299 ₽",
        period: "за месяц",
        description: "Если хочется попробовать на каждый день",
        features: [
            "Безлимитный набор текста",
            "Google Docs, Notion, Word Online",
            "Работа на 1 устройстве",
            "Отмена в любой момент",
        ],
    },
    {
        key: "student" as PlanKey,
        title: "Студенческая",
        price: "1 199 ₽",
        period: "за 6 месяцев",
        description: "Закрывает весь семестр с первого дня занятий",
        features: [
            "Доступ ко всем функциям на 6 месяцев",
            "Выгоднее, чем продлевать помесячно",
            "Все обновления в течение семестра",
            "Работа на 2 устройствах",
            "Приоритетные ответы поддержки",
        ],
        badge: "Выгодно",
    },
    {
        key: "yearly" as PlanKey,
        title: "Годовая",
        price: "1 999 ₽",
        period: "за год",
        description: "Для тех, кто регулярно учится",
        features: [
            "Доступ ко всем функциям на 12 месяцев",
            "Максимальный приоритет поддержки",
            "Ранний доступ к новым функциям",
            "Работа на 3 устройствах одновременно",
        ],
    },
];

type ChangePlanModalProps = {
    open: boolean;
    currentPlanKey: PlanKey;
    onClose: () => void;
};

export function ChangePlanModal({
    open,
    currentPlanKey,
    onClose,
}: ChangePlanModalProps) {
    const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
    const [confirmCancel, setConfirmCancel] = useState(false);

    if (!open) return null;

    const handleSelectPlan = (key: PlanKey) => {
        if (key === currentPlanKey) return;
        setPendingPlan(key);
    };

    const handleConfirmChange = () => {
        if (!pendingPlan) return;
        // TODO: вызвать мутацию смены тарифа
        setPendingPlan(null);
        onClose();
    };

    const handleCancelChange = () => {
        setPendingPlan(null);
    };

    const handleRequestCancelSubscription = () => {
        setConfirmCancel(true);
    };

    const handleConfirmCancelSubscription = () => {
        // TODO: вызвать отключение подписки
        setConfirmCancel(false);
        onClose();
    };

    const handleCancelCancelSubscription = () => {
        setConfirmCancel(false);
    };

    const currentPlan = plans.find((p) => p.key === currentPlanKey);

    return (
        <>
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4">
                <div className="w-full max-w-5xl max-h-[min(640px,100vh-40px)] rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 border-b border-[var(--border)]/70">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-main)]/80 px-3 py-2.5 text-[12px] md:text-[13px] font-semibold text-white shadow-sm hover:border-[var(--text-muted)] hover:bg-[var(--bg-main)] hover:shadow-md transition"
                        >
                            <MdArrowBack className="text-sm" />
                            <span>Назад</span>
                        </button>

                        <div className="flex-1 flex flex-col items-center">
                            <h2 className="text-[17px] md:text-[19px] font-bold text-white">
                                Сменить тариф
                            </h2>
                            {currentPlan && (
                                <p className="mt-0.5 text-[11px] md:text-[12px] text-[var(--text-muted)]">
                                    Текущий план:{" "}
                                    <span className="font-semibold text-white">
                                        {currentPlan.title}
                                    </span>
                                </p>
                            )}
                        </div>

                        <div className="w-[80px] md:w-[96px]" />
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-5">
                        {/* Мобильный текст-пояснение (как в десктопном футере) */}
                        <p className="mb-3 text-[11px] text-[var(--text-muted)] md:hidden">
                            При смене тарифа оставшийся оплаченный период будет учтён, действие
                            нового тарифа начнётся после окончания текущего.
                        </p>

                        <div className="grid md:grid-cols-3 gap-5">
                            {plans.map((plan) => {
                                const isCurrent = plan.key === currentPlanKey;

                                return (
                                    <div
                                        key={plan.key}
                                        className={[
                                            "relative p-5 rounded-2xl bg-[var(--bg-main)]/70 border flex flex-col shadow-md transition-all",
                                            "border-[var(--border)] outline outline-1 outline-transparent",
                                            "hover:outline-[var(--text-muted)] hover:shadow-xl hover:z-10",
                                            isCurrent
                                                ? "border-[var(--primary)] outline-[var(--primary)] outline-1 ring-0 z-10"
                                                : "",
                                        ].join(" ")}
                                    >
                                        {/* Верхняя часть: заголовок, цена, бейдж */}
                                        <div className="mb-3 flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="text-[15px] md:text-[16px] font-semibold text-white mb-1.5">
                                                    {plan.title}
                                                </h3>
                                                <div className="flex items-baseline gap-1.5 mb-1">
                                                    <span className="text-2xl md:text-3xl font-bold text-white">
                                                        {plan.price}
                                                    </span>
                                                    <span className="text-[11px] md:text-[12px] text-[var(--text-muted)]">
                                                        {plan.period}
                                                    </span>
                                                </div>
                                            </div>

                                            {plan.badge && (
                                                <div className="inline-flex items-center rounded-full bg-[var(--primary)]/18 border border-[var(--primary)]/70 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
                                                    {plan.badge}
                                                </div>
                                            )}
                                        </div>

                                        <p className="mb-4 text-[11px] md:text-[12px] text-[var(--text-muted)]">
                                            {plan.description}
                                        </p>

                                        <ul className="space-y-2 mb-5 text-[11px] md:text-[12px] flex-grow">
                                            {plan.features.map((item, i) => (
                                                <li
                                                    key={i}
                                                    className="flex items-start gap-2 text-[var(--text-main)]"
                                                >
                                                    <MdCheck className="mt-0.5 text-[var(--accent)] text-base shrink-0" />
                                                    <span className="leading-snug text-[var(--text-muted)]">
                                                        {item}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            type="button"
                                            disabled={isCurrent}
                                            onClick={() => handleSelectPlan(plan.key)}
                                            className={[
                                                "w-full py-2.5 rounded-xl text-[12px] md:text-[13px] font-semibold transition-all text-center",
                                                isCurrent
                                                    ? "border border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] cursor-default"
                                                    : "border border-[var(--border)] text-white hover:bg-[var(--border)] hover:border-[var(--text-muted)]",
                                            ].join(" ")}
                                        >
                                            {isCurrent ? "Текущий тариф" : "Перейти на этот тариф"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* На мобиле: кнопка отключения подписки по центру, ниже по скроллу */}
                        <div className="mt-5 flex justify-center md:hidden">
                            <button
                                type="button"
                                onClick={handleRequestCancelSubscription}
                                className="inline-flex items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--primary)]/10 px-4 py-2 text-[12px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition"
                            >
                                Отключить подписку
                            </button>
                        </div>
                    </div>

                    {/* Footer – десктоп */}
                    <div className="px-5 pb-4 pt-3 md:px-6 md:pb-5 md:pt-3 border-t border-[var(--border)]/70 hidden md:block">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-[11px] md:text-[12px] text-[var(--text-muted)]">
                            <p>
                                При смене тарифа оставшийся оплаченный период будет учтён, действие
                                нового тарифа начнётся после окончания текущего.
                            </p>
                            <button
                                type="button"
                                onClick={handleRequestCancelSubscription}
                                className="inline-flex items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--primary)]/10 px-4 py-2 text-[12px] md:text-[13px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition"
                            >
                                Отключить подписку
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ActionConfirmationModal
                open={pendingPlan !== null}
                title="Сменить тариф?"
                description={
                    pendingPlan
                        ? "Мы поменяем твой текущий тариф на новый, оставшийся оплаченный период будет пересчитан по правилам сервиса."
                        : ""
                }
                confirmLabel="Сменить тариф"
                onConfirm={handleConfirmChange}
                onCancel={handleCancelChange}
            />

            <ActionConfirmationModal
                open={confirmCancel}
                title="Отключить подписку?"
                description="После отключения подписка будет активна до конца оплаченного периода, затем доступ к функционалу пропадёт."
                confirmLabel="Отключить подписку"
                onConfirm={handleConfirmCancelSubscription}
                onCancel={handleCancelCancelSubscription}
            />
        </>
    );
}
