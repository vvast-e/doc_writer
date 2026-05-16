use once_cell::sync::OnceCell;
use serde_json::Value;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
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

fn get_log_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = get_app_data_dir(app)?.join("logs");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn chromium_subdir() -> &'static str {
    match std::env::consts::OS {
        "windows" => "chrome-win64",
        "macos" => "chrome-mac",
        "linux" => "chrome-linux64",
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

fn python_script_candidates(resources_root: &std::path::Path) -> Vec<PathBuf> {
    vec![
        resources_root.join(python_script_name()),
        resources_root.join("resources").join(python_script_name()),
    ]
}

/// В debug-сборке предпочитаем исходник `main.py` из repo root —
/// тогда правки в .py подхватываются без пересборки PyInstaller'ом.
/// `resources_root` обычно `D:\doc_writer\humantype-tauri\src-tauri\resources`;
/// repo root — это три уровня вверх.
fn locate_dev_python_main(resources_root: &std::path::Path) -> Option<PathBuf> {
    if !cfg!(debug_assertions) && std::env::var_os("HUMANTYPE_PYTHON_DEV").is_none() {
        return None;
    }
    let repo_root = resources_root.parent()?.parent()?.parent()?;
    let main_py = repo_root.join("main.py");
    if main_py.is_file() {
        Some(main_py)
    } else {
        None
    }
}

fn locate_python_script(resources_root: &std::path::Path) -> Option<PathBuf> {
    if let Some(dev) = locate_dev_python_main(resources_root) {
        return Some(dev);
    }
    python_script_candidates(resources_root)
        .into_iter()
        .find(|p| p.is_file())
}

fn chromium_parent_candidates(resources_root: &std::path::Path) -> Vec<PathBuf> {
    vec![
        resources_root.join("chromium"),
        resources_root.join("resources").join("chromium"),
    ]
}

fn try_chromium_at_standard_layout(ch_home: &std::path::Path) -> Option<PathBuf> {
    let subdir = chromium_subdir();
    let exe = chromium_exe_name();
    let candidate = ch_home.join(subdir).join(exe);
    if candidate.is_file() {
        Some(candidate)
    } else {
        None
    }
}

fn try_chromium_via_playwright_nesting(ch_home: &std::path::Path) -> Option<PathBuf> {
    let subdir = chromium_subdir();
    let exe = chromium_exe_name();
    let Ok(entries) = std::fs::read_dir(ch_home) else {
        return None;
    };
    for entry in entries.flatten() {
        let entry_path = entry.path();
        if !entry_path.is_dir() {
            continue;
        }
        let direct = entry_path.join(subdir).join(exe);
        if direct.is_file() {
            return Some(direct);
        }
    }
    None
}

fn locate_chromium_exe(resources_root: &std::path::Path) -> Option<PathBuf> {
    for ch_home in chromium_parent_candidates(resources_root) {
        if !ch_home.is_dir() {
            continue;
        }
        if let Some(p) = try_chromium_at_standard_layout(&ch_home) {
            return Some(p);
        }
        if let Some(p) = try_chromium_via_playwright_nesting(&ch_home) {
            return Some(p);
        }
    }
    None
}

fn chromium_bundle_home_for_exe(resources_root: &std::path::Path, chromium_exe: &std::path::Path) -> PathBuf {
    for cand in chromium_parent_candidates(resources_root) {
        if cand.is_dir() && chromium_exe.starts_with(&cand) {
            return cand;
        }
    }
    resources_root.join("chromium")
}

fn append_log(log_dir: &std::path::Path, line: &str) {
    use std::io::Write;
    let path = log_dir.join("sidecar.log");
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(f, "{}", line);
    }
}

#[tauri::command]
async fn find_chromium(app: tauri::AppHandle) -> Result<String, String> {
    let resources = get_resources_dir(&app)?;
    let chromium = locate_chromium_exe(&resources).ok_or_else(|| {
        let tried: Vec<PathBuf> = chromium_parent_candidates(&resources)
            .into_iter()
            .map(|ch| ch.join(chromium_subdir()).join(chromium_exe_name()))
            .collect();
        format!(
            "Chromium не найден. Искали: {:?}. Приложите в bundle структуру Playwright/Chromium или путь chromium/{}/{}. ",
            tried,
            chromium_subdir(),
            chromium_exe_name()
        )
    })?;

    Ok(chromium.to_string_lossy().to_string())
}

