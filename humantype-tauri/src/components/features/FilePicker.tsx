import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface FilePickerProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onBrowse: () => Promise<void>;
  buttonLabel?: string;
}

export function FilePicker({
  label,
  value,
  placeholder,
  onChange,
  onBrowse,
  buttonLabel = "Обзор...",
}: FilePickerProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input
          className="h-11"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4 md:px-6"
          onClick={async () => {
            await onBrowse();
          }}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

