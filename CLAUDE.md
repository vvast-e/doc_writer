# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

This is a Tauri 2 desktop app (`humantype-tauri/`) that drives a Python sidecar to type text into a Google Docs document with human-like cadence. Three layers, all in one repo:

1. **React + Vite frontend** (`humantype-tauri/src/`) — TypeScript, Tailwind, shadcn/radix. Calls Rust commands via `invoke()`.
2. **Rust Tauri backend** (`humantype-tauri/src-tauri/src/lib.rs`) — locates bundled resources (Chromium + Python EXE) and spawns/controls the sidecar process. All IPC commands are registered in `run()` at the bottom of `lib.rs`.
3. **Python sidecar** (`main.py`, `google_docs_typist.py`) — Playwright async script. Launches the bundled Chromium against a persistent user-data-dir, navigates to the doc, and types via `human_type_text()` (lognormal IKI, warmup, complexity multipliers, micro-navigations). Communicates with Rust over stdin (JSON `{"command":"stop"}`) and stdout (progress/done/error events as JSON lines). Packaged with PyInstaller into `python-script.exe`.

`gui.py` is a legacy customtkinter standalone GUI — the Tauri app is the active surface.

## How the pieces find each other at runtime

The Rust side locates resources in this order — important when changing bundle layout or CI:

- `get_resources_dir()` — falls back to `src-tauri/resources` in dev, else `resource_dir()`.
- `locate_python_script()` — looks for `python-script.exe` (Windows) at resources root or `resources/resources/`.
- `locate_chromium_exe()` — handles **two layouts**: standard `chromium/chrome-win64/chrome.exe`, and Playwright-style nested `chromium/chromium-<rev>/chrome-win64/chrome.exe`. Both are valid.
- `chromium_bundle_home_for_exe()` is passed via `PLAYWRIGHT_BROWSERS_PATH` to the sidecar so Playwright finds the bundled binary.

Profile (cookies/login) is stored in the per-user app data dir under `chrome-profile/` (`get_profile_path`). The "Login" button opens bundled Chromium against that profile so the user signs into Google once.

## Build & run

Frontend / Tauri (dev — auto-runs `npm run dev` then opens the Tauri shell):
```
cd humantype-tauri
npm install
npm run tauri dev
```

Frontend-only typecheck + bundle: `npm run build` (runs `tsc && vite build`).

Production installer (NSIS):
```
cd humantype-tauri
npm run tauri build -- --bundles nsis
```
This requires `src-tauri/resources/python-script.exe` and `src-tauri/resources/chromium/...` to be present — they are not built by `tauri build`. CI builds them; locally you must replicate the steps in `.github/workflows/build-windows.yml`.

Python sidecar (rebuild after editing `main.py` / `google_docs_typist.py`):
```
pip install -r requirements-sidecar.txt pyinstaller
playwright install chromium
pyinstaller --onefile --name=python-script --collect-all numpy --collect-all playwright main.py
copy dist\python-script.exe humantype-tauri\src-tauri\resources\
```

Sidecar standalone (no Tauri, for debugging typing logic):
```
python main.py --doc-url <url> --text-content "hello" --user-data-dir <path> --chrome-exe-path <chrome.exe> --min-delay 110 --max-delay 380
```

No test suite. No linter configured beyond `tsc`.

## CI

`.github/workflows/build-windows.yml` and `build-linux.yml` trigger on pushes to `feature/bundled-chromium-multi-page` and on `workflow_dispatch`. They build the PyInstaller sidecar, copy Playwright's Chromium into `src-tauri/resources/chromium/<chrome-win64|chrome-linux64>/`, then run `tauri build`. The Chromium directory layout in CI is the "standard" layout (not the Playwright-nested one) — the Rust locator supports both so dev with `playwright install` Just Works.

## Things to know before editing

- **Adding a Tauri command**: define `#[tauri::command] async fn …` in `src-tauri/src/lib.rs` and add it to the `tauri::generate_handler![...]` list in `run()` — easy to forget. Call from TS via `invoke("snake_case_name", { camelCaseArgs })`.
- **Stop signal**: stopping the typist is done by writing a JSON line to the sidecar's stdin, not by killing the process. Don't add a kill path without first sending the stop command — the script needs to close Playwright cleanly.
- **Typing tuning** lives in `google_docs_typist.py`. The `sample_iki_ms`, `_warmup_multiplier`, `_complexity_multiplier`, and `paragraph_micro_navigation` functions together produce the human cadence; changing one without thinking about the others tends to make output feel mechanical.
- **Profile location is per-OS** (`app_data_dir()`); do not assume `chrome-profile/` next to the exe. The `chrome-profile/` and `chrome-profile1/` dirs at repo root are dev leftovers.
