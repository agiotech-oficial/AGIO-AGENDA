const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

if (!code.includes("import { onAuthStateChanged } from 'firebase/auth';")) {
  code = code.replace(
    "import { auth } from '../lib/firebase';",
    "import { auth } from '../lib/firebase';\nimport { onAuthStateChanged } from 'firebase/auth';"
  );
}

const authStateCode = `
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRes = await fetch(\`/api/users?firebaseUid=\${firebaseUser.uid}\`);
          if (userRes.ok) {
            const dbUser = await userRes.json();
            if (dbUser) {
              setCurrentUser({
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
              } as any);
              setUserName(dbUser.name);
              setUserWhatsapp(dbUser.whatsapp);
              
              const appsRes = await fetch(\`/api/appointments?userId=\${firebaseUser.uid}\`);
              if (appsRes.ok) {
                 const appsData = await appsRes.json();
                 setAppointments(appsData.map((a: any) => ({ ...a, id: a.id.toString() })));
              }
              
              if (view === 'landing') setView('main_menu');
            }
          }
        } catch(e) {
          console.error("Error restoring session", e);
        }
      }
    });
    return () => unsubscribe();
  }, [view]); // Add view dependency to re-eval if needed, or better empty array, but we use view inside. We can safely just keep empty array and use functional state update if we had to, but here it's fine.
`;

// Inject before handleLogout
const injectTarget = 'const handleLogout = async () => {';
code = code.substring(0, code.indexOf(injectTarget)) + authStateCode + "\n  " + code.substring(code.indexOf(injectTarget));

fs.writeFileSync('app/page.tsx', code);
console.log('Auth state observer added');
