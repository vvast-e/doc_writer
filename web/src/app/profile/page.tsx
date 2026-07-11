"use client";

import { useState } from "react";
import { MdCheckCircle, MdArrowForward } from "react-icons/md";
import { FaRegCreditCard } from "react-icons/fa";
import { SubscriptionAutoRenewToggle } from "@/components/subscription-auto-renew-toggle";
import { DevicesList } from "@/components/devices-list";
import { ActionConfirmationModal } from "@/components/action-confirmation-modal";
import { ChangePlanModal } from "@/components/change-plan-modal";

const mockUser = {
    plan: "Годовая подписка",
    planKey: "yearly" as const,
    status: "active",
    renewsAt: "2026-02-28",
    startedAt: "2025-03-01",
    lastLoginAt: "05.03.2025 · 09:47",
    devicesUsed: 2,
    devicesLimit: 3,
};

const mockTransactions = [
    {
        id: "INV-2025-0001",
        date: "01.03.2025",
        amount: "1 999 ₽",
        description: "Годовая подписка",
        status: "Успешно",
    },
    {
        id: "INV-2024-0213",
        date: "15.12.2024",
        amount: "1 199 ₽",
        description: "Студенческая подписка",
        status: "Успешно",
    },
    {
        id: "INV-2024-0107",
        date: "01.09.2024",
        amount: "299 ₽",
        description: "Месячная подписка",
        status: "Успешно",
    },
];

