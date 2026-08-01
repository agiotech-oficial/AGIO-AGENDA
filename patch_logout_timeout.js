const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

if (!code.includes('import { signOut } from')) {
  code = code.replace(
    "import { loginWithEmail, registerWithEmail } from '../lib/authFunctions';",
    "import { loginWithEmail, registerWithEmail, signOut as signOutAuth } from '../lib/authFunctions';"
  );
}

// 1. Update handleLogout
code = code.replace(
  'const handleLogout = () => {',
  `const handleLogout = async () => {
    try { await signOutAuth(); } catch(e) {}`
);

// 2. Add activity tracker and timeout to the main useEffect or simply in the component root
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

// Inject this effect after handleUserLogin
const injectTarget = 'const handleLogout = async () => {';
code = code.substring(0, code.indexOf(injectTarget)) + activityTrackerCode + "\n  " + code.substring(code.indexOf(injectTarget));

fs.writeFileSync('app/page.tsx', code);
console.log('Timeout logic patched');
