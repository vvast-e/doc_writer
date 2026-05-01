import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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

export function useTyping() {
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<TypingStatus>({
    type: "idle",
    message: "Готово",
  });

  const startTyping = async (values: TypingFormValues) => {
    setIsTyping(true);
    setStatus({ type: "running", message: "Идёт набор..." });

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

      setStatus({ type: "success", message: "Готово" });
    } catch (error) {
      const message = normalizeInvokeError(error, "Не удалось запустить набор");
      setStatus({ type: "error", message: `Ошибка: ${message}` });
    } finally {
      setIsTyping(false);
    }
  };

  const stopTyping = async () => {
    try {
      await invoke("stop_typing");
      setStatus({ type: "idle", message: "Готово" });
    } catch (error) {
      const message = normalizeInvokeError(error, "Не удалось остановить набор");
      setStatus({ type: "error", message: `Ошибка: ${message}` });
    }
  };

  return {
    isTyping,
    status,
    startTyping,
    stopTyping,
  };
}