#[tauri::command]
async fn find_python_script(app: tauri::AppHandle) -> Result<String, String> {
    let resources = get_resources_dir(&app)?;
    let script = locate_python_script(&resources).ok_or_else(|| {
        let tried = python_script_candidates(&resources);
        format!("Python script not found. Tried: {:?}", tried)
    })?;
    Ok(script.to_string_lossy().to_string())
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

    if !profile_dir.is_dir() {
        return Ok(false);
    }

    let local_state = profile_dir.join("Local State");
    let default_dir = profile_dir.join("Default");
    Ok(local_state.is_file() && default_dir.is_dir())
}

#[tauri::command]
async fn open_chromium_for_login(app: tauri::AppHandle) -> Result<(), String> {
    let chromium_path = find_chromium(app.clone()).await?;
    let profile_path = get_profile_path(app.clone()).await?;
    let log_dir = get_log_dir(&app)?;

    let mut cmd = Command::new(&chromium_path);
    cmd.arg(format!("--user-data-dir={}", profile_path));
    cmd.arg("--no-first-run");
    cmd.arg("--no-default-browser-check");
    cmd.arg("--no-sandbox");
    cmd.arg("--ignore-certificate-errors");
    cmd.arg("--disable-blink-features=AutomationControlled");
    cmd.arg("https://accounts.google.com");

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    append_log(
        &log_dir,
        &format!(
            "[chromium-login] spawn: exe={:?} profile={:?}",
            chromium_path, profile_path
        ),
    );

    let mut child = cmd.spawn().map_err(|e| {
        let msg = format!("[chromium-login] spawn failed: {}", e);
        append_log(&log_dir, &msg);
        e.to_string()
    })?;

    let app_for_task = app.clone();
    let log_dir_for_task = log_dir.clone();
    tokio::spawn(async move {
        let status = child.wait().await;
        let status_str = match &status {
            Ok(s) => format!("{:?}", s),
            Err(e) => format!("wait-error: {}", e),
        };
        append_log(
            &log_dir_for_task,
            &format!("[chromium-login] exited: {}", status_str),
        );
        let _ = app_for_task.emit("chromium:exited", status_str);
    });

    Ok(())
}

/// Прибирает поле TYPING_PROCESS, если процесс уже завершился сам.
/// Должно вызываться под удержанием guard.
fn reap_if_dead(guard: &mut Option<Child>) {
    if let Some(child) = guard.as_mut() {
        match child.try_wait() {
            Ok(Some(_status)) => {
                *guard = None;
            }
            _ => {}
        }
    }
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
    let _ = chrome_exe_path;
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
    reap_if_dead(&mut guard);
    if guard.is_some() {
        return Err("Набор уже запущен".into());
    }

    let python_script = find_python_script(app.clone()).await?;
    let chromium_path = find_chromium(app.clone()).await?;
    let chromium_exe_path = PathBuf::from(chromium_path.clone());

    let resources = get_resources_dir(&app)?;
    let chromium_dir = chromium_bundle_home_for_exe(&resources, &chromium_exe_path);
    let log_dir = get_log_dir(&app)?;

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

    append_log(
        &log_dir,
        &format!(
            "[host] start_typing python={} chromium={} profile={} PWBP={} args={:?}",
            python_script,
            chromium_path,
            profile_path,
            chromium_dir.display(),
            cmd_args
        ),
    );

    let is_py_source = std::path::Path::new(&python_script)
        .extension()
        .and_then(|s| s.to_str())
        .map(|e| e.eq_ignore_ascii_case("py"))
        .unwrap_or(false);

    let mut child_builder = if is_py_source {
        // dev: запускаем исходник через интерпретатор. Используем `py -3` на Windows
        // (PEP 397 launcher) с fallback на `python` — так не зависим от того,
        // как именно у разработчика проброшен Python в PATH.
        let py_launcher = if cfg!(windows) { "py" } else { "python3" };
        let mut c = Command::new(py_launcher);
        if cfg!(windows) {
            c.arg("-3");
        }
        c.arg(&python_script);
        c
    } else {
        Command::new(&python_script)
    };
    child_builder.env("PLAYWRIGHT_BROWSERS_PATH", &chromium_dir);
    child_builder.env("PYTHONIOENCODING", "utf-8");
    child_builder.env("HUMANTYPE_LOG_DIR", &log_dir);
    child_builder.args(&cmd_args);
    child_builder.stdin(Stdio::piped());
    child_builder.stdout(Stdio::piped());
    // stderr наследуем — пускай Python-логи (logger.info / traceback)
    // видны в окне консоли sidecar'а: проще диагностировать зависания при наборе.
    // Файловый лог по-прежнему ведёт сам sidecar в HUMANTYPE_LOG_DIR.
    child_builder.stderr(Stdio::inherit());

    let mut spawned = child_builder.spawn().map_err(|e| {
        let msg = format!("Не удалось запустить sidecar: {}", e);
        append_log(&log_dir, &format!("[host] spawn failed: {}", msg));
        msg
    })?;

    let stdout = spawned.stdout.take();

    *guard = Some(spawned);
    drop(guard);

    if let Some(stdout) = stdout {
        let app_h = app.clone();
        let log_dir_clone = log_dir.clone();
        tauri::async_runtime::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            loop {
                match lines.next_line().await {
                    Ok(Some(line)) => {
                        append_log(&log_dir_clone, &format!("[stdout] {}", line));
                        forward_event(&app_h, &line);
                    }
                    Ok(None) => break,
                    Err(e) => {
                        append_log(&log_dir_clone, &format!("[stdout] read error: {}", e));
                        break;
                    }
                }
            }
            // stdout закрылся → процесс на исходе. Завершаем сессию и эмитим terminated.
            on_sidecar_exit(&app_h, &log_dir_clone).await;
        });
    }

    Ok(())
}

