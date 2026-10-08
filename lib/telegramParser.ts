export interface TelegramParsedCount {
  hostel: number;
  students: number;
  rooms: number;
  total: number;
}

export interface TelegramParseResult {
  isValid: boolean;
  data?: TelegramParsedCount;
  rawText: string;
}

export const TELEGRAM_WELCOME_REPLY = `👋 Welcome to Hostel Management!

Please send hostel data in this format:

120,8,3`;

export const TELEGRAM_INVALID_FORMAT_REPLY = `❌ Invalid format.

Please send data like:
120,8,3`;

export function formatTelegramSuccessReply(
  hostel: number,
  students: number,
  rooms: number
): string {
  return `✅ Data received successfully!

Hostel: ${hostel}
Students: ${students}
Rooms: ${rooms}`;
}

/**
 * Parses incoming Telegram message text into Hostel, Students, and Rooms.
 *
 * Supported count formats:
 * - "120,8,3"
 * - "120, 8, 3"
 * - "120 8 3"
 *
 * Example:
 * 120,8,3 ->
 *   Hostel = 120
 *   Students = 8
 *   Rooms = 3
 *   total = 131
 */
export function parseTelegramCountMessage(
  rawInput: string | undefined | null
): TelegramParseResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      isValid: false,
      rawText: '',
    };
  }

  const cleaned = rawInput.trim();
  if (cleaned.length === 0) {
    return {
      isValid: false,
      rawText: cleaned,
    };
  }

  // Determine split strategy: comma or whitespace
  let tokens: string[] = [];
  if (cleaned.includes(',')) {
    tokens = cleaned.split(',').map((t) => t.trim());
  } else {
    tokens = cleaned.split(/\s+/).map((t) => t.trim());
  }

  // Exactly 3 non-empty values are required: Hostel, Students, Rooms
  if (tokens.length !== 3) {
    return {
      isValid: false,
      rawText: cleaned,
    };
  }

  // Validate that each token is strictly an unsigned whole integer (digits only)
  const digitRegex = /^\d+$/;
  for (const token of tokens) {
    if (!digitRegex.test(token)) {
      return {
        isValid: false,
        rawText: cleaned,
      };
    }
  }

  const hostel = parseInt(tokens[0], 10);
  const students = parseInt(tokens[1], 10);
  const rooms = parseInt(tokens[2], 10);

  // Validate numbers are non-negative integers
  if (
    Number.isNaN(hostel) ||
    Number.isNaN(students) ||
    Number.isNaN(rooms) ||
    hostel < 0 ||
    students < 0 ||
    rooms < 0
  ) {
    return {
      isValid: false,
      rawText: cleaned,
    };
  }

  const total = hostel + students + rooms;

  return {
    isValid: true,
    data: {
      hostel,
      students,
      rooms,
      total,
    },
    rawText: cleaned,
  };
}
