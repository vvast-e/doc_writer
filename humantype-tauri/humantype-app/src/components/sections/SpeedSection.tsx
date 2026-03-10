interface SpeedSectionProps {
  minDelay: number;
  maxDelay: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}

export function SpeedSection({
  minDelay,
  maxDelay,
  onMinChange,
  onMaxChange,
}: SpeedSectionProps) {
  return (
    <section className="space-y-4">
      <label className="block text-sm font-semibold text-slate-300">
        Скорость набора (мс)
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Минимум</span>
            <span className="text-sm font-mono text-[#00d9ff]">{minDelay} мс</span>
          </div>
          <input
            type="range"
            min={10}
            max={1000}
            value={minDelay}
            onChange={(e) => onMinChange(Number(e.target.value))}
            className="w-full h-2 bg-[#0f0f1a] rounded-lg appearance-none cursor-pointer accent-[#00d9ff]"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Максимум</span>
            <span className="text-sm font-mono text-[#ff6b6b]">{maxDelay} мс</span>
          </div>
          <input
            type="range"
            min={10}
            max={2000}
            value={maxDelay}
            onChange={(e) => onMaxChange(Number(e.target.value))}
            className="w-full h-2 bg-[#0f0f1a] rounded-lg appearance-none cursor-pointer accent-[#ff6b6b]"
          />
        </div>
      </div>
    </section>
  );
}

