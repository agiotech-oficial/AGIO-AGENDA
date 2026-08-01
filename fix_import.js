const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

code = code.replace(
  "import { loginWithEmail, registerWithEmail } from '../lib/authFunctions';",
  "import { loginWithEmail, registerWithEmail, signOut as signOutAuth } from '../lib/authFunctions';"
);

fs.writeFileSync('app/page.tsx', code);
