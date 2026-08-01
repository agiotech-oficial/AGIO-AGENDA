const fs = require('fs');
let code = fs.readFileSync('src/app/api/users/route.ts', 'utf8');

const oldSet = `    if (body.totpSecret !== undefined) dataToSet.totpSecret = body.totpSecret;`;
const newSet = `    if (body.totpSecret !== undefined) dataToSet.totpSecret = body.totpSecret;
    if (body.webAuthnEnabled !== undefined) dataToSet.webAuthnEnabled = body.webAuthnEnabled;
    if (body.webAuthnCredentialId !== undefined) dataToSet.webAuthnCredentialId = body.webAuthnCredentialId;`;

const oldInsert = `        totpEnabled: false,`;
const newInsert = `        totpEnabled: false,
        webAuthnEnabled: false,`;

if(code.includes(oldSet)) {
  code = code.replace(oldSet, newSet);
  code = code.replace(oldInsert, newInsert);
  fs.writeFileSync('src/app/api/users/route.ts', code);
  console.log('API patched');
} else {
  console.log('Block not found');
}
