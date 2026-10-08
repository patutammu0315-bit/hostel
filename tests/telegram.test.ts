import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseTelegramCountMessage,
  formatTelegramSuccessReply,
  TELEGRAM_INVALID_FORMAT_REPLY,
} from '../lib/telegramParser';
import { GET, POST } from '../app/api/telegram/webhook/route';
import { NextRequest } from 'next/server';

// Mock hostelService
vi.mock('@/services/hostelService', () => ({
  getDailyCountByDate: vi.fn(),
  saveDailyCount: vi.fn(),
  updateDailyCount: vi.fn(),
  isMessageAlreadyProcessed: vi.fn(),
  recordProcessedMessage: vi.fn(),
}));

// Mock telegramService
vi.mock('@/services/telegramService', () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue({ success: true, messageId: 999 }),
  setTelegramWebhook: vi.fn().mockResolvedValue({ success: true }),
  getTelegramWebhookInfo: vi.fn().mockResolvedValue({ success: true, data: {} }),
  getTelegramBotInfo: vi.fn().mockResolvedValue({ success: true, data: { username: 'test_bot' } }),
}));

// Mock date helper
vi.mock('@/lib/date', () => ({
  getCurrentDateInTimezone: vi.fn().mockReturnValue({
    isoDate: '2026-10-08',
    formattedDate: '08 Oct 2026',
    year: 2026,
    month: 10,
    day: 8,
  }),
}));

import * as hostelService from '@/services/hostelService';
import * as telegramService from '@/services/telegramService';

