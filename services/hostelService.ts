import { getServiceRoleSupabaseClient } from '@/lib/supabase';
import { getMonthNameAndYear } from '@/lib/date';
import { HostelDailyCount, MonthlySummary, PendingCountUpdate } from '@/types';

/**
 * Service providing database operations for Hostel Daily Counts
 */

export async function getDailyCountByDate(recordDate: string): Promise<HostelDailyCount | null> {
  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('hostel_daily_counts')
    .select('*')
    .eq('record_date', recordDate)
    .maybeSingle();

  if (error) {
    console.error(`[HostelService Error] Failed to fetch count for date ${recordDate}:`, error.message);
    throw error;
  }

  return data as HostelDailyCount | null;
}

export async function saveDailyCount(params: {
  recordDate: string;
  students: number;
  staff: number;
  others: number;
  total: number;
  submittedBy: string;
  messageId?: string;
}): Promise<HostelDailyCount> {
  const supabase = getServiceRoleSupabaseClient();

  const insertData = {
    record_date: params.recordDate,
    students: params.students,
    staff: params.staff,
    others: params.others,
    total: params.total,
    submitted_by: params.submittedBy,
    message_id: params.messageId || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('hostel_daily_counts')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error(`[HostelService Error] Failed to insert record for date ${params.recordDate}:`, error.message);
    throw error;
  }

  return data as HostelDailyCount;
}

export async function updateDailyCount(
  recordDate: string,
  params: {
    students: number;
    staff: number;
    others: number;
    total: number;
    submittedBy: string;
    messageId?: string;
  }
): Promise<HostelDailyCount> {
  const supabase = getServiceRoleSupabaseClient();

  const updateData = {
    students: params.students,
    staff: params.staff,
    others: params.others,
    total: params.total,
    submitted_by: params.submittedBy,
    message_id: params.messageId || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('hostel_daily_counts')
    .update(updateData)
    .eq('record_date', recordDate)
    .select()
    .single();

  if (error) {
    console.error(`[HostelService Error] Failed to update record for date ${recordDate}:`, error.message);
    throw error;
  }

  return data as HostelDailyCount;
}

export async function getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
  const supabase = getServiceRoleSupabaseClient();

  const pad = (n: number) => n.toString().padStart(2, '0');
  const startDate = `${year}-${pad(month)}-01`;
  // Last day of month
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${year}-${pad(month)}-${pad(lastDay)}`;

  const { data, error } = await supabase
    .from('hostel_daily_counts')
    .select('students, staff, others, total')
    .gte('record_date', startDate)
    .lte('record_date', endDate);

  if (error) {
    console.error(`[HostelService Error] Failed to fetch monthly summary for ${year}-${pad(month)}:`, error.message);
    throw error;
  }

  const records = data || [];
  let totalStudents = 0;
  let totalStaff = 0;
  let totalOthers = 0;
  let combinedTotal = 0;

  for (const r of records) {
    totalStudents += r.students || 0;
    totalStaff += r.staff || 0;
    totalOthers += r.others || 0;
    combinedTotal += r.total || 0;
  }

  return {
    year,
    month,
    monthName: getMonthNameAndYear(year, month).split(' ')[0],
    daysRecorded: records.length,
    totalStudents,
    totalStaff,
    totalOthers,
    combinedTotal,
  };
}

export async function getAllDailyCounts(options?: {
  date?: string;
  month?: string; // YYYY-MM
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ records: HostelDailyCount[]; totalCount: number }> {
  const supabase = getServiceRoleSupabaseClient();

  let query = supabase.from('hostel_daily_counts').select('*', { count: 'exact' });

  if (options?.date) {
    query = query.eq('record_date', options.date);
  } else if (options?.month) {
    const [yearStr, monthStr] = options.month.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const start = `${year}-${pad(month)}-01`;
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const end = `${year}-${pad(month)}-${pad(lastDay)}`;
      query = query.gte('record_date', start).lte('record_date', end);
    }
  }

  if (options?.search) {
    query = query.ilike('submitted_by', `%${options.search}%`);
  }

  query = query.order('record_date', { ascending: false });

  if (typeof options?.limit === 'number') {
    const from = options.offset || 0;
    const to = from + options.limit - 1;
    query = query.range(from, to);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[HostelService Error] Failed to fetch count records:', error.message);
    throw error;
  }

  return {
    records: (data || []) as HostelDailyCount[],
    totalCount: count || 0,
  };
}

/**
 * Idempotency check: checks if message_id exists in either hostel_daily_counts or hostel_processed_messages
 */
export async function isMessageAlreadyProcessed(messageId: string): Promise<boolean> {
  if (!messageId) return false;
  const supabase = getServiceRoleSupabaseClient();

  // Check in counts table
  const { data: countMatch } = await supabase
    .from('hostel_daily_counts')
    .select('id')
    .eq('message_id', messageId)
    .maybeSingle();

  if (countMatch) return true;

  // Check in processed messages table
  const { data: logMatch } = await supabase
    .from('hostel_processed_messages')
    .select('message_id')
    .eq('message_id', messageId)
    .maybeSingle();

  return Boolean(logMatch);
}

/**
 * Mark a non-saving message/command as processed
 */
export async function recordProcessedMessage(
  messageId: string,
  phoneNumber: string,
  command?: string
): Promise<void> {
  if (!messageId) return;
  const supabase = getServiceRoleSupabaseClient();
  try {
    const { error } = await supabase
      .from('hostel_processed_messages')
      .upsert({
        message_id: messageId,
        phone_number: phoneNumber,
        command: command || 'general',
        created_at: new Date().toISOString(),
      });
    if (error) {
      console.warn('[HostelService Warning] Could not record processed message_id:', error.message);
    }
  } catch (err: any) {
    console.warn('[HostelService Warning] Could not record processed message_id:', err?.message);
  }
}

/**
 * Save pending update for the 2-step confirmation workflow
 */
export async function savePendingUpdate(update: PendingCountUpdate): Promise<void> {
  const supabase = getServiceRoleSupabaseClient();
  const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('hostel_pending_updates').upsert({
    phone_number: update.phone_number,
    record_date: update.record_date,
    students: update.students,
    staff: update.staff,
    others: update.others,
    total: update.total,
    message_id: update.message_id || null,
    created_at: new Date().toISOString(),
    expires_at: twoHoursLater,
  });

  if (error) {
    console.error('[HostelService Error] Failed to save pending update:', error.message);
    throw error;
  }
}

/**
 * Retrieve pending update for a phone number if not expired
 */
export async function getPendingUpdate(phoneNumber: string): Promise<PendingCountUpdate | null> {
  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('hostel_pending_updates')
    .select('*')
    .eq('phone_number', phoneNumber)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('[HostelService Error] Failed to retrieve pending update:', error.message);
    return null;
  }

  return data as PendingCountUpdate | null;
}

/**
 * Remove pending update after confirmation
 */
export async function clearPendingUpdate(phoneNumber: string): Promise<void> {
  const supabase = getServiceRoleSupabaseClient();
  await supabase.from('hostel_pending_updates').delete().eq('phone_number', phoneNumber);
}
