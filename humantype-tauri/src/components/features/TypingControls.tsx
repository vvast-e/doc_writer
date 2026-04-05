import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

type StatusType = "idle" | "running" | "success" | "error";

interface TypingStatusProps {
  type: StatusType;
  message: string;
}

interface TypingControlsProps {
  isTyping: boolean;
  status: TypingStatusProps;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  disabled: boolean;
}

export function TypingControls({
  isTyping,
  status,
  onStart,
  onStop,
  disabled,
}: TypingControlsProps) {
  const statusColor =
    status.type === "error"
      ? "text-red-500"
      : status.type === "running"
        ? "text-[#f4a261]"
        : "text-secondary";

  return (
    <div className="space-y-3">
      <motion.div
        whileHover={!disabled && !isTyping ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !isTyping ? { scale: 0.98 } : undefined}
        className="w-full"
      >
        <Button
          className="h-12 w-full text-base font-medium"
          disabled={disabled}
          onClick={async () => {
            if (isTyping) {
              await onStop();
            } else {
              await onStart();
            }
          }}
        >
          {isTyping ? "Остановить набор" : "Начать набор"}
        </Button>
      </motion.div>

      <p className={`text-sm ${statusColor}`}>{status.message}</p>
    </div>
  );
}

