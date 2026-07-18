import { useState } from "react";
import { TypingSessionCard } from "@/components/sections/TypingSessionCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

// Без активной подписки разрешаем ровно одну сессию — совпадает с
// дефолтом бэкенда для пользователей без подписки (см. web/.../device/service.ts).
const DEFAULT_MAX_CONCURRENT_SESSIONS = 1;

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function MainPage() {
  const { profile } = useAuth();
  const maxConcurrentSessions =
    profile?.subscription?.maxConcurrentSessions ?? DEFAULT_MAX_CONCURRENT_SESSIONS;

  const [sessionIds, setSessionIds] = useState<string[]>([createSessionId()]);

  const canAddSession = sessionIds.length < maxConcurrentSessions;

  const addSession = () => {
    if (!canAddSession) return;
    setSessionIds((prev) => [...prev, createSessionId()]);
  };

  const removeSession = (id: string) => {
    setSessionIds((prev) => prev.filter((sid) => sid !== id));
  };

  return (
    <div className="min-h-screen text-foreground">
      <header className="bg-background border-b border-border p-4">
        <h1 className="text-xl font-semibold bg-gradient-to-r from-green-500 to-red-500 bg-clip-text text-transparent">
          HumanType
        </h1>
      </header>

      <main className="container mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Параллельных сессий: {sessionIds.length} / {maxConcurrentSessions}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={!canAddSession}
            onClick={addSession}
          >
            + Добавить сессию
          </Button>
        </div>

        {sessionIds.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Нет активных сессий — нажмите «Добавить сессию», чтобы начать.
          </p>
        )}

        <div className="space-y-6">
          {sessionIds.map((sessionId, i) => (
            <TypingSessionCard
              key={sessionId}
              sessionId={sessionId}
              index={i + 1}
              maxConcurrentSessions={maxConcurrentSessions}
              onRemove={() => removeSession(sessionId)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
