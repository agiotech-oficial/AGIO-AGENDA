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
    const isAffiliate = userData.isAffiliate !== undefined ? (Boolean(userData.isAffiliate) ? 1 : 0) : null;
    const deviceId = userData.deviceId || userData.device_id || null;
    const allowedDeviceIds = userData.allowedDeviceIds ? (Array.isArray(userData.allowedDeviceIds) ? JSON.stringify(userData.allowedDeviceIds) : String(userData.allowedDeviceIds)) : (deviceId ? JSON.stringify([deviceId]) : null);
    const macAddress = userData.macAddress || userData.mac_address || null;
    const location = userData.location || null;
    const latitude = userData.latitude !== undefined && userData.latitude !== null ? String(userData.latitude) : null;
    const longitude = userData.longitude !== undefined && userData.longitude !== null ? String(userData.longitude) : null;
    const ipAddress = userData.ipAddress || userData.ip_address || userData.ip || null;

    const sql = `
      INSERT INTO users (
        firebase_uid, name, email, photo_url, mfa_enabled, totp_enabled, totp_secret,
        webauthn_enabled, webauthn_credential_id, whatsapp, cpf, city, state, country,
        plan, theme_color, theme_bg, age, gender, profession, pix_key, language,
        sound_enabled, voice_enabled, mfa_pin, visual_edits, is_affiliate,
        device_id, allowed_device_ids, mac_address, location, latitude, longitude, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        visual_edits = COALESCE(VALUES(visual_edits), visual_edits),
        is_affiliate = COALESCE(VALUES(is_affiliate), is_affiliate),
        device_id = COALESCE(VALUES(device_id), device_id),
        allowed_device_ids = COALESCE(VALUES(allowed_device_ids), allowed_device_ids),
        mac_address = COALESCE(VALUES(mac_address), mac_address),
        location = COALESCE(VALUES(location), location),
        latitude = COALESCE(VALUES(latitude), latitude),
        longitude = COALESCE(VALUES(longitude), longitude),
        ip_address = COALESCE(VALUES(ip_address), ip_address);
    `;

    await queryMySQL(sql, [
      uid, name, email, photoUrl, mfaEnabled, totpEnabled, totpSecret,
      webAuthnEnabled, webAuthnCredentialId, whatsapp, cpf, city, state, country,
      plan, themeColor, themeBg, age, gender, profession, pixKey, language,
      soundEnabled, voiceEnabled, mfaPin, visualEdits, isAffiliate,
      deviceId, allowedDeviceIds, macAddress, location, latitude, longitude, ipAddress
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
      const valStr = app.value !== undefined && app.value !== null && app.value !== '' ? String(app.value) : null;
      const cId = String(app.id || app.clientId || app._id || '');
      const itemTypeStr = app.itemType || ((app.value !== undefined && app.value !== null && Number(app.value) > 0) || app.valueStatus ? 'conta' : 'compromisso');
      const colorStr = app.color || '#10b981';
      const alarmTypeStr = app.alarmType || 'text';
      const customAudioUrlStr = app.customAudioUrl || null;
      const googleDocIdStr = app.googleDocId || null;
      const googleDocUrlStr = app.googleDocUrl || null;

      try {
        await queryMySQL(`
          INSERT INTO appointments (
            client_id, user_id, title, date, time, category, address, contact, notes, value, value_status, reminders,
            item_type, color, alarm_type, custom_audio_url, google_doc_id, google_doc_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          cId,
          userId,
          app.title || 'Sem título',
          app.date || '',
          app.time || '00:00',
          app.category || 'Trabalho',
          app.address || null,
          app.contact || null,
          app.notes || null,
          valStr,
          app.valueStatus || null,
          remindersStr,
          itemTypeStr,
          colorStr,
          alarmTypeStr,
          customAudioUrlStr,
          googleDocIdStr,
          googleDocUrlStr
        ]);
      } catch (insertErr) {
        // Fallback in case columns were not migrated
        await queryMySQL(`
          INSERT INTO appointments (
            user_id, title, date, time, category, address, contact, notes, value, value_status, reminders
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          app.title || 'Sem título',
          app.date || '',
          app.time || '00:00',
          app.category || 'Trabalho',
          app.address || null,
          app.contact || null,
          app.notes || null,
          valStr,
          app.valueStatus || null,
          remindersStr
        ]);
      }
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
    await queryMySQL('DELETE FROM appointments WHERE user_id = ? AND (id = ? OR client_id = ?)', [userId, appointmentId, appointmentId]);
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
    isAffiliate: Boolean(row.is_affiliate),
    deviceId: row.device_id,
    allowedDeviceIds: (() => {
      if (!row.allowed_device_ids) return row.device_id ? [row.device_id] : [];
      try {
        const parsed = JSON.parse(row.allowed_device_ids);
        return Array.isArray(parsed) ? parsed : [String(parsed)];
      } catch (e) {
        return [row.allowed_device_ids];
      }
    })(),
    macAddress: row.mac_address,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    ipAddress: row.ip_address,
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

  const finalId = String(row.client_id || row.id);
  const parsedValue = row.value !== undefined && row.value !== null && row.value !== '' ? Number(row.value) : undefined;
  const isConta = row.item_type === 'conta' || ((parsedValue !== undefined && parsedValue > 0) || Boolean(row.value_status));

  return {
    id: finalId,
    clientId: finalId,
    userId: row.user_id,
    title: row.title || 'Sem título',
    date: row.date || '',
    time: row.time || '00:00',
    category: row.category || 'Trabalho',
    address: row.address || undefined,
    contact: row.contact || undefined,
    notes: row.notes || undefined,
    value: parsedValue,
    valueStatus: row.value_status || (isConta ? 'a_receber' : undefined),
    reminders,
    itemType: (row.item_type || (isConta ? 'conta' : 'compromisso')) as 'compromisso' | 'conta',
    color: row.color || '#10b981',
    alarmType: (row.alarm_type || 'text') as 'text' | 'sound',
    customAudioUrl: row.custom_audio_url || undefined,
    googleDocId: row.google_doc_id || undefined,
    googleDocUrl: row.google_doc_url || undefined,
    createdAt: row.created_at
  };
}
