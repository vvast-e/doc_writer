import argparse
import asyncio
import json
import logging
import os
import sys
import threading
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

# Принудительный UTF-8 для общения с родительским процессом (Tauri/Rust).
# На Windows консольная кодировка по умолчанию cp1251 → ломает JSON и логи.
for stream_name in ("stdin", "stdout", "stderr"):
    stream = getattr(sys, stream_name, None)
    if stream is not None and hasattr(stream, "reconfigure"):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

from google_docs_typist import (
    load_text,
    run_google_docs_typing,
    human_type_text,
    estimate_typing_seconds,
    launch_persistent_browser,
    open_and_type_in_session,
)

from playwright.async_api import async_playwright


def _resolve_log_dir() -> Path:
    """Каталог для файлового лога. У пользователя нет консоли → пишем рядом с профилем."""
    explicit = os.environ.get("HUMANTYPE_LOG_DIR")
    if explicit:
        return Path(explicit)
    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
        if base:
            return Path(base) / "com.user.humantype-tauri" / "logs"
    return Path.home() / ".humantype-tauri" / "logs"


def _setup_logging() -> None:
    log_dir = _resolve_log_dir()
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_dir / "sidecar.log",
            maxBytes=1_000_000,
            backupCount=3,
            encoding="utf-8",
        )
    except Exception:
        file_handler = None

    handlers = [logging.StreamHandler(sys.stderr)]
    if file_handler is not None:
        handlers.append(file_handler)

    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] [%(levelname)s] %(message)s",
        handlers=handlers,
        force=True,
    )


