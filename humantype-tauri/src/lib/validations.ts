import { z } from "zod";

export const typingFormSchema = z
  .object({
    docUrl: z.string().min(1, "Ссылка не может быть пустой"),
    textSource: z.enum(["file", "manual"]),
    textFilePath: z.string().optional(),
    manualText: z.string().optional(),
    userDataDir: z.string().optional(),
    chromeExePath: z.string().optional(),
    minDelayMs: z.number().int().min(10).max(2000),
    maxDelayMs: z.number().int().min(10).max(2000),
    closeBrowser: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.textSource === "file" && !data.textFilePath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите файл с текстом",
        path: ["textFilePath"],
      });
    }

    if (data.textSource === "manual" && !data.manualText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Введите текст",
        path: ["manualText"],
      });
    }

    if (data.minDelayMs > data.maxDelayMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Минимальная задержка не может быть больше максимальной",
        path: ["minDelayMs"],
      });
    }
  });

export type TypingFormValues = z.infer<typeof typingFormSchema>;

