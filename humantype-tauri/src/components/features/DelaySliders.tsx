import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface DelaySlidersProps {
  minDelayMs: number;
  maxDelayMs: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}

export function DelaySliders({
  minDelayMs,
  maxDelayMs,
  onChangeMin,
  onChangeMax,
}: DelaySlidersProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <Label className="text-sm font-medium text-foreground">
            Минимальная задержка
          </Label>
          <span className="text-sm text-muted-foreground">
            {minDelayMs} мс
          </span>
        </div>
        <Slider
          min={10}
          max={1000}
          step={10}
          value={[minDelayMs]}
          onValueChange={([value]) => onChangeMin(value)}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <Label className="text-sm font-medium text-foreground">
            Максимальная задержка
          </Label>
          <span className="text-sm text-muted-foreground">
            {maxDelayMs} мс
          </span>
        </div>
        <Slider
          min={10}
          max={2000}
          step={10}
          value={[maxDelayMs]}
          onValueChange={([value]) => onChangeMax(value)}
        />
      </div>
    </div>
  );
}

