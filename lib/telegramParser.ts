export interface TelegramParsedCount {
  students: number; // Total Students (first value)
  staff: number; // Staff (second value)
  others: number; // Others (third value)
  total: number;
}

export interface TelegramParseResult {
  isValid: boolean;
  data?: TelegramParsedCount;
  rawText: string;
}

export const TELEGRAM_WELCOME_REPLY = `Boys Hostel

Welcome to Hostel Management.

Please send today's hostel count in this format:
120,8,3

First value = Total Students
Second value = Staff
Third value = Others`;

export const TELEGRAM_INVALID_FORMAT_REPLY = `Invalid format.

Please send data like:
120,8,3`;

/**
 * Formats success reply:
 *
 * Boys Hostel
 *
 * Date: DD-MM-YYYY
 *
 * Total Students: [first value]
 * Staff: [second value]
 * Others: [third value]
 */
export function formatTelegramSuccessReply(
  formattedDate: string,
  students: number,
  staff: number,
  others: number
): string {
  return `Boys Hostel

Date: ${formattedDate}

Total Students: ${students}
Staff: ${staff}
Others: ${others}`;
}

/**
 * Parses incoming Telegram message text into:
 * - First value = Total Students
 * - Second value = Staff
 * - Third value = Others
 *
 * Example:
 * 120,8,3 ->
 *   Total Students = 120
 *   Staff = 8
 *   Others = 3
 *   Total = 131
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

  // Must contain comma-separated values (allowing optional surrounding spaces)
  if (!cleaned.includes(',')) {
    return {
      isValid: false,
      rawText: cleaned,
    };
  }

  const tokens = cleaned.split(',').map((t) => t.trim());

  // Exactly 3 comma-separated numeric values are required
  if (tokens.length !== 3) {
    return {
      isValid: false,
      rawText: cleaned,
    };
  }

  // Validate each token consists strictly of digits (whole non-negative integer)
  const digitRegex = /^\d+$/;
  for (const token of tokens) {
    if (!digitRegex.test(token)) {
      return {
        isValid: false,
        rawText: cleaned,
      };
    }
  }

  const students = parseInt(tokens[0], 10);
  const staff = parseInt(tokens[1], 10);
  const others = parseInt(tokens[2], 10);

  if (
    Number.isNaN(students) ||
    Number.isNaN(staff) ||
    Number.isNaN(others) ||
    students < 0 ||
    staff < 0 ||
    others < 0
  ) {
    return {
      isValid: false,
      rawText: cleaned,
    };
  }

  const total = students + staff + others;

  return {
    isValid: true,
    data: {
      students,
      staff,
      others,
      total,
    },
    rawText: cleaned,
  };
}
