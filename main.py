import argparse
import asyncio
import json
import logging
import sys
import threading
from pathlib import Path
from typing import Optional

from google_docs_typist import load_text, run_google_docs_typing, human_type_text

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments for Google Docs typing script."""
    parser = argparse.ArgumentParser(
        description=(
            "Открывает указанный Google Docs в уже залогиненном профиле Chrome "
            "и посимвольно печатает текст с человеческими задержками."
        )
    )
    parser.add_argument(
        "--session-id",
        required=False,
        help="ID сессии для sidecar режима",
    )
    parser.add_argument(
        "--doc-url",
        required=True,
        help="Ссылка на документ Google Docs.",
    )
    text_group = parser.add_mutually_exclusive_group(required=True)
    text_group.add_argument(
        "--text-file",
        help="Путь к текстовому файлу UTF-8 с текстом для ввода.",
    )
    text_group.add_argument(
        "--text-content",
        help="Текст для ввода напрямую.",
    )
    parser.add_argument(
        "--user-data-dir",
        required=True,
        help=(
            "Путь к директории профиля Chrome "
            "(например, C:\\Users\\USER\\AppData\\Local\\Google\\Chrome\\User Data\\Default)."
        ),
    )
    parser.add_argument(
        "--chrome-exe-path",
        default=None,
        help="Необязательный путь к chrome.exe, если используется нестандартный путь.",
    )
    parser.add_argument(
        "--min-delay",
        type=int,
        default=110,
        help="Минимальная задержка между символами в миллисекундах (по умолчанию 110).",
    )
    parser.add_argument(
        "--max-delay",
        type=int,
        default=380,
        help="Максимальная задержка между символами в миллисекундах (по умолчанию 380).",
    )
    parser.add_argument(
        "--close-browser",
        action="store_true",
        help="Закрыть браузер по завершении работы скрипта.",
    )
    return parser.parse_args()


stop_flag = threading.Event()
status_data = {
    "status": "idle",
    "progress": 0,
    "session_id": None,
    "error": None,
}


def stdin_command_loop():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            cmd = json.loads(line)
        except Exception:
            continue
        if cmd.get("command") == "stop":
            stop_flag.set()
            status_data["status"] = "stopped"
        elif cmd.get("command") == "status":
            print(json.dumps(status_data), flush=True)


async def run_typing_with_events(
    *,
    doc_url,
    text,
    user_data_dir,
    chrome_exe_path,
    min_delay_ms,
    max_delay_ms,
    close_browser,
    session_id
):
    status_data["status"] = "running"
    status_data["session_id"] = session_id
    try:
        total = len(text)

        def progress_event(typed, total):
            status_data["progress"] = typed / total if total else 0
            event = {
                "event": "progress",
                "session_id": session_id,
                "progress": status_data["progress"],
                "typed": typed,
                "total": total,
            }
            print(json.dumps(event), flush=True)

        async def human_type_text_with_events(page, text, min_delay_ms, max_delay_ms):
            await human_type_text(
                page, text, min_delay_ms, max_delay_ms,
                progress_callback=progress_event
            )

        await run_google_docs_typing(
            doc_url=doc_url,
            text=text,
            user_data_dir=user_data_dir,
            chrome_exe_path=chrome_exe_path,
            min_delay_ms=min_delay_ms,
            max_delay_ms=max_delay_ms,
            close_browser=close_browser,
            type_text_fn=human_type_text_with_events,
        )
        status_data["status"] = "done"
        print(json.dumps({"event": "done", "session_id": session_id}), flush=True)
    except Exception as exc:
        status_data["status"] = "error"
        status_data["error"] = str(exc)
        print(
            json.dumps({"event": "error", "session_id": session_id, "error": str(exc)}),
            flush=True,
        )


def main():
    args = parse_args()
    session_id = args.session_id or "default"
    doc_url = args.doc_url
    user_data_dir = Path(args.user_data_dir)
    chrome_exe_path: Optional[Path] = (
        Path(args.chrome_exe_path) if args.chrome_exe_path else None
    )
    if args.text_content:
        text = args.text_content
    else:
        text_file = Path(args.text_file)
        text = load_text(text_file)
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
        )
    )


if __name__ == "__main__":
    main()
