import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { toEmail, code, resendApiKey, resendFromEmail } = await req.json();

    if (!toEmail || !code || !resendApiKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const from = resendFromEmail || "onboarding@resend.dev";
    const subject = "Seu código de verificação - Ágio Agenda";
    const html = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
        <h2>Código de Verificação</h2>
        <p>Você solicitou um código de acesso para entrar na sua conta Ágio Agenda.</p>
        <p>Seu código é:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px;">${code}</h1>
        <p>Se você não solicitou este código, por favor, ignore este e-mail.</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API route error response:", errorText);
      return NextResponse.json({ error: "Failed to send email API" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Resend 2FA Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
