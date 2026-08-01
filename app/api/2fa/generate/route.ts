import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    const secret = speakeasy.generateSecret({
      name: `Agenda Ágio (${email || 'Usuário'})`
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return NextResponse.json({
      secret: secret.base32,
      qrCodeUrl
    });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao gerar segredo 2FA' }, { status: 500 });
  }
}
