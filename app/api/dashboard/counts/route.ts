import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { getAllDailyCounts } from '@/services/hostelService';

export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date') || undefined;
  const month = searchParams.get('month') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
  const offset = searchParams.has('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

  try {
    const result = await getAllDailyCounts({ date, month, search, limit, offset });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Dashboard Counts API Error]', err?.message);
    return NextResponse.json({ error: 'Failed to retrieve daily records.' }, { status: 500 });
  }
}
