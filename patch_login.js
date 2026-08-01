const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');
const oldBlock = `      } else if (email && password && !name) {
        // Login
        const userCredential = await loginWithEmail(email, password);
        firebaseUser = userCredential.user;
      } else {
        alert("E-mail e senha são obrigatórios.");
        return;
      }`;
const newBlock = `      } else if (email && password && !name) {
        // Login
        const userCredential = await loginWithEmail(email, password);
        firebaseUser = userCredential.user;
      } else if (auth.currentUser) {
        // Google login or already authenticated
        firebaseUser = auth.currentUser;
      } else {
        alert("E-mail e senha são obrigatórios.");
        return;
      }`;
if(code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync('app/page.tsx', code);
  console.log('Login patched');
} else {
  console.log('Block not found');
}
