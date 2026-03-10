interface StatusSectionProps {
  text: string;
  isRunning: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export function StatusSection({
  text,
  isRunning,
  isSuccess,
  isError,
}: StatusSectionProps) {
  const className = isSuccess
    ? "bg-[#00c851]/20 text-[#00c851] border border-[#00c851]/30"
    : isError
    ? "bg-[#ff4444]/20 text-[#ff4444] border border-[#ff4444]/30"
    : isRunning
    ? "bg-[#ffaa53]/20 text-[#ffaa53] border border-[#ffaa53]/30"
    : "bg-[#1f3a5f]/30 text-slate-300 border border-[#1f3a5f]/50";

  return (
    <div
      className={`text-center py-3 px-4 rounded-xl text-sm font-medium transition-all ${className}`}
    >
      {text}
    </div>
  );
}

