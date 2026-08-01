const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const mfaOld = `      if (dbUser.mfaEnabled) {
         const mfaCode = prompt("Verificação de duas etapas ativada. Informe o PIN de segurança:");
         // Simple simulation of MFA
         if (mfaCode !== localStorage.getItem('mfa_pin_' + firebaseUser.uid)) {
            alert("PIN incorreto!");
            await auth.signOut();
            return;
         }
      }`;

const mfaNew = `      if (dbUser.totpEnabled) {
         const totpCode = prompt("Verificação de duas etapas (Google Authenticator) ativada. Informe o código de 6 dígitos:");
         if (!totpCode) {
            await signOutAuth();
            return;
         }
         const verRes = await fetch('/api/2fa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: dbUser.totpSecret, token: totpCode })
         });
         const verData = await verRes.json();
         if (!verData.verified) {
            alert("Código incorreto!");
            await signOutAuth();
            return;
         }
      } else if (dbUser.mfaEnabled) {
         const mfaCode = prompt("Verificação de duas etapas ativada. Informe o PIN de segurança:");
         if (mfaCode !== localStorage.getItem('mfa_pin_' + firebaseUser.uid)) {
            alert("PIN incorreto!");
            await signOutAuth();
            return;
         }
      }`;

code = code.replace(mfaOld, mfaNew);

// Add totpEnabled and totpSecret to AffiliateUser assignment inside handleUserLogin
const affOld = `         createdAt: dbUser.createdAt,
         firebaseUid: firebaseUser.uid,
         mfaEnabled: dbUser.mfaEnabled
      };`;
const affNew = `         createdAt: dbUser.createdAt,
         firebaseUid: firebaseUser.uid,
         mfaEnabled: dbUser.mfaEnabled,
         totpEnabled: dbUser.totpEnabled,
         totpSecret: dbUser.totpSecret
      };`;

code = code.replace(affOld, affNew);

fs.writeFileSync('app/page.tsx', code);
console.log('Login patched with TOTP');
