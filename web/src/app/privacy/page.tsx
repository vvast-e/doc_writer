export const metadata = {
    title: "Политика конфиденциальности — HumanType",
    description: "Политика обработки персональных данных сервиса HumanType.",
};

export default function PrivacyPage() {
    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-16 space-y-8 text-[var(--text-main)]">
            <h1 className="text-3xl md:text-4xl font-bold text-white">
                Политика конфиденциальности
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
                Действует с 18.07.2026
            </p>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">1. Общие положения</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Настоящая Политика определяет порядок обработки персональных данных пользователей сайта
                    humantype.ru и десктопного приложения HumanType. Оператором данных является Астахов Иван
                    Александрович, плательщик налога на профессиональный доход (самозанятый), ИНН 505204469403
                    (далее — «Оператор»). Используя сайт или приложение, Пользователь соглашается с условиями
                    настоящей Политики.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">2. Какие данные собираются</h2>
                <ul className="list-disc list-inside text-[var(--text-muted)] space-y-1.5 leading-relaxed">
                    <li>Email и имя — при регистрации через Google, VK ID или Яндекс OAuth;</li>
                    <li>Идентификатор устройства (device-токен) — при привязке десктопного приложения к аккаунту;</li>
                    <li>Данные о подписке и история платежей (статус, сумма, дата) — без данных банковских карт;</li>
                    <li>Технические данные (IP-адрес) — для защиты от злоупотреблений и ограничения частоты запросов.</li>
                </ul>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Данные банковских карт Оператор не получает и не хранит — оплата обрабатывается напрямую
                    платёжным сервисом ЮKassa в соответствии со стандартом PCI DSS.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">3. Цели обработки</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Данные используются для: регистрации и аутентификации Пользователя, привязки устройств,
                    предоставления доступа к оплаченной подписке, обработки платежей и возвратов, ответов на
                    обращения в поддержку.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">4. Передача третьим лицам</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Для оказания услуг Оператор передаёт минимально необходимые данные следующим сторонним
                    сервисам: ЮKassa (обработка платежей), Google / VK / Яндекс (аутентификация через OAuth).
                    Данные не передаются третьим лицам в иных целях и не продаются.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">5. Сроки хранения</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Данные хранятся до момента удаления аккаунта Пользователем либо до истечения срока, требуемого
                    законодательством РФ для хранения сведений о платежах.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">6. Права Пользователя</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Пользователь вправе запросить доступ к своим данным, их исправление или удаление, направив
                    обращение на{" "}
                    <a href="mailto:support@humantype.ru" className="text-[var(--primary)] hover:underline">
                        support@humantype.ru
                    </a>
                    .
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">7. Меры защиты</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Сайт работает по протоколу HTTPS, доступ к устройствам защищён токенами, хранящимися в
                    защищённом хранилище операционной системы. Оператор принимает разумные технические и
                    организационные меры для защиты персональных данных от несанкционированного доступа.
                </p>
            </section>

            <section className="space-y-2 pt-6 border-t border-[var(--border)]">
                <h2 className="text-xl font-bold text-white">Контакты Оператора</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    Астахов Иван Александрович, ИНН 505204469403
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
