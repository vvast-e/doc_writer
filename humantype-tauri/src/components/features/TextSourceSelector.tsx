import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type TextSource = "file" | "manual";

interface TextSourceSelectorProps {
  value: TextSource;
  onChange: (value: TextSource) => void;
}

export function TextSourceSelector({
  value,
  onChange,
}: TextSourceSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">
        Источник текста:
      </Label>
      <RadioGroup
        value={value}
        onValueChange={(val) => onChange(val as TextSource)}
        className="grid gap-2 md:grid-cols-2"
      >
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card/60 px-4 py-3 text-sm transition-colors hover:border-primary/60 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-primary/40">
          <RadioGroupItem value="file" />
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">Файл</span>
            <span className="text-xs text-muted-foreground">
              Использовать текст из файла
            </span>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card/60 px-4 py-3 text-sm transition-colors hover:border-primary/60 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-primary/40">
          <RadioGroupItem value="manual" />
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">
              Ввести вручную
            </span>
            <span className="text-xs text-muted-foreground">
              Вставить или набрать текст здесь
            </span>
          </div>
        </label>
      </RadioGroup>
    </div>
  );
}

