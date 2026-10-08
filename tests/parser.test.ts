import { describe, it, expect } from 'vitest';
import { parseCountMessage, INVALID_FORMAT_REPLY } from '../lib/parser';

describe('Hostel Daily Count Parser', () => {
  describe('Valid inputs', () => {
    it('parses standard comma-separated "120,8,3"', () => {
      const res = parseCountMessage('120,8,3');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({
        students: 120,
        staff: 8,
        others: 3,
        total: 131,
      });
    });

    it('parses space-after-comma "120, 8, 3"', () => {
      const res = parseCountMessage('120, 8, 3');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({
        students: 120,
        staff: 8,
        others: 3,
        total: 131,
      });
    });

    it('parses whitespace-separated "120 8 3"', () => {
      const res = parseCountMessage('120 8 3');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({
        students: 120,
        staff: 8,
        others: 3,
        total: 131,
      });
    });

    it('handles zero counts "0,0,0"', () => {
      const res = parseCountMessage('0,0,0');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({
        students: 0,
        staff: 0,
        others: 0,
        total: 0,
      });
    });

    it('handles "100,5,2"', () => {
      const res = parseCountMessage('100,5,2');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({
        students: 100,
        staff: 5,
        others: 2,
        total: 107,
      });
    });

    it('handles leading and trailing whitespace "   150, 10, 5   "', () => {
      const res = parseCountMessage('   150, 10, 5   ');
      expect(res.type).toBe('count');
      expect(res.data).toEqual({
        students: 150,
        staff: 10,
        others: 5,
        total: 165,
      });
    });
  });

  describe('Invalid inputs', () => {
    it('rejects single number "120"', () => {
      const res = parseCountMessage('120');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects two numbers "120,8"', () => {
      const res = parseCountMessage('120,8');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects four numbers "120,8,3,5"', () => {
      const res = parseCountMessage('120,8,3,5');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects letters "abc,8,3"', () => {
      const res = parseCountMessage('abc,8,3');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects letters in middle "120,abc,3"', () => {
      const res = parseCountMessage('120,abc,3');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects negative numbers "120,-5,3"', () => {
      const res = parseCountMessage('120,-5,3');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects decimals "120.5,8,3"', () => {
      const res = parseCountMessage('120.5,8,3');
      expect(res.type).toBe('invalid');
      expect(res.error).toBe(INVALID_FORMAT_REPLY);
    });

    it('rejects empty string or whitespace', () => {
      const res1 = parseCountMessage('');
      expect(res1.type).toBe('invalid');
      const res2 = parseCountMessage('   ');
      expect(res2.type).toBe('invalid');
      const res3 = parseCountMessage(undefined);
      expect(res3.type).toBe('invalid');
    });
  });

  describe('Commands', () => {
    it('recognizes "today" in any case', () => {
      expect(parseCountMessage('today').command).toBe('today');
      expect(parseCountMessage('TODAY').command).toBe('today');
      expect(parseCountMessage(' Today ').command).toBe('today');
    });

    it('recognizes "yesterday" in any case', () => {
      expect(parseCountMessage('yesterday').command).toBe('yesterday');
      expect(parseCountMessage('YESTERDAY').command).toBe('yesterday');
    });

    it('recognizes "month" in any case', () => {
      expect(parseCountMessage('month').command).toBe('month');
      expect(parseCountMessage('MONTH').command).toBe('month');
    });

    it('recognizes "help" in any case', () => {
      expect(parseCountMessage('help').command).toBe('help');
      expect(parseCountMessage('HELP').command).toBe('help');
    });

    it('recognizes "update" in any case', () => {
      expect(parseCountMessage('update').command).toBe('update');
      expect(parseCountMessage('UPDATE').command).toBe('update');
    });
  });
});
