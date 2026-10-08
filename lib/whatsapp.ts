import { HostelDailyCount } from '@/types';

/**
 * Normalizes phone numbers by stripping +, -, spaces, and non-digit characters.
 * E.g., "+91 98765-43210" -> "919876543210"
 */
export function normalizePhoneNumber(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '');
}

/**
 * Checks whether a sender's phone number is authorized.
 * Compares against the comma-separated AUTHORIZED_WHATSAPP_NUMBERS environment variable.
 */
export function isPhoneNumberAuthorized(rawPhone: string): boolean {
  const allowed = process.env.AUTHORIZED_WHATSAPP_NUMBERS;
  if (!allowed) {
    // If empty or undefined, reject for security
    return false;
  }

  const normalizedSender = normalizePhoneNumber(rawPhone);
  if (!normalizedSender) return false;

  const allowedList = allowed
    .split(',')
    .map((num) => normalizePhoneNumber(num))
    .filter((num) => num.length > 0);

  return allowedList.includes(normalizedSender);
}

// --------------------------------------------------------------------------
// Standard WhatsApp Bot Replies (Exact matching specification)
// --------------------------------------------------------------------------

export const UNAUTHORIZED_REPLY = `❌ You are not authorized to use the Hostel Daily Count system.`;

export const DATABASE_ERROR_REPLY = `⚠️ Unable to save today's count right now.

Please try again.`;

export const NO_TODAY_RECORD_REPLY = `❌ No count has been submitted for today.`;

export const NO_YESTERDAY_RECORD_REPLY = `❌ No count has been submitted for yesterday.`;

export const UPDATE_SUCCESS_REPLY = `✅ Today's count updated successfully.`;

export const NO_PENDING_UPDATE_REPLY = `⚠️ No pending count update found.

Please submit your count like:

120,8,3

Students, Staff, Others`;

export function formatSavedCountReply(
  formattedDate: string,
  students: number,
  staff: number,
  others: number,
  total: number
): string {
  return `🏨 HOSTEL DAILY COUNT

📅 ${formattedDate}

👨🎓 Students: ${students}
👨🏫 Staff: ${staff}
👤 Others: ${others}
----------------
📊 Total: ${total}

✅ Saved`;
}

export function formatTodayCountReply(
  formattedDate: string,
  students: number,
  staff: number,
  others: number,
  total: number
): string {
  return `🏨 TODAY'S HOSTEL COUNT

📅 Date: ${formattedDate}

👨🎓 Students: ${students}
👨🏫 Staff: ${staff}
👤 Others: ${others}
----------------
📊 Total: ${total}`;
}

export function formatYesterdayCountReply(
  formattedDate: string,
  students: number,
  staff: number,
  others: number,
  total: number
): string {
  return `🏨 YESTERDAY'S HOSTEL COUNT

📅 Date: ${formattedDate}

👨🎓 Students: ${students}
👨🏫 Staff: ${staff}
👤 Others: ${others}
----------------
📊 Total: ${total}`;
}

export function formatMonthlySummaryReply(
  monthName: string,
  year: number,
  daysRecorded: number,
  totalStudents: number,
  totalStaff: number,
  totalOthers: number
): string {
  return `📊 HOSTEL MONTHLY SUMMARY

${monthName} ${year}

Days Recorded: ${daysRecorded}

Student Count Total: ${totalStudents}
Staff Count Total: ${totalStaff}
Others Count Total: ${totalOthers}`;
}

export function formatHelpReply(): string {
  return `🏨 HOSTEL DAILY COUNT BOT

Send your daily hostel count like:

120,8,3

Students, Staff, Others

Commands:

today
yesterday
month
help`;
}

export function formatExistingCountWarning(existing: HostelDailyCount | {
  students: number;
  staff: number;
  others: number;
  total: number;
}): string {
  return `⚠️ Today's hostel count already exists.

Current count:

👨🎓 Students: ${existing.students}
👨🏫 Staff: ${existing.staff}
👤 Others: ${existing.others}
📊 Total: ${existing.total}

To update today's count, reply:

UPDATE`;
}
