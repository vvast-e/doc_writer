interface OptionsSectionProps {
  closeBrowser: boolean;
  onCloseBrowserChange: (value: boolean) => void;
}

export function OptionsSection({
  closeBrowser,
  onCloseBrowserChange,
}: OptionsSectionProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        id="close-browser"
        type="checkbox"
        checked={closeBrowser}
        onChange={(e) => onCloseBrowserChange(e.target.checked)}
        className="w-5 h-5 rounded border-[#1f3a5f] bg-[#0f0f1a] text-[#00d9ff] focus:ring-[#00d9ff]/50"
      />
      <label htmlFor="close-browser" className="text-sm text-slate-300">
        Закрывать браузер после завершения
      </label>
    </div>
  );
}

