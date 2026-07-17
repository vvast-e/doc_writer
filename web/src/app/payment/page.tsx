import Link from "next/link";
import { MdCheck, MdStar, MdRefresh, MdCreditCard, MdLock } from "react-icons/md";

export default function PaymentPage() {
    return (
        <div className="flex flex-col items-center w-full py-16 px-4">
            {/* Header */}
            <div className="text-center max-w-4xl mx-auto mb-14 space-y-4">
                <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight bg-gradient-to-r from-white via-[var(--primary)] to-[var(--accent)] bg-clip-text">
                    Простые тарифы
                </h1>
                <p className="text-base md:text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto">
                    Выбери план. Никаких скрытых платежей.
                </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl w-full mb-16">
                {/* Месяц */}
                <div className="relative p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col hover:border-[var(--text-muted)] transition-all group shadow-md hover:shadow-xl">
                    <div className="mb-5">
                        <h3 className="text-lg font-semibold text-[var(--text-muted)] mb-2 group-hover:text-white transition-colors">
                            Месячная
                        </h3>
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                            <span className="text-3xl md:text-4xl font-bold text-white">399 ₽</span>
                            <span className="text-xs md:text-sm text-[var(--text-muted)]">за месяц</span>
                        </div>
                        <p className="text-xs md:text-sm text-[var(--text-muted)]">
                            Если хочется попробовать на каждый день
                        </p>
                    </div>

                    <ul className="space-y-2.5 mb-6 text-xs md:text-sm flex-grow">
                        {[
                            "Безлимитный набор текста",
                            "Google Docs, Word Online",
                            "Работа на 1 устройстве",
                            "Отмена в любой момент",
                        ].map((item, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-2.5 text-[var(--text-main)] group-hover:text-white transition-colors"
                            >
                                <MdCheck className="text-lg text-[var(--accent)] shrink-0 mt-0.5" />
                                <span className="leading-snug">{item}</span>
                            </li>
                        ))}
                    </ul>

                    <Link
                        href="/auth"
                        className="w-full py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-white hover:bg-[var(--border)] hover:border-[var(--text-muted)] transition-all text-center shadow-sm hover:shadow-md"
                    >
                        Выбрать месячную
                    </Link>
                </div>

                {/* Студенческая (6 месяцев) – выгодно */}
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-[var(--primary)]/15 via-[var(--bg-surface)] to-[var(--primary)]/15 border-2 border-[var(--primary)] flex flex-col shadow-xl group">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white text-[11px] md:text-xs font-black px-4 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-xl ring-2 ring-[var(--primary)]/30">
                        <MdStar className="text-sm" />
                        ВЫГОДНО −20%
                    </div>

                    <div className="mb-5 pt-4">
                        <h3 className="text-lg font-bold text-[var(--primary)] mb-2">
                            Студенческая
                        </h3>
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                            <span className="text-3xl md:text-4xl font-bold text-white">1 899 ₽</span>
                            <span className="text-xs md:text-sm text-[var(--text-muted)]">за 6 месяцев</span>
                        </div>
                        <p className="text-xs md:text-sm text-white/90">
                            Закрывает весь семестр с первого дня занятий
                        </p>
                    </div>

                    <ul className="space-y-2.5 mb-6 text-xs md:text-sm flex-grow">
                        {[
                            "Доступ ко всем функциям на 6 месяцев",
                            "Выгоднее, чем продлевать помесячно",
                            "Все обновления в течение семестра",
                            "Работа на 2 устройствах",
                            "Приоритетные ответы поддержки",
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-white/95">
                                <MdCheck className="text-lg text-[var(--accent)] shrink-0 mt-0.5" />
                                <span className="leading-snug">{item}</span>
                            </li>
                        ))}
                    </ul>

                    <Link
                        href="/auth"
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] hover:from-[var(--primary-hover)] hover:to-[var(--primary)] text-sm font-bold text-white transition-all text-center shadow-xl hover:shadow-2xl ring-2 ring-[var(--primary)]/50 hover:ring-[var(--primary)]/70 transform hover:-translate-y-0.5"
                    >
                        Взять на семестр
                    </Link>

                    <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] md:text-xs text-white/80">
                        <MdRefresh className="text-sm" />
                        <span>Можно перейти на годовой позже</span>
                    </div>
                </div>

                {/* Годовая */}
                <div className="relative p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col hover:border-[var(--text-muted)] transition-all group shadow-md hover:shadow-xl">
                    <div className="mb-5">
                        <h3 className="text-lg font-semibold text-[var(--text-muted)] mb-2 group-hover:text-white transition-colors flex items-center gap-2">
                            Годовая
                            <span className="text-[10px] md:text-xs font-black text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-full px-2 py-0.5">
                                −30%
                            </span>
                        </h3>
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                            <span className="text-3xl md:text-4xl font-bold text-white">3 299 ₽</span>
                            <span className="text-xs md:text-sm text-[var(--text-muted)]">за год</span>
                        </div>
                        <p className="text-xs md:text-sm text-[var(--text-muted)]">
                            Для тех, кто регулярно учится
                        </p>
                    </div>

                    <ul className="space-y-2.5 mb-6 text-xs md:text-sm flex-grow">
                        {[
                            "Доступ ко всем функциям на 12 месяцев",
                            "Максимальный приоритет поддержки",
                            "Ранний доступ к новым функциям",
                        ].map((item, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-2.5 text-[var(--text-main)] group-hover:text-white transition-colors"
                            >
                                <MdCheck className="text-lg text-[var(--accent)] shrink-0 mt-0.5" />
                                <span className="leading-snug">{item}</span>
                            </li>
                        ))}
                    </ul>

                    <Link
                        href="/auth"
                        className="w-full py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-white hover:bg-[var(--border)] hover:border-[var(--text-muted)] transition-all text-center shadow-sm hover:shadow-md"
                    >
                        Выбрать годовую
                    </Link>
                </div>
            </div>

            {/* Доп: параллельные документы (скоро) */}
            <div className="w-full max-w-6xl mb-16">
                <div className="relative p-6 rounded-2xl bg-[var(--bg-surface)]/60 border border-dashed border-[var(--border)] flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div className="flex items-start gap-4">
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)]">
                            <MdRefresh className="text-2xl" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-white">Параллельные документы</h3>
                                <span className="text-[10px] md:text-xs font-black text-[var(--text-muted)] bg-white/5 border border-[var(--border)] rounded-full px-2 py-0.5">
                                    СКОРО
                                </span>
                            </div>
                            <p className="text-xs md:text-sm text-[var(--text-muted)] max-w-md">
                                Доп. подписка поверх основного тарифа — печать сразу в нескольких документах одновременно.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl md:text-3xl font-bold text-white">799 ₽</span>
                            <span className="text-xs md:text-sm text-[var(--text-muted)]">в месяц</span>
                        </div>
                        <button
                            type="button"
                            disabled
                            className="py-2.5 px-6 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text-muted)] cursor-not-allowed opacity-70"
                        >
                            Скоро
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Methods */}
            <div className="w-full max-w-4xl p-6 md:p-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xl mb-16">
                <div className="text-center mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Безопасная оплата</h3>
                    <p className="text-sm md:text-base text-[var(--text-muted)] max-w-2xl mx-auto">
                        Принимаем карты всех банков. SSL-шифрование. Данные карты не сохраняются на наших серверах.
                    </p>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-2xl border border-white/10">
                        <MdCreditCard className="text-xl text-[var(--accent)]" />
                        <span className="text-xs md:text-sm font-semibold text-white">Карты всех банков</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-2xl border border-white/10">
                        <MdLock className="text-xl text-[var(--accent)]" />
                        <span className="text-xs md:text-sm font-semibold text-white">SSL защита</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-2xl border border-white/10">
                        <MdRefresh className="text-xl text-[var(--accent)]" />
                        <span className="text-xs md:text-sm font-semibold text-white">Возврат 14 дней</span>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
                    <h4 className="text-sm md:text-base font-semibold text-white mb-2">Как получить доступ</h4>
                    <p className="text-xs md:text-sm text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
                        Это цифровая услуга без физической доставки. После оплаты подписка активируется
                        автоматически — статус виден в{" "}
                        <a href="/profile" className="text-[var(--primary)] hover:underline">
                            личном кабинете
                        </a>
                        , а приложение можно скачать на странице{" "}
                        <a href="/download" className="text-[var(--primary)] hover:underline">
                            /download
                        </a>{" "}
                        и привязать кодом из личного кабинета.
                    </p>
                </div>
            </div>

            {/* FAQ */}
            <div className="max-w-4xl w-full border-t border-[var(--border)] pt-12">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center bg-gradient-to-r from-white to-[var(--text-muted)] bg-clip-text">
                    Частые вопросы
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                    {[
                        {
                            q: "Как работает оплата?",
                            a: "Принимаем карты всех банков РФ. После оплаты вы сразу получаете возможность активировать функционал приложения на устройстве.",
                        },
                        {
                            q: "Можно ли вернуть деньги?",
                            a: "Да. Если HumanType вам не подошёл технически — вернём 100% суммы в течение 14 дней.",
                        },
                        {
                            q: "Чем отличаются популярные тарифы?",
                            a: "Студенческий рассчитан на один семестр, годовой даёт на год приоритетную поддержку и ранний доступ к новым функциям.",
                        },
                        {
                            q: "Безопасно ли платить?",
                            a: "Да. Платежи проходят через защищённый шлюз, мы не храним данные ваших карт.",
                        },
                    ].map((faq, i) => (
                        <div
                            key={i}
                            className="group p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--primary)] transition-all hover:shadow-xl"
                        >
                            <h4 className="text-lg md:text-xl font-bold text-white mb-3 group-hover:text-[var(--primary)] transition-colors">
                                {faq.q}
                            </h4>
                            <p className="text-[var(--text-muted)] leading-relaxed text-sm md:text-base">
                                {faq.a}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
