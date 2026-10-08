import { NextRequest, NextResponse } from 'next/server';
import { parseCountMessage } from '@/lib/parser';
import {
  getCurrentDateInTimezone,
  getYesterdayDateInTimezone,
  formatIsoToDisplay,
} from '@/lib/date';
import { sendWhatsAppMessage } from '@/services/whatsappService';
import {
  getDailyCountByDate,
  saveDailyCount,
  updateDailyCount,
  getMonthlySummary,
  isMessageAlreadyProcessed,
  recordProcessedMessage,
  savePendingUpdate,
  getPendingUpdate,
  clearPendingUpdate,
} from '@/services/hostelService';
import {
  isPhoneNumberAuthorized,
  normalizePhoneNumber,
  formatSavedCountReply,
  formatTodayCountReply,
  formatYesterdayCountReply,
  formatMonthlySummaryReply,
  formatHelpReply,
  formatExistingCountWarning,
  UNAUTHORIZED_REPLY,
  DATABASE_ERROR_REPLY,
  NO_TODAY_RECORD_REPLY,
  NO_YESTERDAY_RECORD_REPLY,
  UPDATE_SUCCESS_REPLY,
  NO_PENDING_UPDATE_REPLY,
} from '@/lib/whatsapp';
import { checkRateLimit } from '@/lib/ratelimit';
import { MetaWebhookPayload } from '@/types';

/**
 * GET /api/webhook
 * Used by Meta WhatsApp Cloud API to verify webhook subscription.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  // Safe technical log without exposing token
  console.log(`[Webhook Verification] Mode: ${mode}, Token provided: ${Boolean(token)}`);

  if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
    console.log('[Webhook Verification] Successful subscription handshake.');
    return new NextResponse(challenge || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[Webhook Verification Failed] Token mismatch or invalid mode.');
  return new NextResponse('Verification failed: Forbidden', { status: 403 });
}

/**
 * POST /api/webhook
 * Main Meta WhatsApp Cloud API incoming message dispatcher.
 */
