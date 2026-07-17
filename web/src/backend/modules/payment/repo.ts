import { prisma } from '@/backend/lib/db';
import type { Prisma } from '@prisma/client';

export async function getActiveSubscriptionCatalog() {
  return prisma.subscription.findMany({
    where: { is_active: true },
    orderBy: { sort_order: 'asc' },
  });
}

export async function getSubscriptionById(id: number) {
  return prisma.subscription.findUnique({ where: { id } });
}

export async function getActiveSubscription(userId: string) {
  return prisma.userSubscription.findFirst({
    where: { user_id: userId, is_active: true },
    include: { subscription: true },
  });
}

export async function createPendingTransaction(params: {
  userId: string;
  subscriptionId: number;
  amount: Prisma.Decimal | number | string;
  currency: string;
}) {
  return prisma.transaction.create({
    data: {
      user_id: params.userId,
      subscription_id: params.subscriptionId,
      amount: params.amount,
      currency: params.currency,
      status: 'pending',
      provider: 'yookassa',
    },
  });
}

export async function attachProviderTxId(transactionId: string, paymentId: string) {
  return prisma.transaction.update({
    where: { id: transactionId },
    data: { provider_tx_id: paymentId },
  });
}

export async function findTransactionByProviderTxId(paymentId: string) {
  return prisma.transaction.findFirst({
    where: { provider: 'yookassa', provider_tx_id: paymentId },
    include: { subscription: true },
  });
}

export async function getUserTransactions(userId: string) {
  return prisma.transaction.findMany({
    where: { user_id: userId },
    include: { subscription: true },
    orderBy: { created_at: 'desc' },
  });
}

export async function activateSubscriptionInTransaction(params: {
  transactionId: string;
  userId: string;
  subscriptionId: number;
  period: number;
  providerPayload: unknown;
  paymentMethod?: { id: string; mask: string | null };
}) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.transaction.update({
      where: { id: params.transactionId },
      data: {
        status: 'success',
        paid_at: now,
        provider_payload: params.providerPayload as Prisma.InputJsonValue,
      },
    });

    await tx.userSubscription.updateMany({
      where: { user_id: params.userId, is_active: true },
      data: { is_active: false, cancelled_at: now, cancel_reason: 'plan_changed' },
    });

    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + params.period);

    const userSubscription = await tx.userSubscription.create({
      data: {
        user_id: params.userId,
        subscription_id: params.subscriptionId,
        started_at: now,
        expires_at: expiresAt,
        is_active: true,
      },
    });

    if (params.paymentMethod) {
      await tx.user.update({
        where: { id: params.userId },
        data: {
          payment_provider: 'yookassa',
          payment_method_id: params.paymentMethod.id,
          payment_mask: params.paymentMethod.mask,
        },
      });
    }

    return userSubscription;
  });
}
