export const metadata = {
    title: "Контакты и реквизиты — HumanType",
    description: "Контактная информация и реквизиты сервиса HumanType.",
};

export default function ContactsPage() {
    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-16 space-y-10 text-[var(--text-main)]">
            <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    Контакты и реквизиты
                </h1>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Свяжитесь с нами по любым вопросам об оплате, подписке или работе приложения.
                </p>
            </div>

            <section className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-2">
                <h2 className="text-lg font-bold text-white mb-2">Реквизиты исполнителя</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Астахов Иван Александрович
                    <br />
                    Статус: плательщик налога на профессиональный доход (самозанятый)
                    <br />
                    ИНН: 505204469403
                </p>
            </section>

            <section className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-2">
                <h2 className="text-lg font-bold text-white mb-2">Связь</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Email:{" "}
                    <a href="mailto:support@humantype.ru" className="text-[var(--primary)] hover:underline">
                        support@humantype.ru
                    </a>
                </p>
            </section>

            <section className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-2">
                <h2 className="text-lg font-bold text-white mb-2">Как получить доступ после оплаты</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    HumanType — цифровая услуга без физической доставки. После подтверждения оплаты подписка
                    активируется автоматически:
                </p>
                <ul className="list-disc list-inside text-[var(--text-muted)] space-y-1.5 leading-relaxed">
                    <li>статус подписки и история платежей видны в личном кабинете на сайте;</li>
                    <li>
                        десктопное приложение можно скачать на странице{" "}
                        <a href="/download" className="text-[var(--primary)] hover:underline">
                            /download
                        </a>{" "}
                        и привязать к аккаунту кодом из личного кабинета.
                    </li>
                </ul>
            </section>

            <p className="text-sm text-[var(--text-muted)]">
                Условия оказания услуг —{" "}
                <a href="/oferta" className="text-[var(--primary)] hover:underline">
                    публичная оферта
                </a>
                , обработка данных —{" "}
                <a href="/privacy" className="text-[var(--primary)] hover:underline">
                    политика конфиденциальности
                </a>
                .
            </p>
        </div>
    );
}
