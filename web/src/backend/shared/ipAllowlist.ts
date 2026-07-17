// YooKassa doesn't sign webhook payloads — the only server-side guard against a forged
// webhook call is restricting the source IP to YooKassa's documented ranges (in addition to
// re-fetching the payment status from their API before trusting anything in the body).
// https://yookassa.ru/developers/using-api/webhooks#ip
const YOOKASSA_CIDR_RANGES = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11/32',
  '77.75.156.35/32',
  '77.75.154.128/25',
  '2a02:5180::/32',
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    result = (result << 8) + value;
  }
  return result >>> 0;
}

function ipv6ToBigInt(ip: string): bigint | null {
  const [head, tail] = ip.split('::');
  if (tail === undefined && ip.split(':').length !== 8) return null;

  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missing = 8 - headParts.length - tailParts.length;
  if (missing < 0) return null;

  const groups = [...headParts, ...Array(missing).fill('0'), ...tailParts];
  if (groups.length !== 8) return null;

  let result = BigInt(0);
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{0,4}$/.test(group)) return null;
    result = (result << BigInt(16)) | BigInt(parseInt(group || '0', 16));
  }
  return result;
}

function isIpv4InCidr(ip: string, cidr: string, prefix: number): boolean {
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(cidr);
  if (ipInt === null || rangeInt === null) return false;
  if (prefix === 0) return true;
  const mask = prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function isIpv6InCidr(ip: string, cidr: string, prefix: number): boolean {
  const ipBig = ipv6ToBigInt(ip);
  const rangeBig = ipv6ToBigInt(cidr);
  if (ipBig === null || rangeBig === null) return false;
  if (prefix === 0) return true;
  const FULL_MASK = (BigInt(1) << BigInt(128)) - BigInt(1);
  const mask = (FULL_MASK << BigInt(128 - prefix)) & FULL_MASK;
  return (ipBig & mask) === (rangeBig & mask);
}

export function isYooKassaIp(ip: string): boolean {
  const normalizedIp = ip.trim();
  if (!normalizedIp || normalizedIp === 'unknown') return false;

  return YOOKASSA_CIDR_RANGES.some((range) => {
    const [rangeIp, prefixStr] = range.split('/');
    const prefix = Number(prefixStr);
    return rangeIp.includes(':')
      ? isIpv6InCidr(normalizedIp, rangeIp, prefix)
      : isIpv4InCidr(normalizedIp, rangeIp, prefix);
  });
}
