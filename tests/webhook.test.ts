import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../app/api/webhook/route';
import { NextRequest } from 'next/server';

describe('Webhook Handshake Route (GET /api/webhook)', () => {
  beforeEach(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'IFET_WHATSAPP_VERIFY_2026';
  });

  it('successfully verifies when mode is subscribe and token matches configured env token', async () => {
    const url =
      'https://example.com/api/webhook?hub.mode=subscribe&hub.verify_token=IFET_WHATSAPP_VERIFY_2026&hub.challenge=123456';
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('123456');
    expect(res.headers.get('content-type')).toContain('text/plain');
  });

  it('uses default IFET_WHATSAPP_VERIFY_2026 when env variable is not set', async () => {
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    const url =
      'https://example.com/api/webhook?hub.mode=subscribe&hub.verify_token=IFET_WHATSAPP_VERIFY_2026&hub.challenge=789012';
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('789012');
  });

  it('rejects with 403 when verify token does not match', async () => {
    const url =
      'https://example.com/api/webhook?hub.mode=subscribe&hub.verify_token=WRONG_TOKEN&hub.challenge=123456';
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('rejects with 403 when mode is not subscribe', async () => {
    const url =
      'https://example.com/api/webhook?hub.mode=unsubscribe&hub.verify_token=IFET_WHATSAPP_VERIFY_2026&hub.challenge=123456';
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
