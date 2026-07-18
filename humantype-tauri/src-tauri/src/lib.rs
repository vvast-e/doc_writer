use once_cell::sync::OnceCell;
use serde_json::Value;
use std::collections::HashSet;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

/// Фаза 5: вместо одного процесса-браузера на сессию печати — ОДИН
/// долгоживущий sidecar-процесс (`main.py --multiplex`) на всё приложение,
/// который сам держит один Chromium/профиль и открывает по вкладке на
/// сессию. `sessions` — активные session_id (для enforce лимита параллельности
/// и для решения "закрыть браузер, когда опустело"); `close_browser_requested`
/// — sticky-флаг: если ЛЮБАЯ из сессий просила закрыть браузer по завершении,
/// он закроется, когда опустеет набор активных сессий (см. `maybe_shutdown_after_session_end`).
struct SidecarHandle {
    child: Child,
    sessions: HashSet<String>,
    close_browser_requested: bool,
}

static SIDECAR: OnceCell<Mutex<Option<SidecarHandle>>> = OnceCell::new();

fn sidecar() -> &'static Mutex<Option<SidecarHandle>> {
    SIDECAR.get_or_init(|| Mutex::new(None))
}

/// На Windows `resource_dir()` возвращает extended-path вида `\\?\D:\...`.
/// Этот префикс понятен Win32 API, но ломает sub-процессы, которые ходят через
/// libc (например, Python: `py -3 \\?\D:\foo.py` → ошибка).
/// Нормализуем для всего, что передаём дочерним процессам.
fn strip_extended_prefix(p: &std::path::Path) -> PathBuf {
    let s = p.to_string_lossy();
    if let Some(rest) = s.strip_prefix(r"\\?\") {
        // Может быть UNC: `\\?\UNC\server\share\...` → `\\server\share\...`
        if let Some(unc) = rest.strip_prefix(r"UNC\") {
            return PathBuf::from(format!(r"\\{}", unc));
        }
        return PathBuf::from(rest);
    }
    p.to_path_buf()
}

fn get_resources_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app.path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let resource_dir = strip_extended_prefix(&resource_dir);

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

