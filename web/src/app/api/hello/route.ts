import { getHelloService } from '@/backend/modules/hello';
import { fail, ok } from '@/backend/shared/http';

export async function GET() {
  try {
    const data = await getHelloService();
    return ok(data);
  } catch (error) {
    console.error('Hello API error:', error);
    return fail('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
}
