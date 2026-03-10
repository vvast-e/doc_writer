import { useState } from "react";
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
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#1a1a2e]">
      <Header />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <section className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            <span className="block text-white">Текст от ИИ</span>
            <span className="block bg-gradient-to-r from-[#00c851] via-[#ffaa53] to-[#ff6b6b] bg-clip-text text-transparent">
              Почерк человека
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Эмуляция живого набора текста в Google Docs
          </p>
        </section>

        <MainCard>
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

          <section className="space-y-4 pt-4 border-t border-[#1f3a5f]/50">
            <OptionsSection
              closeBrowser={closeBrowser}
              onCloseBrowserChange={setCloseBrowser}
            />

            <button
              type="button"
              disabled={running}
              onClick={handleStart}
              className="w-full py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-[#ff6b6b] via-[#ff8e53] to-[#ff6b6b] shadow-lg hover:shadow-[#ff6b6b]/30 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {running ? "Набор идёт..." : "Начать набор"}
            </button>

            <StatusSection
              text={statusText}
              isRunning={isRunning}
              isSuccess={isSuccess}
              isError={isError}
            />
          </section>
        </MainCard>

        {/* Footer — только версия */}
        <footer className="text-center mt-8 text-slate-500 text-sm">
          HumanType v1.0 • Все данные обрабатываются локально
        </footer>
      </main>
    </div>
  );
}

export default App;
