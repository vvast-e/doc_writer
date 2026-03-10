import type { ReactNode } from "react";

interface MainCardProps {
  children: ReactNode;
}

export function MainCard({ children }: MainCardProps) {
  return (
    <div className="bg-[#16213e]/80 backdrop-blur-xl border border-[#1f3a5f]/50 rounded-2xl shadow-2xl overflow-hidden max-w-3xl mx-auto">
      <div className="p-8 space-y-7">{children}</div>
    </div>
  );
}