export async function POST(request: NextRequest) {
  try {
    let body: MetaWebhookPayload;
    try {
      body = await request.json();
    } catch {
      console.warn('[Webhook] Malformed JSON received.');
      return NextResponse.json({ status: 'invalid_json' }, { status: 200 });
    }

    // Quick verification of Meta payload structure
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) {
      return NextResponse.json({ status: 'ignored_non_event' }, { status: 200 });
    }

    // Check if this is a delivery status receipt (sent, delivered, read) -> safely ignore
    if (value.statuses && (!value.messages || value.messages.length === 0)) {
      return NextResponse.json({ status: 'status_receipt_acknowledged' }, { status: 200 });
    }

    const message = value.messages?.[0];
    if (!message) {
      return NextResponse.json({ status: 'no_message_found' }, { status: 200 });
    }

    const senderRaw = message.from;
    const messageId = message.id;
    const messageType = message.type;
    const sender = normalizePhoneNumber(senderRaw);

    console.log(`[Webhook] Inbound event from: ${sender}, type: ${messageType}, id: ${messageId}`);

    // Check rate limit per sender
    const rateCheck = checkRateLimit(sender);
    if (!rateCheck.allowed) {
      console.warn(`[Webhook Rate Limit] Flooding detected for sender ${sender}.`);
      return NextResponse.json({ status: 'rate_limited' }, { status: 200 });
    }

    // Ignore non-text messages
    if (messageType !== 'text' || !message.text?.body) {
      console.log(`[Webhook] Ignored non-text message type: ${messageType}`);
      return NextResponse.json({ status: 'ignored_non_text' }, { status: 200 });
    }

    const messageText = message.text.body;

    // Authorization verification
    const authorized = isPhoneNumberAuthorized(sender);
    if (!authorized) {
      console.warn(`[Webhook Authorization] Unauthorized access attempt by ${sender}`);
      // Send unauthorized rejection message
      await sendWhatsAppMessage(sender, UNAUTHORIZED_REPLY);
      return NextResponse.json({ status: 'unauthorized_handled' }, { status: 200 });
    }

    // Idempotency check: prevent duplicate processing of the same message_id
    if (messageId) {
      const alreadyProcessed = await isMessageAlreadyProcessed(messageId);
      if (alreadyProcessed) {
        console.log(`[Webhook Idempotency] Duplicate message_id ${messageId} already processed.`);
        return NextResponse.json({ status: 'duplicate_ignored' }, { status: 200 });
      }
    }

    // Parse input
    const parseResult = parseCountMessage(messageText);

    // 1. Invalid Input handling
    if (parseResult.type === 'invalid') {
      console.log(`[Webhook] Invalid format received from ${sender}: "${messageText}"`);
      await sendWhatsAppMessage(sender, parseResult.error || '❌ Invalid format.');
      await recordProcessedMessage(messageId, sender, 'invalid');
      return NextResponse.json({ status: 'invalid_format_replied' }, { status: 200 });
    }

    // 2. Command handling
    if (parseResult.type === 'command' && parseResult.command) {
      const cmd = parseResult.command;
      console.log(`[Webhook] Command "${cmd}" received from ${sender}`);

      if (cmd === 'help') {
        await sendWhatsAppMessage(sender, formatHelpReply());
        await recordProcessedMessage(messageId, sender, 'help');
        return NextResponse.json({ status: 'help_dispatched' }, { status: 200 });
      }

      if (cmd === 'today') {
        const { isoDate, formattedDate } = getCurrentDateInTimezone();
        const record = await getDailyCountByDate(isoDate);

        if (!record) {
          await sendWhatsAppMessage(sender, NO_TODAY_RECORD_REPLY);
        } else {
          const reply = formatTodayCountReply(
            formattedDate,
            record.students,
            record.staff,
            record.others,
            record.total
          );
          await sendWhatsAppMessage(sender, reply);
        }
        await recordProcessedMessage(messageId, sender, 'today');
        return NextResponse.json({ status: 'today_dispatched' }, { status: 200 });
      }

      if (cmd === 'yesterday') {
        const { isoDate, formattedDate } = getYesterdayDateInTimezone();
        const record = await getDailyCountByDate(isoDate);

        if (!record) {
          await sendWhatsAppMessage(sender, NO_YESTERDAY_RECORD_REPLY);
        } else {
          const reply = formatYesterdayCountReply(
            formattedDate,
            record.students,
            record.staff,
            record.others,
            record.total
          );
          await sendWhatsAppMessage(sender, reply);
        }
        await recordProcessedMessage(messageId, sender, 'yesterday');
        return NextResponse.json({ status: 'yesterday_dispatched' }, { status: 200 });
      }

      if (cmd === 'month') {
        const { year, month } = getCurrentDateInTimezone();
        const summary = await getMonthlySummary(year, month);
        const reply = formatMonthlySummaryReply(
          summary.monthName,
          summary.year,
          summary.daysRecorded,
          summary.totalStudents,
          summary.totalStaff,
          summary.totalOthers
        );
        await sendWhatsAppMessage(sender, reply);
        await recordProcessedMessage(messageId, sender, 'month');
        return NextResponse.json({ status: 'month_dispatched' }, { status: 200 });
      }

      if (cmd === 'update') {
        const pending = await getPendingUpdate(sender);
        if (!pending) {
          await sendWhatsAppMessage(sender, NO_PENDING_UPDATE_REPLY);
        } else {
          try {
            await updateDailyCount(pending.record_date, {
              students: pending.students,
              staff: pending.staff,
              others: pending.others,
              total: pending.total,
              submittedBy: sender,
              messageId,
            });
            await clearPendingUpdate(sender);
            await sendWhatsAppMessage(sender, UPDATE_SUCCESS_REPLY);
          } catch (dbErr: any) {
            console.error('[Webhook Error] Failed to execute pending update:', dbErr?.message);
            await sendWhatsAppMessage(sender, DATABASE_ERROR_REPLY);
          }
        }
        await recordProcessedMessage(messageId, sender, 'update');
        return NextResponse.json({ status: 'update_command_handled' }, { status: 200 });
      }
    }

    // 3. Count submission handling
    if (parseResult.type === 'count' && parseResult.data) {
      const { students, staff, others, total } = parseResult.data;
      const { isoDate, formattedDate } = getCurrentDateInTimezone();

      // Check if count already exists for today
      let existingRecord = null;
      try {
        existingRecord = await getDailyCountByDate(isoDate);
      } catch (dbErr: any) {
        console.error('[Webhook Error] Failed to check existing record:', dbErr?.message);
        await sendWhatsAppMessage(sender, DATABASE_ERROR_REPLY);
        return NextResponse.json({ status: 'db_error' }, { status: 200 });
      }

      if (existingRecord) {
        // Daily duplicate handling: Save to pending updates and prompt for confirmation
        console.log(`[Webhook] Duplicate count detected for ${isoDate}. Sending update prompt to ${sender}`);
        await savePendingUpdate({
          phone_number: sender,
          record_date: isoDate,
          students,
          staff,
          others,
          total,
          message_id: messageId,
        });

        const warningReply = formatExistingCountWarning(existingRecord);
        await sendWhatsAppMessage(sender, warningReply);
        await recordProcessedMessage(messageId, sender, 'count_duplicate_prompt');
        return NextResponse.json({ status: 'duplicate_prompted' }, { status: 200 });
      }

      // Record does not exist: Save to database
      try {
        await saveDailyCount({
          recordDate: isoDate,
          students,
          staff,
          others,
          total,
          submittedBy: sender,
          messageId,
        });

        console.log(`[Webhook] Daily record successfully saved for ${isoDate} by ${sender}. Total: ${total}`);

        // Reply to manager
        const successReply = formatSavedCountReply(formattedDate, students, staff, others, total);
        await sendWhatsAppMessage(sender, successReply);

        return NextResponse.json({ status: 'count_saved' }, { status: 200 });
      } catch (saveErr: any) {
        console.error(`[Webhook Error] Save failed for ${isoDate}:`, saveErr?.message);
        await sendWhatsAppMessage(sender, DATABASE_ERROR_REPLY);
        return NextResponse.json({ status: 'save_failed' }, { status: 200 });
      }
    }

    return NextResponse.json({ status: 'unhandled_path' }, { status: 200 });
  } catch (globalErr: any) {
    // Critical: Never crash webhook endpoint or expose secrets
    console.error('[Webhook Critical Error]', globalErr?.message || globalErr);
    return NextResponse.json({ status: 'internal_error_handled' }, { status: 200 });
  }
}
