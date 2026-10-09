import { CommandType, ParseResult } from '@/types';

export const INVALID_FORMAT_REPLY = `Invalid format.

Please send the hostel count like:

120,8,3

Students, Staff, Others`;

/**
 * Normalizes input text and parses hostel daily count numbers or commands.
 *
 * Supported count formats:
 * - "120,8,3"
 * - "120, 8, 3"
 * - "120 8 3"
 *
 * Supported commands:
 * - "today"
 * - "yesterday"
 * - "month"
 * - "help"
 * - "update"
 */
export function parseCountMessage(rawInput: string | undefined | null): ParseResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      type: 'invalid',
      rawText: '',
      error: INVALID_FORMAT_REPLY,
    };
  }

  const cleaned = rawInput.trim();
  if (cleaned.length === 0) {
    return {
      type: 'invalid',
      rawText: cleaned,
      error: INVALID_FORMAT_REPLY,
    };
  }

  // Check known commands first (case-insensitive)
  const lower = cleaned.toLowerCase();
  const knownCommands: CommandType[] = ['today', 'yesterday', 'month', 'help', 'update'];
  if (knownCommands.includes(lower as CommandType)) {
    return {
      type: 'command',
      command: lower as CommandType,
      rawText: cleaned,
    };
  }

  // Determine split strategy:
  // If text contains a comma, split by comma; otherwise split by whitespace.
  let tokens: string[] = [];
  if (cleaned.includes(',')) {
    tokens = cleaned.split(',').map((t) => t.trim());
  } else {
    tokens = cleaned.split(/\s+/).map((t) => t.trim());
  }

  // Exactly 3 values are required (Students, Staff, Others)
  if (tokens.length !== 3) {
    return {
      type: 'invalid',
      rawText: cleaned,
      error: INVALID_FORMAT_REPLY,
    };
  }

  // Validate that each token is strictly an unsigned whole integer (digits only)
  // Rejects negatives (-5), decimals (120.5), letters (abc), empty strings ("")
  const digitRegex = /^\d+$/;
  for (const token of tokens) {
    if (!digitRegex.test(token)) {
      return {
        type: 'invalid',
        rawText: cleaned,
        error: INVALID_FORMAT_REPLY,
      };
    }
  }

  const students = parseInt(tokens[0], 10);
  const staff = parseInt(tokens[1], 10);
  const others = parseInt(tokens[2], 10);

  // Safeguard against NaN or negative numbers
  if (
    Number.isNaN(students) ||
    Number.isNaN(staff) ||
    Number.isNaN(others) ||
    students < 0 ||
    staff < 0 ||
    others < 0
  ) {
    return {
      type: 'invalid',
      rawText: cleaned,
      error: INVALID_FORMAT_REPLY,
    };
  }

  // Calculate total automatically
  const total = students + staff + others;

  return {
    type: 'count',
    data: {
      students,
      staff,
      others,
      total,
    },
    rawText: cleaned,
  };
}
