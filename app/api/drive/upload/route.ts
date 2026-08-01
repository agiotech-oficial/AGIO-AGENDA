import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing Google Drive token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const { name, content } = await req.json();

    const metadata = {
      name: name || "Backup.txt",
      mimeType: "text/plain",
    };

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", new Blob([content || "Hello from AI Studio Applet!"], { type: "text/plain" }));

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: "Failed to upload to Google Drive", details: errorText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, file: data });
  } catch (error) {
    console.error("Error uploading to Google Drive:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
