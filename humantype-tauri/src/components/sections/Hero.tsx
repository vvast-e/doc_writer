import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

export function Hero() {
  return (
    <section className="border-b border-border bg-background">
      <motion.div
        className="mx-auto max-w-5xl px-6 py-16 text-center md:px-12 md:py-24"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          HumanType — живой почерк для текста от ИИ
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
          <span className="block">Текст от ИИ</span>
          <span className="bg-gradient-to-r from-secondary via-[#f4a261] to-primary bg-clip-text text-transparent">
            Почерк Человека
          </span>
        </h1>

        <p className="mt-6 text-balance text-lg leading-relaxed text-muted-foreground md:text-xl">
          HumanType эмулирует живой набор текста в Google Docs, Notion и Word
          Online. Преподаватель видит курсор и печать, а не моментальную
          вставку из буфера.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto"
          >
            <Button className="flex h-12 w-full items-center justify-center gap-2 px-8 text-base sm:w-auto">
              <Download className="h-5 w-5" />
              ⬇ Скачать для Windows
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto"
          >
            <Button
              variant="outline"
              className="h-12 w-full border-border px-8 text-base text-foreground sm:w-auto"
            >
              Как это работает
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

