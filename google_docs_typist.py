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


async def _kix_cursor_position(page: Page) -> Optional[tuple]:
    """Координаты мигающего курсора Google Docs (.kix-cursor), если он есть.

    Используется не как факт "фокус есть" (DOM-эвристики типа activeElement
    или наличия .kix-cursor-blink оказались истинны ЕЩЁ ДО реального фокуса —
    проверено вживую), а как способ поведенчески убедиться, что тестовый
    символ реально дошёл до документа: если курсор сдвинулся после печати —
    ввод действительно попал в текст.
    """
    try:
        pos = await page.evaluate(
            """
            () => {
                const el = document.querySelector('.kix-cursor');
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return [r.left, r.top];
            }
            """
        )
        return tuple(pos) if pos else None
    except Exception:
        return None


async def focus_document_body(page: Page) -> None:
    """Надёжный фокус на документе Google Docs.

    ВАЖНО (найдено живой диагностикой): `element.click(position=...)` у
    Playwright может зависать на ~30с и падать по таймауту, потому что клик в
    верхней части страницы перехватывается плавающими UI-подсказками, которые
    Google Docs рисует поверх canvas для пустых/новых документов ("Заметки к
    встрече" и т.п.) — Playwright обнаруживает перехват через свою
    actionability-проверку и бесконечно ретраит клик. Поэтому кликаем ТОЛЬКО
    через `page.mouse.click()` по вычисленным координатам (сырой клик без
    проверки перехвата) и заметно ниже верхнего края страницы.

    Также сам факт "клик прошёл" не значит, что фокус реально встал — DOM-
    признаки (activeElement, .kix-cursor-blink) оказались истинны ещё до
    реального ввода. Поэтому подтверждаем поведенчески: печатаем тестовый
    символ и проверяем, что курсор (.kix-cursor) реально сдвинулся.

    Не действует против облегчённых fake-page объектов офлайн-симуляции
    (tools/calibrate_cadence.py, estimate_typing_seconds) — у них нет
    wait_for_selector, и реальная проверка фокуса там неприменима и не нужна.
    """
    if not hasattr(page, "wait_for_selector"):
        return

    try:
        await page.wait_for_selector("#docs-editor-container", timeout=30000)
    except Exception:
        _log("Редактор Google Docs не дождался готовности (#docs-editor-container) — пробуем клик всё равно")

    click_targets = [
        "canvas.kix-canvas-tile-content",
        "div.kix-page-paginated",
    ]

    attempts = 5
    for attempt in range(attempts):
        for sel in click_targets:
            try:
                el = await page.wait_for_selector(sel, timeout=5000)
                box = await el.bounding_box()
            except Exception:
                continue
            if not box:
                continue

            # Целимся заметно ниже верха страницы — там, где Google Docs
            # рисует плавающие подсказки для пустых документов.
            abs_x = box["x"] + min(150, box["width"] * 0.2)
            abs_y = box["y"] + min(350, box["height"] * 0.3)

            pos_before = await _kix_cursor_position(page)
            await page.mouse.click(abs_x, abs_y)
            await page.wait_for_timeout(300)

            # Поведенческий тест: печатаем один символ и проверяем, что
            # курсор реально сдвинулся, затем сразу откатываем.
            await page.keyboard.type("?", delay=30)
            await page.wait_for_timeout(200)
            pos_after = await _kix_cursor_position(page)
            await page.keyboard.press("Backspace")

            if pos_after is not None and pos_after != pos_before:
                _log(f"Фокус подтверждён через {sel} (попытка {attempt + 1})")
                return

        await page.wait_for_timeout(500)

    diagnostics = await _probe_focus_candidates(page)
    _log(
        "ПРЕДУПРЕЖДЕНИЕ: фокус документа не подтверждён после всех попыток — "
        f"печать может не попасть в документ. Диагностика DOM: {diagnostics}"
    )


async def _probe_focus_candidates(page: Page) -> dict:
    """Диагностика на случай очередного сдвига вёрстки Google Docs: какие из
    известных селекторов реально присутствуют в DOM на момент отказа фокуса."""
    selectors = [
        "#docs-editor-container",
        "#docs-editor",
        "canvas.kix-canvas-tile-content",
        "div.kix-page-paginated",
        ".kix-appview-editor",
        "iframe.docs-texteventtarget-iframe",
        ".kix-cursor",
    ]
    try:
        return await page.evaluate(
            """
            (selectors) => {
                const out = {};
                for (const sel of selectors) {
                    try { out[sel] = document.querySelectorAll(sel).length; }
                    catch (e) { out[sel] = 'ERR'; }
                }
                return out;
            }
            """,
            selectors,
        )
    except Exception:
        return {}


async def _add_pause_after_char(ch: str) -> None:
    if ch in NEWLINE_CHARS:
        await asyncio.sleep(float(np.random.uniform(6.8, 15.2)))
    elif ch in PAUSE_CHARS:
        await asyncio.sleep(float(np.random.uniform(1.0, 3.05)))


async def _retype_char(page: Page, ch: str) -> None:
    """Заново отправляет ровно один символ (без учёта каденса — это аварийный
    повтор, а не часть модели человеческого набора)."""
    if ch == "\n":
        await page.keyboard.press("Enter")
    elif ch == "\b":
        await page.keyboard.press("Backspace")
    else:
        await page.keyboard.type(ch, delay=30)


