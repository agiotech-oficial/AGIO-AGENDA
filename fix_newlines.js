const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

code = code.replace(/\\n/g, '\n');

fs.writeFileSync('app/page.tsx', code);
console.log('Fixed \\n');
