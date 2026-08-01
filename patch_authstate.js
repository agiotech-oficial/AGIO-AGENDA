const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const oldState = `                createdAt: dbUser.createdAt,
                firebaseUid: firebaseUser.uid,
                mfaEnabled: dbUser.mfaEnabled
              } as any);`;
const newState = `                createdAt: dbUser.createdAt,
                firebaseUid: firebaseUser.uid,
                mfaEnabled: dbUser.mfaEnabled,
                totpEnabled: dbUser.totpEnabled,
                totpSecret: dbUser.totpSecret
              } as any);`;

code = code.replace(oldState, newState);
fs.writeFileSync('app/page.tsx', code);
console.log('AuthState patched');
