const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// Update LandingView props
code = code.replace(
  /onLogin: \(name: string, whatsapp: string, isAffiliateOptIn: boolean, email\?: string, cpf\?: string, city\?: string, state\?: string, country\?: string\) => void/g,
  'onLogin: (name: string, whatsapp: string, isAffiliateOptIn: boolean, email?: string, cpf?: string, city?: string, state?: string, country?: string, password?: string) => void'
);

// Add password state to LandingView
code = code.replace(
  "const [loginEmail, setLoginEmail] = useState('');",
  "const [loginEmail, setLoginEmail] = useState('');\n  const [loginPassword, setLoginPassword] = useState('');\n  const [password, setPassword] = useState('');"
);

// Update handleSubmit
code = code.replace(
  "onLogin(name || 'Visitante', whatsapp, isAffiliateOptIn, email, cpf, city, state, country);",
  "onLogin(name || 'Visitante', whatsapp, isAffiliateOptIn, email, cpf, city, state, country, password);"
);

// Update password input in form to be bound
code = code.replace(
  'id="password" placeholder="••••••••" type="password" required disabled={isSubmitting}',
  'id="password" placeholder="••••••••" type="password" required disabled={isSubmitting} value={password} onChange={(e) => setPassword(e.target.value)}'
);

// Update login modal
const oldLoginModalBtn = `                  if (loginEmail.trim() === '') {
                    alert('Por favor, informe seu e-mail ou WhatsApp.');
                    return;
                  }
                  setIsLoginModalOpen(false);
                  
                  const isEmail = loginEmail.includes('@');
                  if (isEmail) {
                    onLogin('', '', false, loginEmail);
                  } else {
                    onLogin('', loginEmail, false);
                  }`;
                  
const newLoginModalBtn = `                  if (loginEmail.trim() === '' || loginPassword.trim() === '') {
                    alert('Por favor, informe seu e-mail/WhatsApp e senha.');
                    return;
                  }
                  setIsLoginModalOpen(false);
                  
                  const isEmail = loginEmail.includes('@');
                  if (isEmail) {
                    onLogin('', '', false, loginEmail, undefined, undefined, undefined, undefined, loginPassword);
                  } else {
                    onLogin('', loginEmail, false, undefined, undefined, undefined, undefined, undefined, loginPassword);
                  }`;

code = code.replace(oldLoginModalBtn, newLoginModalBtn);

const oldLoginModalInput = `              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white" htmlFor="loginEmail">E-mail ou WhatsApp</label>
                <input 
                  type="text" 
                  id="loginEmail"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-white/10 border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary px-4 py-3 rounded-lg text-white placeholder-white/40"
                  placeholder="Ex: seu@email.com ou 11999999999"
                  autoFocus
                />
              </div>`;
              
const newLoginModalInput = `              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white" htmlFor="loginEmail">E-mail ou WhatsApp</label>
                <input 
                  type="text" 
                  id="loginEmail"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-white/10 border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary px-4 py-3 rounded-lg text-white placeholder-white/40"
                  placeholder="Ex: seu@email.com ou 11999999999"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white" htmlFor="loginPassword">Senha</label>
                <input 
                  type="password" 
                  id="loginPassword"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-white/10 border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary px-4 py-3 rounded-lg text-white placeholder-white/40"
                  placeholder="••••••••"
                />
              </div>`;

code = code.replace(oldLoginModalInput, newLoginModalInput);

// Replace handleUserLogin signature
code = code.replace(
  'const handleUserLogin = async (name: string, whatsapp: string, isAffiliateOptIn?: boolean, email?: string, cpf?: string, city?: string, state?: string, country?: string) => {',
  'const handleUserLogin = async (name: string, whatsapp: string, isAffiliateOptIn?: boolean, email?: string, cpf?: string, city?: string, state?: string, country?: string, password?: string) => {'
);

// We need to inject the auth logic. Let's create a new script file that patches handleUserLogin completely.
fs.writeFileSync('app/page.tsx', code);
console.log('Patch basic auth inputs applied successfully');
