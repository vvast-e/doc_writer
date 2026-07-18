import type { NextRequest } from 'next/server';
import { prisma } from '@/backend/lib/db';

export interface DeviceAuthContext {
  deviceId: string;
  userId: string;
}

// Скелет под device-token авторизацию. Полная логика (revocation, last_seen_at,
// rate limiting и т.п.) реализуется в Phase 3.
export async function authenticateDevice(
  request: NextRequest,
): Promise<DeviceAuthContext | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;

  const device = await prisma.device.findUnique({ where: { key: token } });
  if (!device || !device.is_active) return null;

  prisma.device
    .update({ where: { id: device.id }, data: { last_seen_at: new Date() } })
    .catch((error) => console.error('Failed to update device last_seen_at:', error));

  return { deviceId: device.id, userId: device.user_id };
}
