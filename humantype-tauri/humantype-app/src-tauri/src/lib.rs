use std::fs;
use std::path::PathBuf;
use std::process::Command;

// Команда для запуска Python-скрипта с параметрами из React
#[tauri::command]
async fn run_typing(
    doc_url: String,
    user_data_dir: String,
    chrome_exe_path: Option<String>,
    min_delay: u32,
    max_delay: u32,
    close_browser: bool,
    text_source: String,          // "file" | "manual"
    text_file_path: Option<String>,
    manual_text: Option<String>,
) -> Result<(), String> {
    // Пути к твоему проекту и питону
    let python_exe = PathBuf::from(r"D:\doc_writer\venv\Scripts\python.exe");
    let project_dir = PathBuf::from(r"D:\doc_writer");
    let script_path = PathBuf::from(r"D:\doc_writer\main.py");

    if !python_exe.exists() {
        return Err(format!("Не найден python.exe по пути: {}", python_exe.display()));
    }
    if !script_path.exists() {
        return Err(format!("Не найден main.py по пути: {}", script_path.display()));
    }

    // Подготовка текстового файла
    let final_text_file: String = match text_source.as_str() {
        "file" => {
            let p = text_file_path.ok_or("Не указан путь к файлу с текстом")?;
            p
        }
        "manual" => {
            let text = manual_text.ok_or("Не передан текст для ручного ввода")?;
            if text.trim().is_empty() {
                return Err("Текст для ручного ввода пустой".into());
            }
            let mut tmp_path = project_dir.clone();
            tmp_path.push("temp_text_input.txt");
            fs::write(&tmp_path, text)
                .map_err(|e| format!("Не удалось записать временный файл текста: {e}"))?;
            tmp_path.to_string_lossy().to_string()
        }
        other => {
            return Err(format!("Неизвестный источник текста: {other}"));
        }
    };

    // Сбор аргументов для main.py
    let mut args: Vec<String> = Vec::new();
    args.push(script_path.to_string_lossy().to_string());
    args.push("--doc-url".into());
    args.push(doc_url);
    args.push("--text-file".into());
    args.push(final_text_file);
    args.push("--user-data-dir".into());
    args.push(user_data_dir);
    if let Some(chrome) = chrome_exe_path {
        if !chrome.trim().is_empty() {
            args.push("--chrome-exe-path".into());
            args.push(chrome);
        }
    }
    args.push("--min-delay".into());
    args.push(min_delay.to_string());
    args.push("--max-delay".into());
    args.push(max_delay.to_string());
    if close_browser {
        args.push("--close-browser".into());
    }

    let output = Command::new(&python_exe)
        .current_dir(&project_dir)
        .args(&args)
        .output()
        .map_err(|e| format!("Не удалось запустить python: {e}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!(
            "Скрипт завершился с ошибкой (код {}): {}",
            output.status.code().unwrap_or(-1),
            stderr
        ))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![run_typing])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
