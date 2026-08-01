const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const loginBlockOld = `      if (dbUser.totpEnabled) {
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

const loginBlockNew = `      if (dbUser.webAuthnEnabled) {
         try {
             if (!window.PublicKeyCredential) throw new Error("WebAuthn não suportado");
             const challenge = new Uint8Array(32);
             window.crypto.getRandomValues(challenge);
             await navigator.credentials.get({
               publicKey: {
                 challenge: challenge,
                 rpId: window.location.hostname,
                 userVerification: "required",
                 timeout: 60000
               }
             });
             // Se passou, prossegue
         } catch(e) {
             console.error(e);
             alert("Autenticação por biometria falhou ou foi cancelada!");
             await signOutAuth();
             return;
         }
      } else if (dbUser.totpEnabled) {
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

if(code.includes(loginBlockOld)) {
  code = code.replace(loginBlockOld, loginBlockNew);
}

const authOld = `         mfaEnabled: dbUser.mfaEnabled,
         totpEnabled: dbUser.totpEnabled,
         totpSecret: dbUser.totpSecret
      };`;
const authNew = `         mfaEnabled: dbUser.mfaEnabled,
         totpEnabled: dbUser.totpEnabled,
         totpSecret: dbUser.totpSecret,
         webAuthnEnabled: dbUser.webAuthnEnabled,
         webAuthnCredentialId: dbUser.webAuthnCredentialId
      };`;

if(code.includes(authOld)) {
  code = code.replace(authOld, authNew);
}

fs.writeFileSync('app/page.tsx', code);
console.log('Login MFA patched');
