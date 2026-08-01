import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Hello"
    });
    console.log("3.5 succeeded:", res.text);
  } catch (err: any) {
    console.error("3.5 failed:", err.message);
    try {
      const res2 = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: "Hello"
      });
      console.log("flash-latest succeeded:", res2.text);
    } catch(e2: any) {
      console.error("flash-latest failed:", e2.message);
    }
  }
}
run();
