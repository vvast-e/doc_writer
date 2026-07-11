import asyncio
import logging
import math
import random
import re
import threading
from pathlib import Path
from typing import Callable, Optional

import numpy as np
from playwright.async_api import async_playwright, BrowserContext, Page


class TypingStopped(Exception):
    """Поднимается из цикла набора, когда пришла stop-команда."""

logger = logging.getLogger("google_docs_typist")


def _log(message: str) -> None:
    logger.info(message)


PAUSE_CHARS = {".", "!", "?", ";", ":", ",", ")", "]"}
NEWLINE_CHARS = {"\n", "\r"}

# ── Интервал между нажатиями (IKI): логнормальный, обрезанный к [lo, hi] мс ──


def sample_iki_ms(lo: float, hi: float) -> float:
    """Сэмплирует человекоподобный IKI: LogNormal со срезом по границам UI."""
    if hi <= lo:
        return float(lo)
    lo_f = float(max(lo, 1.0))
    hi_f = float(hi)
    median = math.sqrt(lo_f * hi_f)
    mu = math.log(median)
    span = hi_f / lo_f if lo_f > 0 else 1.02
    sigma = 0.40 + 0.12 * math.log(max(span, 1.01))
    sigma = max(0.28, min(0.72, sigma))
    for _ in range(16):
        x = float(np.random.lognormal(mu, sigma))
        if lo_f <= x <= hi_f:
            return x
    return float(np.clip(np.random.uniform(lo_f, hi_f), lo_f, hi_f))


def _warmup_multiplier(chars_typed: int, warmup_end: int, peak: float) -> float:
    """G2: начало набора медленнее; к warmup_end уже ~1.0."""
    if warmup_end <= 0 or chars_typed >= warmup_end:
        return 1.0
    t = min(1.0, chars_typed / warmup_end)
    return peak + (1.0 - peak) * t


def _complexity_multiplier(ch: str, idx_in_word: int, prev_ch: Optional[str]) -> float:
    """G1: цифры, длинные слова, заглавная после разделителя."""
    m = 1.0
    if ch.isdigit():
        m *= random.uniform(1.12, 1.42)
    if idx_in_word > 8:
        excess = min(idx_in_word - 8, 18)
        m *= 1.0 + excess * 0.017
    if prev_ch in (None, " ", "\t", "\n", "\r") and ch.isupper() and ch.isalpha():
        m *= random.uniform(1.06, 1.22)
    return m


async def paragraph_micro_navigation(page: Page) -> None:
    """C3: краткий «переосмысление» — сдвиг каретки и возврат без изменения текста."""
    steps = random.randint(2, 6)
    for _ in range(steps):
        await page.keyboard.press("ArrowLeft")
        await asyncio.sleep(random.uniform(0.04, 0.11))
    await asyncio.sleep(random.uniform(0.25, 0.85))
    for _ in range(steps):
        await page.keyboard.press("ArrowRight")
        await asyncio.sleep(random.uniform(0.04, 0.11))
    if random.random() < 0.32:
        up = random.randint(1, 2)
        for _ in range(up):
            await page.keyboard.press("ArrowUp")
            await asyncio.sleep(random.uniform(0.06, 0.14))
        await asyncio.sleep(random.uniform(0.2, 0.55))
        for _ in range(up):
            await page.keyboard.press("ArrowDown")
            await asyncio.sleep(random.uniform(0.06, 0.14))
    await asyncio.sleep(random.uniform(0.18, 0.45))


async def focus_document_body(page: Page) -> None:
    """Надёжный фокус"""
    strategies = [
        "canvas.kix-canvas-tile-content",
        "div.kix-page-paginated",
        "div[role='textbox']",
        ".kix-cursor",
    ]
    for sel in strategies:
        try:
            el = await page.wait_for_selector(sel, timeout=5000)
            await el.click(position={"x": 150, "y": 80})
            await page.wait_for_timeout(1500)
            _log(f"Фокус получен через {sel}")
            return
        except Exception:
            continue
    await page.mouse.click(700, 400)
    _log("Использован ультра-fallback фокус")


