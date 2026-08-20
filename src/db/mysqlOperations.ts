import { queryMySQL, isMySQLConfigured } from './mysql';

export async function getMySQLUser(firebaseUid?: string | null, email?: string | null) {
  if (!isMySQLConfigured()) return null;
  try {
    if (firebaseUid && email) {
      const rows = await queryMySQL(
        'SELECT * FROM users WHERE firebase_uid = ? OR email = ? LIMIT 1',
        [firebaseUid, email.toLowerCase().trim()]
      );
      return rows && rows.length > 0 ? formatMySQLUser(rows[0]) : null;
    } else if (firebaseUid) {
      const rows = await queryMySQL(
        'SELECT * FROM users WHERE firebase_uid = ? LIMIT 1',
        [firebaseUid]
      );
      return rows && rows.length > 0 ? formatMySQLUser(rows[0]) : null;
    } else if (email) {
      const rows = await queryMySQL(
        'SELECT * FROM users WHERE email = ? LIMIT 1',
        [email.toLowerCase().trim()]
      );
      return rows && rows.length > 0 ? formatMySQLUser(rows[0]) : null;
    }
    return null;
  } catch (error) {
    console.warn('[MySQL] Error getting user:', error);
    return null;
  }
}

export async function getAllMySQLUsers() {
  if (!isMySQLConfigured()) return [];
  try {
    const rows = await queryMySQL('SELECT * FROM users ORDER BY id DESC');
    return (rows || []).map(formatMySQLUser);
  } catch (error) {
    console.warn('[MySQL] Error getting all users:', error);
    return [];
  }
}

export async function saveMySQLUser(userData: any) {
  if (!isMySQLConfigured()) return false;
  try {
    const uid = userData.firebaseUid || 'user_' + Date.now();
    const email = userData.email || `${uid}@user.local`;
    const name = userData.name || null;
    const photoUrl = userData.photoUrl || null;
    const mfaEnabled = Boolean(userData.mfaEnabled);
    const totpEnabled = Boolean(userData.totpEnabled);
    const totpSecret = userData.totpSecret || null;
    const webAuthnEnabled = Boolean(userData.webAuthnEnabled);
    const webAuthnCredentialId = userData.webAuthnCredentialId || null;
    const whatsapp = userData.whatsapp || null;
    const cpf = userData.cpf || null;
    const city = userData.city || null;
    const state = userData.state || null;
    const country = userData.country || null;
    const plan = userData.plan || 'free';
    const themeColor = userData.themeColor || null;
    const themeBg = userData.themeBg || null;
    const age = userData.age || null;
    const gender = userData.gender || null;
    const profession = userData.profession || null;
    const pixKey = userData.pixKey || null;
    const language = userData.language || null;
    const soundEnabled = userData.soundEnabled !== undefined ? Boolean(userData.soundEnabled) : true;
    const voiceEnabled = Boolean(userData.voiceEnabled);
    const mfaPin = userData.mfaPin || null;
    const visualEdits = userData.visualEdits ? (typeof userData.visualEdits === 'string' ? userData.visualEdits : JSON.stringify(userData.visualEdits)) : null;

    const sql = `
      INSERT INTO users (
        firebase_uid, name, email, photo_url, mfa_enabled, totp_enabled, totp_secret,
        webauthn_enabled, webauthn_credential_id, whatsapp, cpf, city, state, country,
        plan, theme_color, theme_bg, age, gender, profession, pix_key, language,
        sound_enabled, voice_enabled, mfa_pin, visual_edits
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = COALESCE(VALUES(name), name),
        email = COALESCE(VALUES(email), email),
        photo_url = COALESCE(VALUES(photo_url), photo_url),
        mfa_enabled = VALUES(mfa_enabled),
        totp_enabled = VALUES(totp_enabled),
        totp_secret = COALESCE(VALUES(totp_secret), totp_secret),
        webauthn_enabled = VALUES(webauthn_enabled),
        webauthn_credential_id = COALESCE(VALUES(webauthn_credential_id), webauthn_credential_id),
        whatsapp = COALESCE(VALUES(whatsapp), whatsapp),
        cpf = COALESCE(VALUES(cpf), cpf),
        city = COALESCE(VALUES(city), city),
        state = COALESCE(VALUES(state), state),
        country = COALESCE(VALUES(country), country),
        plan = COALESCE(VALUES(plan), plan),
        theme_color = COALESCE(VALUES(theme_color), theme_color),
        theme_bg = COALESCE(VALUES(theme_bg), theme_bg),
        age = COALESCE(VALUES(age), age),
        gender = COALESCE(VALUES(gender), gender),
        profession = COALESCE(VALUES(profession), profession),
        pix_key = COALESCE(VALUES(pix_key), pix_key),
        language = COALESCE(VALUES(language), language),
        sound_enabled = VALUES(sound_enabled),
        voice_enabled = VALUES(voice_enabled),
        mfa_pin = COALESCE(VALUES(mfa_pin), mfa_pin),
        visual_edits = COALESCE(VALUES(visual_edits), visual_edits);
    `;

    await queryMySQL(sql, [
      uid, name, email, photoUrl, mfaEnabled, totpEnabled, totpSecret,
      webAuthnEnabled, webAuthnCredentialId, whatsapp, cpf, city, state, country,
      plan, themeColor, themeBg, age, gender, profession, pixKey, language,
      soundEnabled, voiceEnabled, mfaPin, visualEdits
    ]);
    return true;
  } catch (error) {
    console.warn('[MySQL] Error saving user:', error);
    return false;
  }
}

