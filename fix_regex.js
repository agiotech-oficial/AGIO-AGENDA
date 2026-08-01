const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// The line is: trackEvent('click', `Clicou em: ${text.trim().replace(/
// /g, ' ')}`, currentUser);
// I will use regex to fix it.

code = code.replace(/\.replace\(\/\n\/g, ' '\)/g, ".replace(/\\\\n/g, ' ')");
code = code.replace("setCurrentUser(null);\n    setAppointments([]);\n    setView('landing');", "setCurrentUser(null); setAppointments([]); setView('landing');");

fs.writeFileSync('app/page.tsx', code);
console.log('Fixed Regex');