async def _add_pause_after_char(ch: str) -> None:
    if ch in NEWLINE_CHARS:
        await asyncio.sleep(float(np.random.uniform(6.8, 15.2)))
    elif ch in PAUSE_CHARS:
        await asyncio.sleep(float(np.random.uniform(1.0, 3.05)))


async def human_type_text(
    page: Page,
    text: str,
    min_delay_ms: int,
    max_delay_ms: int,
    progress_callback: Optional[Callable[[int, int], None]] = None,
    stop_flag: Optional[threading.Event] = None,
) -> None:
    """
    Эмуляция набора с A1/A4/B1/B2/C3/G1/G2 (без искусственных опечаток и без сессий).
    """
    lo = float(min_delay_ms)
    hi = float(max_delay_ms)

    total = len(text)
    typed = 0

    def report_progress() -> None:
        if progress_callback:
            progress_callback(typed, total)

    def check_stop() -> None:
        if stop_flag is not None and stop_flag.is_set():
            raise TypingStopped()

    warmup_end = random.randint(50, 150)
    warmup_peak = random.uniform(1.34, 1.54)

    burst_left = random.randint(6, 14)
    newlines_seen = 0
    next_nav_at = random.randint(2, 5)
    prev_ch_global: Optional[str] = None

    await page.wait_for_timeout(random.randint(2800, 3600))

    words = re.split(r"(\s+)", text)
    for segment in words:
        if segment == "":
            continue

        is_word = not segment.isspace()
        idx_in_word = 0

        for ch in segment:
            check_stop()
            wm = _warmup_multiplier(typed, warmup_end, warmup_peak)

            if ch == "\n":
                await page.keyboard.press("Enter")
                typed += 1
                report_progress()
                await asyncio.sleep(random.uniform(0.14, 0.52) * wm)
                await _add_pause_after_char(ch)
                prev_ch_global = "\n"

                newlines_seen += 1
                if newlines_seen >= next_nav_at:
                    await paragraph_micro_navigation(page)
                    newlines_seen = 0
                    next_nav_at = random.randint(2, 5)
                idx_in_word = 0
                continue

            if ch == "\r":
                continue

            if ch == "\b":
                await page.keyboard.press("Backspace")
                typed += 1
                report_progress()
                prev_ch_global = "\b"
                await asyncio.sleep(
                    random.uniform(0.11, 0.34) * wm,
                )
                continue

            cm = _complexity_multiplier(ch, idx_in_word, prev_ch_global)
            iki = sample_iki_ms(lo, hi) * wm * cm
            iki = min(iki, hi * 2.2)
            after_ms = iki * random.uniform(0.07, 0.26)
            press_ms = iki - after_ms

            await page.keyboard.type(ch, delay=max(1.0, press_ms))
            typed += 1
            report_progress()

            burst_left -= 1
            if burst_left <= 0:
                burst_left = random.randint(6, 14)
                await asyncio.sleep(random.uniform(0.12, 0.40))

            await asyncio.sleep(after_ms / 1000.0)
            await _add_pause_after_char(ch)

            if not ch.isspace():
                idx_in_word += 1
            prev_ch_global = ch

        if is_word and segment.strip():
            r_idle = random.random()
            if r_idle < 0.0035:
                await asyncio.sleep(random.uniform(35.0, 165.0))
            elif r_idle < 0.0285:
                await asyncio.sleep(random.uniform(3.0, 22.0))

        if segment.isspace():
            idx_in_word = 0

        if is_word and segment.strip() and np.random.rand() < 0.08:
            await page.mouse.move(
                random.randint(150, 950),
                random.randint(180, 720),
                steps=random.randint(4, 10),
            )

    await page.wait_for_timeout(random.randint(2400, 3200))
    _log("✅ Набор завершён")


