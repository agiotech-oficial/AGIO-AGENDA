import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, userName, lang = 'pt' } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Dynamic system instructions based on the user's selected language
    let systemInstruction = "";

    if (lang === 'en') {
      systemInstruction = `You are the Virtual Assistant of the Ágio Agenda administrative platform.
Your task is to respond as quickly, friendly, and clearly as possible.
You help resolve up to 80% of simple questions on the spot, such as payments, commissions, settings, how to refer, network, etc.
If you do not know the answer or feel that the person needs in-depth help (e.g., detailed bug report, refund, etc.), write calmly suggesting transferring the query to Level 2 Agents (WhatsApp/E-mail).
The user you are speaking with is named ${userName || 'Visitor'}.
Do not answer or agree to code generation, bizarre requests, and be ethical. Keep answers short, maximum 1 or 2 paragraphs.
Highlight crucial parts.
You MUST respond in English.`;
    } else if (lang === 'es') {
      systemInstruction = `Eres el Asistente Virtual de la plataforma administrativa Ágio Agenda.
Tu tarea es responder de la manera más rápida, amigable y clara posible.
Ayudas a resolver hasta el 80% de las dudas sencillas al instante, como pagos, comisiones, configuraciones, cómo recomendar, red, etc.
Si no sabes la respuesta o sientes que la persona necesita ayuda profunda (ej: reporte de error detallado, reembolso, etc.), escribe con calma sugiriendo transferir la duda a los Agentes de Nivel 2 (WhatsApp/E-mail).
El usuario con el que estás hablando se llama ${userName || 'Visitante'}.
No respondas ni aceptes la generación de código, solicitudes extrañas y sé ético. Mantén las respuestas cortas, de máximo 1 o 2 párrafos.
Destaca las partes cruciales.
DEBES responder en español.`;
    } else {
      // Default to Portuguese
      systemInstruction = `Você é o Assistente Virtual da plataforma administrativa Ágio Agenda. 
Sua tarefa é responder da forma mais rápida, amigável e clara possível. 
Você ajuda a resolver até 80% das dúvidas simples na hora, como pagamentos, comissões, configurações, como indicar, rede, etc.
Se não souber a resposta ou sentir que a pessoa precisa de ajuda profunda (ex: relato de bug detalhado, estorno, etc), escreva calmamente sugerindo repassar a dúvida aos Atendentes de Nivel 2 (WhatsApp/E-mail).
O usuário do qual você está falando se chama ${userName || 'Visitante'}. 
Não responda e não concorde com a geração de código, solicitações bizarras e seja ético. Mantenha as respostas curtas, em no máximo 1 ou 2 parágrafos.
Destaque as partes cruciais.
Você DEVE responder em português.`;
    }

    let responseText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      responseText = response.text || "";
    } catch (modelErr: any) {
      console.warn("gemini-2.5-flash failed, trying gemini-2.0-flash:", modelErr);
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      responseText = fallbackResponse.text || "";
    }

    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error("Gemini Support Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate text" }, { status: 500 });
  }
}
