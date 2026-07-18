"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MdCheckCircle, MdArrowForward, MdInfo } from "react-icons/md";
import { FaRegCreditCard } from "react-icons/fa";
import { SubscriptionAutoRenewToggle } from "@/components/subscription-auto-renew-toggle";
import { DevicesList } from "@/components/devices-list";
import { ActionConfirmationModal } from "@/components/action-confirmation-modal";
import { ChangePlanModal } from "@/components/change-plan-modal";

interface UserSubscription {
    subscriptionId: number;
    name: string;
    maxDevices: number;
    expiresAt: string;
    autoRenew: boolean;
}

interface UserProfile {
    id: string;
    email: string | null;
    name: string | null;
    subscription: UserSubscription | null;
}

interface Transaction {
    id: string;
    date: string;
    amount: string;
    currency: string;
    description: string;
    status: string;
}

interface Device {
    id: string;
    activatedAt: string;
    lastSeenAt: string | null;
}

// Subscription.id -> ChangePlanModal's plan key (seed order: 1 monthly, 2 student, 3 yearly).
const SUBSCRIPTION_ID_TO_PLAN_KEY: Record<number, "monthly" | "student" | "yearly"> = {
    1: "monthly",
    2: "student",
    3: "yearly",
};

const STATUS_LABELS: Record<string, string> = {
    success: "Успешно",
    pending: "В обработке",
    failed: "Ошибка",
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("ru-RU");
}

function formatAmount(amount: string, currency: string): string {
    const value = Math.round(Number(amount));
    const formatted = value.toLocaleString("ru-RU");
    return currency === "RUB" ? `${formatted} ₽` : `${formatted} ${currency}`;
}

export default function ProfilePage() {
    return (
        <Suspense fallback={null}>
            <ProfilePageContent />
        </Suspense>
    );
}

function ProfilePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const paymentSuccess = searchParams.get("payment") === "success";

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [unauthenticated, setUnauthenticated] = useState(false);

    const [autoRenew, setAutoRenew] = useState(false);
    const [confirmAutoRenew, setConfirmAutoRenew] = useState<null | "on" | "off">(null);
    const [confirmResetDevices, setConfirmResetDevices] = useState(false);
    const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);

    const loadProfile = useCallback(async () => {
        const [userRes, historyRes, devicesRes] = await Promise.all([
            fetch("/api/user"),
            fetch("/api/payment/history"),
            fetch("/api/device"),
        ]);

        if (userRes.status === 401) {
            setUnauthenticated(true);
            setLoading(false);
            return;
        }

        if (userRes.ok) {
            const body = await userRes.json();
            if (body.ok) {
                setProfile(body.data as UserProfile);
                setAutoRenew(Boolean(body.data.subscription?.autoRenew));
            } else {
                setUnauthenticated(true);
                setLoading(false);
                return;
            }
        }

        if (historyRes.ok) {
            const body = await historyRes.json();
            if (body.ok) setTransactions(body.data as Transaction[]);
        }

        if (devicesRes.ok) {
            const body = await devicesRes.json();
            if (body.ok) setDevices(body.data as Device[]);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        if (unauthenticated) router.push("/auth");
    }, [unauthenticated, router]);

    // Webhook activation can land a couple seconds after the redirect back from checkout —
    // poll briefly so the banner turns into a real "Активна" state without a manual refresh.
    useEffect(() => {
        if (!paymentSuccess) return;
        const interval = setInterval(loadProfile, 2000);
        const timeout = setTimeout(() => clearInterval(interval), 10_000);
        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [paymentSuccess, loadProfile]);

    const handleToggleAutoRenew = (next: boolean) => {
        setConfirmAutoRenew(next ? "on" : "off");
    };

    const handleConfirmAutoRenew = () => {
        if (!confirmAutoRenew) return;
        setAutoRenew(confirmAutoRenew === "on");
        setConfirmAutoRenew(null);
        // TODO: автопродление отложено до отдельной итерации (recurring-списания через ЮKassa)
    };

    const handleCancelAutoRenew = () => {
        setConfirmAutoRenew(null);
    };

    const handleResetDevices = () => {
        setConfirmResetDevices(true);
    };

    const handleConfirmResetDevices = async () => {
        await fetch("/api/device/reset", { method: "POST" });
        setConfirmResetDevices(false);
        loadProfile();
    };

    const handleCancelResetDevices = () => {
        setConfirmResetDevices(false);
    };

    if (loading || unauthenticated) {
        return (
            <div className="flex w-full flex-col items-center px-6 py-24 text-[var(--text-muted)]">
                Загрузка…
            </div>
        );
    }

    const subscription = profile?.subscription ?? null;
    const currentPlanKey = subscription ? SUBSCRIPTION_ID_TO_PLAN_KEY[subscription.subscriptionId] ?? "monthly" : "monthly";
    const devicesLimit = subscription?.maxDevices ?? 1;

    return (
        <>
            <div className="flex w-full flex-col items-center px-6 py-16 md:py-20">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
                    {paymentSuccess && (
                        <div className="flex items-center gap-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-5 py-4 text-[13px] md:text-[14px] text-white">
                            <MdInfo className="text-lg text-[var(--accent)] shrink-0" />
                            <span>
                                Платёж обрабатывается. Обычно подписка активируется в течение нескольких
                                секунд — эта страница обновится автоматически.
                            </span>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-[30px] md:text-[34px] font-bold text-white">
                                Аккаунт HumanType
                            </h1>
                            <p className="text-[14px] md:text-[16px] text-[var(--text-muted)]">
                                {profile?.email ?? profile?.name ?? "Управляй подпиской, устройствами и оплатой в одном месте."}
                            </p>
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
                                    {subscription ? (
                                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/12 px-4 py-1.5 text-[12px] font-medium text-[var(--accent)] border border-[var(--accent)]/40">
                                            <MdCheckCircle className="text-sm" />
                                            <span>Активна</span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-1.5 text-[12px] font-medium text-[var(--text-muted)] border border-[var(--border)]">
                                            <span>Нет подписки</span>
                                        </div>
                                    )}
                                </div>

                                {subscription ? (
                                    <div className="mb-7 rounded-2xl border border-[var(--border)] bg-[var(--bg-main)]/60 p-5 flex flex-col gap-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[13px] text-[var(--text-muted)]">План</p>
                                                <p className="text-[16px] md:text-[17px] font-semibold text-white">
                                                    {subscription.name}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[13px] text-[var(--text-muted)]">
                                                    Действует до
                                                </p>
                                                <p className="text-[16px] md:text-[17px] font-semibold text-white">
                                                    {formatDate(subscription.expiresAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-7 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-main)]/60 p-5 text-[13px] md:text-[14px] text-[var(--text-muted)]">
                                        Активной подписки нет.{" "}
                                        <a href="/payment" className="text-[var(--primary)] hover:underline">
                                            Выбрать тариф
                                        </a>
                                    </div>
                                )}

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
                                        <span className="font-semibold text-white">{devices.length}</span>{" "}
                                        из{" "}
                                        <span className="font-semibold text-white">{devicesLimit}</span>{" "}
                                        устройств используется
                                    </p>
                                </div>

                                <DevicesList devices={devices} />

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
                                {transactions.length === 0 && (
                                    <p className="text-[13px] text-[var(--text-muted)]">Платежей ещё не было.</p>
                                )}
                                {transactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-main)]/60 px-4 py-3.5"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[12px] text-[var(--text-muted)]">
                                                    {formatDate(tx.date)} · {tx.id.slice(0, 8)}
                                                </p>
                                                <p className="text-[14px] md:text-[15px] font-semibold text-white">
                                                    {tx.description}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[14px] md:text-[15px] font-semibold text-white">
                                                    {formatAmount(tx.amount, tx.currency)}
                                                </p>
                                                <p className="text-[12px] text-[var(--accent)]">
                                                    {STATUS_LABELS[tx.status] ?? tx.status}
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
                currentPlanKey={currentPlanKey}
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
