import type { TextSource } from "../../types";

interface TextSourceSectionProps {
  textSource: TextSource;
  textFilePath: string;
  manualText: string;
  onSourceChange: (source: TextSource) => void;
  onTextFileChange: (path: string) => void;
  onManualTextChange: (value: string) => void;
  onPickFile: () => void;
}

export function TextSourceSection({
  textSource,
  textFilePath,
  manualText,
  onSourceChange,
  onTextFileChange,
  onManualTextChange,
  onPickFile,
}: TextSourceSectionProps) {
  return (
    <section className="space-y-3">
      <label className="block text-sm font-semibold text-slate-300">
        Источник текста
      </label>
      <div className="inline-flex rounded-xl bg-[#0f0f1a]/80 border border-[#1f3a5f] p-1">
        <button
          type="button"
          onClick={() => onSourceChange("file")}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
            textSource === "file"
              ? "bg-gradient-to-r from-[#00d9ff] to-[#00c851] text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Файл
        </button>
        <button
          type="button"
          onClick={() => onSourceChange("manual")}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
            textSource === "manual"
              ? "bg-gradient-to-r from-[#00d9ff] to-[#00c851] text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Вручную
        </button>
      </div>

      {textSource === "file" ? (
        <div className="flex gap-3 max-w-2xl">
          <input
            className="flex-1 px-4 py-3 bg-[#0f0f1a]/80 border border-[#1f3a5f] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 transition-all"
            value={textFilePath}
            readOnly
            onChange={(e) => onTextFileChange(e.target.value)}
            placeholder="Выберите .txt файл"
          />
          <button
            type="button"
            onClick={onPickFile}
            className="px-5 py-3 rounded-xl bg-[#1f3a5f]/50 border border-[#1f3a5f] text-sm font-medium text-slate-100 hover:bg-[#1f3a5f] transition-all"
          >
            Обзор
          </button>
        </div>
      ) : (
        <textarea
          className="w-full h-32 max-w-2xl px-4 py-3 bg-[#0f0f1a]/80 border border-[#1f3a5f] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 transition-all resize-none font-mono text-sm"
          value={manualText}
          onChange={(e) => onManualTextChange(e.target.value)}
          placeholder="Введите текст..."
        />
      )}
    </section>
  );
}