export async function getMySQLAppointments(userId: string) {
  if (!isMySQLConfigured() || !userId) return [];
  try {
    const rows = await queryMySQL(
      'SELECT * FROM appointments WHERE user_id = ? ORDER BY date ASC, time ASC',
      [userId]
    );
    return (rows || []).map(formatMySQLAppointment);
  } catch (error) {
    console.warn('[MySQL] Error getting appointments:', error);
    return [];
  }
}

export async function saveMySQLAppointments(userId: string, appsList: any[]) {
  if (!isMySQLConfigured() || !userId) return false;
  try {
    // Delete existing
    await queryMySQL('DELETE FROM appointments WHERE user_id = ?', [userId]);

    // Insert new
    for (const app of appsList) {
      const remindersStr = Array.isArray(app.reminders) ? JSON.stringify(app.reminders) : (typeof app.reminders === 'string' ? app.reminders : '[]');
      const valStr = app.value !== undefined && app.value !== null ? String(app.value) : null;
      
      await queryMySQL(`
        INSERT INTO appointments (
          user_id, title, date, time, category, address, contact, notes, value, value_status, reminders
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        app.title || 'Sem título',
        app.date || '',
        app.time || '00:00',
        app.category || 'Geral',
        app.address || null,
        app.contact || null,
        app.notes || null,
        valStr,
        app.valueStatus || null,
        remindersStr
      ]);
    }
    return true;
  } catch (error) {
    console.warn('[MySQL] Error saving appointments:', error);
    return false;
  }
}

export async function deleteMySQLAppointment(userId: string, appointmentId: string) {
  if (!isMySQLConfigured() || !userId || !appointmentId) return false;
  try {
    await queryMySQL('DELETE FROM appointments WHERE user_id = ? AND id = ?', [userId, appointmentId]);
    return true;
  } catch (error) {
    console.warn('[MySQL] Error deleting appointment:', error);
    return false;
  }
}

function formatMySQLUser(row: any) {
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    name: row.name,
    email: row.email,
    photoUrl: row.photo_url,
    mfaEnabled: Boolean(row.mfa_enabled),
    totpEnabled: Boolean(row.totp_enabled),
    totpSecret: row.totp_secret,
    webAuthnEnabled: Boolean(row.webauthn_enabled),
    webAuthnCredentialId: row.webauthn_credential_id,
    whatsapp: row.whatsapp,
    cpf: row.cpf,
    city: row.city,
    state: row.state,
    country: row.country,
    plan: row.plan || 'free',
    themeColor: row.theme_color,
    themeBg: row.theme_bg,
    age: row.age,
    gender: row.gender,
    profession: row.profession,
    pixKey: row.pix_key,
    language: row.language,
    soundEnabled: row.sound_enabled !== undefined ? Boolean(row.sound_enabled) : true,
    voiceEnabled: Boolean(row.voice_enabled),
    mfaPin: row.mfa_pin,
    visualEdits: row.visual_edits,
    createdAt: row.created_at
  };
}

function formatMySQLAppointment(row: any) {
  let reminders: any[] = [];
  try {
    reminders = typeof row.reminders === 'string' ? JSON.parse(row.reminders) : (Array.isArray(row.reminders) ? row.reminders : []);
  } catch (e) {
    reminders = [];
  }

  return {
    id: String(row.id),
    userId: row.user_id,
    title: row.title,
    date: row.date,
    time: row.time,
    category: row.category,
    address: row.address,
    contact: row.contact,
    notes: row.notes,
    value: row.value !== undefined && row.value !== null && row.value !== '' ? Number(row.value) : undefined,
    valueStatus: row.value_status,
    reminders,
    createdAt: row.created_at
  };
}
