import { prisma } from '@/backend/lib/db';

export async function getUserWithActiveSubscription(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { is_active: true },
        include: { subscription: true },
        take: 1,
      },
    },
  });
}
