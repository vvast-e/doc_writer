import asyncio
import random
import sys
import numpy as np
from pathlib import Path
from typing import Optional

from playwright.async_api import async_playwright, BrowserContext, Page


def _log(message: str) -> None:
    print(f"[google_docs_typist] {message}", file=sys.stderr, flush=True)


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
        except:
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


async def human_type_text(
    page: Page, text: str, min_delay_ms: int, max_delay_ms: int
) -> None:
    import re

    await page.wait_for_timeout(3200)  # человек готовится

    # Разбиваем текст на абзацы
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    for p_idx, paragraph in enumerate(paragraphs):
        # Разбиваем абзац на предложения
        sentences = re.split(r"(?<=[.!?…])\s+", paragraph)
        # Добавляем пробел в конец предложения, если оно заканчивается на точку/знак конца предложения и не заканчивается пробелом
        for i in range(len(sentences)):
            if (
                sentences[i]
                and sentences[i][-1] in ".!?…"
                and (len(sentences[i]) == 1 or sentences[i][-1] != " ")
            ):
                sentences[i] = sentences[i] + " "
        for s_idx, sentence in enumerate(sentences):
            # Разбиваем предложение на слова
            words = re.split(r"(\s+)", sentence)

            for w_idx, word in enumerate(words):
                restored = False
                idx = 0
                while idx < len(word):
                    ch = word[idx]
                    # Опечатки (2.7% — выглядит очень человечно)
                    if (
                        not restored
                        and np.random.rand() < 0.027
                        and idx > 0
                        and ch.isalpha()
                    ):
                        max_err = min(3, idx)
                        err_len = np.random.randint(1, max_err + 1)
                        _log(
                            f"[LOG] Опечатка: backspace {err_len} на символе '{ch}' (позиция {idx}) в слове '{word}'"
                        )
                        # Удаляем последние err_len символов
                        for del_idx in range(err_len):
                            await _type_char(page, "\b")
                        _log(
                            f"[LOG] Восстановление слова полностью после backspace: '{word}'"
                        )
                        # Восстанавливаем всё слово полностью
                        for symbol in word:
                            await _type_char(page, symbol)
                        restored = True
                        break
                    await _type_char(page, ch)
                    idx += 1
                if restored:
                    continue

                # Проверка: если слово заканчивается на точку/знак конца предложения и следующий word не пробел, добавить пробел
                if w_idx < len(words) - 1:
                    last_ch = word[-1] if word else ""
                    next_word = words[w_idx + 1]
                    if last_ch in ".!?…" and not next_word.startswith(" "):
                        await _type_char(page, " ")

                # Пауза между словами (имитация естественности)
                if w_idx % 2 == 0:
                    await asyncio.sleep(np.random.uniform(0.12, 0.35))

            # Длинная пауза между предложениями (thinking time)
            await asyncio.sleep(np.random.uniform(5, 20))
            _log(f"🕒 Thinking pause after sentence {s_idx+1} in paragraph {p_idx+1}")

        # Очень длинная пауза между абзацами (инициирует новую ревизию)
        await asyncio.sleep(np.random.uniform(30, 90))
        _log(f"🕒 Long pause after paragraph {p_idx+1}")

        # Редкое движение мыши
        if np.random.rand() < 0.13:
            await page.mouse.move(
                random.randint(150, 950),
                random.randint(180, 720),
                steps=random.randint(6, 15),
            )

    await page.wait_for_timeout(2800)
    _log("✅ Набор завершён (логические паузы и thinking time реализованы)")


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