async def _verify_char_landed(page: Page, last_pos: Optional[tuple], ch: str) -> Optional[tuple]:
    """Проверка ПОСЛЕ КАЖДОГО символа: реально ли он долетел до документа.

    Живой диагностикой подтверждено: Google Docs проводит фоновую ротацию
    сессионных cookie (навигация accounts.google.com/RotateCookiesPage) в
    первые секунды после открытия документа — это совпадает с моментом,
    когда human_type_text начинает печатать после стартовой паузы, и
    сбрасывает установленный фокус: символы перестают попадать в документ, а
    progress_callback (считающий отправленные keyboard.type()-вызовы, не то,
    что реально долетело до DOM) этого не замечает и продолжает рапортовать
    100%. Проверка только раз в N символов оставляла целое окно потерянных
    символов без возможности понять, сколько именно из них долетело — поэтому
    проверяем после каждого: максимум теряется/дублируется 0-1 символ, а не
    целый чанк.

    Короткая пауза перед чтением позиции курсора — дать рендеру устаканиться,
    иначе можно прочитать ещё не обновившуюся позицию и ложно посчитать
    успешно долетевший символ пропавшим (и продублировать его).

    Восстановление кликает ТОЧНО по последней известной позиции курсора (а не
    через focus_document_body — та кликает по фиксированному смещению внутри
    canvas, рассчитанному для самого начала документа; вызванная посреди
    набора, она увела бы точку ввода назад, в верх страницы — именно так и
    проявлялся баг при живой проверке).

    Settle-пауза (asyncio.sleep, не page.wait_for_timeout) намеренно учитывается
    виртуальными часами офлайн-симуляции (tools/calibrate_cadence.py,
    estimate_typing_seconds) — это систематическая добавка на КАЖДЫЙ символ,
    и её сокрытие от Monte-Carlo оценки времени воспроизвело бы ту же
    недооценку ETA, которую чинили в Фазе 2. Сама же DOM-проверка/восстановление
    неприменимы к облегчённым fake-page объектам симуляции (нет
    wait_for_selector) — та часть у них просто не выполняется.
    """
    await asyncio.sleep(0.06)

    if not hasattr(page, "wait_for_selector"):
        return last_pos

    current_pos = await _kix_cursor_position(page)
    if current_pos is not None and current_pos != last_pos:
        return current_pos

    click_pos = current_pos or last_pos
    if click_pos is None:
        # Ещё ни разу не видели курсор на экране — некуда точно кликнуть,
        # только тогда используем общий focus_document_body (старт документа).
        _log("ПРЕДУПРЕЖДЕНИЕ: фокус потерян и позиция курсора неизвестна — переустанавливаю фокус с нуля")
        await focus_document_body(page)
        return await _kix_cursor_position(page)

    _log(f"ПРЕДУПРЕЖДЕНИЕ: символ не долетел до документа — восстанавливаю фокус в позиции курсора {click_pos} и повторяю ввод")
    x, y = click_pos
    await page.mouse.click(x + 2, y + 8)
    await page.wait_for_timeout(200)
    await _retype_char(page, ch)
    await page.wait_for_timeout(60)
    return await _kix_cursor_position(page)


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

    # Именно тут (сразу после стартовой паузы) живая диагностика поймала
    # коллизию с фоновой ротацией сессионных cookie Google Docs — повторно
    # подтверждаем фокус перед началом печати.
    await focus_document_body(page)

    last_char_pos = await _kix_cursor_position(page)

    async def verify_last_char(ch: str) -> None:
        nonlocal last_char_pos
        last_char_pos = await _verify_char_landed(page, last_char_pos, ch)

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
                await verify_last_char(ch)
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
                await verify_last_char(ch)
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
            await verify_last_char(ch)

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


async def estimate_typing_seconds(
    text: str,
    min_delay_ms: int,
    max_delay_ms: int,
    seeds: int = 24,
) -> list[float]:
    """Monte-Carlo оценка длительности набора: реальный human_type_text
    поверх виртуальных часов (без браузера, без реального sleep)."""

    class _FakeKeyboard:
        def __init__(self, state: dict) -> None:
            self.state = state

        async def press(self, key: str) -> None:
            return None

        async def type(self, ch: str, delay: float = 0.0) -> None:
            self.state["total"] += delay / 1000.0

    class _FakeMouse:
        async def move(self, x, y, steps=1) -> None:
            return None

        async def click(self, x, y) -> None:
            return None

    class _FakePage:
        def __init__(self, state: dict) -> None:
            self.keyboard = _FakeKeyboard(state)
            self.mouse = _FakeMouse()

        async def wait_for_timeout(self, ms: int) -> None:
            return None

    orig_sleep = asyncio.sleep
    totals: list[float] = []
    try:
        for seed in range(max(1, seeds)):
            state = {"total": 0.0}

            async def fake_sleep(seconds: float, result=None, _state=state):
                _state["total"] += seconds
                return result

            random.seed(seed)
            np.random.seed(seed)
            asyncio.sleep = fake_sleep
            page = _FakePage(state)
            await human_type_text(page, text, min_delay_ms, max_delay_ms)
            totals.append(state["total"])
    finally:
        asyncio.sleep = orig_sleep

    return totals


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
