import { NextRequest, NextResponse } from 'next/server';
import {
  setTelegramWebhook,
  getTelegramWebhookInfo,
  getTelegramBotInfo,
} from '@/services/telegramService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_WEBHOOK_URL = 'https://new-folder-17-orpin.vercel.app/api/telegram/webhook';

/**
 * GET /api/telegram/setup
 *
 * Query options:
 * - ?action=set : Registers webhook with Telegram (using production URL or provided ?url=...)
 * - ?action=info (default) : Checks current bot info and webhook status
 */
export async function GET(request: NextRequest) {
  const searchParams =
    request.nextUrl?.searchParams || new URL(request.url).searchParams;
  const action = searchParams.get('action') || 'info';
  const customUrl = searchParams.get('url') || DEFAULT_WEBHOOK_URL;

  const tokenConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  if (!tokenConfigured) {
    return NextResponse.json(
      {
        ok: false,
        error: 'TELEGRAM_BOT_TOKEN environment variable is not configured.',
        instruction: 'Add TELEGRAM_BOT_TOKEN to your Vercel Project Settings > Environment Variables.',
      },
      { status: 500 }
    );
  }

  if (action === 'set') {
    const setResult = await setTelegramWebhook(customUrl);
    const webhookInfo = await getTelegramWebhookInfo();
    return NextResponse.json({
      ok: setResult.success,
      action: 'setWebhook',
      registeredUrl: customUrl,
      result: setResult.result || setResult.error,
      currentWebhookInfo: webhookInfo.data || webhookInfo.error,
    });
  }

  // Default: Return current bot info and webhook status
  const botInfo = await getTelegramBotInfo();
  const webhookInfo = await getTelegramWebhookInfo();

  return NextResponse.json({
    ok: true,
    tokenConfigured: true,
    bot: botInfo.data || { error: botInfo.error },
    webhook: webhookInfo.data || { error: webhookInfo.error },
    helper: {
      toRegisterWebhook: `/api/telegram/setup?action=set`,
      webhookEndpoint: DEFAULT_WEBHOOK_URL,
    },
  });
}

/**
 * POST /api/telegram/setup
 * Programmatic endpoint to set the webhook URL.
 */
export async function POST(request: NextRequest) {
  let webhookUrl = DEFAULT_WEBHOOK_URL;
  try {
    const body = await request.json().catch(() => null);
    if (body?.url) {
      webhookUrl = body.url;
    }
  } catch {
    // Fall back to default
  }

  const result = await setTelegramWebhook(webhookUrl);
  return NextResponse.json({
    ok: result.success,
    webhookUrl,
    result: result.result || result.error,
  });
}
