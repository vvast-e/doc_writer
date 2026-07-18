import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import { TextSourceSelector } from "@/components/features/TextSourceSelector";
import { FilePicker } from "@/components/features/FilePicker";
import { DelaySliders } from "@/components/features/DelaySliders";
import { TypingControls } from "@/components/features/TypingControls";
import { useFilePicker } from "@/hooks/useFilePicker";
import { useTyping } from "@/hooks/useTyping";
import {
  typingFormSchema,
  type TypingFormValues,
} from "@/lib/validations";

type FieldErrors = Partial<Record<keyof TypingFormValues, string>>;

const DEFAULT_MANUAL_TEXT =
  "привет это тест ввода текста скриптом, под видом человека";

interface TypingSessionCardProps {
  sessionId: string;
  /** Порядковый номер карточки для заголовка ("Сессия 1", "Сессия 2", ...). */
  index: number;
  /** Лимит параллельных сессий по тарифу — передаётся в start_typing для
   * server-side (Rust) enforce, MainPage уже не даёт добавить карточку сверх
   * лимита, но Rust проверяет ещё раз (см. lib.rs start_typing). */
  maxConcurrentSessions: number;
  /** Удалить карточку — MainPage решает, когда это можно (не во время печати). */
  onRemove: () => void;
}

export function TypingSessionCard({
  sessionId,
  index,
  maxConcurrentSessions,
  onRemove,
}: TypingSessionCardProps) {
  const [values, setValues] = useState<TypingFormValues>({
    docUrl: "",
    textSource: "file",
    textFilePath: "",
    manualText: DEFAULT_MANUAL_TEXT,
    userDataDir: "",
    chromeExePath: "",
    minDelayMs: 170,
    maxDelayMs: 580,
    // false по умолчанию: браузер общий на все карточки (Фаза 5), и Rust
    // закрывает его, как только реестр активных сессий опустеет ХОТЯ БЫ НА
    // МГНОВЕНИЕ (lib.rs close_browser_requested) — с true по умолчанию первая
    // же завершившаяся карточка убивала бы браузер под ещё не стартовавшими
    // соседними карточками. Пользователь включает это осознанно, когда точно
    // не планирует больше сессий.
    closeBrowser: false,
  });

  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const profilePath = await invoke<string>("get_profile_path");
        const chromePath = await invoke<string>("find_chromium");
        setValues((prev) => ({
          ...prev,
          userDataDir: profilePath,
          chromeExePath: chromePath,
        }));
      } catch (e) {
        console.error("Failed to load defaults:", e);
      }
    };
    loadDefaults();
  }, []);

  const { pick: pickTextFile } = useFilePicker("file");

  const {
    isTyping,
    status,
    progress,
    typed,
    total,
    etaRemainingSec,
    startTyping,
    stopTyping,
  } = useTyping(sessionId);

  const isValid = useMemo(
    () => typingFormSchema.safeParse(values).success,
    [values],
  );

  const manualText =
    values.textSource === "manual" ? values.manualText ?? "" : "";

  // Грубая мгновенная прикидка (без idle-пауз и множителей) — показывается,
  // пока не пришла точная Monte-Carlo оценка от sidecar.
  const roughEstimateSec = useMemo(() => {
    if (!manualText) return null;

    const avgDelay = (values.minDelayMs + values.maxDelayMs) / 2;
    const pauseChars = manualText.match(/[.!?,;:)]/g)?.length ?? 0;
    const pauseTime = pauseChars * 2000;
    const newlines = manualText.match(/\n/g)?.length ?? 0;
    const newlineTime = newlines * 11000;
    const charTime = manualText.length * avgDelay;

    return Math.round((charTime + pauseTime + newlineTime) / 1000);
  }, [manualText, values.minDelayMs, values.maxDelayMs]);

  const [preciseEstimate, setPreciseEstimate] = useState<
    { p10: number; p50: number; p90: number } | null
  >(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const estimateRequestIdRef = useRef(0);

  useEffect(() => {
    if (!manualText) {
      setPreciseEstimate(null);
      setIsEstimating(false);
      return;
    }

    setIsEstimating(true);
    const requestId = ++estimateRequestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const result = await invoke<{ p10: number; p50: number; p90: number }>(
          "estimate_typing_time",
          {
            text: manualText,
            minDelayMs: values.minDelayMs,
            maxDelayMs: values.maxDelayMs,
          },
        );
        if (estimateRequestIdRef.current === requestId) {
          setPreciseEstimate(result);
        }
      } catch (e) {
        console.error("estimate_typing_time failed:", e);
      } finally {
        if (estimateRequestIdRef.current === requestId) {
          setIsEstimating(false);
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [manualText, values.minDelayMs, values.maxDelayMs]);

  const formatMinSec = (totalSec: number) =>
    `${Math.floor(totalSec / 60)} мин ${Math.round(totalSec % 60)} сек`;

  const updateField = <K extends keyof TypingFormValues>(
    key: K,
    value: TypingFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const result = typingFormSchema.safeParse(values);
    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const path = issue.path[0] as keyof TypingFormValues | undefined;
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    setErrors(fieldErrors);
    return false;
  };

  const handleStart = async () => {
    if (!validate()) return;
    await startTyping(values, maxConcurrentSessions, preciseEstimate?.p50 ?? null);
  };

  const handleStop = async () => {
    await stopTyping();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border bg-card backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Сессия {index}
          </CardTitle>
          {!isTyping && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-500"
              onClick={onRemove}
            >
              Удалить
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Ссылка на Google Docs:
            </Label>
            <Input
              className="h-11 bg-input border-border focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="https://docs.google.com/document/d/..."
              value={values.docUrl}
              onChange={(event) =>
                updateField("docUrl", event.target.value)
              }
            />
            {errors.docUrl && (
              <p className="mt-1 text-sm text-red-500">{errors.docUrl}</p>
            )}
          </div>

          <Separator className="bg-border" />

          <div className="space-y-4">
            <TextSourceSelector
              value={values.textSource}
              onChange={(value) => updateField("textSource", value)}
            />

            {values.textSource === "file" && (
              <div className="space-y-2">
                <FilePicker
                  label="Файл с текстом:"
                  value={values.textFilePath ?? ""}
                  placeholder="D:/path/to/text.txt"
                  onChange={(value) => updateField("textFilePath", value)}
                  onBrowse={async () => {
                    const picked = await pickTextFile();
                    if (picked) {
                      updateField("textFilePath", picked);
                    }
                  }}
                />
                {errors.textFilePath && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.textFilePath}
                  </p>
                )}
              </div>
            )}

            {values.textSource === "manual" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Текст:
                </Label>
                <Textarea
                  className="min-h-[120px] bg-input border-border focus-visible:ring-2 focus-visible:ring-ring"
                  value={values.manualText ?? ""}
                  onChange={(event) =>
                    updateField("manualText", event.target.value)
                  }
                />
                {errors.manualText && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.manualText}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Chromium и профиль Chrome встроены в приложение и настраиваются автоматически
              </p>
              {values.userDataDir && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Профиль: {values.userDataDir}
                </p>
              )}
            </div>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-4">
            <Label className="text-sm font-medium text-foreground">
              Скорость набора:
            </Label>
            <DelaySliders
              minDelayMs={values.minDelayMs}
              maxDelayMs={values.maxDelayMs}
              onChangeMin={(value) => updateField("minDelayMs", value)}
              onChangeMax={(value) => updateField("maxDelayMs", value)}
            />
            {errors.minDelayMs && (
              <p className="mt-1 text-sm text-red-500">
                {errors.minDelayMs}
              </p>
            )}

            {isTyping ? (
              <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {total > 0
                      ? `Набрано: ${typed}/${total} символов`
                      : "Идёт набор..."}
                  </span>
                  <span className="font-semibold text-foreground">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <Progress value={progress * 100} />
                {etaRemainingSec !== null && (
                  <p className="text-xs text-muted-foreground/80">
                    Осталось ≈ {formatMinSec(etaRemainingSec)}
                  </p>
                )}
              </div>
            ) : (
              (preciseEstimate || roughEstimateSec !== null) && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Примерное время:{" "}
                    <span className="font-semibold text-foreground">
                      {preciseEstimate
                        ? `${formatMinSec(preciseEstimate.p10)} – ${formatMinSec(preciseEstimate.p90)}`
                        : roughEstimateSec !== null
                          ? `≈ ${formatMinSec(roughEstimateSec)}`
                          : null}
                    </span>
                    {isEstimating && (
                      <span className="ml-2 text-xs text-muted-foreground/60">
                        (уточняю...)
                      </span>
                    )}
                  </p>
                </div>
              )
            )}
          </div>

          <Separator className="bg-border" />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`close-browser-${sessionId}`}
                checked={values.closeBrowser}
                onCheckedChange={(checked) =>
                  updateField("closeBrowser", Boolean(checked))
                }
              />
              <Label htmlFor={`close-browser-${sessionId}`} className="text-sm">
                Закрыть браузер, когда завершатся все сессии
              </Label>
            </div>
          </div>

          <TypingControls
            isTyping={isTyping}
            status={status}
            onStart={handleStart}
            onStop={handleStop}
            disabled={isTyping || !isValid}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
