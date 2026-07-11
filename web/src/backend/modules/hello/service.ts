import { getHelloRepo } from './repo';
import type { HelloData } from './types';

export async function getHelloService(): Promise<HelloData> {
  return getHelloRepo();
}