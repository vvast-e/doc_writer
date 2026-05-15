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
  const [status, setStatus] = useState<TypingStatus>({
    type: "idle",
    message: "Готово",
  });
  const sidecarErroredRef = useRef(false);

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    const setup = async () => {
      unlisteners.push(
        await listen<ProgressPayload>("typing:progress", (event) => {
          const p = event.payload?.progress ?? 0;
          setProgress(p);
          const typed = event.payload?.typed ?? 0;
          const total = event.payload?.total ?? 0;
          setStatus({
            type: "running",
            message:
              total > 0
                ? `Набираю: ${typed}/${total} (${Math.round(p * 100)}%)`
                : "Идёт набор...",
          });
        }),
      );

      unlisteners.push(
        await listen("typing:started", () => {
          sidecarErroredRef.current = false;
          setProgress(0);
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
        }),
      );

      unlisteners.push(
        await listen("typing:stopped", () => {
          setStatus({ type: "idle", message: "Остановлено" });
          setIsTyping(false);
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

  const startTyping = async (values: TypingFormValues) => {
    setIsTyping(true);
    setProgress(0);
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
    startTyping,
    stopTyping,
  };
}
