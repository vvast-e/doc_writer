import { prisma } from '@/backend/lib/db';
import type { HelloData } from './types';

export async function getHelloRepo(): Promise<HelloData> {
  const helloData = await prisma.hello.findFirst();
  return { message: helloData!.message };
}