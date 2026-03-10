export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-black/30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00d9ff] to-[#00c851] rounded-lg blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative w-10 h-10 bg-gradient-to-br from-[#00d9ff]/20 to-[#00c851]/20 rounded-lg flex items-center justify-center border border-white/10">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="gradient1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#00d9ff"/>
                    <stop offset="1" stopColor="#00c851"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold bg-gradient-to-r from-[#00d9ff] via-[#00c851] to-[#00d9ff] bg-clip-text text-transparent hover:from-[#00c851] hover:via-[#00d9ff] hover:to-[#00c851] transition-all duration-500">
              Human
            </span>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#ff6b6b] via-[#ffaa53] to-[#ff6b6b] bg-clip-text text-transparent hover:from-[#ffaa53] hover:via-[#ff6b6b] hover:to-[#ffaa53] transition-all duration-500">
              Type
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-[#00c851] animate-pulse"></div>
            <span>Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}