/// Ищет рабочий Python launcher: пробует `python` → `python3` → `py -3`.
/// Возвращает (исполняемый файл, дополнительные ведущие args).
fn find_python_launcher() -> Option<(&'static str, Vec<&'static str>)> {
    let candidates: &[(&str, &[&str])] = &[
        ("python", &[]),
        ("python3", &[]),
        ("py", &["-3"]),
    ];
    for (exe, leading) in candidates {
        let mut cmd = std::process::Command::new(exe);
        for a in *leading {
            cmd.arg(a);
        }
        cmd.arg("--version");
        cmd.stdout(Stdio::null());
        cmd.stderr(Stdio::null());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        if let Ok(st) = cmd.status() {
            if st.success() {
                return Some((exe, leading.iter().copied().collect()));
            }
        }
    }
    None
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

/// Прибирает поле SIDECAR, если процесс уже завершился сам.
/// Должно вызываться под удержанием guard.
fn reap_if_dead(guard: &mut Option<SidecarHandle>) {
    let should_clear = match guard.as_mut() {
        Some(handle) => matches!(handle.child.try_wait(), Ok(Some(_))),
        None => false,
    };
    if should_clear {
        *guard = None;
    }
}

#[tauri::command]
async fn start_typing(
    app: tauri::AppHandle,
    session_id: String,
    doc_url: String,
    text_source: String,
    text_file_path: Option<String>,
    manual_text: Option<String>,
    user_data_dir: String,
    chrome_exe_path: Option<String>,
    min_delay_ms: i32,
    max_delay_ms: i32,
    close_browser: bool,
    max_concurrent: u32,
) -> Result<(), String> {
    let _ = chrome_exe_path;
    if session_id.trim().is_empty() {
        return Err("Не указан идентификатор сессии".into());
    }
    if doc_url.trim().is_empty() {
        return Err("Ссылка на документ не может быть пустой".into());
    }
    if min_delay_ms > max_delay_ms {
        return Err("Минимальная задержка не может быть больше максимальной".into());
    }

    let profile_path = if user_data_dir.trim().is_empty() {
        get_profile_path(app.clone()).await?
    } else {
        user_data_dir
    };

    // Мультиплекс-протокол sidecar принимает готовый текст в команде `start`
    // (не путь к файлу) — файл читаем здесь, в Rust, один раз при старте сессии.
    let text = match text_source.as_str() {
        "file" => {
            let path = text_file_path
                .ok_or_else(|| "Не указан путь к файлу с текстом".to_string())?;
            std::fs::read_to_string(&path)
                .map_err(|e| format!("Не удалось прочитать файл с текстом: {}", e))?
        }
        "manual" => manual_text
            .filter(|t| !t.trim().is_empty())
            .ok_or_else(|| "Текст не может быть пустым".to_string())?,
        _ => return Err("Неизвестный источник текста".into()),
    };

    let log_dir = get_log_dir(&app)?;

    let mut guard = sidecar().lock().await;
    reap_if_dead(&mut guard);

    if guard.is_none() {
        // Sidecar ещё не поднят для этого приложения — стартуем его ОДИН раз
        // в режиме --multiplex; сама сессия печати уйдёт отдельной командой
        // `start` через stdin чуть ниже, когда sidecar уже будет слушать.
        let python_script = find_python_script(app.clone()).await?;
        let chromium_path = find_chromium(app.clone()).await?;
        let chromium_exe_path = PathBuf::from(chromium_path.clone());

        let resources = get_resources_dir(&app)?;
        let chromium_dir = chromium_bundle_home_for_exe(&resources, &chromium_exe_path);

        let cmd_args: Vec<String> = vec![
            "--multiplex".into(),
            "--user-data-dir".into(),
            profile_path.clone(),
            "--chrome-exe-path".into(),
            chromium_path.clone(),
            "--min-delay".into(),
            min_delay_ms.to_string(),
            "--max-delay".into(),
            max_delay_ms.to_string(),
        ];

        append_log(
            &log_dir,
            &format!(
                "[host] spawning multiplex sidecar: python={} chromium={} profile={} PWBP={} args={:?}",
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
            let (launcher, extra_args) = find_python_launcher().ok_or_else(|| {
                "Python 3 не найден в PATH. Установите Python 3.10+ или соберите python-script.exe."
                    .to_string()
            })?;
            append_log(
                &log_dir,
                &format!("[host] using Python launcher: {} {:?}", launcher, extra_args),
            );
            let mut c = Command::new(launcher);
            for arg in extra_args {
                c.arg(arg);
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
        child_builder.stderr(Stdio::piped());

        let mut spawned = child_builder.spawn().map_err(|e| {
            let msg = format!("Не удалось запустить sidecar: {}", e);
            append_log(&log_dir, &format!("[host] spawn failed: {}", msg));
            msg
        })?;

        let stdout = spawned.stdout.take();
        let stderr = spawned.stderr.take();

        *guard = Some(SidecarHandle {
            child: spawned,
            sessions: HashSet::new(),
            close_browser_requested: false,
        });

        if let Some(stderr) = stderr {
            let log_dir_clone = log_dir.clone();
            tauri::async_runtime::spawn(async move {
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    // В файл — всегда, в stderr процесса — для видимости в dev-консоли.
                    append_log(&log_dir_clone, &format!("[stderr] {}", line));
                    eprintln!("[sidecar] {}", line);
                }
            });
        }

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
                            if let Some((event_name, session_id)) = forward_event(&app_h, &line) {
                                if matches!(event_name.as_str(), "done" | "stopped" | "error") {
                                    if let Some(sid) = session_id {
                                        maybe_shutdown_after_session_end(&sid).await;
                                    }
                                }
                            }
                        }
                        Ok(None) => break,
                        Err(e) => {
                            append_log(&log_dir_clone, &format!("[stdout] read error: {}", e));
                            break;
                        }
                    }
                }
                // stdout закрылся → sidecar на исходе (весь браузер, все сессии).
                on_sidecar_exit(&app_h, &log_dir_clone).await;
            });
        }
    }

    let handle = guard.as_mut().expect("sidecar только что запущен или уже был запущен");

    if handle.sessions.len() as u32 >= max_concurrent.max(1) {
        return Err(format!(
            "Достигнут лимит параллельных сессий для вашего тарифа ({})",
            max_concurrent
        ));
    }
    if handle.sessions.contains(&session_id) {
        return Err("Сессия с таким идентификатором уже запущена".into());
    }

    if close_browser {
        handle.close_browser_requested = true;
    }

    append_log(
        &log_dir,
        &format!(
            "[host] start session {} doc={} chars={}",
            session_id,
            doc_url,
            text.len()
        ),
    );

    let start_cmd = serde_json::json!({
        "command": "start",
        "session_id": session_id,
        "doc_url": doc_url,
        "text": text,
        "min_delay_ms": min_delay_ms,
        "max_delay_ms": max_delay_ms,
    });
    let payload = format!("{}\n", start_cmd);

    let Some(stdin) = handle.child.stdin.as_mut() else {
        return Err("Sidecar недоступен (stdin закрыт)".into());
    };
    stdin
        .write_all(payload.as_bytes())
        .await
        .map_err(|e| format!("Не удалось отправить команду старта в sidecar: {}", e))?;
    stdin
        .flush()
        .await
        .map_err(|e| format!("Не удалось отправить команду старта в sidecar: {}", e))?;

    handle.sessions.insert(session_id);

    Ok(())
}

