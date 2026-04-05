use once_cell::sync::OnceCell;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::Manager;
use tokio::process::Child;
use tokio::process::Command;
use tokio::sync::Mutex;

static TYPING_PROCESS: OnceCell<Mutex<Option<Child>>> = OnceCell::new();

fn typing_process() -> &'static Mutex<Option<Child>> {
    TYPING_PROCESS.get_or_init(|| Mutex::new(None))
}

fn get_resources_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app.path()
        .resource_dir()
        .map_err(|e| e.to_string())?;

    let dev_resources = resource_dir
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .map(|p| p.join("src-tauri").join("resources"));

    if let Some(ref dev_path) = dev_resources {
        if dev_path.exists() {
            return Ok(dev_path.clone());
        }
    }

    Ok(resource_dir)
}

fn get_app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())
}

fn chromium_subdir() -> &'static str {
    match std::env::consts::OS {
        "windows" => "chrome-win64",
        "macos" => "chrome-mac",
        "linux" => "chrome-linux",
        _ => "chrome-win64",
    }
}

fn chromium_exe_name() -> &'static str {
    match std::env::consts::OS {
        "windows" => "chrome.exe",
        "macos" => "Chromium.app/Contents/MacOS/Chromium",
        "linux" => "chrome",
        _ => "chrome.exe",
    }
}

fn python_script_name() -> &'static str {
    match std::env::consts::OS {
        "windows" => "python-script.exe",
        _ => "python-script",
    }
}

#[tauri::command]
async fn find_chromium(app: tauri::AppHandle) -> Result<String, String> {
    let resources = get_resources_dir(&app)?;
    let subdir = chromium_subdir();
    let exe = chromium_exe_name();
    let chromium = resources.join("chromium").join(subdir).join(exe);

    if chromium.exists() {
        Ok(chromium.to_string_lossy().to_string())
    } else {
        Err(format!("Chromium not found at: {}", chromium.display()))
    }
}

#[tauri::command]
async fn find_python_script(app: tauri::AppHandle) -> Result<String, String> {
    let resources = get_resources_dir(&app)?;
    let script = resources.join(python_script_name());

    if script.exists() {
        Ok(script.to_string_lossy().to_string())
    } else {
        Err(format!("Python script not found at: {}", script.display()))
    }
}

#[tauri::command]
async fn get_profile_path(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = get_app_data_dir(&app)?;
    let profile_dir = data_dir.join("chrome-profile");
    std::fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;
    Ok(profile_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn check_profile_exists(app: tauri::AppHandle) -> Result<bool, String> {
    let data_dir = get_app_data_dir(&app)?;
    let profile_dir = data_dir.join("chrome-profile");

    if !profile_dir.exists() {
        return Ok(false);
    }

    let entries = std::fs::read_dir(&profile_dir)
        .map_err(|e| e.to_string())?;
    for entry in entries {
        if let Ok(entry) = entry {
            return Ok(true);
        }
    }

    Ok(false)
}

#[tauri::command]
async fn open_chromium_for_login(app: tauri::AppHandle) -> Result<(), String> {
    let chromium_path = find_chromium(app.clone()).await?;
    let profile_path = get_profile_path(app.clone()).await?;

    let mut cmd = Command::new(&chromium_path);
    cmd.arg("--user-data-dir").arg(&profile_path);
    cmd.arg("--no-first-run");
    cmd.arg("--no-default-browser-check");
    cmd.arg("--ignore-certificate-errors");
    cmd.arg("--disable-features=NetworkService");
    cmd.arg("https://accounts.google.com");

    cmd.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn start_typing(
    app: tauri::AppHandle,
    doc_url: String,
    text_source: String,
    text_file_path: Option<String>,
    manual_text: Option<String>,
    user_data_dir: String,
    chrome_exe_path: Option<String>,
    min_delay_ms: i32,
    max_delay_ms: i32,
    close_browser: bool,
) -> Result<(), String> {
    if doc_url.trim().is_empty() {
        return Err("Ссылка на документ не может быть пустой".into());
    }

    let profile_path = if user_data_dir.trim().is_empty() {
        get_profile_path(app.clone()).await?
    } else {
        user_data_dir
    };

    if min_delay_ms > max_delay_ms {
        return Err("Минимальная задержка не может быть больше максимальной".into());
    }

    let mut guard = typing_process().lock().await;
    if guard.is_some() {
        return Err("Набор уже запущен".into());
    }

    let python_script = find_python_script(app.clone()).await?;
    let chromium_path = find_chromium(app.clone()).await?;

    let resources = get_resources_dir(&app)?;
    let chromium_dir = resources.join("chromium");

    let mut cmd_args: Vec<String> = Vec::new();
    cmd_args.push("--doc-url".into());
    cmd_args.push(doc_url);
    cmd_args.push("--user-data-dir".into());
    cmd_args.push(profile_path.clone());
    cmd_args.push("--min-delay".into());
    cmd_args.push(min_delay_ms.to_string());
    cmd_args.push("--max-delay".into());
    cmd_args.push(max_delay_ms.to_string());
    cmd_args.push("--chrome-exe-path".into());
    cmd_args.push(chromium_path.clone());

    if close_browser {
        cmd_args.push("--close-browser".into());
    }

    match text_source.as_str() {
        "file" => {
            let path = text_file_path
                .ok_or_else(|| "Не указан путь к файлу с текстом".to_string())?;
            cmd_args.push("--text-file".into());
            cmd_args.push(path);
        }
        "manual" => {
            let text = manual_text
                .filter(|t| !t.trim().is_empty())
                .ok_or_else(|| "Текст не может быть пустым".to_string())?;
            cmd_args.push("--text-content".into());
            cmd_args.push(text);
        }
        _ => {
            return Err("Неизвестный источник текста".into());
        }
    }

    eprintln!("[DEBUG] Python script: {}", python_script);
    eprintln!("[DEBUG] Chromium: {}", chromium_path);
    eprintln!("[DEBUG] Profile: {}", profile_path);
    eprintln!("[DEBUG] PLAYWRIGHT_BROWSERS_PATH: {}", chromium_dir.display());
    eprintln!("[DEBUG] Args: {}", cmd_args.join(" "));

    let mut child = Command::new(&python_script);
    child.env("PLAYWRIGHT_BROWSERS_PATH", &chromium_dir);
    child.args(&cmd_args);
    child.stdin(Stdio::piped());
    child.stdout(Stdio::inherit());
    child.stderr(Stdio::inherit());

    let spawned = child.spawn().map_err(|e| e.to_string())?;
    *guard = Some(spawned);

    Ok(())
}

#[tauri::command]
async fn stop_typing() -> Result<(), String> {
    use tokio::io::AsyncWriteExt;

    let mut guard = typing_process().lock().await;
    if let Some(child) = guard.as_mut() {
        if let Some(stdin) = child.stdin.as_mut() {
            let payload = r#"{"command":"stop"}"#;
            stdin
                .write_all(payload.as_bytes())
                .await
                .map_err(|e| e.to_string())?;
            stdin
                .write_all(b"\n")
                .await
                .map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    Err("Процесс набора не запущен".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            start_typing,
            stop_typing,
            find_chromium,
            find_python_script,
            get_profile_path,
            check_profile_exists,
            open_chromium_for_login,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
