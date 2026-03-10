interface DocUrlSectionProps {
  docUrl: string;
  onChange: (value: string) => void;
}

export function DocUrlSection({ docUrl, onChange }: DocUrlSectionProps) {
  return (
    <section className="space-y-2">
      <label className="block text-sm font-semibold text-slate-300">
        Ссылка на Google Docs
      </label>
      <input
        className="w-full max-w-2xl px-4 py-3 bg-[#0f0f1a]/80 border border-[#1f3a5f] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 focus:border-[#00d9ff] transition-all"
        value={docUrl}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://docs.google.com/document/d/..."
      />
    </section>
  );
}