/// Разбирает JSON-событие sidecar, эмитит его во фронт (`typing:<event>`,
/// payload как есть — `session_id` уже внутри) и возвращает
/// `(имя события, session_id)` для внутренней бухгалтерии реестра сессий.
fn forward_event(app: &AppHandle, line: &str) -> Option<(String, Option<String>)> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }
    match serde_json::from_str::<Value>(trimmed) {
        Ok(value) => {
            let event_name = value
                .get("event")
                .and_then(|v| v.as_str())
                .unwrap_or("raw")
                .to_string();
            let session_id = value
                .get("session_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let _ = app.emit(&format!("typing:{}", event_name), value);
            Some((event_name, session_id))
        }
        Err(_) => {
            let _ = app.emit("typing:raw", trimmed);
            None
        }
    }
}

/// Убирает завершённую сессию из реестра; если после этого активных сессий
/// не осталось и хотя бы одна из них просила закрыть браузер по завершении —
/// шлёт sidecar'у `shutdown` (закрывает браузер и сам sidecar-процесс).
async fn maybe_shutdown_after_session_end(session_id: &str) {
    let mut guard = sidecar().lock().await;
    let Some(handle) = guard.as_mut() else {
        return;
    };
    handle.sessions.remove(session_id);
    if handle.sessions.is_empty() && handle.close_browser_requested {
        if let Some(stdin) = handle.child.stdin.as_mut() {
            let _ = stdin.write_all(b"{\"command\":\"shutdown\"}\n").await;
            let _ = stdin.flush().await;
        }
    }
}

async fn on_sidecar_exit(app: &AppHandle, log_dir: &std::path::Path) {
    let mut guard = sidecar().lock().await;
    let status_str: String = if let Some(handle) = guard.as_mut() {
        match handle.child.wait().await {
            Ok(status) => format!("{}", status),
            Err(e) => format!("wait error: {}", e),
        }
    } else {
        "no child".to_string()
    };
    *guard = None;
    drop(guard);
    append_log(log_dir, &format!("[host] sidecar exited: {}", status_str));
    // Без session_id — фронт трактует это как обрыв ВСЕХ активных сессий
    // (общий браузер на всех, поэтому его смерть роняет все вкладки разом).
    let _ = app.emit(
        "typing:terminated",
        serde_json::json!({ "status": status_str }),
    );
}

