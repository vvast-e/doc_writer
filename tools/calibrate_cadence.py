"""Dev-only оффлайн-калибровка каденции human_type_text — без браузера и аккаунта.

Подменяет asyncio.sleep и Playwright keyboard.type(delay=...) виртуальными
часами (мгновенное выполнение + учёт времени), гоняет human_type_text над
образцом текста на нескольких сидах и печатает статистику по слоям задержки.

Категоризация опирается на номер строки вызова asyncio.sleep внутри
google_docs_typist.py (см. LINE_TAGS) — если строки сместятся при правках,
обнови номера здесь.

Запуск:
    python tools/calibrate_cadence.py [--min-delay 110] [--max-delay 380] [--seeds 5]

Не бандлится в PyInstaller-сборку, не импортируется из main.py/lib.rs.
"""
from __future__ import annotations

import argparse
import asyncio
import random
import sys
from pathlib import Path
from statistics import median

import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import google_docs_typist as gdt  # noqa: E402

SAMPLE_TEXT = (
    "Введение в тему исследования начинается с общего обзора предметной области, "
    "включая ключевые определения и терминологию, используемую далее.\n"
    "В 2023 году было опубликовано более 1500 работ по этой теме, что на 42% "
    "больше, чем годом ранее; рост интереса объясняется несколькими факторами.\n"
    "Во-первых, доступность вычислительных ресурсов; во-вторых, снижение "
    "стоимости хранения данных; в-третьих, появление открытых датасетов.\n"
    "Экспериментальная часть работы состоит из трёх этапов: подготовки данных, "
    "обучения модели и валидации результатов на отложенной выборке.\n"
    "Таким образом, предложенный подход демонстрирует улучшение метрики точности "
    "на 7.8 процентных пунктов по сравнению с базовым решением.\n"
)

# co_name функции -> {номер_строки: категория}. Если строка не найдена в словаре
# для данной функции — используется "other".
GDT_FILE = Path(gdt.__file__).resolve()
LINE_TAGS: dict[str, dict[int, str]] = {
    "human_type_text": {
        170: "newline_enter",
        191: "backspace",
        208: "burst",
        210: "keystroke_after",
        220: "idle_big",
        222: "idle_small",
    },
    "_add_pause_after_char": {
        114: "newline_pause",
        116: "pause_char",
    },
    "paragraph_micro_navigation": None,  # всё -> micro_nav
}


class _VirtualClock:
    """Копит виртуальное время вместо реального сна и делит его по категориям."""

    def __init__(self) -> None:
        self.total_s = 0.0
        self.buckets: dict[str, float] = {}
        self.press_gaps: list[float] = []
        self.after_gaps: list[float] = []

    def add(self, category: str, seconds: float) -> None:
        self.total_s += seconds
        self.buckets[category] = self.buckets.get(category, 0.0) + seconds

    def char_gaps_combined(self) -> list[float]:
        n = min(len(self.press_gaps), len(self.after_gaps))
        return [self.press_gaps[i] + self.after_gaps[i] for i in range(n)]


def _categorize(frame) -> str:
    co_name = frame.f_code.co_name
    if co_name not in LINE_TAGS:
        return "other"
    file_ok = Path(frame.f_code.co_filename).resolve() == GDT_FILE
    if not file_ok:
        return "other"
    mapping = LINE_TAGS[co_name]
    if mapping is None:
        return "micro_nav"
    return mapping.get(frame.f_lineno, "other")


def _patch_sleep(clock: _VirtualClock) -> None:
    async def fake_sleep(seconds: float, result=None):
        frame = sys._getframe(1)
        category = _categorize(frame)
        clock.add(category, seconds)
        if category == "keystroke_after":
            clock.after_gaps.append(seconds)
        return result

    asyncio.sleep = fake_sleep  # type: ignore[assignment]


class FakeKeyboard:
    def __init__(self, clock: _VirtualClock) -> None:
        self.clock = clock

    async def press(self, key: str) -> None:
        return None

    async def type(self, ch: str, delay: float = 0.0) -> None:
        seconds = delay / 1000.0
        self.clock.add("keystroke_press", seconds)
        self.clock.press_gaps.append(seconds)


class FakeMouse:
    async def move(self, x, y, steps=1) -> None:
        return None

    async def click(self, x, y) -> None:
        return None


class FakePage:
    def __init__(self, clock: _VirtualClock) -> None:
        self.keyboard = FakeKeyboard(clock)
        self.mouse = FakeMouse()

    async def wait_for_timeout(self, ms: int) -> None:
        # Реальный оверхед загрузки страницы вне алгоритма — не считаем.
        return None


async def _run_once(text: str, min_delay_ms: int, max_delay_ms: int, seed: int) -> _VirtualClock:
    random.seed(seed)
    np.random.seed(seed)
    clock = _VirtualClock()
    _patch_sleep(clock)
    page = FakePage(clock)
    await gdt.human_type_text(page, text, min_delay_ms, max_delay_ms)
    return clock


async def main_async(args: argparse.Namespace) -> None:
    all_totals = []
    all_gaps: list[float] = []
    bucket_sums: dict[str, float] = {}

    for seed in range(args.seeds):
        clock = await _run_once(SAMPLE_TEXT, args.min_delay, args.max_delay, seed)
        all_totals.append(clock.total_s)
        all_gaps.extend(clock.char_gaps_combined())
        for k, v in clock.buckets.items():
            bucket_sums[k] = bucket_sums.get(k, 0.0) + v

    n = len(SAMPLE_TEXT)
    words = len(SAMPLE_TEXT.split())
    print(f"Образец: {n} символов / {words} слов, {args.seeds} сидов\n")

    print("Итоговая длительность по сидам:")
    for i, t in enumerate(all_totals):
        print(f"  seed {i}: {t/60:.2f} мин ({t:.1f} с), wpm={words/(t/60):.1f}")
    print(f"  среднее: {sum(all_totals)/len(all_totals)/60:.2f} мин\n")

    print("Доля времени по слоям (суммарно по всем сидам):")
    grand_total = sum(bucket_sums.values())
    for k, v in sorted(bucket_sums.items(), key=lambda kv: -kv[1]):
        pct = (v / grand_total * 100) if grand_total else 0
        print(f"  {k:16s}: {v:8.1f} с  ({pct:5.1f}%)")

    if all_gaps:
        p50 = median(all_gaps)
        gaps_sorted = sorted(all_gaps)
        p95 = gaps_sorted[int(0.95 * (len(gaps_sorted) - 1))]
        print("\nМежсимвольный keystroke-gap (press+after, без крупных пауз):")
        print(f"  p50 = {p50*1000:.1f} мс   (контракт: [{args.min_delay}, {args.max_delay}] мс)")
        print(f"  p95 = {p95*1000:.1f} мс")
        in_range = args.min_delay <= p50 * 1000 <= args.max_delay
        print(f"  p50 в диапазоне: {'OK' if in_range else 'ВНЕ ДИАПАЗОНА'}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--min-delay", type=int, default=110)
    parser.add_argument("--max-delay", type=int, default=380)
    parser.add_argument("--seeds", type=int, default=5)
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
