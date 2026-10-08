import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
