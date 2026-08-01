import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../src/db";
import { appointments } from "../../../src/db/schema";
import { eq } from "drizzle-orm";
import { sanitizeInput } from "../../../lib/security";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), 'data', 'appointments.json');

function getFileAppointments(): Record<string, any[]> {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {};
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content || '{}');
  } catch (e) {
    return {};
  }
}

function saveFileAppointments(data: Record<string, any[]>) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write appointments file:", e);
  }
}

function parseRecord(r: any) {
  return {
    ...r,
    id: String(r.id),
    value: r.value !== undefined && r.value !== null && r.value !== '' ? Number(r.value) : undefined,
    reminders: typeof r.reminders === 'string' ? (r.reminders ? JSON.parse(r.reminders) : []) : (Array.isArray(r.reminders) ? r.reminders : [])
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    let result: any[] = [];
    try {
      const records = await db.select().from(appointments).where(eq(appointments.userId, userId));
      if (records && records.length > 0) {
        result = records.map(parseRecord);
      }
    } catch (e) {
      // DB offline, proceed to file storage
    }

    if (result.length === 0) {
      const fileData = getFileAppointments();
      if (fileData[userId] && Array.isArray(fileData[userId])) {
        result = fileData[userId].map(parseRecord);
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = sanitizeInput(body.userId || '');
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const fileData = getFileAppointments();

    // Bulk sync case
    if (Array.isArray(body.appointments)) {
      const sanitizedApps = body.appointments.map((a: any) => ({
        id: String(a.id || Math.random().toString(36).substring(2, 11)),
        userId,
        title: sanitizeInput(a.title || 'Sem título'),
        date: sanitizeInput(a.date || ''),
        time: sanitizeInput(a.time || '00:00'),
        category: sanitizeInput(a.category || 'Trabalho'),
        address: a.address ? sanitizeInput(a.address) : undefined,
        contact: a.contact ? sanitizeInput(a.contact) : undefined,
        notes: a.notes ? sanitizeInput(a.notes) : undefined,
        value: a.value !== undefined && a.value !== null ? Number(a.value) : undefined,
        valueStatus: a.valueStatus ? sanitizeInput(a.valueStatus) : undefined,
        reminders: Array.isArray(a.reminders) ? a.reminders : []
      }));

      fileData[userId] = sanitizedApps;
      saveFileAppointments(fileData);

      try {
        await db.delete(appointments).where(eq(appointments.userId, userId));
        if (sanitizedApps.length > 0) {
          await db.insert(appointments).values(
            sanitizedApps.map((a: any) => ({
              userId: a.userId,
              title: a.title,
              date: a.date,
              time: a.time,
              category: a.category,
              address: a.address || null,
              contact: a.contact || null,
              notes: a.notes || null,
              value: a.value !== undefined && a.value !== null ? String(a.value) : null,
              valueStatus: a.valueStatus || null,
              reminders: a.reminders ? JSON.stringify(a.reminders) : null,
            }))
          );
        }
      } catch (e) {
        // DB optional fallback
      }

      return NextResponse.json({ success: true, count: sanitizedApps.length });
    }

    // Single item insert
    const newItem = {
      id: String(body.id || Math.random().toString(36).substring(2, 11)),
      userId,
      title: sanitizeInput(body.title || ''),
      date: sanitizeInput(body.date || ''),
      time: sanitizeInput(body.time || '00:00'),
      category: sanitizeInput(body.category || 'Trabalho'),
      address: body.address ? sanitizeInput(body.address) : undefined,
      contact: body.contact ? sanitizeInput(body.contact) : undefined,
      notes: body.notes ? sanitizeInput(body.notes) : undefined,
      value: body.value !== undefined && body.value !== null ? Number(body.value) : undefined,
      valueStatus: body.valueStatus ? sanitizeInput(body.valueStatus) : undefined,
      reminders: Array.isArray(body.reminders) ? body.reminders : []
    };

    const userList = fileData[userId] || [];
    const existingIndex = userList.findIndex((item: any) => item.id === newItem.id);
    if (existingIndex !== -1) {
      userList[existingIndex] = newItem;
    } else {
      userList.push(newItem);
    }
    fileData[userId] = userList;
    saveFileAppointments(fileData);

    try {
      await db.insert(appointments).values({
        userId,
        title: newItem.title,
        date: newItem.date,
        time: newItem.time,
        category: newItem.category,
        address: newItem.address || null,
        contact: newItem.contact || null,
        notes: newItem.notes || null,
        value: newItem.value !== undefined ? String(newItem.value) : null,
        valueStatus: newItem.valueStatus || null,
        reminders: newItem.reminders ? JSON.stringify(newItem.reminders) : null,
      });
    } catch (e) {
      // DB optional fallback
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = sanitizeInput(body.userId || '');
    const id = String(body.id);
    if (!id || !userId) {
      return NextResponse.json({ error: "Missing id or userId" }, { status: 400 });
    }

    const fileData = getFileAppointments();
    const userList = fileData[userId] || [];
    const index = userList.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      userList[index] = {
        ...userList[index],
        title: body.title ? sanitizeInput(body.title) : userList[index].title,
        date: body.date ? sanitizeInput(body.date) : userList[index].date,
        time: body.time ? sanitizeInput(body.time) : userList[index].time,
        category: body.category ? sanitizeInput(body.category) : userList[index].category,
        address: body.address !== undefined ? (body.address ? sanitizeInput(body.address) : undefined) : userList[index].address,
        contact: body.contact !== undefined ? (body.contact ? sanitizeInput(body.contact) : undefined) : userList[index].contact,
        notes: body.notes !== undefined ? (body.notes ? sanitizeInput(body.notes) : undefined) : userList[index].notes,
        value: body.value !== undefined ? (body.value !== null ? Number(body.value) : undefined) : userList[index].value,
        valueStatus: body.valueStatus !== undefined ? (body.valueStatus ? sanitizeInput(body.valueStatus) : undefined) : userList[index].valueStatus,
        reminders: Array.isArray(body.reminders) ? body.reminders : userList[index].reminders,
      };
      fileData[userId] = userList;
      saveFileAppointments(fileData);
    }

    try {
      await db.update(appointments).set({
        title: sanitizeInput(body.title),
        date: sanitizeInput(body.date),
        time: sanitizeInput(body.time || '00:00'),
        category: sanitizeInput(body.category || 'Geral'),
        address: body.address ? sanitizeInput(body.address) : null,
        contact: body.contact ? sanitizeInput(body.contact) : null,
        notes: body.notes ? sanitizeInput(body.notes) : null,
        value: body.value !== undefined && body.value !== null ? sanitizeInput(String(body.value)) : null,
        valueStatus: body.valueStatus ? sanitizeInput(body.valueStatus) : null,
        reminders: body.reminders ? JSON.stringify(body.reminders) : null,
      }).where(eq(appointments.id, Number(id)));
    } catch (e) {
      // DB optional fallback
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    if (userId) {
      const fileData = getFileAppointments();
      if (fileData[userId]) {
        fileData[userId] = fileData[userId].filter((item: any) => String(item.id) !== String(id));
        saveFileAppointments(fileData);
      }
    }

    try {
      await db.delete(appointments).where(eq(appointments.id, Number(id)));
    } catch (e) {
      // DB optional fallback
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

