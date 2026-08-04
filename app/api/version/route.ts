import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VERSION = '1.0.8-' + (process.env.BUILD_ID || 'prod');

export async function GET() {
  return NextResponse.json({
    version: VERSION,
    updatedAt: new Date().toISOString(),
    status: 'online',
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}
