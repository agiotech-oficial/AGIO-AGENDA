import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../db";
import { appointments } from "../../../db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const records = await db.select().from(appointments).where(eq(appointments.userId, userId));
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await db.insert(appointments).values({
      userId: body.userId,
      title: body.title,
      date: body.date,
      time: body.time,
      category: body.category,
      address: body.address,
      contact: body.contact,
      notes: body.notes,
      value: body.value ? String(body.value) : null,
      valueStatus: body.valueStatus,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    await db.update(appointments).set({
      title: body.title,
      date: body.date,
      time: body.time,
      category: body.category,
      address: body.address,
      contact: body.contact,
      notes: body.notes,
      value: body.value ? String(body.value) : null,
      valueStatus: body.valueStatus,
    }).where(eq(appointments.id, Number(body.id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.delete(appointments).where(eq(appointments.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
