export interface PairingIssueResult {
  code: string;
  expiresAt: string;
}

export interface RedeemResult {
  token: string;
  user: { id: string; email: string | null; name: string | null };
  subscription: {
    subscriptionId: number;
    name: string;
    maxDevices: number;
    expiresAt: string;
  } | null;
}

export interface DeviceDTO {
  id: string;
  activatedAt: string;
  lastSeenAt: string | null;
}

export type DeviceServiceError =
  | { code: 'INVALID_OR_EXPIRED_CODE' }
  | { code: 'DEVICE_LIMIT_REACHED'; maxDevices: number }
  | { code: 'RESET_COOLDOWN_ACTIVE'; retryAfter: string };
