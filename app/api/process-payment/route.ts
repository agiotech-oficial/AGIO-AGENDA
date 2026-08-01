import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getMercadoPagoKeys } from '../../../lib/payment-config';

const getMercadoPagoClient = async (token: string | undefined) => {
  let resolvedToken = token;
  if (!resolvedToken || resolvedToken === 'env_token') {
    const keys = await getMercadoPagoKeys();
    resolvedToken = keys.accessToken;
  }

  if (!resolvedToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN is not provided.');
  }

  return new MercadoPagoConfig({ accessToken: resolvedToken, options: { timeout: 10000 } });
};

export async function POST(req: NextRequest) {
  try {
    const { formData, userId, planName, mpAccessToken, planType, months, cpf, userName, name } = await req.json();

    if (!formData) {
      return NextResponse.json({ error: 'Missing formData' }, { status: 400 });
    }

    const client = await getMercadoPagoClient(mpAccessToken);
    const payment = new Payment(client);

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
    
    const resolvedName = (
      userName || 
      name || 
      (formData?.payer?.first_name ? `${formData?.payer?.first_name || ''} ${formData?.payer?.last_name || ''}`.trim() : '')
    );
    const userCpf = cpf || formData?.payer?.identification?.number || '';

    const namePart = resolvedName ? ` Nome: ${resolvedName}` : '';
    const cpfPart = userCpf ? ` CPF: ${userCpf}` : '';

    const descriptionText = `Plano de Assinatura app ÁGIO AGENDA Por: ${monthsText}${namePart}${cpfPart}`;

    const body = {
      ...formData,
      description: descriptionText,
      external_reference: userId,
      statement_descriptor: "SISTEMA AGIO",
      metadata: {
        app_name: "Sistema_Agio",
        user_id: userId || "unknown",
        user_name: resolvedName || undefined,
        user_cpf: userCpf || undefined,
      }
    };

    const response = await payment.create({ body });

    return NextResponse.json({
      id: response.id,
      status: response.status,
      status_detail: response.status_detail,
      point_of_interaction: response.point_of_interaction,
    });

  } catch (error: any) {
    console.error('Mercado Pago Error:', error);
    
    // Check if it's missing token
    if (error.message?.includes('MERCADOPAGO_ACCESS_TOKEN')) {
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
