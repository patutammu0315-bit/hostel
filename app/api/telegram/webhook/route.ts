import { NextRequest, NextResponse } from 'next/server';
import {
  parseTelegramCountMessage,
  formatTelegramSuccessReply,
  TELEGRAM_WELCOME_REPLY,
  TELEGRAM_INVALID_FORMAT_REPLY,
} from '@/lib/telegramParser';
import { sendTelegramMessage } from '@/services/telegramService';
import { getCurrentDateInTimezone } from '@/lib/date';
import {
  getDailyCountByDate,
  saveDailyCount,
  updateDailyCount,
  isMessageAlreadyProcessed,
  recordProcessedMessage,
} from '@/services/hostelService';
import { TelegramUpdate } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/telegram/webhook
 * Health check and diagnostic endpoint for the Telegram webhook.
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const tokenConfigured = Boolean(token);

  return NextResponse.json(
    {
      status: 'Telegram Webhook Endpoint Active',
      tokenConfigured,
      tokenPrefix: tokenConfigured ? `${token?.substring(0, 8)}...` : null,
      endpoint: '/api/telegram/webhook',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

/**
 * POST /api/telegram/webhook
 * Telegram Bot API Webhook receiver.
 * Compatible with Vercel serverless runtime.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Telegram Webhook] Inbound POST request received.');

  try {
    let update: TelegramUpdate;
    try {
      update = await request.json();
    } catch (parseErr) {
      console.warn('[Telegram Webhook] Received invalid JSON payload.');
      return NextResponse.json({ ok: true, status: 'invalid_json' }, { status: 200 });
    }

    const updateId = update?.update_id;
    console.log(`[Telegram Webhook] Update ID: ${updateId}`);

    const message = update?.message || update?.edited_message;
    if (!message) {
      console.log('[Telegram Webhook] No message or edited_message in update; acknowledging.');
      return NextResponse.json({ ok: true, status: 'ignored_non_message' }, { status: 200 });
    }

    // Requirement 2: Extract update.message.text and update.message.chat.id
    const chatId = message.chat?.id;
    const rawText = message.text;

    console.log(`[Telegram Webhook] Extracted -> chatId: ${chatId}, text: "${rawText}"`);

    if (!chatId) {
      console.warn('[Telegram Webhook] Missing chat.id in message.');
      return NextResponse.json({ ok: true, status: 'ignored_no_chat_id' }, { status: 200 });
    }

    // Check duplicate update_id (non-blocking if database is unconfigured)
    const updateKey = `tg_up_${updateId}`;
    try {
      const alreadyProcessed = await isMessageAlreadyProcessed(updateKey);
      if (alreadyProcessed) {
        console.log(`[Telegram Webhook Idempotency] Duplicate update_id ${updateId} already processed.`);
        return NextResponse.json({ ok: true, status: 'duplicate_ignored' }, { status: 200 });
      }
    } catch (dbCheckErr: any) {
      console.warn('[Telegram Webhook Idempotency Warning] Could not check duplicate:', dbCheckErr?.message);
    }

    // Ignore non-text messages (e.g. photos, stickers)
    if (typeof rawText !== 'string' || !rawText.trim()) {
      console.log(`[Telegram Webhook] Ignored non-text message in chat ${chatId}`);
      return NextResponse.json({ ok: true, status: 'ignored_non_text' }, { status: 200 });
    }

    const text = rawText.trim();

    // Requirement 5: For /start, reply with welcome instructions
    if (text === '/start') {
      console.log(`[Telegram Webhook] Handling /start command for chat ${chatId}`);
      const sendResult = await sendTelegramMessage(chatId, TELEGRAM_WELCOME_REPLY);
      console.log(`[Telegram Webhook] /start sendResult:`, sendResult);

      try {
        await recordProcessedMessage(updateKey, String(chatId), 'start');
      } catch (logErr) {
        // Non-blocking
      }

      return NextResponse.json({ ok: true, status: 'start_replied' }, { status: 200 });
    }

    // Requirement 3: Parse message (e.g. 120,8,3 -> Hostel: 120, Students: 8, Rooms: 3)
    const parsed = parseTelegramCountMessage(text);

    // Requirement 6: For invalid messages, reply with invalid format message
    if (!parsed.isValid || !parsed.data) {
      console.log(`[Telegram Webhook] Invalid format received: "${text}" from chat ${chatId}`);
      const sendResult = await sendTelegramMessage(chatId, TELEGRAM_INVALID_FORMAT_REPLY);
      console.log(`[Telegram Webhook] Invalid format sendResult:`, sendResult);

      try {
        await recordProcessedMessage(updateKey, String(chatId), 'invalid_format');
      } catch (logErr) {
        // Non-blocking
      }

      return NextResponse.json({ ok: true, status: 'invalid_format_replied' }, { status: 200 });
    }

    // Valid format: Hostel = 120, Students = 8, Rooms = 3
    const { hostel, students, rooms, total } = parsed.data;
    console.log(
      `[Telegram Webhook] Valid count: Hostel=${hostel}, Students=${students}, Rooms=${rooms}, Total=${total}`
    );

    // Extract sender username or display name
    const from = message.from;
    const senderIdentifier = from?.username
      ? `@${from.username}`
      : [from?.first_name, from?.last_name].filter(Boolean).join(' ') || `Chat_${chatId}`;
    const submittedBy = `Telegram: ${senderIdentifier}`;

    // Store parsed data using existing database / data workflow (safe non-blocking)
    const { isoDate } = getCurrentDateInTimezone();
    try {
      const existingRecord = await getDailyCountByDate(isoDate);

      if (existingRecord) {
        await updateDailyCount(isoDate, {
          students: hostel,
          staff: students,
          others: rooms,
          total,
          submittedBy,
          messageId: updateKey,
        });
        console.log(`[Telegram Webhook] Database updated record for date ${isoDate}`);
      } else {
        await saveDailyCount({
          recordDate: isoDate,
          students: hostel,
          staff: students,
          others: rooms,
          total,
          submittedBy,
          messageId: updateKey,
        });
        console.log(`[Telegram Webhook] Database inserted record for date ${isoDate}`);
      }
    } catch (dbErr: any) {
      console.error('[Telegram Webhook Database Error]', dbErr?.message || dbErr);
    }

    // Requirement 4: Send success reply using Telegram Bot API
    const successReply = formatTelegramSuccessReply(hostel, students, rooms);
    const sendResult = await sendTelegramMessage(chatId, successReply);
    console.log(`[Telegram Webhook] Success reply sendResult:`, sendResult);

    try {
      await recordProcessedMessage(updateKey, String(chatId), 'count_saved');
    } catch (logErr) {
      // Non-blocking
    }

    const durationMs = Date.now() - startTime;
    console.log(`[Telegram Webhook] Finished processing update ${updateId} in ${durationMs}ms`);

    // Requirement 10: Always return HTTP 200 to Telegram
    return NextResponse.json({ ok: true, status: 'count_saved' }, { status: 200 });
  } catch (error: any) {
    // Critical: Never crash webhook or return non-200 to avoid Telegram retry storms
    console.error('[Telegram Webhook Critical Error]', error?.message || error);
    return NextResponse.json({ ok: true, status: 'internal_error_handled' }, { status: 200 });
  }
}