_setup_logging()
logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments for Google Docs typing script."""
    parser = argparse.ArgumentParser(
        description=(
            "Открывает указанный Google Docs в уже залогиненном профиле Chrome "
            "и посимвольно печатает текст с человеческими задержками."
        )
    )
    parser.add_argument("--session-id", required=False, help="ID сессии для sidecar режима")
    parser.add_argument("--doc-url", default=None, help="Ссылка на документ Google Docs.")
    text_group = parser.add_mutually_exclusive_group(required=False)
    text_group.add_argument("--text-file", help="Путь к текстовому файлу UTF-8 с текстом для ввода.")
    text_group.add_argument("--text-content", help="Текст для ввода напрямую.")
    parser.add_argument("--user-data-dir", default=None, help="Путь к директории профиля Chrome.")
    parser.add_argument("--chrome-exe-path", default=None, help="Путь к chrome.exe, опционально.")
    parser.add_argument("--min-delay", type=int, default=110, help="Минимальная задержка (мс).")
    parser.add_argument("--max-delay", type=int, default=380, help="Максимальная задержка (мс).")
    parser.add_argument("--login-wait-timeout", type=int, default=180,
                        help="Сколько секунд ждать ручной вход в Google (по умолчанию 180).")
    parser.add_argument("--close-browser", action="store_true", help="Закрыть браузер после завершения.")
    parser.add_argument("--estimate-only", action="store_true",
                        help="Не открывать браузер: посчитать Monte-Carlo оценку времени набора и выйти.")
    parser.add_argument("--seeds", type=int, default=24,
                        help="Число сидов Monte-Carlo для --estimate-only (по умолчанию 24).")
    parser.add_argument("--multiplex", action="store_true",
                        help="Режим мультиплексора (Фаза 5): один браузер на весь sidecar, "
                             "сессии печати (doc/text/задержки) приходят по одной командой "
                             "'start' через stdin вместо CLI-аргументов.")
    args = parser.parse_args()
    if args.multiplex:
        if not args.user_data_dir or not args.user_data_dir.strip():
            parser.error("--user-data-dir обязателен для --multiplex")
    elif not args.estimate_only:
        if not args.doc_url or not args.doc_url.strip():
            parser.error("--doc-url обязателен, если не указаны --estimate-only/--multiplex")
        if not args.text_file and not args.text_content:
            parser.error("--text-file или --text-content обязателен, если не указаны --estimate-only/--multiplex")
        if not args.user_data_dir or not args.user_data_dir.strip():
            parser.error("--user-data-dir обязателен, если не указан --estimate-only")
    return args


# Кросс-поточный флаг останова (управляется stdin-командой `stop`).
stop_flag = threading.Event()


def _emit(event: dict) -> None:
    """Шлём structured-event в stdout — Rust parsит построчно."""
    try:
        sys.stdout.write(json.dumps(event, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    except Exception:
        pass


def stdin_command_loop() -> None:
    while True:
        try:
            line = sys.stdin.readline()
        except Exception:
            break
        if not line:
            break
        try:
            cmd = json.loads(line)
        except Exception:
            continue
        if cmd.get("command") == "stop":
            logger.info("Получена команда stop из stdin")
            stop_flag.set()


async def run_typing_with_events(
    *,
    doc_url,
    text,
    user_data_dir,
    chrome_exe_path,
    min_delay_ms,
    max_delay_ms,
    close_browser,
    session_id,
    login_wait_timeout_s,
):
    _emit({"event": "started", "session_id": session_id, "total": len(text)})
    try:
        total = len(text)

        def progress_event(typed: int, total: int) -> None:
            _emit({
                "event": "progress",
                "session_id": session_id,
                "typed": typed,
                "total": total,
                "progress": (typed / total) if total else 0,
            })

        def login_wait_event() -> None:
            _emit({"event": "login_wait", "session_id": session_id})

        async def typing_callback(page, txt, mn, mx):
            await human_type_text(
                page, txt, mn, mx,
                progress_callback=progress_event,
                stop_flag=stop_flag,
            )

        await run_google_docs_typing(
            doc_url=doc_url,
            text=text,
            user_data_dir=user_data_dir,
            chrome_exe_path=chrome_exe_path,
            min_delay_ms=min_delay_ms,
            max_delay_ms=max_delay_ms,
            close_browser=close_browser,
            type_text_fn=typing_callback,
            stop_flag=stop_flag,
            login_wait_callback=login_wait_event,
            login_wait_timeout_s=login_wait_timeout_s,
        )
        if stop_flag.is_set():
            _emit({"event": "stopped", "session_id": session_id})
        else:
            _emit({"event": "done", "session_id": session_id})
    except Exception as exc:
        logger.exception("Sidecar fatal error")
        _emit({"event": "error", "session_id": session_id, "error": str(exc)})
        sys.exit(2)


async def run_multiplex(args: argparse.Namespace) -> None:
    """Мультиплекс-режим (Фаза 5): ОДИН Chromium/профиль на весь процесс sidecar,
    вместо одного процесса-браузера на сессию. Сессии печати открываются и
    останавливаются командами через stdin (а не CLI-аргументами при старте
    процесса) — каждая сессия получает свою вкладку, свой `asyncio.Task` и свой
    per-session stop-флаг (`asyncio.Event`, duck-type совместим с
    `threading.Event`, см. `open_and_type_in_session`). Логин Google — общий
    для профиля: только первая вкладка, попавшая на экран входа, ждёт ручной
    авторизации; остальные уже используют её cookies.

    Протокол команд (JSON-строка на stdin, по одной на строку):
      {"command":"start","session_id":"...","doc_url":"...","text":"...",
       "min_delay_ms":110,"max_delay_ms":380}
      {"command":"stop","session_id":"..."}
      {"command":"shutdown"}   — останавливает все активные сессии и закрывает браузер.
    Закрытие stdin (EOF, например если упал родительский Rust-процесс)
    трактуется как неявный shutdown.
    """
    user_data_dir = Path(args.user_data_dir)
    chrome_exe_path: Optional[Path] = (
        Path(args.chrome_exe_path) if args.chrome_exe_path else None
    )

    loop = asyncio.get_running_loop()
    cmd_queue: "asyncio.Queue[dict]" = asyncio.Queue()

    def stdin_reader() -> None:
        while True:
            try:
                line = sys.stdin.readline()
            except Exception:
                break
            if not line:
                loop.call_soon_threadsafe(cmd_queue.put_nowait, {"command": "__stdin_eof__"})
                break
            line = line.strip()
            if not line:
                continue
            try:
                cmd = json.loads(line)
            except Exception:
                continue
            loop.call_soon_threadsafe(cmd_queue.put_nowait, cmd)

    threading.Thread(target=stdin_reader, daemon=True).start()

    sessions: dict[str, asyncio.Task] = {}
    stop_events: dict[str, asyncio.Event] = {}
    context_holder: dict[str, object] = {}

    async def run_session(session_id: str, cmd: dict) -> None:
        doc_url = cmd.get("doc_url") or ""
        text = cmd.get("text") or ""
        min_delay_ms = int(cmd.get("min_delay_ms", args.min_delay))
        max_delay_ms = int(cmd.get("max_delay_ms", args.max_delay))

        _emit({"event": "started", "session_id": session_id, "total": len(text)})
        try:
            def progress_event(typed: int, total: int) -> None:
                _emit({
                    "event": "progress",
                    "session_id": session_id,
                    "typed": typed,
                    "total": total,
                    "progress": (typed / total) if total else 0,
                })

            def login_wait_event() -> None:
                _emit({"event": "login_wait", "session_id": session_id})

            stop_event = stop_events[session_id]
            await open_and_type_in_session(
                context_holder["context"],
                doc_url=doc_url,
                text=text,
                min_delay_ms=min_delay_ms,
                max_delay_ms=max_delay_ms,
                stop_flag=stop_event,
                progress_callback=progress_event,
                login_wait_callback=login_wait_event,
                login_wait_timeout_s=args.login_wait_timeout,
            )
            if stop_event.is_set():
                _emit({"event": "stopped", "session_id": session_id})
            else:
                _emit({"event": "done", "session_id": session_id})
        except Exception as exc:
            logger.exception("Сессия %s: фатальная ошибка", session_id)
            _emit({"event": "error", "session_id": session_id, "error": str(exc)})
        finally:
            sessions.pop(session_id, None)
            stop_events.pop(session_id, None)

    try:
        async with async_playwright() as p:
            logger.info("Мультиплекс-старт: profile=%s", user_data_dir)
            context = await launch_persistent_browser(p, user_data_dir, chrome_exe_path)
            context_holder["context"] = context

            try:
                while True:
                    cmd = await cmd_queue.get()
                    command = cmd.get("command")

                    if command == "start":
                        session_id = cmd.get("session_id")
                        if not session_id:
                            continue
                        if session_id in sessions:
                            logger.warning(
                                "Сессия %s уже запущена, повторный start игнорирован", session_id
                            )
                            continue
                        stop_events[session_id] = asyncio.Event()
                        sessions[session_id] = asyncio.create_task(run_session(session_id, cmd))

                    elif command == "stop":
                        session_id = cmd.get("session_id")
                        stop_event = stop_events.get(session_id)
                        if stop_event is not None:
                            stop_event.set()

                    elif command in ("shutdown", "__stdin_eof__"):
                        break
            finally:
                for stop_event in stop_events.values():
                    stop_event.set()
                if sessions:
                    await asyncio.gather(*sessions.values(), return_exceptions=True)
                try:
                    await context.close()
                except Exception as exc:
                    if "Target page, context or browser has been closed" not in str(exc):
                        logger.warning("Ошибка закрытия браузера: %s", exc)
    except Exception as exc:
        logger.exception("Мультиплекс: фатальная ошибка")
        _emit({"event": "error", "session_id": None, "error": str(exc)})

    logger.info("Мультиплекс-режим завершён.")


def main() -> None:
    # Windows + asyncio + subprocess: ProactorEventLoopPolicy нужен для Playwright.
    if sys.platform == "win32":
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        except Exception:
            pass

    args = parse_args()

    if args.multiplex:
        asyncio.run(run_multiplex(args))
        return

    if args.text_content:
        text = args.text_content
    else:
        text_file = Path(args.text_file)
        text = load_text(text_file)

    if args.estimate_only:
        async def _run_estimate() -> None:
            totals = await estimate_typing_seconds(
                text, args.min_delay, args.max_delay, seeds=args.seeds,
            )
            totals_sorted = sorted(totals)

            def pct(p: float) -> float:
                idx = min(len(totals_sorted) - 1, round(p * (len(totals_sorted) - 1)))
                return totals_sorted[idx]

            _emit({
                "event": "estimate",
                "p10": pct(0.10),
                "p50": pct(0.50),
                "p90": pct(0.90),
                "seeds": args.seeds,
            })

        asyncio.run(_run_estimate())
        return

    session_id = args.session_id or "default"
    doc_url = args.doc_url
    user_data_dir = Path(args.user_data_dir)
    chrome_exe_path: Optional[Path] = (
        Path(args.chrome_exe_path) if args.chrome_exe_path else None
    )

    logger.info(
        "Sidecar старт: session=%s url=%s chars=%d delays=%d..%d profile=%s",
        session_id, doc_url, len(text), args.min_delay, args.max_delay, user_data_dir,
    )

    threading.Thread(target=stdin_command_loop, daemon=True).start()
    asyncio.run(
        run_typing_with_events(
            doc_url=doc_url,
            text=text,
            user_data_dir=user_data_dir,
            chrome_exe_path=chrome_exe_path,
            min_delay_ms=args.min_delay,
            max_delay_ms=args.max_delay,
            close_browser=bool(args.close_browser),
            session_id=session_id,
            login_wait_timeout_s=args.login_wait_timeout,
        )
    )


if __name__ == "__main__":
    main()
