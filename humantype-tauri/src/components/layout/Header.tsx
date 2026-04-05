import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Human
          </span>
          <span className="bg-gradient-to-r from-secondary via-[#f4a261] to-primary bg-clip-text text-xl font-semibold tracking-tight text-transparent">
            Type
          </span>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <button className="transition-colors hover:text-foreground">
            Главная
          </button>
          <button className="transition-colors hover:text-foreground">
            Скачать
          </button>
          <button className="transition-colors hover:text-foreground">
            Оплата
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <Button className="h-10 px-6 text-sm font-medium">
            Попробовать
          </Button>
        </div>
      </div>
    </header>
  );
}

