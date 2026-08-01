const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');
code = code.replace(
  'const [currentUser, setCurrentUser] = useState<AffiliateUser | null>(null);',
  'const [currentUser, setCurrentUser] = useState<AffiliateUser | null>(null);\n  useAccessTracker(currentUser);'
);
fs.writeFileSync('app/page.tsx', code);