fn forward_event(app: &AppHandle, line: &str) {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return;
    }
    match serde_json::from_str::<Value>(trimmed) {
        Ok(value) => {
            let event_name = value
                .get("event")
                .and_then(|v| v.as_str())
                .unwrap_or("typing:raw")
                .to_string();
            let _ = app.emit(&format!("typing:{}", event_name), value);
        }
        Err(_) => {
            let _ = app.emit("typing:raw", trimmed);
        }
    }
}

async fn on_sidecar_exit(app: &AppHandle, log_dir: &std::path::Path) {
    let mut guard = typing_process().lock().await;
    let status_str: String = if let Some(child) = guard.as_mut() {
        match child.wait().await {
            Ok(status) => format!("{}", status),
            Err(e) => format!("wait error: {}", e),
        }
    } else {
        "no child".to_string()
    };
    *guard = None;
    drop(guard);
    append_log(log_dir, &format!("[host] sidecar exited: {}", status_str));
    let _ = app.emit(
        "typing:terminated",
        serde_json::json!({ "status": status_str }),
    );
}

#[tauri::command]
async fn stop_typing(app: tauri::AppHandle) -> Result<(), String> {
    let log_dir = get_log_dir(&app).ok();

    let mut guard = typing_process().lock().await;
    reap_if_dead(&mut guard);
    let Some(child) = guard.as_mut() else {
        return Err("Процесс набора не запущен".into());
    };

    // Сначала вежливо: stop-команда через stdin.
    let graceful_ok = if let Some(stdin) = child.stdin.as_mut() {
        let payload = b"{\"command\":\"stop\"}\n";
        match stdin.write_all(payload).await {
            Ok(_) => {
                let _ = stdin.flush().await;
                if let Some(ref dir) = log_dir {
                    append_log(dir, "[host] stop_typing: sent stop via stdin");
                }
                true
            }
            Err(e) => {
                if let Some(ref dir) = log_dir {
                    append_log(dir, &format!("[host] stop_typing: stdin write failed: {}", e));
                }
                false
            }
        }
    } else {
        false
    };

    if graceful_ok {
        return Ok(());
    }

    // Фолбэк: жёсткий kill, если stdin сломан.
    match child.kill().await {
        Ok(_) => {
            if let Some(ref dir) = log_dir {
                append_log(dir, "[host] stop_typing: killed child (stdin unavailable)");
            }
            Ok(())
        }
        Err(e) => Err(format!("Не удалось остановить процесс: {}", e)),
    }
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
