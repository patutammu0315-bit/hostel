import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCountMessage, INVALID_FORMAT_REPLY } from '../lib/parser';
import {
  normalizePhoneNumber,
  isPhoneNumberAuthorized,
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
} from '../lib/whatsapp';
import {
  getCurrentDateInTimezone,
  getYesterdayDateInTimezone,
  formatIsoToDisplay,
} from '../lib/date';
import { checkRateLimit } from '../lib/ratelimit';
import { sendWhatsAppMessage } from '../services/whatsappService';

describe('Hostel Daily Count Complete System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTHORIZED_WHATSAPP_NUMBERS = '919876543210,919876543211';
    process.env.APP_TIMEZONE = 'Asia/Kolkata';
  });

  describe('1. Parsing Valid Counts', () => {
    it('120,8,3 calculates total 131', () => {
      const res = parseCountMessage('120,8,3');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({ students: 120, staff: 8, others: 3, total: 131 });
    });

    it('120, 8, 3 calculates total 131', () => {
      const res = parseCountMessage('120, 8, 3');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({ students: 120, staff: 8, others: 3, total: 131 });
    });

    it('120 8 3 calculates total 131', () => {
      const res = parseCountMessage('120 8 3');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({ students: 120, staff: 8, others: 3, total: 131 });
    });

    it('0,0,0 calculates total 0', () => {
      const res = parseCountMessage('0,0,0');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({ students: 0, staff: 0, others: 0, total: 0 });
    });

    it('100,5,2 calculates total 107', () => {
      const res = parseCountMessage('100,5,2');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({ students: 100, staff: 5, others: 2, total: 107 });
    });
  });

  describe('2. Parsing Invalid Counts', () => {
    it('rejects "120"', () => {
      const res = parseCountMessage('120');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects "120,8"', () => {
      const res = parseCountMessage('120,8');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects "120,8,3,4"', () => {
      const res = parseCountMessage('120,8,3,4');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects "abc,8,3"', () => {
      const res = parseCountMessage('abc,8,3');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects "100,-5,2"', () => {
      const res = parseCountMessage('100,-5,2');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects "100.5,8,3"', () => {
      const res = parseCountMessage('100.5,8,3');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects empty message', () => {
      const res = parseCountMessage('');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });
  });

  describe('3. Command Parsing', () => {
    it('recognizes "today"', () => {
      expect(parseCountMessage('today').command).toBe('today');
    });

    it('recognizes "yesterday"', () => {
      expect(parseCountMessage('yesterday').command).toBe('yesterday');
    });

    it('recognizes "month"', () => {
      expect(parseCountMessage('month').command).toBe('month');
    });

    it('recognizes "help"', () => {
      expect(parseCountMessage('help').command).toBe('help');
    });

    it('recognizes "update"', () => {
      expect(parseCountMessage('update').command).toBe('update');
    });
  });

  describe('4. Phone Authorization and Normalization', () => {
    it('normalizes formatted phone numbers', () => {
      expect(normalizePhoneNumber('+91 98765-43210')).toBe('919876543210');
      expect(normalizePhoneNumber('91-98765-43211')).toBe('919876543211');
    });

    it('authorizes listed phone numbers', () => {
      expect(isPhoneNumberAuthorized('919876543210')).toBe(true);
      expect(isPhoneNumberAuthorized('+91 98765-43211')).toBe(true);
    });

    it('rejects unlisted phone numbers', () => {
      expect(isPhoneNumberAuthorized('919999999999')).toBe(false);
      expect(isPhoneNumberAuthorized('')).toBe(false);
    });

    it('rejects all if AUTHORIZED_WHATSAPP_NUMBERS is not configured', () => {
      delete process.env.AUTHORIZED_WHATSAPP_NUMBERS;
      expect(isPhoneNumberAuthorized('919876543210')).toBe(false);
    });
  });

  describe('5. WhatsApp Message Formatting', () => {
    it('formats successful saved count reply according to Section 6', () => {
      const text = formatSavedCountReply('08-10-2026', 120, 8, 3, 131);
      expect(text).toContain('🏨 HOSTEL DAILY COUNT');
      expect(text).toContain('📅 08-10-2026');
      expect(text).toContain('👨🎓 Students: 120');
      expect(text).toContain('👨🏫 Staff: 8');
      expect(text).toContain('👤 Others: 3');
      expect(text).toContain('📊 Total: 131');
      expect(text).toContain('✅ Saved');
    });

    it('formats today count reply according to Section 7', () => {
      const text = formatTodayCountReply('08-10-2026', 120, 8, 3, 131);
      expect(text).toContain("🏨 TODAY'S HOSTEL COUNT");
      expect(text).toContain('📅 Date: 08-10-2026');
      expect(text).toContain('📊 Total: 131');
    });

    it('formats yesterday count reply', () => {
      const text = formatYesterdayCountReply('07-10-2026', 115, 8, 2, 125);
      expect(text).toContain("🏨 YESTERDAY'S HOSTEL COUNT");
      expect(text).toContain('📅 Date: 07-10-2026');
      expect(text).toContain('📊 Total: 125');
    });

    it('formats monthly summary according to Section 7', () => {
      const text = formatMonthlySummaryReply('October', 2026, 24, 2880, 192, 72);
      expect(text).toContain('📊 HOSTEL MONTHLY SUMMARY');
      expect(text).toContain('October 2026');
      expect(text).toContain('Days Recorded: 24');
      expect(text).toContain('Student Count Total: 2880');
      expect(text).toContain('Staff Count Total: 192');
      expect(text).toContain('Others Count Total: 72');
    });

    it('formats help reply according to Section 7', () => {
      const text = formatHelpReply();
      expect(text).toContain('🏨 HOSTEL DAILY COUNT BOT');
      expect(text).toContain('120,8,3');
      expect(text).toContain('today');
      expect(text).toContain('yesterday');
      expect(text).toContain('month');
      expect(text).toContain('help');
    });

    it('formats existing count duplicate warning according to Section 10', () => {
      const text = formatExistingCountWarning({ students: 120, staff: 8, others: 3, total: 131 });
      expect(text).toContain("⚠️ Today's hostel count already exists.");
      expect(text).toContain('👨🎓 Students: 120');
      expect(text).toContain('To update today\'s count, reply:\n\nUPDATE');
    });
  });

  describe('6. Rate Limiting Protection', () => {
    it('allows requests within limit and throttles excess', () => {
      const phone = '919876543999';
      for (let i = 0; i < 15; i++) {
        expect(checkRateLimit(phone).allowed).toBe(true);
      }
      const throttled = checkRateLimit(phone);
      expect(throttled.allowed).toBe(false);
      expect(throttled.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('7. Date & Timezone Utilities', () => {
    it('produces valid dates in Asia/Kolkata', () => {
      const cur = getCurrentDateInTimezone('Asia/Kolkata');
      expect(cur.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(cur.formattedDate).toMatch(/^\d{2}-\d{2}-\d{4}$/);

      const yest = getYesterdayDateInTimezone('Asia/Kolkata');
      expect(yest.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(yest.formattedDate).toMatch(/^\d{2}-\d{2}-\d{4}$/);
    });

    it('formats ISO to display DD-MM-YYYY', () => {
      expect(formatIsoToDisplay('2026-10-08')).toBe('08-10-2026');
    });
  });

  describe('8. WhatsApp Service Error Handling', () => {
    it('gracefully handles missing credentials without crashing or exposing tokens', async () => {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;

      const res = await sendWhatsAppMessage('919876543210', 'Test message');
      expect(res.success).toBe(false);
      expect(res.error).toContain('missing');
    });

    it('gracefully handles invalid recipient phone numbers', async () => {
      process.env.WHATSAPP_ACCESS_TOKEN = 'mock_token';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'mock_phone_id';

      const res = await sendWhatsAppMessage('', 'Test message');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid recipient');
    });
  });
});
