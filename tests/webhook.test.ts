import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../app/api/webhook/route';
import { NextRequest } from 'next/server';

describe('Webhook Handshake Route (GET /api/webhook)', () => {
  beforeEach(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'secret_webhook_verify_token_123';
  });

  it('successfully verifies when mode is subscribe and token matches', async () => {
    const url = 'https://example.com/api/webhook?hub.mode=subscribe&hub.verify_token=secret_webhook_verify_token_123&hub.challenge=test_challenge_code_987';
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('test_challenge_code_987');
  });

  it('rejects with 403 when verify token does not match', async () => {
    const url = 'https://example.com/api/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge_code_987';
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('rejects with 403 when mode is not subscribe', async () => {
    const url = 'https://example.com/api/webhook?hub.mode=unsubscribe&hub.verify_token=secret_webhook_verify_token_123&hub.challenge=test_challenge_code_987';
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
