export function Header() {
  return (
    <header className="border-b border-white/5 backdrop-blur-sm bg-black/20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-[#00d9ff] to-[#00c851] bg-clip-text text-transparent">
            Human
          </span>
          <span className="text-2xl font-bold bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] bg-clip-text text-transparent">
            Type
          </span>
        </div>
        <div className="w-20" />
      </div>
    </header>
  );
}

