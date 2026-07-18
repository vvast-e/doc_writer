export const metadata = {
    title: "Публичная оферта — HumanType",
    description: "Публичная оферта на оказание услуг сервиса HumanType.",
};

export default function OfertaPage() {
    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-16 space-y-8 text-[var(--text-main)]">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
                Публичная оферта
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
                Действует с 18.07.2026
            </p>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">1. Общие положения</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Настоящий документ является официальным предложением (публичной офертой) Астахова Ивана
                    Александровича, плательщика налога на профессиональный доход (самозанятого), ИНН 505204469403
                    (далее — «Исполнитель»), заключить договор оказания услуг на изложенных ниже условиях в
                    соответствии со ст. 437 Гражданского кодекса РФ.
                </p>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Акцептом оферты (полным и безоговорочным принятием её условий) является факт оплаты услуг
                    физическим лицом (далее — «Пользователь») на сайте humantype.ru.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">2. Предмет оферты</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Исполнитель предоставляет Пользователю доступ к сервису HumanType — десктопному приложению и
                    личному кабинету на сайте, по модели платной подписки. Действующие тарифы, их стоимость и
                    состав указаны на странице{" "}
                    <a href="/payment" className="text-[var(--primary)] hover:underline">
                        humantype.ru/payment
                    </a>{" "}
                    и являются неотъемлемой частью настоящей оферты.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">3. Порядок оплаты</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Оплата производится на сайте humantype.ru банковской картой через платёжный сервис ЮKassa.
                    Исполнитель не получает и не хранит данные банковских карт Пользователя — обработка платежей
                    выполняется ЮKassa в соответствии с требованиями безопасности PCI DSS.
                </p>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Подписка действует фиксированный срок, соответствующий выбранному тарифу (1, 6 или 12 месяцев).
                    Автоматическое списание по истечении срока подписки не производится — продление осуществляется
                    повторной оплатой Пользователем на сайте.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">4. Порядок предоставления услуг</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Услуга является цифровой и предоставляется без физической доставки. После подтверждения оплаты
                    подписка активируется автоматически, обычно в течение нескольких минут:
                </p>
                <ul className="list-disc list-inside text-[var(--text-muted)] space-y-1.5 leading-relaxed">
                    <li>статус подписки и история платежей отображаются в личном кабинете на сайте;</li>
                    <li>
                        десктопное приложение доступно для скачивания на странице{" "}
                        <a href="/download" className="text-[var(--primary)] hover:underline">
                            humantype.ru/download
                        </a>{" "}
                        и привязывается к аккаунту Пользователя кодом из личного кабинета.
                    </li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">5. Возврат денежных средств</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Пользователь вправе запросить возврат полной суммы оплаты в течение 14 календарных дней с даты
                    платежа, если сервис не подошёл технически. Для возврата необходимо обратиться по адресу{" "}
                    <a href="mailto:support@humantype.ru" className="text-[var(--primary)] hover:underline">
                        support@humantype.ru
                    </a>
                    .
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">6. Ответственность сторон</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Исполнитель не несёт ответственности за невозможность оказания услуг по причинам, не зависящим
                    от него (сбои в работе сторонних сервисов — Google Docs, платёжного провайдера, интернет-провайдеров
                    Пользователя). Стороны несут ответственность в соответствии с законодательством РФ.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">7. Персональные данные</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Обработка персональных данных Пользователя осуществляется в соответствии с{" "}
                    <a href="/privacy" className="text-[var(--primary)] hover:underline">
                        Политикой конфиденциальности
                    </a>
                    .
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">8. Заключительные положения</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Исполнитель вправе изменять условия оферты в одностороннем порядке с публикацией новой редакции
                    на сайте. Действующая редакция всегда доступна по адресу humantype.ru/oferta. Споры разрешаются
                    в соответствии с законодательством Российской Федерации.
                </p>
            </section>

            <section className="space-y-2 pt-6 border-t border-[var(--border)]">
                <h2 className="text-xl font-bold text-white">Реквизиты Исполнителя</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Астахов Иван Александрович
                    <br />
                    Плательщик налога на профессиональный доход (самозанятый)
                    <br />
                    ИНН 505204469403
                    <br />
                    Email:{" "}
                    <a href="mailto:support@humantype.ru" className="text-[var(--primary)] hover:underline">
                        support@humantype.ru
                    </a>
                </p>
            </section>
        </div>
    );
}
