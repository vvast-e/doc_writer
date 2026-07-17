import { getUserWithActiveSubscription } from './repo';
import type { UserProfile } from './types';

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const user = await getUserWithActiveSubscription(userId);
  if (!user) return null;

  const activeSubscription = user.subscriptions[0];

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    subscription: activeSubscription
      ? {
          subscriptionId: activeSubscription.subscription_id,
          name: activeSubscription.subscription.name,
          maxDevices: activeSubscription.subscription.max_devices,
          expiresAt: activeSubscription.expires_at.toISOString(),
          autoRenew: activeSubscription.auto_renew,
        }
      : null,
  };
}
