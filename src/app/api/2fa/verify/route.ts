import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';

export async function POST(req: NextRequest) {
  try {
    const { token, secret } = await req.json();

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // allows 1 step before/after (30 seconds margin)
    });

    if (verified) {
      return NextResponse.json({ verified: true });
    } else {
      return NextResponse.json({ verified: false, error: 'Token inválido' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
