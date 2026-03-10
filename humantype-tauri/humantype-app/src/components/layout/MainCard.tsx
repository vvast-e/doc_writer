import type { ReactNode } from "react";

interface MainCardProps {
  children: ReactNode;
}

export function MainCard({ children }: MainCardProps) {
  return (
    <div className="relative group">
      {/* Glow effect behind card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00d9ff]/20 via-[#00c851]/20 to-[#ffaa53]/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-all duration-500 animate-pulse-slow"></div>
      
      {/* Main card */}
      <div className="relative glass bg-[#16213e]/70 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d9ff]/50 to-transparent"></div>
        
        {/* Content */}
        <div className="p-8 space-y-8">
          {children}
        </div>
        
        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00c851]/30 to-transparent"></div>
      </div>
    </div>
  );
}

