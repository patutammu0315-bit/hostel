/**
 * Basic in-memory rate limiter per WhatsApp sender phone number.
 * Protects against accidental message loops or message flooding.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Maximum 15 messages per 30 seconds per sender
const WINDOW_MS = 30 * 1000;
const MAX_REQUESTS = 15;

export function checkRateLimit(phoneNumber: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  let record = rateLimitMap.get(cleanPhone);
  if (!record) {
    record = { timestamps: [] };
    rateLimitMap.set(cleanPhone, record);
  }

  // Filter out timestamps outside the active sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS) {
    const oldest = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  record.timestamps.push(now);
  return { allowed: true };
}
