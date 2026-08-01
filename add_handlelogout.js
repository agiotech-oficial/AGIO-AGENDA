const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const target = 'const [currentUser, setCurrentUser] = useState<AffiliateUser | null>(null);';
const handleLogoutCode = `
  const handleLogout = async () => {
    try {
      await signOutAuth();
    } catch(e) {}
    setCurrentUser(null);
    setAppointments([]);
    setView('landing');
  };
`;
code = code.replace(target, target + "\\n" + handleLogoutCode);

fs.writeFileSync('app/page.tsx', code);
console.log('Added handleLogout');
