import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

// Keep in sync with APP_BASE_URL in src-tauri/src/lib.rs.
const APP_BASE_URL = "https://humantype.ru";

export function LoginPage() {
  const navigate = useNavigate();
  const { status, redeemCode } = useAuth();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const exists = await invoke<boolean>("check_profile_exists");
        navigate(exists ? "/main" : "/profile");
      } catch {
        navigate("/profile");
      }
    })();
  }, [status, navigate]);

  const handleOpenPairing = async () => {
    await openUrl(`${APP_BASE_URL}/pair`);
  };

  const handleSubmit = async () => {
    setLocalError("");
    if (code.trim().length !== 6) {
      setLocalError("Код должен состоять из 6 цифр");
      return;
    }
    setIsSubmitting(true);
    try {
      const errorMessage = await redeemCode(code.trim());
      if (errorMessage) {
        setLocalError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <p className="text-sm text-muted-foreground">Проверка авторизации...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-4"
      >
        <Card className="border-border bg-card/80 backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              <span className="bg-gradient-to-r from-green-500 to-red-500 bg-clip-text text-transparent">
                HumanType
              </span>
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Привяжите устройство, чтобы начать работу
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button className="w-full" variant="outline" type="button" onClick={handleOpenPairing}>
              Открыть привязку устройства
            </Button>

            <div className="space-y-2">
              <Label htmlFor="pairing-code">Код из личного кабинета</Label>
              <Input
                id="pairing-code"
                placeholder="000000"
                value={code}
                maxLength={6}
                inputMode="numeric"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={handleKeyDown}
                autoComplete="one-time-code"
              />
            </div>

            {localError && (
              <p className="text-sm text-red-500 text-center">{localError}</p>
            )}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting || code.length !== 6}
            >
              {isSubmitting ? "Проверка..." : "Войти"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
