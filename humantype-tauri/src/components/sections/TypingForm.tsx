import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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

export function TypingForm() {
  const [values, setValues] = useState<TypingFormValues>({
    docUrl: "",
    textSource: "file",
    textFilePath: "",
    manualText: DEFAULT_MANUAL_TEXT,
    userDataDir: "",
    chromeExePath: "",
    minDelayMs: 170,
    maxDelayMs: 580,
    closeBrowser: true,
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

  const { isTyping, status, startTyping, stopTyping } = useTyping();

  const isValid = useMemo(
    () => typingFormSchema.safeParse(values).success,
    [values],
  );

  const estimatedTime = useMemo(() => {
    const text =
      values.textSource === "manual"
        ? values.manualText ?? ""
        : "";

    if (!text) return null;

    const avgDelay = (values.minDelayMs + values.maxDelayMs) / 2;

    const pauseChars = text.match(/[.!?,;:)]/g)?.length ?? 0;
    const pauseTime = pauseChars * 2000;

    const newlines = text.match(/\n/g)?.length ?? 0;
    const newlineTime = newlines * 11000;

    const totalChars = text.length;
    const charTime = totalChars * avgDelay;

    const totalMs = charTime + pauseTime + newlineTime;
    const totalSec = Math.round(totalMs / 1000);

    return totalSec;
  }, [values.textSource, values.manualText, values.minDelayMs, values.maxDelayMs]);

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
    await startTyping(values);
  };

  const handleStop = async () => {
    await stopTyping();
  };

  return (
    <section>
      <motion.div
        className="mx-auto max-w-4xl px-6 py-16 md:px-12 md:py-24"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-border bg-card backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-xl font-semibold tracking-tight">
              Настройка HumanType
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Заполните данные ниже, чтобы эмулировать живой набор текста в
              Google Docs.
            </CardDescription>
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

              {estimatedTime !== null && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Примерное время:{" "}
                    <span className="font-semibold text-foreground">
                      {Math.floor(estimatedTime / 60)} мин {estimatedTime % 60} сек
                    </span>
                  </p>
                </div>
              )}
            </div>

            <Separator className="bg-border" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="close-browser"
                  checked={values.closeBrowser}
                  onCheckedChange={(checked) =>
                    updateField("closeBrowser", Boolean(checked))
                  }
                />
                <Label htmlFor="close-browser" className="text-sm">
                  Закрывать браузер после завершения
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
    </section>
  );
}

