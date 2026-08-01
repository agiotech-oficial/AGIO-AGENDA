import { NextRequest, NextResponse } from "next/server";
import { sanitizeInput } from "../../../lib/security";
import fs from "fs";
import path from "path";

const DOCS_FILE = path.join(process.cwd(), 'data', 'docs.json');

function getFileDocs(): Record<string, any> {
  try {
    if (!fs.existsSync(DOCS_FILE)) {
      return {};
    }
    const content = fs.readFileSync(DOCS_FILE, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (e) {
    return {};
  }
}

function saveFileDocs(data: Record<string, any>) {
  try {
    const dir = path.dirname(DOCS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DOCS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write docs file:", e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const appointmentId = searchParams.get('appointmentId');
    const docId = searchParams.get('docId');

    const docsData = getFileDocs();

    if (docId) {
      const doc = docsData[docId];
      if (doc) return NextResponse.json(doc);
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (appointmentId) {
      const allDocs = Object.values(docsData);
      const doc = allDocs.find((d: any) => d.appointmentId === appointmentId || (userId && d.userId === userId && d.appointmentId === appointmentId));
      if (doc) return NextResponse.json(doc);
    }

    if (userId) {
      const userDocs = Object.values(docsData).filter((d: any) => d.userId === userId);
      return NextResponse.json(userDocs);
    }

    return NextResponse.json(Object.values(docsData));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = sanitizeInput(body.userId || 'guest');
    const appointmentId = sanitizeInput(body.appointmentId || '');
    const title = sanitizeInput(body.title || 'Anotação Ágio Agenda');
    const content = body.content || '';
    const googleToken = body.accessToken || req.headers.get("Authorization")?.replace("Bearer ", "");

    let googleDocId = body.googleDocId;
    let googleDocUrl = body.googleDocUrl;
    let googleSyncError = null;

    // Call Google Workspace / Docs API if access token is available
    if (googleToken && !googleToken.startsWith("dummy")) {
      try {
        if (!googleDocId) {
          // Create new Google Document via Google Docs API
          const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${googleToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              title: `[Ágio Agenda] ${title}`
            })
          });

          if (createRes.ok) {
            const createData = await createRes.json();
            googleDocId = createData.documentId;
            googleDocUrl = `https://docs.google.com/document/d/${googleDocId}/edit`;

            // Insert initial content if any
            if (content && content.trim()) {
              await fetch(`https://docs.googleapis.com/v1/documents/${googleDocId}:batchUpdate`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${googleToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  requests: [
                    {
                      insertText: {
                        location: { index: 1 },
                        text: content
                      }
                    }
                  ]
                })
              });
            }
          } else {
            const errBody = await createRes.text();
            console.warn("Google Docs API create error:", errBody);
            googleSyncError = "Não foi possível criar diretamente na conta Google (token expirado ou sem permissão).";
          }
        } else if (content) {
          // Update existing Google Document
          // For simple update: replace text using Google Docs API
          const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${googleDocId}`, {
            headers: { "Authorization": `Bearer ${googleToken}` }
          });

          if (docRes.ok) {
            const docData = await docRes.json();
            const endIndex = docData.body?.content?.[docData.body.content.length - 1]?.endIndex || 1;
            
            const requests = [];
            if (endIndex > 2) {
              requests.push({
                deleteContentRange: {
                  range: {
                    startIndex: 1,
                    endIndex: endIndex - 1
                  }
                }
              });
            }
            if (content.trim()) {
              requests.push({
                insertText: {
                  location: { index: 1 },
                  text: content
                }
              });
            }

            if (requests.length > 0) {
              await fetch(`https://docs.googleapis.com/v1/documents/${googleDocId}:batchUpdate`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${googleToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ requests })
              });
            }
          }
        }
      } catch (err: any) {
        console.error("Google Docs API call error:", err);
        googleSyncError = err.message;
      }
    }

    // Generate fallback doc ID if still empty
    const id = appointmentId || googleDocId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (!googleDocId) {
      googleDocId = `agio_doc_${id}`;
      googleDocUrl = `https://docs.google.com/document/create`;
    }

    const docRecord = {
      id,
      userId,
      appointmentId,
      title,
      content,
      googleDocId,
      googleDocUrl,
      updatedAt: new Date().toISOString(),
      googleSynced: !googleSyncError && !!googleToken
    };

    const docsData = getFileDocs();
    docsData[id] = docRecord;
    saveFileDocs(docsData);

    return NextResponse.json({
      success: true,
      doc: docRecord,
      googleSyncError
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