async def ensure_page(context: BrowserContext) -> Page:
    if context.pages:
        return context.pages[0]
    return await context.new_page()


def load_text(text_file: Path) -> str:
    if not text_file.is_file():
        raise FileNotFoundError(f"Файл с текстом не найден: {text_file}")
    return text_file.read_text(encoding="utf-8")


async def wait_for_google_login(
    page: Page,
    timeout_ms: int = 180_000,
    stop_flag: Optional[threading.Event] = None,
) -> None:
    deadline = asyncio.get_event_loop().time() + timeout_ms / 1000.0
    while True:
        if stop_flag is not None and stop_flag.is_set():
            raise TypingStopped()
        if asyncio.get_event_loop().time() >= deadline:
            raise TimeoutError(
                "Не удалось дождаться входа в Google. "
                "Откройте приложение, войдите через кнопку Login и попробуйте снова."
            )
        if "docs.google.com" in page.url and "accounts.google.com" not in page.url:
            return
        await page.wait_for_timeout(1000)


async def run_google_docs_typing(
    doc_url: str,
    text: str,
    user_data_dir: Path,
    chrome_exe_path: Optional[Path],
    min_delay_ms: int,
    max_delay_ms: int,
    close_browser: bool,
    type_text_fn=None,
    stop_flag: Optional[threading.Event] = None,
    login_wait_callback: Optional[Callable[[], None]] = None,
    login_wait_timeout_s: int = 180,
) -> None:
    if not user_data_dir.exists():
        raise FileNotFoundError(f"Каталог профиля Chrome не найден: {user_data_dir}")

    _log(f"Запуск с параметрами: doc_url={doc_url!r}")
    _log(f"user_data_dir={user_data_dir}")
    _log(f"chrome_exe_path={chrome_exe_path}")
    _log(
        f"delays: min={min_delay_ms} ms, max={max_delay_ms} ms, close_browser={close_browser}"
    )

    executable_path_str: Optional[str] = (
        str(chrome_exe_path) if chrome_exe_path else None
    )
    context: Optional[BrowserContext] = None

    try:
        async with async_playwright() as p:
            _log("Создаём persistent context Chromium/Chrome...")
            chrome_args = [
                "--disable-blink-features=AutomationControlled",
            ]
            context = await p.chromium.launch_persistent_context(
                user_data_dir=str(user_data_dir),
                headless=False,
                executable_path=executable_path_str,
                args=chrome_args,
            )

            page = await ensure_page(context)
            _log("Открыта первая страница, выполняем переход к документу...")
            await page.goto(doc_url, wait_until="domcontentloaded")
            await page.wait_for_timeout(2800)

            if "accounts.google.com" in page.url or "ServiceLogin" in page.url:
                _log("Требуется ручной вход в Google. Ожидание авторизации...")
                if login_wait_callback is not None:
                    try:
                        login_wait_callback()
                    except Exception:
                        pass
                await wait_for_google_login(
                    page,
                    timeout_ms=login_wait_timeout_s * 1000,
                    stop_flag=stop_flag,
                )
                _log("Вход выполнен, продолжаем работу с документом.")

            try:
                await focus_document_body(page)
            except Exception as exc:
                _log(f"Критическая ошибка фокуса: {exc}")
                return

            _log("Фокус установлен, начинаем печатать текст...")
            try:
                if type_text_fn:
                    await type_text_fn(
                        page, text, min_delay_ms, max_delay_ms
                    )
                else:
                    await human_type_text(
                        page, text, min_delay_ms, max_delay_ms,
                        stop_flag=stop_flag,
                    )
            except TypingStopped:
                _log("Набор прерван пользователем.")

            _log("Набор текста завершён, финальная пауза...")

    finally:
        if context is not None and close_browser:
            try:
                await context.close()
            except Exception as exc:
                if "Target page, context or browser has been closed" not in str(exc):
                    _log(f"Ошибка закрытия браузера: {exc}")

    _log("Завершено без ошибок.")