export default function ProfilePage() {
    const [autoRenew, setAutoRenew] = useState(false);
    const [confirmAutoRenew, setConfirmAutoRenew] = useState<null | "on" | "off">(null);
    const [confirmResetDevices, setConfirmResetDevices] = useState(false);
    const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);

    const handleToggleAutoRenew = (next: boolean) => {
        setConfirmAutoRenew(next ? "on" : "off");
    };

    const handleConfirmAutoRenew = () => {
        if (!confirmAutoRenew) return;
        setAutoRenew(confirmAutoRenew === "on");
        setConfirmAutoRenew(null);
        // TODO: вызвать мутацию/виджет
    };

    const handleCancelAutoRenew = () => {
        setConfirmAutoRenew(null);
    };

    const handleResetDevices = () => {
        setConfirmResetDevices(true);
    };

    const handleConfirmResetDevices = () => {
        // TODO: вызвать сброс устройств
        setConfirmResetDevices(false);
    };

    const handleCancelResetDevices = () => {
        setConfirmResetDevices(false);
    };

    return (
        <>
            <div className="flex w-full flex-col items-center px-6 py-16 md:py-20">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
                    {/* Header */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        {/* mobile: last login above title */}
                        <div className="flex flex-col gap-2 md:hidden">
                            <div className="flex flex-col gap-1 text-[12px] text-[var(--text-muted)]">
                                <span className="uppercase tracking-[0.16em] text-[11px]">
                                    Последний вход
                                </span>
                                <span className="text-white text-[14px] font-medium">
                                    {mockUser.lastLoginAt}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-[30px] font-bold text-white">
                                    Аккаунт HumanType
                                </h1>
                                <p className="text-[14px] text-[var(--text-muted)]">
                                    Управляй подпиской, устройствами и оплатой в одном месте.
                                </p>
                            </div>
                        </div>

                        {/* desktop layout */}
                        <div className="hidden md:flex md:flex-col md:gap-2">
                            <h1 className="text-[34px] font-bold text-white">
                                Аккаунт HumanType
                            </h1>
                            <p className="text-[16px] text-[var(--text-muted)]">
                                Управляй подпиской, устройствами и оплатой в одном месте.
                            </p>
                        </div>
                        <div className="hidden md:flex flex-col items-end gap-1 text-[13px] text-[var(--text-muted)]">
                            <span className="uppercase tracking-[0.16em] text-[11px]">
                                Последний вход
                            </span>
                            <span className="text-white text-[15px] font-medium">
                                {mockUser.lastLoginAt}
                            </span>
                        </div>
                    </div>

                    {/* Grid: subscription + devices + transactions */}
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                        {/* Left column: subscription + devices */}
                        <div className="space-y-8">
                            {/* Subscription block */}
                            <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-7 md:p-8 shadow-xl">
                                <div className="mb-6 flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-[19px] md:text-[21px] font-bold text-white">
                                            Подписка
                                        </h2>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/12 px-4 py-1.5 text-[12px] font-medium text-[var(--accent)] border border-[var(--accent)]/40">
                                        <MdCheckCircle className="text-sm" />
                                        <span>Активна</span>
                                    </div>
                                </div>

                                <div className="mb-7 rounded-2xl border border-[var(--border)] bg-[var(--bg-main)]/60 p-5 flex flex-col gap-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-[13px] text-[var(--text-muted)]">План</p>
                                            <p className="text-[16px] md:text-[17px] font-semibold text-white">
                                                {mockUser.plan}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[13px] text-[var(--text-muted)]">
                                                Действует до
                                            </p>
                                            <p className="text-[16px] md:text-[17px] font-semibold text-white">
                                                {mockUser.renewsAt}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Timeline – градиент */}
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-[12px] md:text-[13px] text-[var(--text-muted)] mb-2">
                                            <span>Начало: {mockUser.startedAt}</span>
                                            <span>Продление: {mockUser.renewsAt}</span>
                                        </div>
                                        <div className="relative h-3 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] overflow-hidden">
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
                                                style={{ width: "68%" }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 text-[13px] md:text-[14px] text-[var(--text-muted)]">
                                    <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between gap-3">
                                        <SubscriptionAutoRenewToggle
                                            enabled={autoRenew}
                                            onToggle={handleToggleAutoRenew}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setIsChangePlanOpen(true)}
                                            className="inline-flex items-center justify-center md:justify-center rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 px-5 py-2.5 text-[12px] md:text-[13px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition w-full md:w-auto"
                                        >
                                            Сменить тариф
                                            <MdArrowForward className="text-sm ml-2" />
                                        </button>
                                    </div>
                                </div>

                            </div>

                            {/* Devices block */}
                            <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-7 md:p-8 shadow-xl">
                                <div className="mb-5 flex items-center justify-between gap-4">
                                    <h2 className="text-[19px] md:text-[21px] font-bold text-white">
                                        Устройства
                                    </h2>
                                    <p className="text-[12px] md:text-[13px] text-[var(--text-muted)]">
                                        <span className="font-semibold text-white">
                                            {mockUser.devicesUsed}
                                        </span>{" "}
                                        из{" "}
                                        <span className="font-semibold text-white">
                                            {mockUser.devicesLimit}
                                        </span>{" "}
                                        устройств используется
                                    </p>
                                </div>

                                <DevicesList />

                                <div className="mt-5 flex items-center justify-between text-[12px] md:text-[13px] text-[var(--text-muted)]">
                                    <p>Если видишь незнакомое устройство — сбрось все активации.</p>
                                    <button
                                        type="button"
                                        onClick={handleResetDevices}
                                        className="inline-flex items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 px-5 py-2.5 text-[12px] md:text-[13px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition"
                                    >
                                        Сбросить
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right column: transactions */}
                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-7 md:p-8 shadow-xl flex flex-col">
                            <div className="mb-6 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)]/12 text-[var(--accent)]">
                                        <FaRegCreditCard className="text-[20px]" />
                                    </div>
                                    <div>
                                        <h2 className="text-[19px] md:text-[21px] font-bold text-white">
                                            История оплат
                                        </h2>
                                        <p className="text-[12px] md:text-[13px] text-[var(--text-muted)]">
                                            Последние списания по подписке
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-3.5 text-[13px] md:text-[14px]">
                                {mockTransactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-main)]/60 px-4 py-3.5"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[12px] text-[var(--text-muted)]">
                                                    {tx.date} · {tx.id}
                                                </p>
                                                <p className="text-[14px] md:text-[15px] font-semibold text-white">
                                                    {tx.description}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[14px] md:text-[15px] font-semibold text-white">
                                                    {tx.amount}
                                                </p>
                                                <p className="text-[12px] text-[var(--accent)]">
                                                    {tx.status}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="mt-6 text-[12px] md:text-[13px] text-[var(--text-muted)]">
                                Если в выписке банка не сходится сумма или дата списания — напиши в
                                поддержку, мы поможем разобраться.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Модалка смены тарифа */}
            <ChangePlanModal
                open={isChangePlanOpen}
                currentPlanKey={mockUser.planKey}
                onClose={() => setIsChangePlanOpen(false)}
            />


            {/* Модалка подтверждения автопродления */}
            <ActionConfirmationModal
                open={confirmAutoRenew !== null}
                title={
                    confirmAutoRenew === "on"
                        ? "Включить автопродление?"
                        : "Выключить автопродление?"
                }
                description={
                    confirmAutoRenew === "on"
                        ? "С карты будут списываться платежи автоматически в день продления."
                        : "После выключения автопродления подписка завершится в дату окончания текущего периода."
                }
                confirmLabel={confirmAutoRenew === "on" ? "Включить" : "Выключить"}
                onConfirm={handleConfirmAutoRenew}
                onCancel={handleCancelAutoRenew}
            />

            {/* Модалка подтверждения сброса устройств */}
            <ActionConfirmationModal
                open={confirmResetDevices}
                title="Сбросить привязанные устройства?"
                description="Все текущие сессии будут деактивированы. Чтобы продолжить пользоваться HumanType, нужно будет заново войти на устройствах."
                confirmLabel="Сбросить устройства"
                onConfirm={handleConfirmResetDevices}
                onCancel={handleCancelResetDevices}
            />
        </>
    );
}
