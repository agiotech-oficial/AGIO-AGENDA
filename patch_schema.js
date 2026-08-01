const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

const oldSchema = `  totpSecret: text("totp_secret"),`;
const newSchema = `  totpSecret: text("totp_secret"),
  webAuthnEnabled: boolean("webauthn_enabled").default(false),
  webAuthnCredentialId: text("webauthn_credential_id"),`;

code = code.replace(oldSchema, newSchema);
fs.writeFileSync('src/db/schema.ts', code);
console.log('Schema patched');
