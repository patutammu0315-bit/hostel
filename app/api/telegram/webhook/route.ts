import { NextRequest, NextResponse } from 'next/server';
import {
  parseTelegramCountMessage,
  formatTelegramSuccessReply,
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
  const hasToken = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  return NextResponse.json(
    {
      status: 'Telegram Webhook Endpoint Active',
      tokenConfigured: hasToken,
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
  try {
    let update: TelegramUpdate;
    try {
      update = await request.json();
    } catch (parseErr) {
      console.warn('[Telegram Webhook] Received invalid JSON payload.');
      return NextResponse.json({ ok: true, status: 'invalid_json' }, { status: 200 });
    }

    const updateId = update?.update_id;
    if (typeof updateId !== 'number') {
      console.warn('[Telegram Webhook] Payload missing update_id.');
      return NextResponse.json({ ok: true, status: 'ignored_missing_update_id' }, { status: 200 });
    }

    const message = update.message || update.edited_message;
    if (!message) {
      // Non-message event (e.g. channel_post, inline_query) -> acknowledge and ignore
      return NextResponse.json({ ok: true, status: 'ignored_non_message' }, { status: 200 });
    }

    const chatId = message.chat?.id;
    if (!chatId) {
      console.warn(`[Telegram Webhook] Message has no chat_id in update_id ${updateId}`);
      return NextResponse.json({ ok: true, status: 'ignored_no_chat_id' }, { status: 200 });
    }

    // Idempotency check: prevent duplicate processing if Telegram retries the same update
    const updateKey = `tg_up_${updateId}`;
    const alreadyProcessed = await isMessageAlreadyProcessed(updateKey);
    if (alreadyProcessed) {
      console.log(`[Telegram Webhook Idempotency] Duplicate update_id ${updateId} already processed.`);
      return NextResponse.json({ ok: true, status: 'duplicate_ignored' }, { status: 200 });
    }

    // Extract message sender info
    const from = message.from;
    const senderIdentifier = from?.username
      ? `@${from.username}`
      : [from?.first_name, from?.last_name].filter(Boolean).join(' ') || `Chat_${chatId}`;
    const submittedBy = `Telegram: ${senderIdentifier}`;

    const text = message.text?.trim();

    // Ignore non-text messages (stickers, photos, voice, etc.)
    if (!text) {
      console.log(`[Telegram Webhook] Ignored non-text message from ${senderIdentifier} (${chatId})`);
      await recordProcessedMessage(updateKey, String(chatId), 'non_text');
      return NextResponse.json({ ok: true, status: 'ignored_non_text' }, { status: 200 });
    }

    console.log(`[Telegram Webhook] Inbound message from ${senderIdentifier} (${chatId}): "${text}"`);

    // Handle /start command
    if (text === '/start') {
      await sendTelegramMessage(
        chatId,
        `👋 Welcome to Hostel Daily Count Bot!\n\nPlease send data like:\n\n120,8,3`
      );
      await recordProcessedMessage(updateKey, String(chatId), 'start');
      return NextResponse.json({ ok: true, status: 'start_replied' }, { status: 200 });
    }

    // Parse count message (e.g. "120,8,3")
    const parsed = parseTelegramCountMessage(text);

    // 1. Invalid format handling
    if (!parsed.isValid || !parsed.data) {
      console.log(`[Telegram Webhook] Invalid format from ${senderIdentifier}: "${text}"`);
      await sendTelegramMessage(chatId, TELEGRAM_INVALID_FORMAT_REPLY);
      await recordProcessedMessage(updateKey, String(chatId), 'invalid_format');
      return NextResponse.json({ ok: true, status: 'invalid_format_replied' }, { status: 200 });
    }

    // 2. Valid format handling
    // Hostel = 120, Students = 8, Rooms = 3
    const { hostel, students, rooms, total } = parsed.data;
    const { isoDate } = getCurrentDateInTimezone();

    console.log(
      `[Telegram Webhook] Valid count from ${senderIdentifier}: Hostel=${hostel}, Students=${students}, Rooms=${rooms}, Total=${total} for date ${isoDate}`
    );

    // Store parsed data using existing database / data workflow
    try {
      const existingRecord = await getDailyCountByDate(isoDate);

      if (existingRecord) {
        // Update existing record for today
        await updateDailyCount(isoDate, {
          students: hostel,
          staff: students,
          others: rooms,
          total,
          submittedBy,
          messageId: updateKey,
        });
        console.log(`[Telegram Webhook] Updated existing record for date ${isoDate}`);
      } else {
        // Insert new record for today
        await saveDailyCount({
          recordDate: isoDate,
          students: hostel,
          staff: students,
          others: rooms,
          total,
          submittedBy,
          messageId: updateKey,
        });
        console.log(`[Telegram Webhook] Inserted new record for date ${isoDate}`);
      }
    } catch (dbErr: any) {
      console.error('[Telegram Webhook Database Error]', dbErr?.message || dbErr);
      await sendTelegramMessage(
        chatId,
        `⚠️ Unable to save today's count right now.\n\nPlease try again.`
      );
      // Return 200 so Telegram doesn't retry looping on db exceptions
      return NextResponse.json({ ok: true, status: 'db_error_handled' }, { status: 200 });
    }

    // 3. Automatically reply through Telegram
    const successReply = formatTelegramSuccessReply(hostel, students, rooms);
    await sendTelegramMessage(chatId, successReply);

    // Record processed message for idempotency
    await recordProcessedMessage(updateKey, String(chatId), 'count_saved');

    return NextResponse.json({ ok: true, status: 'count_saved' }, { status: 200 });
  } catch (error: any) {
    // Critical: Never crash serverless webhook or leak secrets
    console.error('[Telegram Webhook Critical Error]', error?.message || error);
    return NextResponse.json({ ok: true, status: 'internal_error_handled' }, { status: 200 });
  }
}
