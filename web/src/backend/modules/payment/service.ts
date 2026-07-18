import { createYooKassaPayment, generateIdempotenceKey, getYooKassaPayment } from '@/backend/lib/yookassa';
import {
  activateSubscriptionInTransaction,
  attachProviderTxId,
  createPendingTransaction,
  findTransactionByProviderTxId,
  getActiveSubscription,
  getActiveSubscriptionCatalog,
  getSubscriptionById,
  getUserTransactions,
} from './repo';
import type {
  CreatePaymentResult,
  PaymentServiceError,
  SubscriptionCatalogItem,
  SubscriptionStatusDTO,
  TransactionDTO,
} from './types';

function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL ?? 'http://localhost:3000';
}

export async function listSubscriptions(): Promise<SubscriptionCatalogItem[]> {
  const subscriptions = await getActiveSubscriptionCatalog();
  return subscriptions.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price.toString(),
    currency: s.currency,
    period: s.period,
    maxDevices: s.max_devices,
    maxConcurrentSessions: s.max_concurrent_sessions,
  }));
}

export async function createPayment(
  userId: string,
  subscriptionId: number,
): Promise<{ ok: true; data: CreatePaymentResult } | { ok: false; error: PaymentServiceError }> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription || !subscription.is_active) {
    return { ok: false, error: { code: 'SUBSCRIPTION_NOT_FOUND' } };
  }

  const transaction = await createPendingTransaction({
    userId,
    subscriptionId,
    amount: subscription.price,
    currency: subscription.currency,
  });

  try {
    const payment = await createYooKassaPayment({
      amount: subscription.price.toString(),
      currency: subscription.currency,
      description: `Подписка HumanType "${subscription.name}"`,
      returnUrl: `${getAppBaseUrl()}/profile?payment=success`,
      metadata: { transactionId: transaction.id, userId, subscriptionId: String(subscriptionId) },
      idempotenceKey: transaction.id,
    });

    if (!payment.confirmation_url) {
      return { ok: false, error: { code: 'PROVIDER_ERROR' } };
    }

    await attachProviderTxId(transaction.id, payment.id);

    return { ok: true, data: { confirmationUrl: payment.confirmation_url, transactionId: transaction.id } };
  } catch (error) {
    console.error('YooKassa createPayment failed:', error);
    return { ok: false, error: { code: 'PROVIDER_ERROR' } };
  }
}

export async function handleWebhook(paymentId: string): Promise<void> {
  const payment = await getYooKassaPayment(paymentId);
  if (payment.status !== 'succeeded' || !payment.paid) return;

  const transaction = await findTransactionByProviderTxId(paymentId);
  if (!transaction) return;
  if (transaction.status === 'success') return; // already processed — idempotent no-op
  if (!transaction.subscription_id) return;

  const subscription = await getSubscriptionById(transaction.subscription_id);
  if (!subscription) return;

  await activateSubscriptionInTransaction({
    transactionId: transaction.id,
    userId: transaction.user_id,
    subscriptionId: subscription.id,
    period: subscription.period,
    providerPayload: payment as unknown,
    paymentMethod:
      payment.payment_method?.saved && payment.payment_method.id
        ? { id: payment.payment_method.id, mask: payment.payment_method.card?.last4 ? `**** ${payment.payment_method.card.last4}` : null }
        : undefined,
  });
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatusDTO | null> {
  const activeSubscription = await getActiveSubscription(userId);
  if (!activeSubscription) return null;

  return {
    subscriptionId: activeSubscription.subscription_id,
    name: activeSubscription.subscription.name,
    maxDevices: activeSubscription.subscription.max_devices,
    maxConcurrentSessions: activeSubscription.subscription.max_concurrent_sessions,
    expiresAt: activeSubscription.expires_at.toISOString(),
    autoRenew: activeSubscription.auto_renew,
  };
}

export async function listTransactions(userId: string): Promise<TransactionDTO[]> {
  const transactions = await getUserTransactions(userId);
  return transactions.map((t) => ({
    id: t.id,
    date: t.created_at.toISOString(),
    amount: t.amount.toString(),
    currency: t.currency,
    description: t.subscription ? `Подписка "${t.subscription.name}"` : 'Оплата',
    status: t.status,
  }));
}
