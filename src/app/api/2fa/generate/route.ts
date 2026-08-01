import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email || 'user';

    const secret = speakeasy.generateSecret({
      name: `Agio App (${email})`
    });

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return NextResponse.json({
      secret: secret.base32,
      qrCodeUrl: qrCodeDataUrl
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
