import speakeasy from 'speakeasy';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { secret, token } = await req.json();

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 6 // allows 3 minutes before and after to tolerate clock drift
    });

    return NextResponse.json({
      verified
    });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao verificar token' }, { status: 500 });
  }
}