describe('Telegram Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ';
  });

  describe('1. Parsing Telegram Count Messages', () => {
    it('parses "120,8,3" as Hostel: 120, Students: 8, Rooms: 3, Total: 131', () => {
      const res = parseTelegramCountMessage('120,8,3');
      expect(res.isValid).toBe(true);
      expect(res.data).toEqual({
        hostel: 120,
        students: 8,
        rooms: 3,
        total: 131,
      });
    });

    it('parses "120, 8, 3" with spaces correctly', () => {
      const res = parseTelegramCountMessage('120, 8, 3');
      expect(res.isValid).toBe(true);
      expect(res.data).toEqual({
        hostel: 120,
        students: 8,
        rooms: 3,
        total: 131,
      });
    });

    it('parses "120 8 3" with whitespace delimiters correctly', () => {
      const res = parseTelegramCountMessage('120 8 3');
      expect(res.isValid).toBe(true);
      expect(res.data).toEqual({
        hostel: 120,
        students: 8,
        rooms: 3,
        total: 131,
      });
    });

    it('parses zero counts "0,0,0"', () => {
      const res = parseTelegramCountMessage('0,0,0');
      expect(res.isValid).toBe(true);
      expect(res.data).toEqual({
        hostel: 0,
        students: 0,
        rooms: 0,
        total: 0,
      });
    });

    it('rejects incomplete inputs (e.g. "120,8")', () => {
      const res = parseTelegramCountMessage('120,8');
      expect(res.isValid).toBe(false);
    });

    it('rejects extra tokens (e.g. "120,8,3,4")', () => {
      const res = parseTelegramCountMessage('120,8,3,4');
      expect(res.isValid).toBe(false);
    });

    it('rejects negative numbers (e.g. "-120,8,3")', () => {
      const res = parseTelegramCountMessage('-120,8,3');
      expect(res.isValid).toBe(false);
    });

    it('rejects alphabetic characters (e.g. "abc,8,3")', () => {
      const res = parseTelegramCountMessage('abc,8,3');
      expect(res.isValid).toBe(false);
    });

    it('rejects empty string and null', () => {
      expect(parseTelegramCountMessage('').isValid).toBe(false);
      expect(parseTelegramCountMessage(null).isValid).toBe(false);
      expect(parseTelegramCountMessage(undefined).isValid).toBe(false);
    });
  });

  describe('2. Response Formats', () => {
    it('formats success reply exactly matching specification', () => {
      const reply = formatTelegramSuccessReply(120, 8, 3);
      expect(reply).toBe(
        '✅ Data received successfully!\n\nHostel: 120\nStudents: 8\nRooms: 3'
      );
    });

    it('matches invalid format reply specification', () => {
      expect(TELEGRAM_INVALID_FORMAT_REPLY).toBe(
        '❌ Invalid format.\n\nPlease send data like:\n\n120,8,3'
      );
    });
  });

  describe('3. Webhook Route Execution', () => {
    it('GET /api/telegram/webhook returns 200 with status', async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('Telegram Webhook Endpoint Active');
      expect(json.tokenConfigured).toBe(true);
    });

    it('handles /start message and replies with instructions', async () => {
      vi.mocked(hostelService.isMessageAlreadyProcessed).mockResolvedValue(false);

      const payload = {
        update_id: 10001,
        message: {
          message_id: 1,
          chat: { id: 12345 },
          from: { id: 12345, username: 'tester' },
          text: '/start',
          date: 1728388307,
        },
      };

      const req = new NextRequest('https://example.com/api/telegram/webhook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('start_replied');
      expect(telegramService.sendTelegramMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('120,8,3')
      );
    });

    it('processes valid count 120,8,3 and saves to database and replies', async () => {
      vi.mocked(hostelService.isMessageAlreadyProcessed).mockResolvedValue(false);
      vi.mocked(hostelService.getDailyCountByDate).mockResolvedValue(null);

      const payload = {
        update_id: 10002,
        message: {
          message_id: 2,
          chat: { id: 98765 },
          from: { id: 98765, username: 'manager_rajesh' },
          text: '120,8,3',
          date: 1728388308,
        },
      };

      const req = new NextRequest('https://example.com/api/telegram/webhook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('count_saved');

      expect(hostelService.saveDailyCount).toHaveBeenCalledWith({
        recordDate: '2026-10-08',
        students: 120,
        staff: 8,
        others: 3,
        total: 131,
        submittedBy: 'Telegram: @manager_rajesh',
        messageId: 'tg_up_10002',
      });

      expect(telegramService.sendTelegramMessage).toHaveBeenCalledWith(
        98765,
        '✅ Data received successfully!\n\nHostel: 120\nStudents: 8\nRooms: 3'
      );
    });

    it('updates existing record when a record already exists for today', async () => {
      vi.mocked(hostelService.isMessageAlreadyProcessed).mockResolvedValue(false);
      vi.mocked(hostelService.getDailyCountByDate).mockResolvedValue({
        id: 'existing-id',
        record_date: '2026-10-08',
        students: 100,
        staff: 5,
        others: 2,
        total: 107,
        submitted_by: 'Telegram: @old',
        message_id: 'old_msg',
        created_at: '',
        updated_at: '',
      });

      const payload = {
        update_id: 10003,
        message: {
          message_id: 3,
          chat: { id: 98765 },
          from: { id: 98765, first_name: 'Rajesh' },
          text: '120,8,3',
          date: 1728388309,
        },
      };

      const req = new NextRequest('https://example.com/api/telegram/webhook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(hostelService.updateDailyCount).toHaveBeenCalledWith('2026-10-08', {
        students: 120,
        staff: 8,
        others: 3,
        total: 131,
        submittedBy: 'Telegram: Rajesh',
        messageId: 'tg_up_10003',
      });

      expect(telegramService.sendTelegramMessage).toHaveBeenCalledWith(
        98765,
        '✅ Data received successfully!\n\nHostel: 120\nStudents: 8\nRooms: 3'
      );
    });

    it('replies with invalid format message when user sends invalid data', async () => {
      vi.mocked(hostelService.isMessageAlreadyProcessed).mockResolvedValue(false);

      const payload = {
        update_id: 10004,
        message: {
          message_id: 4,
          chat: { id: 11111 },
          from: { id: 11111, username: 'user1' },
          text: 'invalid data here',
          date: 1728388310,
        },
      };

      const req = new NextRequest('https://example.com/api/telegram/webhook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('invalid_format_replied');

      expect(telegramService.sendTelegramMessage).toHaveBeenCalledWith(
        11111,
        TELEGRAM_INVALID_FORMAT_REPLY
      );
    });

    it('ignores duplicate updates when Telegram retries the same update_id', async () => {
      vi.mocked(hostelService.isMessageAlreadyProcessed).mockResolvedValue(true);

      const payload = {
        update_id: 10005,
        message: {
          message_id: 5,
          chat: { id: 11111 },
          text: '120,8,3',
          date: 1728388311,
        },
      };

      const req = new NextRequest('https://example.com/api/telegram/webhook', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('duplicate_ignored');

      expect(hostelService.saveDailyCount).not.toHaveBeenCalled();
      expect(telegramService.sendTelegramMessage).not.toHaveBeenCalled();
    });
  });
});
