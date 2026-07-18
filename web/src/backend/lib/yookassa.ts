import crypto from 'node:crypto';

const DEFAULT_API_URL = 'https://api.yookassa.ru/v3';

function getApiUrl(): string {
  return process.env.YOOKASSA_API_URL ?? DEFAULT_API_URL;
}

function getAuthHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secretKey) throw new Error('YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY are not set');
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`;
}

export interface YooKassaPayment {
  id: string;
  status: string;
  paid: boolean;
  confirmation_url: string | null;
  payment_method?: { id: string; saved: boolean; title?: string; card?: { last4: string } };
}

export async function createYooKassaPayment(params: {
  amount: string;
  currency: string;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
  idempotenceKey: string;
}): Promise<YooKassaPayment> {
  const response = await fetch(`${getApiUrl()}/payments`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': params.idempotenceKey,
    },
    body: JSON.stringify({
      amount: { value: params.amount, currency: params.currency },
      capture: true,
      confirmation: { type: 'redirect', return_url: params.returnUrl },
      description: params.description,
      metadata: params.metadata,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`YooKassa create payment failed: ${response.status} ${text}`);
  }

  const payment = (await response.json()) as {
    id: string;
    status: string;
    paid: boolean;
    confirmation?: { confirmation_url?: string };
    payment_method?: YooKassaPayment['payment_method'];
  };

  return {
    id: payment.id,
    status: payment.status,
    paid: payment.paid,
    confirmation_url: payment.confirmation?.confirmation_url ?? null,
    payment_method: payment.payment_method,
  };
}

export async function getYooKassaPayment(paymentId: string): Promise<YooKassaPayment> {
  const response = await fetch(`${getApiUrl()}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: getAuthHeader() },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`YooKassa get payment failed: ${response.status} ${text}`);
  }

  const payment = (await response.json()) as {
    id: string;
    status: string;
    paid: boolean;
    confirmation?: { confirmation_url?: string };
    payment_method?: YooKassaPayment['payment_method'];
  };

  return {
    id: payment.id,
    status: payment.status,
    paid: payment.paid,
    confirmation_url: payment.confirmation?.confirmation_url ?? null,
    payment_method: payment.payment_method,
  };
}

export function generateIdempotenceKey(): string {
  return crypto.randomUUID();
}
