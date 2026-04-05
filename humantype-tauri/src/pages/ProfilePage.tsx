import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { Monitor, CheckCircle2, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

export function ProfilePage() {
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [launchError, setLaunchError] = useState("");

  const launchChromium = async () => {
    setLaunchError("");
    setIsLaunching(true);
    try {
      await invoke("open_chromium_for_login");
      setLaunched(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLaunchError(message);
      console.error("Failed to launch Chromium:", err);
    } finally {
      setIsLaunching(false);
    }
  };

  const checkAndContinue = async () => {
    setIsChecking(true);
    try {
      const exists = await invoke<boolean>("check_profile_exists");
      if (exists) {
        navigate("/main");
      } else {
        alert("Профиль ещё не создан. Пожалуйста, войдите в Google аккаунт в Chromium и закройте его.");
      }
    } catch (err) {
      console.error("Failed to check profile:", err);
    } finally {
      setIsChecking(false);
    }
  };

  const skipProfileSetup = () => {
    navigate("/main");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg px-4"
      >
        <Card className="border-border bg-card/80 backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-xl font-semibold tracking-tight">
              Настройка профиля Chrome
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Для работы приложения необходим профиль с авторизованным Google аккаунтом
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Monitor className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                Приложение использует встроенный Chromium — установка Chrome не требуется
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Инструкция:</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    1
                  </span>
                  Нажмите кнопку «Запустить Chromium»
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    2
                  </span>
                  Откроется Chromium с чистым профилем на странице входа Google
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    3
                  </span>
                  Войдите в свой Google аккаунт
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    4
                  </span>
                  После успешного входа закройте Chromium
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    5
                  </span>
                  Нажмите «Готово» для продолжения
                </li>
              </ol>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-600 dark:text-amber-400">
                Если Chromium не может подключиться к Google, попробуйте войти через обычный Chrome — профиль будет найден автоматически.
              </div>
            </div>

            <Separator />

            {launchError && (
              <p className="text-sm text-red-500 text-center">{launchError}</p>
            )}

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={launchChromium}
                disabled={isLaunching}
                variant={launched ? "secondary" : "default"}
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Запуск Chromium...
                  </>
                ) : launched ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Chromium запущен
                  </>
                ) : (
                  "Запустить Chromium"
                )}
              </Button>

              <Button
                className="w-full"
                onClick={checkAndContinue}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  "Готово"
                )}
              </Button>

              <Button
                className="w-full"
                onClick={skipProfileSetup}
                variant="ghost"
              >
                Пропустить
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
