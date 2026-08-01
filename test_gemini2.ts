import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello"
    });
    console.log("2.5 succeeded:", res.text);
  } catch (err: any) {
    console.error("2.5 failed:", err.message);
  }
}
run();
