import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Header } from "./components/layout/Header";
import { MainCard } from "./components/layout/MainCard";
import { DocUrlSection } from "./components/sections/DocUrlSection";
import { TextSourceSection } from "./components/sections/TextSourceSection";
import { ChromeProfileSection } from "./components/sections/ChromeProfileSection";
import { SpeedSection } from "./components/sections/SpeedSection";
import { OptionsSection } from "./components/sections/OptionsSection";
import { StatusSection } from "./components/sections/StatusSection";
import type { TextSource } from "./types";

function App() {
  const [docUrl, setDocUrl] = useState("");
  const [textSource, setTextSource] = useState<TextSource>("manual");
  const [textFilePath, setTextFilePath] = useState("");
  const [manualText, setManualText] = useState("");
  const [userDataDir, setUserDataDir] = useState("");
  const [chromeExePath, setChromeExePath] = useState("");
  const [minDelay, setMinDelay] = useState(50);
  const [maxDelay, setMaxDelay] = useState(220);
  const [closeBrowser, setCloseBrowser] = useState(true);
  const [statusText, setStatusText] = useState("Готово");
  const [isRunning, setIsRunning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [running, setRunning] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pickTextFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Text", extensions: ["txt"] }],
    });
    if (typeof selected === "string") setTextFilePath(selected);
  };

  const pickUserDataDir = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (typeof selected === "string") setUserDataDir(selected);
  };

  const pickChromeExe = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Executable", extensions: ["exe"] }],
    });
    if (typeof selected === "string") setChromeExePath(selected);
  };

  const validate = (): string | null => {
    if (!docUrl.trim()) return "Укажите ссылку на Google Docs";
    if (!userDataDir.trim()) return "Укажите путь к профилю Chrome";
    if (textSource === "file") {
      if (!textFilePath.trim()) return "Укажите файл с текстом";
    } else {
      if (!manualText.trim()) return "Введите текст для набора";
    }
    if (minDelay > maxDelay) return "Мин. задержка не может быть больше макс.";
    return null;
  };

  const handleStart = async () => {
    const err = validate();
    if (err) {
      setIsError(true);
      setIsSuccess(false);
      setStatusText(err);
      return;
    }
    setRunning(true);
    setIsRunning(true);
    setIsError(false);
    setIsSuccess(false);
    setStatusText("Идёт набор...");
    try {
      await invoke("run_typing", {
        docUrl: docUrl.trim(),
        userDataDir: userDataDir.trim(),
        chromeExePath: chromeExePath.trim() || null,
        minDelay,
        maxDelay,
        closeBrowser,
        textSource,
        textFilePath: textSource === "file" ? textFilePath.trim() : null,
        manualText: textSource === "manual" ? manualText : null,
      });
      setIsSuccess(true);
      setIsError(false);
      setStatusText("Готово");
    } catch (e: any) {
      setIsError(true);
      setIsSuccess(false);
      setStatusText(`Ошибка: ${String(e)}`);
    } finally {
      setRunning(false);
      setIsRunning(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#1a1a2e] transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00d9ff]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#00c851]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#ffaa53]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <Header />

      {/* Main Content */}
      <main className="relative max-w-5xl mx-auto px-6 py-10">
        <section className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            <span className="block text-white drop-shadow-lg">Текст от ИИ</span>
            <span className="block bg-gradient-to-r from-[#00c851] via-[#ffaa53] to-[#ff6b6b] bg-clip-text text-transparent drop-shadow-lg">
              Почерк человека
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Эмуляция живого набора текста в Google Docs
          </p>
        </section>

        <MainCard>
          <div className="space-y-8">
            <DocUrlSection docUrl={docUrl} onChange={setDocUrl} />

            <TextSourceSection
              textSource={textSource}
              textFilePath={textFilePath}
              manualText={manualText}
              onSourceChange={setTextSource}
              onTextFileChange={setTextFilePath}
              onManualTextChange={setManualText}
              onPickFile={pickTextFile}
            />

            <ChromeProfileSection
              userDataDir={userDataDir}
              chromeExePath={chromeExePath}
              onUserDataDirChange={setUserDataDir}
              onChromeExePathChange={setChromeExePath}
              onPickUserDataDir={pickUserDataDir}
              onPickChromeExe={pickChromeExe}
            />

            <SpeedSection
              minDelay={minDelay}
              maxDelay={maxDelay}
              onMinChange={setMinDelay}
              onMaxChange={setMaxDelay}
            />

            <div className="space-y-4 pt-6 border-t border-[#1f3a5f]/50">
              <OptionsSection
                closeBrowser={closeBrowser}
                onCloseBrowserChange={setCloseBrowser}
              />

              <button
                type="button"
                disabled={running}
                onClick={handleStart}
                className="group relative w-full py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-[#ff6b6b] via-[#ff8e53] to-[#ff6b6b] shadow-lg hover:shadow-[#ff6b6b]/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#ff8e53] via-[#ff6b6b] to-[#ff8e53] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative flex items-center justify-center gap-2">
                  {running ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Набор идёт...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Начать набор
                    </>
                  )}
                </span>
              </button>

              <StatusSection
                text={statusText}
                isRunning={isRunning}
                isSuccess={isSuccess}
                isError={isError}
              />
            </div>
          </div>
        </MainCard>

        {/* Footer — только версия */}
        <footer className="relative text-center mt-8 text-slate-500 text-sm animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#00d9ff] to-[#00c851] animate-pulse"></div>
            <span>HumanType v1.0</span>
            <span className="text-slate-600">•</span>
            <span>Все данные обрабатываются локально</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
