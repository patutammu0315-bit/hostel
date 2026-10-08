import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { getAllDailyCounts } from '@/services/hostelService';
import { formatIsoToDisplay, formatDisplayDateTime, getCurrentDateInTimezone } from '@/lib/date';

export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month') || undefined;
  const date = searchParams.get('date') || undefined;
  const search = searchParams.get('search') || undefined;

  try {
    const { records } = await getAllDailyCounts({
      month,
      date,
      search,
      limit: 5000,
      offset: 0,
    });

    const headers = ['Date', 'Students', 'Staff', 'Others', 'Total', 'Submitted By', 'Created At'];
    const rows = records.map((r) => [
      formatIsoToDisplay(r.record_date),
      r.students,
      r.staff,
      r.others,
      r.total,
      `"${(r.submitted_by || '').replace(/"/g, '""')}"`,
      `"${formatDisplayDateTime(r.created_at)}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const { isoDate } = getCurrentDateInTimezone();
    const filename = `hostel_daily_counts_${month || date || isoDate}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[Dashboard Export API Error]', err?.message);
    return NextResponse.json({ error: 'Failed to generate export file.' }, { status: 500 });
  }
}
