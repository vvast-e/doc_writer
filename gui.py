import asyncio
import logging
import threading
from pathlib import Path
from typing import Optional

import customtkinter as ctk
from tkinter import filedialog, messagebox

from google_docs_typist import run_google_docs_typing, load_text

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
)
logger = logging.getLogger("gui")


class App(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()

        self.title("Google Docs Human Typer")
        self.geometry("720x600")

        ctk.set_appearance_mode("system")
        ctk.set_default_color_theme("blue")

        self._build_ui()

        self.min_delay_slider.set(170)
        self.max_delay_slider.set(580)

    def _build_ui(self) -> None:
        self.grid_columnconfigure(0, weight=1)

        # Документ
        doc_frame = ctk.CTkFrame(self)
        doc_frame.grid(row=0, column=0, padx=20, pady=(20, 10), sticky="ew")
        doc_frame.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(doc_frame, text="Ссылка на Google Docs:").grid(
            row=0, column=0, padx=10, pady=10, sticky="w"
        )
        self.doc_url_entry = ctk.CTkEntry(doc_frame)
        self.doc_url_entry.grid(row=0, column=1, padx=10, pady=10, sticky="ew")

        # Источник текста
        text_frame = ctk.CTkFrame(self)
        text_frame.grid(row=1, column=0, padx=20, pady=10, sticky="nsew")
        text_frame.grid_columnconfigure(1, weight=1)
        text_frame.grid_rowconfigure(3, weight=1)

        ctk.CTkLabel(text_frame, text="Источник текста:").grid(
            row=0, column=0, padx=10, pady=(10, 0), sticky="w"
        )

        self.text_source_var = ctk.StringVar(value="file")

        self.radio_file = ctk.CTkRadioButton(
            text_frame,
            text="Файл",
            variable=self.text_source_var,
            value="file",
            command=self._update_text_source_state,
        )
        self.radio_file.grid(row=1, column=0, padx=10, pady=5, sticky="w")

        self.radio_manual = ctk.CTkRadioButton(
            text_frame,
            text="Ввести вручную",
            variable=self.text_source_var,
            value="manual",
            command=self._update_text_source_state,
        )
        self.radio_manual.grid(row=1, column=1, padx=10, pady=5, sticky="w")

        # Текст из файла
        ctk.CTkLabel(text_frame, text="Файл с текстом:").grid(
            row=2, column=0, padx=10, pady=5, sticky="w"
        )
        file_frame = ctk.CTkFrame(text_frame, corner_radius=0, fg_color="transparent")
        file_frame.grid(row=2, column=1, padx=10, pady=5, sticky="ew")
        file_frame.grid_columnconfigure(0, weight=1)

        self.text_file_entry = ctk.CTkEntry(file_frame)
        self.text_file_entry.grid(row=0, column=0, padx=(0, 5), pady=0, sticky="ew")

        file_button = ctk.CTkButton(
            file_frame,
            text="Обзор...",
            width=90,
            command=self._browse_text_file,
        )
        file_button.grid(row=0, column=1, padx=0, pady=0)

        # Ручной ввод
        ctk.CTkLabel(text_frame, text="Текст:").grid(
            row=3, column=0, padx=10, pady=(5, 10), sticky="nw"
        )
        self.manual_textbox = ctk.CTkTextbox(text_frame, height=120)
        self.manual_textbox.grid(row=3, column=1, padx=10, pady=(5, 10), sticky="nsew")

        # Профиль Chrome
        profile_frame = ctk.CTkFrame(self)
        profile_frame.grid(row=2, column=0, padx=20, pady=10, sticky="ew")
        profile_frame.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(profile_frame, text="Путь к профилю Chrome (user-data-dir):").grid(
            row=0, column=0, padx=10, pady=5, sticky="w"
        )

        profile_path_frame = ctk.CTkFrame(
            profile_frame, corner_radius=0, fg_color="transparent"
        )
        profile_path_frame.grid(row=0, column=1, padx=10, pady=5, sticky="ew")
        profile_path_frame.grid_columnconfigure(0, weight=1)

        self.user_data_entry = ctk.CTkEntry(profile_path_frame)
        self.user_data_entry.grid(row=0, column=0, padx=(0, 5), pady=0, sticky="ew")

        profile_button = ctk.CTkButton(
            profile_path_frame,
            text="Обзор...",
            width=90,
            command=self._browse_user_data_dir,
        )
        profile_button.grid(row=0, column=1, padx=0, pady=0)

        # Chrome executable (опционально)
        chrome_frame = ctk.CTkFrame(self)
        chrome_frame.grid(row=3, column=0, padx=20, pady=10, sticky="ew")
        chrome_frame.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(chrome_frame, text="Путь к chrome.exe (опционально):").grid(
            row=0, column=0, padx=10, pady=5, sticky="w"
        )

        chrome_path_frame = ctk.CTkFrame(
            chrome_frame, corner_radius=0, fg_color="transparent"
        )
        chrome_path_frame.grid(row=0, column=1, padx=10, pady=5, sticky="ew")
        chrome_path_frame.grid_columnconfigure(0, weight=1)

        self.chrome_exe_entry = ctk.CTkEntry(chrome_path_frame)
        self.chrome_exe_entry.grid(row=0, column=0, padx=(0, 5), pady=0, sticky="ew")

        chrome_button = ctk.CTkButton(
            chrome_path_frame,
            text="Обзор...",
            width=90,
            command=self._browse_chrome_exe,
        )
        chrome_button.grid(row=0, column=1, padx=0, pady=0)

        # Скорость набора
        speed_frame = ctk.CTkFrame(self)
        speed_frame.grid(row=4, column=0, padx=20, pady=10, sticky="ew")
        speed_frame.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(speed_frame, text="Скорость набора (мс между символами):").grid(
            row=0, column=0, columnspan=2, padx=10, pady=(10, 0), sticky="w"
        )

        ctk.CTkLabel(speed_frame, text="Минимум:").grid(
            row=1, column=0, padx=10, pady=5, sticky="w"
        )
        self.min_delay_slider = ctk.CTkSlider(
            speed_frame,
            from_=10,
            to=1000,
            number_of_steps=99,
            command=self._on_min_delay_change,
        )
        self.min_delay_slider.set(50)
        self.min_delay_slider.grid(row=1, column=1, padx=10, pady=5, sticky="ew")
        self.min_delay_label = ctk.CTkLabel(speed_frame, text="50 мс")
        self.min_delay_label.grid(row=1, column=2, padx=10, pady=5, sticky="w")

        ctk.CTkLabel(speed_frame, text="Максимум:").grid(
            row=2, column=0, padx=10, pady=5, sticky="w"
        )
        self.max_delay_slider = ctk.CTkSlider(
            speed_frame,
            from_=10,
            to=2000,
            number_of_steps=199,
            command=self._on_max_delay_change,
        )
        self.max_delay_slider.set(220)
        self.max_delay_slider.grid(row=2, column=1, padx=10, pady=5, sticky="ew")
        self.max_delay_label = ctk.CTkLabel(speed_frame, text="220 мс")
        self.max_delay_label.grid(row=2, column=2, padx=10, pady=5, sticky="w")

        # Прочие опции
        options_frame = ctk.CTkFrame(self)
        options_frame.grid(row=5, column=0, padx=20, pady=10, sticky="ew")

        self.close_browser_var = ctk.BooleanVar(value=True)
        self.close_browser_checkbox = ctk.CTkCheckBox(
            options_frame,
            text="Закрывать браузер после завершения",
            variable=self.close_browser_var,
        )
        self.close_browser_checkbox.grid(row=0, column=0, padx=10, pady=10, sticky="w")

        # Кнопки и статус
        control_frame = ctk.CTkFrame(self)
        control_frame.grid(row=6, column=0, padx=20, pady=(10, 20), sticky="ew")
        control_frame.grid_columnconfigure(0, weight=1)

        self.start_button = ctk.CTkButton(
            control_frame,
            text="Начать набор",
            command=self._on_start_click,
        )
        self.start_button.grid(row=0, column=0, padx=10, pady=10, sticky="ew")

        self.status_label = ctk.CTkLabel(control_frame, text="Готово", anchor="w")
        self.status_label.grid(row=1, column=0, padx=10, pady=(0, 5), sticky="ew")

        self._update_text_source_state()

    def _update_text_source_state(self) -> None:
        source = self.text_source_var.get()
        if source == "file":
            self.text_file_entry.configure(state="normal")
            self.manual_textbox.configure(state="disabled")
        else:
            self.text_file_entry.configure(state="disabled")
            self.manual_textbox.configure(state="normal")

    def _browse_text_file(self) -> None:
        path = filedialog.askopenfilename(
            title="Выберите файл с текстом",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
        )
        if path:
            self.text_file_entry.delete(0, "end")
            self.text_file_entry.insert(0, path)

    def _browse_user_data_dir(self) -> None:
        path = filedialog.askdirectory(
            title="Выберите каталог профиля Chrome (user-data-dir)"
        )
        if path:
            self.user_data_entry.delete(0, "end")
            self.user_data_entry.insert(0, path)

    def _browse_chrome_exe(self) -> None:
        path = filedialog.askopenfilename(
            title="Выберите chrome.exe",
            filetypes=[("chrome.exe", "chrome.exe"), ("All files", "*.*")],
        )
        if path:
            self.chrome_exe_entry.delete(0, "end")
            self.chrome_exe_entry.insert(0, path)

    def _on_min_delay_change(self, value: float) -> None:
        self.min_delay_label.configure(text=f"{int(value)} мс")

    def _on_max_delay_change(self, value: float) -> None:
        self.max_delay_label.configure(text=f"{int(value)} мс")

    def _set_status(self, text: str, color: str = "white") -> None:
        self.status_label.configure(text=text, text_color=color)

    def _on_start_click(self) -> None:
        doc_url = self.doc_url_entry.get().strip()
        if not doc_url:
            messagebox.showerror("Ошибка", "Укажите ссылку на документ Google Docs.")
            return

        source = self.text_source_var.get()

        try:
            if source == "file":
                text_path = Path(self.text_file_entry.get().strip())
                if not text_path.is_file():
                    messagebox.showerror("Ошибка", "Файл с текстом не найден.")
                    return
                text = load_text(text_path)
            else:
                text = self.manual_textbox.get("1.0", "end").strip()
                if not text:
                    messagebox.showerror("Ошибка", "Введите текст для набора.")
                    return
        except Exception as exc:  # noqa: BLE001
            messagebox.showerror("Ошибка", f"Не удалось прочитать текст: {exc}")
            return

        user_data_dir_str = self.user_data_entry.get().strip()
        if not user_data_dir_str:
            messagebox.showerror(
                "Ошибка", "Укажите путь к профилю Chrome (user-data-dir)."
            )
            return

        user_data_dir = Path(user_data_dir_str)
        if not user_data_dir.exists():
            messagebox.showerror(
                "Ошибка",
                f"Каталог профиля Chrome не найден:\n{user_data_dir}",
            )
            return

        chrome_exe_str = self.chrome_exe_entry.get().strip()
        chrome_exe_path: Optional[Path] = None
        if chrome_exe_str:
            chrome_exe_path = Path(chrome_exe_str)

        min_delay_ms = int(self.min_delay_slider.get())
        max_delay_ms = int(self.max_delay_slider.get())

        if min_delay_ms > max_delay_ms:
            messagebox.showerror(
                "Ошибка",
                "Минимальная задержка не может быть больше максимальной.",
            )
            return

        close_browser = bool(self.close_browser_var.get())

        self._set_status("Идёт набор...", "orange")
        self.start_button.configure(state="disabled")

        thread = threading.Thread(
            target=self._run_task_thread,
            args=(
                doc_url,
                text,
                user_data_dir,
                chrome_exe_path,
                min_delay_ms,
                max_delay_ms,
                close_browser,
            ),
            daemon=True,
        )
        thread.start()

    def _run_task_thread(
        self,
        doc_url: str,
        text: str,
        user_data_dir: Path,
        chrome_exe_path: Optional[Path],
        min_delay_ms: int,
        max_delay_ms: int,
        close_browser: bool,
    ) -> None:
        error: Optional[str] = None
        try:
            asyncio.run(
                run_google_docs_typing(
                    doc_url=doc_url,
                    text=text,
                    user_data_dir=user_data_dir,
                    chrome_exe_path=chrome_exe_path,
                    min_delay_ms=min_delay_ms,
                    max_delay_ms=max_delay_ms,
                    close_browser=close_browser,
                )
            )
        except Exception as exc:  # noqa: BLE001
            error = str(exc)

        # Если ошибки нет, всегда статус "Готово"
        self.after(0, lambda: self._on_task_finished(error if error else None))

    def _on_task_finished(self, error: Optional[str]) -> None:
        if error:
            self._set_status(f"Ошибка: {error}", "red")
            messagebox.showerror(
                "Ошибка", f"Во время набора произошла ошибка:\n{error}"
            )
        else:
            self._set_status("Готово", "green")

        self.start_button.configure(state="normal")


def main() -> None:
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