#[derive(serde::Serialize)]
struct EstimateResult {
    p10: f64,
    p50: f64,
    p90: f64,
}

#[tauri::command]
async fn estimate_typing_time(
    app: tauri::AppHandle,
    text: String,
    min_delay_ms: i32,
    max_delay_ms: i32,
) -> Result<EstimateResult, String> {
    if text.trim().is_empty() {
        return Err("Пустой текст".into());
    }

    let python_script = find_python_script(app.clone()).await?;

    let is_py_source = std::path::Path::new(&python_script)
        .extension()
        .and_then(|s| s.to_str())
        .map(|e| e.eq_ignore_ascii_case("py"))
        .unwrap_or(false);

    let mut child_builder = if is_py_source {
        let (launcher, extra_args) = find_python_launcher().ok_or_else(|| {
            "Python 3 не найден в PATH. Установите Python 3.10+ или соберите python-script.exe."
                .to_string()
        })?;
        let mut c = Command::new(launcher);
        for arg in extra_args {
            c.arg(arg);
        }
        c.arg(&python_script);
        c
    } else {
        Command::new(&python_script)
    };
    child_builder.env("PYTHONIOENCODING", "utf-8");
    child_builder.arg("--estimate-only");
    child_builder.arg("--text-content").arg(&text);
    child_builder.arg("--min-delay").arg(min_delay_ms.to_string());
    child_builder.arg("--max-delay").arg(max_delay_ms.to_string());
    child_builder.stdin(Stdio::null());
    child_builder.stdout(Stdio::piped());
    child_builder.stderr(Stdio::null());

    let child = child_builder
        .spawn()
        .map_err(|e| format!("Не удалось запустить оценку: {}", e))?;

    let output = tokio::time::timeout(std::time::Duration::from_secs(20), child.wait_with_output())
        .await
        .map_err(|_| "Таймаут расчёта оценки времени".to_string())?
        .map_err(|e| format!("Ошибка ожидания процесса оценки: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines().rev() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Ok(value) = serde_json::from_str::<Value>(trimmed) {
            if value.get("event").and_then(|v| v.as_str()) == Some("estimate") {
                let p10 = value.get("p10").and_then(|v| v.as_f64()).unwrap_or(0.0);
                let p50 = value.get("p50").and_then(|v| v.as_f64()).unwrap_or(0.0);
                let p90 = value.get("p90").and_then(|v| v.as_f64()).unwrap_or(0.0);
                return Ok(EstimateResult { p10, p50, p90 });
            }
        }
    }

    Err("Не удалось получить оценку времени от sidecar".into())
}

#[tauri::command]
async fn stop_typing(app: tauri::AppHandle, session_id: String) -> Result<(), String> {
    let log_dir = get_log_dir(&app).ok();

    let mut guard = sidecar().lock().await;
    reap_if_dead(&mut guard);
    let Some(handle) = guard.as_mut() else {
        return Err("Процесс набора не запущен".into());
    };

    if !handle.sessions.contains(&session_id) {
        return Err("Сессия не найдена или уже завершена".into());
    }

    // Останавливаем ТОЛЬКО указанную сессию (свою вкладку) — браузер общий на
    // все сессии, поэтому здесь нет kill-фолбэка, как раньше: убить процесс
    // означало бы оборвать все остальные активные сессии тоже.
    let payload = format!(
        "{}\n",
        serde_json::json!({ "command": "stop", "session_id": session_id })
    );

    let Some(stdin) = handle.child.stdin.as_mut() else {
        return Err("Sidecar недоступен (stdin закрыт)".into());
    };
    match stdin.write_all(payload.as_bytes()).await {
        Ok(_) => {
            let _ = stdin.flush().await;
            if let Some(ref dir) = log_dir {
                append_log(
                    dir,
                    &format!("[host] stop_typing: sent stop for session {}", session_id),
                );
            }
            Ok(())
        }
        Err(e) => Err(format!("Не удалось остановить сессию: {}", e)),
    }
}

