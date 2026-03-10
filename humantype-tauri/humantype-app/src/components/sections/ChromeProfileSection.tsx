interface ChromeProfileSectionProps {
  userDataDir: string;
  chromeExePath: string;
  onUserDataDirChange: (value: string) => void;
  onChromeExePathChange: (value: string) => void;
  onPickUserDataDir: () => void;
  onPickChromeExe: () => void;
}

export function ChromeProfileSection({
  userDataDir,
  chromeExePath,
  onUserDataDirChange,
  onChromeExePathChange,
  onPickUserDataDir,
  onPickChromeExe,
}: ChromeProfileSectionProps) {
  return (
    <section className="space-y-3">
      <label className="block text-sm font-semibold text-slate-300">
        Профиль Chrome
      </label>
      <div className="space-y-3 max-w-2xl">
        <div className="flex gap-3">
          <input
            className="flex-1 px-4 py-3 bg-[#0f0f1a]/80 border border-[#1f3a5f] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 transition-all font-mono text-sm"
            value={userDataDir}
            onChange={(e) => onUserDataDirChange(e.target.value)}
            placeholder="C:\\Users\\...\\Chrome\\User Data"
          />
          <button
            type="button"
            onClick={onPickUserDataDir}
            className="px-5 py-3 rounded-xl bg-[#1f3a5f]/50 border border-[#1f3a5f] text-sm font-medium text-slate-100 hover:bg-[#1f3a5f] transition-all"
          >
            Обзор
          </button>
        </div>
        <div className="flex gap-3">
          <input
            className="flex-1 px-4 py-3 bg-[#0f0f1a]/80 border border-[#1f3a5f] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 transition-all font-mono text-sm"
            value={chromeExePath}
            onChange={(e) => onChromeExePathChange(e.target.value)}
            placeholder="chrome.exe (опционально)"
          />
          <button
            type="button"
            onClick={onPickChromeExe}
            className="px-5 py-3 rounded-xl bg-[#1f3a5f]/50 border border-[#1f3a5f] text-sm font-medium text-slate-100 hover:bg-[#1f3a5f] transition-all"
          >
            Обзор
          </button>
        </div>
      </div>
    </section>
  );
}

