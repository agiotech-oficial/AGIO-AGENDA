import { pgTable, serial, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: varchar("firebase_uid", { length: 255 }).notNull().unique(),
  name: text("name"),
  email: text("email").notNull().unique(),
  photoUrl: text("photo_url"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  totpEnabled: boolean("totp_enabled").default(false),
  totpSecret: text("totp_secret"),
  webAuthnEnabled: boolean("webauthn_enabled").default(false),
  webAuthnCredentialId: text("webauthn_credential_id"),
  whatsapp: text("whatsapp"),
  cpf: text("cpf"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  plan: text("plan").default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // Custom user settings and preferences synced directly to the central database
  themeColor: text("theme_color"),
  themeBg: text("theme_bg"),
  age: text("age"),
  gender: text("gender"),
  profession: text("profession"),
  pixKey: text("pix_key"),
  language: text("language"),
  soundEnabled: boolean("sound_enabled").default(true),
  voiceEnabled: boolean("voice_enabled").default(false),
  mfaPin: text("mfa_pin"),
  visualEdits: text("visual_edits"),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  category: text("category").notNull(),
  address: text("address"),
  contact: text("contact"),
  notes: text("notes"),
  value: text("value"),
  valueStatus: text("value_status"),
  reminders: text("reminders"), // Stored as a serialized JSON array of reminder offsets (e.g. ['15m'])
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
