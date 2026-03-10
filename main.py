import argparse
import asyncio
import sys
from pathlib import Path
from typing import Optional

from google_docs_typist import load_text, run_google_docs_typing


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments for Google Docs typing script."""
    parser = argparse.ArgumentParser(
        description=(
            "Открывает указанный Google Docs в уже залогиненном профиле Chrome "
            "и посимвольно печатает текст с человеческими задержками."
        )
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
        default=50,
        help="Минимальная задержка между символами в миллисекундах (по умолчанию 50).",
    )
    parser.add_argument(
        "--max-delay",
        type=int,
        default=220,
        help="Максимальная задержка между символами в миллисекундах (по умолчанию 220).",
    )
    parser.add_argument(
        "--close-browser",
        action="store_true",
        help="Закрыть браузер по завершении работы скрипта.",
    )
    return parser.parse_args()


def main() -> None:
    """Synchronous entry point that parses arguments and runs async logic."""
    args = parse_args()

    doc_url = args.doc_url
    user_data_dir = Path(args.user_data_dir)
    chrome_exe_path: Optional[Path] = Path(args.chrome_exe_path) if args.chrome_exe_path else None

    try:
        # Load text from either file or content parameter
        if args.text_content:
            text = args.text_content
        else:
            text_file = Path(args.text_file)
            text = load_text(text_file)

        asyncio.run(
            run_google_docs_typing(
                doc_url=doc_url,
                text=text,
                user_data_dir=user_data_dir,
                chrome_exe_path=chrome_exe_path,
                min_delay_ms=args.min_delay,
                max_delay_ms=args.max_delay,
                close_browser=bool(args.close_browser),
            )
        )
    except Exception as exc:  # noqa: BLE001
        print(f"Ошибка при выполнении скрипта: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()


