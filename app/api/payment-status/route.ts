import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMercadoPagoKeys } from '../../../lib/payment-config';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');
    const paramToken = searchParams.get('token');

    let token = paramToken;
    if (!token || token === 'env_token') {
      const keys = await getMercadoPagoKeys();
      token = keys.accessToken;
    }

    if (!idStr || !token) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const client = new MercadoPagoConfig({ accessToken: token, options: { timeout: 10000 } });
    const paymentClient = new Payment(client);
    
    const payment = await paymentClient.get({ id: idStr });

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
    });
  } catch (error: any) {
    console.error('Mercado Pago Error:', error);
    return NextResponse.json({ 
      error: 'Erro ao buscar status do pagamento', 
      details: error.message 
    }, { status: 500 });
  }
}
