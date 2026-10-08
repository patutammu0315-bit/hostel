import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { getDailyCountByDate, getMonthlySummary } from '@/services/hostelService';
import { getCurrentDateInTimezone } from '@/lib/date';

export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  try {
    const { year, month, isoDate, formattedDate } = getCurrentDateInTimezone();
    const todayRecord = await getDailyCountByDate(isoDate);
    const monthlySummary = await getMonthlySummary(year, month);

    return NextResponse.json({
      today: {
        date: isoDate,
        formattedDate,
        hasRecord: Boolean(todayRecord),
        students: todayRecord?.students ?? 0,
        staff: todayRecord?.staff ?? 0,
        others: todayRecord?.others ?? 0,
        total: todayRecord?.total ?? 0,
        submittedBy: todayRecord?.submitted_by ?? null,
      },
      monthly: monthlySummary,
    });
  } catch (err: any) {
    console.error('[Dashboard Summary API Error]', err?.message);
    return NextResponse.json({ error: 'Failed to retrieve dashboard summary.' }, { status: 500 });
  }
}