const APP_BASE_URL: &str = "https://humantype.ru";
const KEYRING_SERVICE: &str = "humantype-tauri";
const KEYRING_ACCOUNT: &str = "device_token";

fn warn_if_insecure_transport() {
    if !APP_BASE_URL.starts_with("https://") {
        eprintln!(
            "[security] APP_BASE_URL ({}) is not HTTPS — device tokens travel in plaintext. \
             Set up TLS on the backend before shipping a release build.",
            APP_BASE_URL
        );
    }
}

#[derive(serde::Deserialize)]
struct ApiEnvelope<T> {
    ok: bool,
    data: Option<T>,
    #[serde(default)]
    error: Option<ApiErrorBody>,
}

#[derive(serde::Deserialize)]
struct ApiErrorBody {
    message: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct SubscriptionInfo {
    #[serde(rename = "subscriptionId")]
    subscription_id: i64,
    name: String,
    #[serde(rename = "maxDevices")]
    max_devices: i64,
    #[serde(rename = "expiresAt")]
    expires_at: String,
    #[serde(rename = "autoRenew", default)]
    auto_renew: Option<bool>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct UserBasic {
    id: String,
    email: Option<String>,
    name: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct RedeemResponse {
    token: String,
    user: UserBasic,
    subscription: Option<SubscriptionInfo>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct UserProfileResponse {
    id: String,
    email: Option<String>,
    name: Option<String>,
    subscription: Option<SubscriptionInfo>,
}

async fn parse_envelope<T: serde::de::DeserializeOwned>(
    res: reqwest::Response,
    fallback_message: &str,
) -> Result<T, String> {
    let status = res.status();
    let envelope: ApiEnvelope<T> = res
        .json()
        .await
        .map_err(|e| format!("Некорректный ответ сервера: {}", e))?;

    if !envelope.ok || status.as_u16() >= 400 {
        return Err(envelope
            .error
            .map(|e| e.message)
            .unwrap_or_else(|| fallback_message.to_string()));
    }

    envelope.data.ok_or_else(|| fallback_message.to_string())
}

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|e| format!("Не удалось открыть хранилище ключей: {}", e))
}

#[tauri::command]
async fn redeem_pairing_code(code: String) -> Result<RedeemResponse, String> {
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/api/device/redeem", APP_BASE_URL))
        .json(&serde_json::json!({ "code": code }))
        .send()
        .await
        .map_err(|e| format!("Не удалось связаться с сервером: {}", e))?;

    let data: RedeemResponse = parse_envelope(res, "Не удалось привязать устройство").await?;

    keyring_entry()?
        .set_password(&data.token)
        .map_err(|e| format!("Не удалось сохранить токен: {}", e))?;

    Ok(data)
}

#[tauri::command]
async fn get_stored_token() -> Result<Option<String>, String> {
    match keyring_entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Не удалось прочитать токен: {}", e)),
    }
}

#[tauri::command]
async fn clear_device_token() -> Result<(), String> {
    match keyring_entry()?.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Не удалось удалить токен: {}", e)),
    }
}

#[tauri::command]
async fn validate_device_token() -> Result<UserProfileResponse, String> {
    let token = match keyring_entry()?.get_password() {
        Ok(token) => token,
        Err(keyring::Error::NoEntry) => return Err("Устройство не привязано".to_string()),
        Err(e) => return Err(format!("Не удалось прочитать токен: {}", e)),
    };

    let client = reqwest::Client::new();
    let res = client
        .get(format!("{}/api/user", APP_BASE_URL))
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("Не удалось связаться с сервером: {}", e))?;

    parse_envelope(res, "Токен недействителен").await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    warn_if_insecure_transport();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            start_typing,
            stop_typing,
            estimate_typing_time,
            find_chromium,
            find_python_script,
            get_profile_path,
            check_profile_exists,
            open_chromium_for_login,
            redeem_pairing_code,
            get_stored_token,
            clear_device_token,
            validate_device_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
