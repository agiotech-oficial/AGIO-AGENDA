const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

if (!code.includes('import { loginWithEmail, registerWithEmail }')) {
  code = code.replace(
    "import { auth } from '../lib/firebase';",
    "import { auth } from '../lib/firebase';\nimport { loginWithEmail, registerWithEmail } from '../lib/authFunctions';"
  );
}

// Find handleUserLogin and replace it entirely!
const startIdx = code.indexOf('const handleUserLogin = async');
// find the closing brace of handleUserLogin. It ends before const handleLogout = () => {
const endMarker = '  const handleLogout = () => {';
const endIdx = code.indexOf(endMarker);

const newHandleUserLogin = `const handleUserLogin = async (name: string, whatsapp: string, isAffiliateOptIn?: boolean, email?: string, cpf?: string, city?: string, state?: string, country?: string, password?: string) => {
    if (name === 'Visitante' && whatsapp === '') {
      setUserName(name);
      setUserWhatsapp(whatsapp);
      setView('main_menu');
      triggerInstallPrompt();
      return;
    }

    try {
      let firebaseUser = null;
      let isNewUser = false;
      
      // Determine if it's login or registration
      if (email && password && name) {
        // Registration
        try {
          const userCredential = await registerWithEmail(email, password);
          firebaseUser = userCredential.user;
          isNewUser = true;
        } catch(e: any) {
          if (e.code === 'auth/email-already-in-use') {
             // Fallback to login if already exists
             const userCredential = await loginWithEmail(email, password);
             firebaseUser = userCredential.user;
          } else {
             throw e;
          }
        }
      } else if (email && password && !name) {
        // Login
        const userCredential = await loginWithEmail(email, password);
        firebaseUser = userCredential.user;
      } else {
        alert("E-mail e senha são obrigatórios.");
        return;
      }

      // Sync with our PostgreSQL DB
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          name: name || undefined,
          email: email || firebaseUser.email,
          whatsapp,
          cpf,
          city,
          state,
          country,
          mfaEnabled: false
        })
      });
      
      if (!res.ok) throw new Error("Failed to sync user with DB");

      // Fetch full user record from DB
      const userRes = await fetch(\`/api/users?firebaseUid=\${firebaseUser.uid}\`);
      if (!userRes.ok) throw new Error("Failed to fetch user record");
      
      const dbUser = await userRes.json();
      
      if (dbUser.mfaEnabled) {
         const mfaCode = prompt("Verificação de duas etapas ativada. Informe o PIN de segurança:");
         // Simple simulation of MFA, ideally verified on backend. For now we just enforce it locally as requested
         if (mfaCode !== localStorage.getItem('mfa_pin_' + firebaseUser.uid)) {
            alert("PIN incorreto!");
            await auth.signOut();
            return;
         }
      }

      // Format for the app state
      const affiliateUser = {
         id: dbUser.id.toString(),
         name: dbUser.name,
         whatsapp: dbUser.whatsapp,
         email: dbUser.email,
         cpf: dbUser.cpf,
         city: dbUser.city,
         state: dbUser.state,
         country: dbUser.country,
         plan: dbUser.plan,
         createdAt: dbUser.createdAt,
         firebaseUid: firebaseUser.uid,
         mfaEnabled: dbUser.mfaEnabled
      };
      
      setCurrentUser(affiliateUser as any);
      setUserName(affiliateUser.name);
      setUserWhatsapp(affiliateUser.whatsapp);
      localStorage.setItem('agenda_last_activity', Date.now().toString());
      
      // Load appointments from Postgres!
      const appsRes = await fetch(\`/api/appointments?userId=\${firebaseUser.uid}\`);
      if (appsRes.ok) {
         const appsData = await appsRes.json();
         // map to the internal format
         setAppointments(appsData.map((a: any) => ({
            ...a,
            id: a.id.toString()
         })));
      }
      
      setView('main_menu');
      triggerInstallPrompt();
      
    } catch (error: any) {
       console.error("Login Error", error);
       alert("Erro ao realizar login: " + error.message);
    }
  };

`;

code = code.substring(0, startIdx) + newHandleUserLogin + code.substring(endIdx);
fs.writeFileSync('app/page.tsx', code);
console.log("handleUserLogin patched successfully!");
