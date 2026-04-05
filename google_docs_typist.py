import asyncio
import logging
import random
import sys
import numpy as np
from pathlib import Path
from typing import Optional

from playwright.async_api import async_playwright, BrowserContext, Page

logger = logging.getLogger("google_docs_typist")


def _log(message: str) -> None:
    logger.info(message)


async def get_input_frame(page: Page):
    """Возвращает Frame скрытого iframe — сюда Docs реально принимает клавиатуру"""
    try:
        iframe = await page.wait_for_selector(
            ".docs-texteventtarget-iframe", timeout=8000
        )
        frame = await iframe.content_frame()
        _log("✅ Доступ к input-iframe получен")
        return frame
    except Exception as e:
        _log(f"⚠️ Iframe не найден, fallback на main page: {e}")
        return page


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


async def _type_char(page: Page, ch: str) -> None:
    """Ввод символа через page.keyboard (работает для всех типов)"""
    if ch == "\n":
        await page.keyboard.press("Enter")
        await asyncio.sleep(np.random.uniform(0.15, 0.45))
        return
    if ch == "\b":
        await page.keyboard.press("Backspace")
        await asyncio.sleep(np.random.uniform(0.12, 0.28))
        return
    # Для обычных символов — имитируем задержку
    await page.keyboard.type(ch, delay=np.random.uniform(90, 290))
    await asyncio.sleep(np.random.uniform(0.09, 0.22))


PAUSE_CHARS = {'.', '!', '?', ';', ':', ',', ')', ']'}
NEWLINE_CHARS = {'\n', '\r'}


async def human_type_text(
    page: Page, text: str, min_delay_ms: int, max_delay_ms: int,
    progress_callback: callable = None
) -> None:
    import re

    total = len(text)
    typed = 0

    def report_progress():
        nonlocal typed
        if progress_callback:
            progress_callback(typed, total)

    await page.wait_for_timeout(3200)

    words = re.split(r"(\s+)", text)
    for w_idx, word in enumerate(words):
        idx = 0
        while idx < len(word):
            ch = word[idx]
            await _type_char(page, ch)
            typed += 1
            report_progress()
            await _add_pause_after_char(ch)
            idx += 1

        # Редкое движение мыши между словами
        if np.random.rand() < 0.08:
            await page.mouse.move(
                random.randint(150, 950),
                random.randint(180, 720),
                steps=random.randint(4, 10),
            )

    await page.wait_for_timeout(2800)
    _log("✅ Набор завершён")


async def _add_pause_after_char(ch: str) -> None:
    if ch in NEWLINE_CHARS:
        await asyncio.sleep(np.random.uniform(7.0, 15.0))
    elif ch in PAUSE_CHARS:
        await asyncio.sleep(np.random.uniform(1.0, 3.0))


async def ensure_page(context: BrowserContext) -> Page:
    if context.pages:
        return context.pages[0]
    return await context.new_page()


def load_text(text_file: Path) -> str:
    if not text_file.is_file():
        raise FileNotFoundError(f"Файл с текстом не найден: {text_file}")
    return text_file.read_text(encoding="utf-8")


async def wait_for_google_login(page: Page, timeout_ms: int = 600_000) -> None:
    deadline = asyncio.get_event_loop().time() + timeout_ms / 1000.0
    while True:
        if asyncio.get_event_loop().time() >= deadline:
            raise TimeoutError("Не удалось дождаться входа в Google.")
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
                "--remote-debugging-port=0",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
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
                await wait_for_google_login(page)
                _log("Вход выполнен, продолжаем работу с документом.")

            try:
                await focus_document_body(page)
            except Exception as exc:
                _log(f"Критическая ошибка фокуса: {exc}")
                return

            _log("Фокус установлен, начинаем печатать текст...")
            if type_text_fn:
                await type_text_fn(page, text, min_delay_ms, max_delay_ms)
            else:
                await human_type_text(page, text, min_delay_ms, max_delay_ms)

            _log("Набор текста завершён, финальная пауза...")

    finally:
        if context is not None and close_browser:
            try:
                await context.close()
            except Exception as exc:
                if "Target page, context or browser has been closed" not in str(exc):
                    _log(f"Ошибка закрытия браузера: {exc}")

    _log("Завершено без ошибок.")
