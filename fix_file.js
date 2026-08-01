const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Remove everything before "use client";
const useClientIdx = code.indexOf('"use client";');
if (useClientIdx > -1) {
  code = code.substring(useClientIdx);
}

// 2. Find the inside of AgendaApp to inject both the timeout tracker AND the auth observer
const injectInsideComponentTarget = 'const [currentUser, setCurrentUser] = useState<AffiliateUser | null>(null);';

const activityTrackerCode = `
  useEffect(() => {
    if (!currentUser) return;
    
    const resetActivity = () => {
      localStorage.setItem('agenda_last_activity', Date.now().toString());
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('click', resetActivity);
    window.addEventListener('scroll', resetActivity);

    const checkTimeout = setInterval(() => {
      const lastActivity = parseInt(localStorage.getItem('agenda_last_activity') || '0');
      if (lastActivity && Date.now() - lastActivity > 10 * 60 * 1000) {
        alert("Sessão expirada por inatividade (10 minutos).");
        handleLogout();
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('click', resetActivity);
      window.removeEventListener('scroll', resetActivity);
      clearInterval(checkTimeout);
    };
  }, [currentUser]);
`;

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
  }, [view]); // Add view dependency to re-eval if needed
`;

// Insert the code right after currentUser state definition
code = code.replace(injectInsideComponentTarget, injectInsideComponentTarget + "\\n" + activityTrackerCode + "\\n" + authStateCode);

fs.writeFileSync('app/page.tsx', code);
console.log('Fixed file top and injected effects properly');
