export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  subscription: {
    subscriptionId: number;
    name: string;
    maxDevices: number;
    maxConcurrentSessions: number;
    expiresAt: string;
    autoRenew: boolean;
  } | null;
}
