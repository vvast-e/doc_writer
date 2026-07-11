"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MdDownload,
  MdSecurity,
  MdSpeed,
  MdCheckCircle,
  MdKeyboard,
  MdVisibility,
} from "react-icons/md";

export default function Home() {
  const [os, setOs] = useState("Windows");

  const detectOS = useCallback(() => {
    if (typeof window === "undefined") return "Windows";
    const platform = window.navigator.platform;
    if (platform.includes("Mac")) return "macOS";
    if (platform.includes("Linux")) return "Linux";
    return "Windows";
  }, []);

  useEffect(() => {
    setOs(detectOS());
  }, [detectOS]);

  return (
    <div className="flex w-full flex-col items-center">
      {/* 1. Hero */}
      <section className="w-full border-b border-[var(--border)] bg-[radial-gradient(circle_at_top,_rgba(214,83,72,0.15),_transparent_60%)] px-4 pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-6xl">
            Текст от ИИ
            <br />
            <span className="text-gradient">Почерк Человека</span>
          </h1>

          <p className="mb-8 max-w-2xl text-base md:text-lg leading-relaxed text-[var(--text-muted)]">
            HumanType эмулирует живой набор текста в Google Docs и Word Online.
            Преподаватель видит курсор и печать, а не моментальную вставку из буфера.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row">
            <Link
              href="/download"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-7 py-3.5 text-base md:text-lg font-semibold text-white shadow-[0_0_20px_rgba(214,83,72,0.35)] transition hover:bg-[var(--primary-hover)] hover:shadow-[0_0_30px_rgba(214,83,72,0.55)]"
            >
              <MdDownload className="text-lg md:text-xl" />
              Скачать для {os}
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-7 py-3.5 text-base md:text-lg font-medium text-white transition hover:bg-[var(--border)]"
            >
              Как это работает
            </Link>
          </div>

          <p className="mt-4 text-xs md:text-sm text-[var(--text-muted)]">
            Первые 24 часа после установки — бесплатно. Можно спокойно протестировать.
          </p>
        </div>
      </section>

      {/* 2. Два вида: преподаватель vs студент */}
      <section className="w-full px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Как это выглядит</h2>
            <p className="mt-3 text-sm md:text-base text-[var(--text-muted)]">
              Один и тот же набор текста, два ракурса — экран преподавателя и окно HumanType у студента.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            {/* Вид преподавателя */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 md:p-5 shadow-lg">
              <div className="mb-3 flex items-center justify-between text-[10px] md:text-xs font-mono text-[var(--text-muted)]">
                <span>Google Docs · Живой набор</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[9px] md:text-[10px] uppercase tracking-wide text-[var(--accent)]">
                  <MdVisibility className="text-xs" />
                  Вид преподавателя
                </span>
              </div>
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-black/30 p-4 text-xs md:text-sm text-[var(--text-muted)] leading-relaxed">
                Курсор мигает, строки текста медленно появляются одна за другой. Есть паузы,
                мелкие исправления и набор по абзацам — выглядит как реальный студент, который печатает конспект.
              </div>
            </div>

            {/* Вид студента */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 md:p-5 shadow-lg">
              <div className="mb-3 flex items-center justify-between text-[10px] md:text-xs font-mono text-[var(--text-muted)]">
                <span>HumanType · Приложение</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[9px] md:text-[10px] uppercase tracking-wide text-[var(--primary)]">
                  <MdVisibility className="text-xs" />
                  Вид студента
                </span>
              </div>
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-black/30 p-4 text-xs md:text-sm text-[var(--text-muted)] leading-relaxed">
                Ты вставляешь текст из ИИ, выбираешь окно Google Docs и нажимаешь Start typing.
                HumanType сам печатает по символу. В любой момент можно приостановить набор
                или поменять скорость под ситуацию на паре.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Почему именно HumanType */}
      <section id="features" className="w-full border-t border-[var(--border)] px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Почему это больше, чем автонабор</h2>
            <p className="mt-3 text-sm md:text-base text-[var(--text-muted)]">
              HumanType закрывает типичные проблемы: вставка палится, нет времени перепечатывать, хочется уделить время большему.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: <MdSpeed className="text-3xl text-[var(--accent)]" />,
                title: "Естественный ритм",
                desc: "Скорость, микропаузы и поведение курсора похожи на живой набор, а не на идеально ровную машинную печать.",
              },
              {
                icon: <MdSecurity className="text-3xl text-[var(--accent)]" />,
                title: "Без резких вставок",
                desc: "Текст не появляется в документе мгновенно. Преподаватель видит процесс набора, а не копирование из буфера.",
              },
              {
                icon: <MdCheckCircle className="text-3xl text-[var(--accent-muted)]" />,
                title: "Подходит под любые OS",
                desc: "Работает на macOS, Windows и Linux. Подходит для Google Docs, Word Online и любых онлайн-редакторов.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 transition hover:border-[var(--primary)] hover:shadow-xl"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="mb-3 text-lg md:text-xl font-bold text-white transition group-hover:text-[var(--primary)]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How it works + пояснение */}
      <section
        id="how-it-works"
        className="w-full border-t border-[var(--border)] bg-[radial-gradient(circle_at_top,_rgba(68,186,74,0.12),_transparent_55%)] px-4 py-12 md:py-16"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Как можно использовать HumanType</h2>
            <p className="mt-3 text-sm md:text-base text-[var(--text-muted)]">
              От вставки текста до живого набора на глазах у преподавателя — в три простых шага.
            </p>
          </div>

          {/* 3 шага */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-xs font-bold text-[var(--primary)]">
                1
              </div>
              <h3 className="text-base md:text-lg font-semibold text-white">Вставь текст из ИИ</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Любой текст из любых моделей и документов вставляешь в окно HumanType.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-xs font-bold text-[var(--primary)]">
                2
              </div>
              <h3 className="text-base md:text-lg font-semibold text-white">Выбери документ</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Открываешь Google Docs или другой редактор, настраиваешь скорость и нажимаешь Start typing.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-xs font-bold text-[var(--primary)]">
                3
              </div>
              <h3 className="text-base md:text-lg font-semibold text-white">Смотри, как текст печатается</h3>
              <p className="text-sm text-[var(--text-muted)]">
                HumanType по символу набирает текст, имитируя твое печатание. Можно поставить на паузу и продолжить позже.
              </p>
            </div>
          </div>

          {/* Доп. пояснение */}
          <div className="mt-12 grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 md:p-5 shadow-lg">
              <div className="mb-3 flex items-center justify-between text-[10px] md:text-xs font-mono text-[var(--text-muted)]">
                <span>Google Docs</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[9px] md:text-[10px] uppercase tracking-wide text-[var(--accent)]">
                  <MdVisibility className="text-xs" />
                  Как это видно со стороны
                </span>
              </div>
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-black/30 p-4 text-xs md:text-sm text-[var(--text-muted)] leading-relaxed">
                Преподаватель видит привычный Google Docs и текст,
                который печатается строка за строкой. Ничего не появляется целиком —
                всё выглядит как твоя обычная работа за ноутбуком.
                Система контроля версий выглядит, как при обычной ручной печати.
              </div>
            </div>
            <div className="space-y-6 text-xs md:text-sm text-[var(--text-muted)]">
              <div className="flex items-start gap-3">
                <MdKeyboard className="mt-1 text-3xl md:text-2xl text-[var(--accent)]" />
                <div className="space-y-1.5">
                  <p>HumanType снимает с тебя перепечатку текста.</p>
                  <p>Пока приложение печатает, ты можешь думать о важном.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MdSecurity className="mt-1 text-3xl md:text-2xl text-[var(--primary)]" />
                <div className="space-y-1.5">
                  <p>Время набора выглядит правдоподобно.</p>
                  <p>Скорость и паузы похожи на живого человека.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Финальный CTA */}
      <section className="w-full px-4 py-4 md:py-20 text-center">
        <div className="mx-auto max-w-5xl space-y-5">
          <h2 className="text-2xl md:text-4xl font-bold text-white">
            Попробуй
          </h2>
          <p className="text-sm md:text-lg text-[var(--text-muted)]">
            Скачай HumanType, вставь текст из ИИ и посмотри, как он превращается в живой набор
            прямо в Google Docs.
          </p>
          <Link
            href="/download"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-9 py-4 text-base md:text-lg font-semibold text-white shadow-[0_0_20px_rgba(214,83,72,0.35)] transition hover:bg-[var(--primary-hover)] hover:shadow-[0_0_30px_rgba(214,83,72,0.55)]"
          >
            <MdDownload className="text-lg md:text-xl" />
            Скачать бесплатно
          </Link>
          <p className="text-xs md:text-sm text-[var(--text-muted)]">
            24 часа полного доступа после установки.
          </p>
        </div>
      </section>
    </div>
  );
}
