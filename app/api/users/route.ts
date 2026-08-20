import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../src/db";
import { users } from "../../../src/db/schema";
import { getMySQLUser, getAllMySQLUsers, saveMySQLUser } from "../../../src/db/mysqlOperations";
import { eq, or, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

let tableEnsured = false;
let dbIsWorking = true;

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "users.json");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    // ignore
  }
}

function getLocalUsers(): any[] {
  ensureDataDir();
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, "utf-8");
      return JSON.parse(data) || [];
    }
  } catch (e) {
    console.error("Error reading local users file:", e);
  }
  return [];
}

function saveLocalUsers(userList: any[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(userList, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing local users file:", e);
  }
}

function updateOrInsertLocalUser(userToSave: any) {
  const localList = getLocalUsers();
  const userEmail = userToSave.email ? userToSave.email.toLowerCase().trim() : null;
  const uid = userToSave.firebaseUid;

  const index = localList.findIndex((u: any) => 
    (uid && u.firebaseUid === uid) || 
    (userEmail && u.email && u.email.toLowerCase().trim() === userEmail)
  );

  if (index >= 0) {
    const existing = localList[index];
    const merged = {
      ...existing,
      ...userToSave,
      // Preserve existing CPF/whatsapp if new input is empty
      cpf: userToSave.cpf && userToSave.cpf.trim() !== '' ? userToSave.cpf : (existing.cpf || ''),
      whatsapp: userToSave.whatsapp && userToSave.whatsapp.trim() !== '' ? userToSave.whatsapp : (existing.whatsapp || ''),
      updatedAt: new Date().toISOString()
    };
    localList[index] = merged;
    saveLocalUsers(localList);
    return merged;
  } else {
    const newUser = {
      id: userToSave.id || userToSave.firebaseUid || Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...userToSave
    };
    localList.push(newUser);
    saveLocalUsers(localList);
    return newUser;
  }
}

function checkDbConfig() {
  return Boolean(
    process.env.SQL_HOST ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SQL_USER
  );
}

async function ensureUsersTable() {
  if (!checkDbConfig()) {
    dbIsWorking = false;
    return false;
  }
  if (tableEnsured && dbIsWorking) return true;

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) NOT NULL UNIQUE,
        name TEXT,
        email TEXT,
        photo_url TEXT,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        totp_enabled BOOLEAN DEFAULT FALSE,
        totp_secret TEXT,
        webauthn_enabled BOOLEAN DEFAULT FALSE,
        webauthn_credential_id TEXT,
        whatsapp TEXT,
        cpf TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        plan TEXT DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        theme_color TEXT,
        theme_bg TEXT,
        age TEXT,
        gender TEXT,
        profession TEXT,
        pix_key TEXT,
        language TEXT,
        sound_enabled BOOLEAN DEFAULT TRUE,
        voice_enabled BOOLEAN DEFAULT FALSE,
        mfa_pin TEXT,
        visual_edits TEXT
      );
    `);

    const alterQueries = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS webauthn_enabled BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_color TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_bg TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS age TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profession TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_pin TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS visual_edits TEXT`
    ];

    for (const q of alterQueries) {
      try {
        await db.execute(sql.raw(q));
      } catch (e) {
        // ignore
      }
    }

    tableEnsured = true;
    dbIsWorking = true;
    return true;
  } catch (err) {
    dbIsWorking = false;
    tableEnsured = false;
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get('firebaseUid');
    const emailParam = searchParams.get('email')?.toLowerCase().trim();
    const all = searchParams.get('all');

    const localUsers = getLocalUsers();

    if (all === 'true' || searchParams.has('all')) {
      const mysqlUsers = await getAllMySQLUsers();
      const canQuery = await ensureUsersTable();
      let dbUsers: any[] = [];
      if (canQuery) {
        try {
          dbUsers = await db.select().from(users);
        } catch (e) {
          dbUsers = [];
        }
      }
      // Merge MySQL users, DB users and local users
      const map = new Map<string, any>();
      localUsers.forEach((u: any) => {
        const key = u.email ? u.email.toLowerCase().trim() : u.firebaseUid;
        if (key) map.set(key, u);
      });
      mysqlUsers.forEach((u: any) => {
        const key = u.email ? u.email.toLowerCase().trim() : u.firebaseUid;
        if (key) {
          const existing = map.get(key);
          map.set(key, { ...existing, ...u });
        }
      });
      dbUsers.forEach((u: any) => {
        const key = u.email ? u.email.toLowerCase().trim() : u.firebaseUid;
        if (key) {
          const existing = map.get(key);
          map.set(key, { ...existing, ...u });
        }
      });
      return NextResponse.json(Array.from(map.values()));
    }

    // Single user lookup
    let userFound: any = null;

    // First check MySQL (Hostinger DB)
    const mysqlUser = await getMySQLUser(firebaseUid, emailParam);
    if (mysqlUser) {
      userFound = mysqlUser;
    }

    // Then check local file storage if not in MySQL
    if (!userFound && (firebaseUid || emailParam)) {
      userFound = localUsers.find(u => 
        (firebaseUid && u.firebaseUid === firebaseUid) || 
        (emailParam && u.email && u.email.toLowerCase().trim() === emailParam)
      );
    }

    // Next check Postgres DB if available
    const canQuery = await ensureUsersTable();
    if (canQuery) {
      try {
        let dbResult: any[] = [];
        if (firebaseUid && emailParam) {
          dbResult = await db.select().from(users).where(
            or(eq(users.firebaseUid, firebaseUid), eq(users.email, emailParam))
          );
        } else if (firebaseUid) {
          dbResult = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
        } else if (emailParam) {
          dbResult = await db.select().from(users).where(eq(users.email, emailParam));
        }

        if (dbResult.length > 0) {
          const dbU = dbResult[0];
          userFound = {
            ...userFound,
            ...dbU,
            cpf: dbU.cpf || userFound?.cpf || '',
            whatsapp: dbU.whatsapp || userFound?.whatsapp || ''
          };
        }
      } catch (dbError) {
        // use local file result
      }
    }

    // Special case for Dalécio Admin
    if (emailParam === 'agiotech.oficial@gmail.com' || (userFound && userFound.email === 'agiotech.oficial@gmail.com')) {
      if (!userFound) userFound = { firebaseUid: firebaseUid || 'dalecio_admin' };
      userFound.name = userFound.name || 'Dalécio L. Macedo';
      userFound.email = 'agiotech.oficial@gmail.com';
      userFound.cpf = userFound.cpf || '10896050726';
      userFound.plan = 'premium';
    }

    return NextResponse.json(userFound || null);
  } catch (error: any) {
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.firebaseUid && !body.email) {
      return NextResponse.json({ error: "Missing firebaseUid or email" }, { status: 400 });
    }

    const userEmail = body.email ? body.email.trim() : null;
    const dataToSet: any = {
      firebaseUid: body.firebaseUid,
    };
    
    if (body.name !== undefined && body.name !== null) dataToSet.name = body.name;
    if (userEmail) dataToSet.email = userEmail;
    if (body.whatsapp !== undefined && body.whatsapp !== null && body.whatsapp.trim() !== '') dataToSet.whatsapp = body.whatsapp;
    if (body.cpf !== undefined && body.cpf !== null && body.cpf.trim() !== '') dataToSet.cpf = body.cpf;
    if (body.city !== undefined && body.city !== null) dataToSet.city = body.city;
    if (body.state !== undefined && body.state !== null) dataToSet.state = body.state;
    if (body.country !== undefined && body.country !== null) dataToSet.country = body.country;
    
    if (body.mfaEnabled !== undefined) dataToSet.mfaEnabled = body.mfaEnabled;
    if (body.totpEnabled !== undefined) dataToSet.totpEnabled = body.totpEnabled;
    if (body.totpSecret !== undefined) dataToSet.totpSecret = body.totpSecret;
    if (body.webAuthnEnabled !== undefined) dataToSet.webAuthnEnabled = body.webAuthnEnabled;
    if (body.webAuthnCredentialId !== undefined) dataToSet.webAuthnCredentialId = body.webAuthnCredentialId;
    if (body.themeColor !== undefined) dataToSet.themeColor = body.themeColor;
    if (body.themeBg !== undefined) dataToSet.themeBg = body.themeBg;
    if (body.age !== undefined) dataToSet.age = body.age;
    if (body.gender !== undefined) dataToSet.gender = body.gender;
    if (body.profession !== undefined) dataToSet.profession = body.profession;
    if (body.pixKey !== undefined) dataToSet.pixKey = body.pixKey;
    if (body.language !== undefined) dataToSet.language = body.language;
    if (body.soundEnabled !== undefined) dataToSet.soundEnabled = body.soundEnabled;
    if (body.voiceEnabled !== undefined) dataToSet.voiceEnabled = body.voiceEnabled;
    if (body.mfaPin !== undefined) dataToSet.mfaPin = body.mfaPin;
    if (body.visualEdits !== undefined) dataToSet.visualEdits = body.visualEdits;

    const isDalecioAdmin = 
      (userEmail && userEmail.toLowerCase() === 'agiotech.oficial@gmail.com') ||
      (body.cpf && body.cpf.replace(/\D/g, '') === '10896050726') ||
      (body.name && (body.name.toUpperCase().includes('DALÉCIO') || body.name.toUpperCase().includes('DALECIO')));

    if (isDalecioAdmin) {
      dataToSet.email = 'agiotech.oficial@gmail.com';
      dataToSet.cpf = '10896050726';
      dataToSet.name = dataToSet.name || 'Dalécio L. Macedo';
      dataToSet.plan = 'premium';
    }

    // Always update local persistent file
    const savedLocal = updateOrInsertLocalUser(dataToSet);

    // Save to MySQL (Hostinger DB)
    try {
      await saveMySQLUser(dataToSet);
    } catch (mysqlErr) {
      console.warn("MySQL user save error:", mysqlErr);
    }

    // Also update Postgres DB if available
    const canQuery = await ensureUsersTable();
    if (canQuery) {
      try {
        let existing: any[] = [];
        if (userEmail) {
          existing = await db.select().from(users).where(
            or(eq(users.firebaseUid, body.firebaseUid), eq(users.email, userEmail))
          );
        } else {
          existing = await db.select().from(users).where(eq(users.firebaseUid, body.firebaseUid));
        }

        if (existing.length > 0) {
          const existingUser = existing[0];
          await db.update(users).set(dataToSet).where(eq(users.id, existingUser.id));
        } else {
          const fallbackEmail = userEmail || `${body.firebaseUid}@user.local`;
          await db.insert(users).values({
            firebaseUid: body.firebaseUid,
            email: fallbackEmail,
            mfaEnabled: false,
            totpEnabled: false,
            webAuthnEnabled: false,
            ...dataToSet,
          });
        }
      } catch (dbWriteErr) {
        console.warn("DB Write error, using local storage:", dbWriteErr);
      }
    }

    return NextResponse.json({ success: true, user: savedLocal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}



