const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const oldSaveFn = `const appData = { ...dataToSave, category: dataToSave.category as CategoryType, userId: currentUser.firebaseUid };
      // Note: In a real app we'd get the inserted ID, but for simplicity we rely on refetching or mocking ID
      await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appData) });`;

const newSaveFn = `const appData = { ...dataToSave, category: dataToSave.category as CategoryType, userId: currentUser.firebaseUid };
      await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appData) });`;

code = code.replace(oldSaveFn, newSaveFn);

fs.writeFileSync('app/page.tsx', code);
