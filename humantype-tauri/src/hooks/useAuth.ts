import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface SubscriptionInfo {
  subscriptionId: number;
  name: string;
  maxDevices: number;
  expiresAt: string;
  autoRenew?: boolean;
}

export interface AuthProfile {
  id: string;
  email: string | null;
  name: string | null;
  subscription: SubscriptionInfo | null;
}

interface RedeemResponse {
  token: string;
  user: { id: string; email: string | null; name: string | null };
  subscription: SubscriptionInfo | null;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface UseAuthResult {
  status: AuthStatus;
  profile: AuthProfile | null;
  error: string | null;
  redeemCode: (code: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const token = await invoke<string | null>("get_stored_token");
      if (!token) {
        setStatus("unauthenticated");
        setProfile(null);
        return;
      }
      const user = await invoke<AuthProfile>("validate_device_token");
      setProfile(user);
      setStatus("authenticated");
    } catch {
      setProfile(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const redeemCode = useCallback(async (code: string) => {
    setError(null);
    try {
      const result = await invoke<RedeemResponse>("redeem_pairing_code", { code });
      setProfile({
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        subscription: result.subscription,
      });
      setStatus("authenticated");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, []);

  return { status, profile, error, redeemCode, refresh };
}
