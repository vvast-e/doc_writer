export interface SubscriptionCatalogItem {
  id: number;
  name: string;
  price: string;
  currency: string;
  period: number;
  maxDevices: number;
  maxConcurrentSessions: number;
}

export interface CreatePaymentResult {
  confirmationUrl: string;
  transactionId: string;
}

export interface TransactionDTO {
  id: string;
  date: string;
  amount: string;
  currency: string;
  description: string;
  status: string;
}

export interface SubscriptionStatusDTO {
  subscriptionId: number;
  name: string;
  maxDevices: number;
  maxConcurrentSessions: number;
  expiresAt: string;
  autoRenew: boolean;
}

export type PaymentServiceError =
  | { code: 'SUBSCRIPTION_NOT_FOUND' }
  | { code: 'PROVIDER_ERROR' };
