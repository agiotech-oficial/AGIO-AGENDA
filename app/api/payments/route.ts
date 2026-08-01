import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getMercadoPagoKeys } from '../../../lib/payment-config';

export async function GET(req: NextRequest) {
  try {
    const { publicKey, accessToken } = await getMercadoPagoKeys();
    return NextResponse.json({
      publicKey: publicKey || '',
      hasAccessToken: !!accessToken,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userEmail, userId, planName, planPrice, planType, months, userName, name, cpf } = await req.json();

    if (!userEmail || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const appUrl = process.env.APP_URL || (req.headers.get('origin') ?? 'http://localhost:3000');

    const { accessToken } = await getMercadoPagoKeys();
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN environment variable is not defined.');
    }
    const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
    const preference = new Preference(client);

    let monthsCount = 1;
    if (planType === 'annual') {
      monthsCount = 12;
    } else if (planType === 'semiannual') {
      monthsCount = 6;
    } else if (planType === 'monthly') {
      monthsCount = months || 1;
    } else {
      const nameLower = planName ? planName.toLowerCase() : '';
      if (nameLower.includes('anual')) {
        monthsCount = 12;
      } else if (nameLower.includes('semestral') || nameLower.includes('6 meses') || nameLower.includes('semiannual')) {
        monthsCount = 6;
      } else if (nameLower.includes('trimestral') || nameLower.includes('3 meses')) {
        monthsCount = 3;
      } else if (nameLower.includes('mensal') || nameLower.includes('1 mês') || nameLower.includes('1 mes')) {
        monthsCount = 1;
      } else if (months) {
        monthsCount = months;
      }
    }

    const monthsText = monthsCount === 1 ? '1 mês' : `${monthsCount} meses`;
    const resolvedName = userName || name || '';
    const namePart = resolvedName ? ` Nome: ${resolvedName}` : '';
    const cpfPart = cpf ? ` CPF: ${cpf}` : '';

    const body = {
      items: [
        {
          id: 'premium_plan',
          title: `Plano de Assinatura app ÁGIO AGENDA Por: ${monthsText}${namePart}${cpfPart}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(planPrice) || 97.00,
        }
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: `${appUrl}/?payment=success&userId=${userId}`,
        failure: `${appUrl}/?payment=failure`,
        pending: `${appUrl}/?payment=pending`
      },
      auto_return: 'approved',
      // We can enable specific payment methods according to the user request 'PIX and Credit Card'
      payment_methods: {
        excluded_payment_types: [
          { id: 'ticket' }, // Exclude boleto
          { id: 'atm' }
        ],
        installments: 12
      },
      external_reference: userId,
      statement_descriptor: 'AGENDA INTELIGENTE'
    };

    const response = await preference.create({ body });

    return NextResponse.json({ 
      id: response.id,
      init_point: response.init_point, 
      sandbox_init_point: response.sandbox_init_point 
    });

  } catch (error: any) {
    console.error('Mercado Pago Error:', error);
    
    // Check if it's missing token
    if (error.message.includes('MERCADOPAGO_ACCESS_TOKEN')) {
      return NextResponse.json({ 
        error: 'Serviço de pagamento não configurado. Por favor, adicione a chave do Mercado Pago nas configurações.' 
      }, { status: 503 });
    }

    return NextResponse.json({ 
      error: 'Erro ao processar pagamento', 
      details: error.message 
    }, { status: 500 });
  }
}
