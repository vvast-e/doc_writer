import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { TypingFormValues } from "@/lib/validations";

type TypingStatus =
  | { type: "idle"; message: string }
  | { type: "running"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function normalizeInvokeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();
    if (message) return message;
  }

  return fallback;
}

interface ProgressPayload {
  typed?: number;
  total?: number;
  progress?: number;
}

interface ErrorPayload {
  error?: string;
}

export function useTyping() {
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [typed, setTyped] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [etaRemainingSec, setEtaRemainingSec] = useState<number | null>(null);
  const [status, setStatus] = useState<TypingStatus>({
    type: "idle",
    message: "Готово",
  });
  const sidecarErroredRef = useRef(false);
  // Якорь для измерения реального темпа: фиксируется на первом реальном
  // прогрессе (а не на "started"), чтобы не ловить стартовую паузу браузера.
  const firstProgressRef = useRef<{ at: number; typed: number } | null>(null);
  // p50 из Monte-Carlo оценки (сек), посчитанной до старта — используется как
  // якорь ETA, пока не накопилось достаточно реальных данных о темпе.
  const mcP50Ref = useRef<number | null>(null);

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    const setup = async () => {
      unlisteners.push(
        await listen<ProgressPayload>("typing:progress", (event) => {
          const p = event.payload?.progress ?? 0;
          const typedNow = event.payload?.typed ?? 0;
          const totalNow = event.payload?.total ?? 0;
          setProgress(p);
          setTyped(typedNow);
          setTotal(totalNow);

          if (!firstProgressRef.current && typedNow > 0) {
            firstProgressRef.current = { at: Date.now(), typed: typedNow };
          }

          let liveRemaining: number | null = null;
          const baseline = firstProgressRef.current;
          if (baseline && totalNow > typedNow) {
            const deltaTyped = typedNow - baseline.typed;
            const elapsedSec = (Date.now() - baseline.at) / 1000;
            if (deltaTyped > 0 && elapsedSec > 0) {
              const rate = deltaTyped / elapsedSec;
              liveRemaining = rate > 0 ? (totalNow - typedNow) / rate : null;
            }
          }

          const mcP50 = mcP50Ref.current;
          const mcRemaining =
            mcP50 !== null && p < 1 ? mcP50 * (1 - p) : null;

          let blended: number | null;
          if (liveRemaining !== null && mcRemaining !== null) {
            // В начале доверяем Monte-Carlo (мало реальных данных о темпе),
            // после ~20% прогресса переходим на измеренный темп.
            const w = Math.min(1, p / 0.2);
            blended = w * liveRemaining + (1 - w) * mcRemaining;
          } else {
            blended = liveRemaining ?? mcRemaining;
          }
          setEtaRemainingSec(blended);

          setStatus({ type: "running", message: "Идёт набор..." });
        }),
      );

      unlisteners.push(
        await listen<{ total?: number }>("typing:started", (event) => {
          sidecarErroredRef.current = false;
          setProgress(0);
          setTyped(0);
          setTotal(event.payload?.total ?? 0);
          setEtaRemainingSec(null);
          firstProgressRef.current = null;
          setStatus({ type: "running", message: "Браузер запускается..." });
        }),
      );

      unlisteners.push(
        await listen("typing:login_wait", () => {
          setStatus({
            type: "running",
            message: "Войдите в Google в открывшемся окне браузера...",
          });
        }),
      );

      unlisteners.push(
        await listen("typing:done", () => {
          setStatus({ type: "success", message: "Готово" });
          setIsTyping(false);
          setEtaRemainingSec(null);
        }),
      );

      unlisteners.push(
        await listen("typing:stopped", () => {
          setStatus({ type: "idle", message: "Остановлено" });
          setIsTyping(false);
          setEtaRemainingSec(null);
        }),
      );

      unlisteners.push(
        await listen<ErrorPayload>("typing:error", (event) => {
          sidecarErroredRef.current = true;
          const msg = event.payload?.error ?? "Неизвестная ошибка";
          setStatus({ type: "error", message: `Ошибка: ${msg}` });
          setIsTyping(false);
        }),
      );

      unlisteners.push(
        await listen<{ status?: string }>("typing:terminated", (event) => {
          // Если done/stopped/error уже пришли — игнорируем; иначе считаем падением.
          setIsTyping((wasTyping) => {
            if (!wasTyping) return wasTyping;
            if (sidecarErroredRef.current) return false;
            const code = event.payload?.status ?? "";
            setStatus({
              type: "error",
              message: `Sidecar завершился неожиданно (${code}). Проверьте лог.`,
            });
            return false;
          });
        }),
      );
    };

    setup().catch((e) => console.error("event listen failed:", e));

    return () => {
      for (const u of unlisteners) {
        try {
          u();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  const startTyping = async (
    values: TypingFormValues,
    mcP50Sec?: number | null,
  ) => {
    setIsTyping(true);
    setProgress(0);
    setTyped(0);
    setTotal(0);
    setEtaRemainingSec(null);
    firstProgressRef.current = null;
    mcP50Ref.current = mcP50Sec ?? null;
    sidecarErroredRef.current = false;
    setStatus({ type: "running", message: "Запускаю..." });

    try {
      await invoke("start_typing", {
        docUrl: values.docUrl,
        textSource: values.textSource,
        textFilePath: values.textSource === "file" ? values.textFilePath : null,
        manualText: values.textSource === "manual" ? values.manualText : null,
        userDataDir: values.userDataDir,
        chromeExePath: values.chromeExePath || null,
        minDelayMs: values.minDelayMs,
        maxDelayMs: values.maxDelayMs,
        closeBrowser: values.closeBrowser,
      });
      // Дальше состояние двигают события из sidecar.
    } catch (error) {
      const message = normalizeInvokeError(error, "Не удалось запустить набор");
      setStatus({ type: "error", message: `Ошибка: ${message}` });
      setIsTyping(false);
    }
  };

  const stopTyping = async () => {
    try {
      await invoke("stop_typing");
      setStatus({ type: "running", message: "Останавливаю..." });
    } catch (error) {
      const message = normalizeInvokeError(error, "Не удалось остановить набор");
      setStatus({ type: "error", message: `Ошибка: ${message}` });
      setIsTyping(false);
    }
  };

  return {
    isTyping,
    status,
    progress,
    typed,
    total,
    etaRemainingSec,
    startTyping,
    stopTyping,
  };
}
