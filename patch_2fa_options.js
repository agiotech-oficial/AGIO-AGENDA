const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const mfaSectionOld = `<div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/20">
                <h4 className="text-white font-bold mb-2">Segurança</h4>
                <button 
                  onClick={async () => {
                    if (!currentUser) return;
                    const newMfa = !currentUser.mfaEnabled;
                    if (newMfa) {
                      const pin = prompt("Crie um PIN de segurança (6 dígitos) para a Autenticação de 2 Fatores:");
                      if (!pin || pin.length < 4) {
                        alert("PIN inválido.");
                        return;
                      }
                      localStorage.setItem('mfa_pin_' + currentUser.firebaseUid, pin);
                    }
                    
                    try {
                      await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                           firebaseUid: currentUser.firebaseUid,
                           name: currentUser.name,
                           email: currentUser.email,
                           whatsapp: currentUser.whatsapp,
                           cpf: currentUser.cpf,
                           city: currentUser.city,
                           state: currentUser.state,
                           country: currentUser.country,
                           mfaEnabled: newMfa
                        })
                      });
                      setCurrentUser({...currentUser, mfaEnabled: newMfa});
                      alert(\`Autenticação de duas etapas \${newMfa ? 'ativada' : 'desativada'} com sucesso.\`);
                    } catch(e) {
                      alert("Erro ao salvar configuração.");
                    }
                  }} 
                  className="w-full flex items-center justify-center gap-2 bg-[#0E5C3B] hover:bg-[#0B4A2F] text-white py-3 px-4 rounded-lg font-bold transition-colors"
                >
                  <span className="material-symbols-outlined">verified_user</span>
                  {currentUser?.mfaEnabled ? 'Desativar Autenticação 2 Fatores' : 'Ativar Autenticação 2 Fatores'}
                </button>
              </div>`;
              
const mfaSectionNew = `<div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/20">
                <h4 className="text-white font-bold mb-2">Segurança (Autenticação)</h4>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white">Autenticação por PIN</span>
                    <button 
                      onClick={async () => {
                        if (!currentUser) return;
                        const newMfa = !currentUser.mfaEnabled;
                        if (newMfa) {
                          const pin = prompt("Crie um PIN de segurança (mínimo 4 dígitos):");
                          if (!pin || pin.length < 4) {
                            alert("PIN inválido.");
                            return;
                          }
                          localStorage.setItem('mfa_pin_' + currentUser.firebaseUid, pin);
                        }
                        try {
                          await fetch('/api/users', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ firebaseUid: currentUser.firebaseUid, mfaEnabled: newMfa })
                          });
                          setCurrentUser({...currentUser, mfaEnabled: newMfa});
                          alert(\`Autenticação por PIN \${newMfa ? 'ativada' : 'desativada'} com sucesso.\`);
                        } catch(e) { alert("Erro ao salvar configuração."); }
                      }} 
                      className={\`px-3 py-1 rounded text-xs font-bold transition-colors \${currentUser?.mfaEnabled ? 'bg-error/20 text-red-200 hover:bg-error/30' : 'bg-primary/20 text-primary hover:bg-primary/30'}\`}
                    >
                      {currentUser?.mfaEnabled ? 'Desativar' : 'Ativar PIN'}
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">Google Authenticator (TOTP)</span>
                      <span className="text-xs text-white/50">Mais seguro, usando app no celular</span>
                    </div>
                    {currentUser?.totpEnabled ? (
                      <button 
                        onClick={async () => {
                          if (!currentUser) return;
                          if (confirm('Tem certeza que deseja desativar o Google Authenticator?')) {
                            await fetch('/api/users', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ firebaseUid: currentUser.firebaseUid, totpEnabled: false, totpSecret: null })
                            });
                            setCurrentUser({...currentUser, totpEnabled: false, totpSecret: undefined});
                            alert('Google Authenticator desativado.');
                          }
                        }}
                        className="bg-error/20 text-red-200 hover:bg-error/30 px-3 py-1 rounded text-xs font-bold transition-colors"
                      >
                        Desativar
                      </button>
                    ) : (
                      <button 
                        onClick={async () => {
                          if (!currentUser) return;
                          try {
                            const res = await fetch('/api/auth/2fa/generate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: currentUser.email })
                            });
                            const data = await res.json();
                            
                            // Em vez de usar state novo que eu teria que declarar, vou usar um modal usando os hooks que eu ja sei q existem ou prompt,
                            // Mas prompt não roda html. Vamos criar uma div absoluta temporária.
                            // Na verdade eu crio os states no top level.
                            setSetup2FASecret(data.secret);
                            setSetup2FAQrCode(data.qrCode);
                            setIsTwoFactorModalOpen(true);
                          } catch(e) {
                            alert('Erro ao gerar código 2FA');
                          }
                        }}
                        className="bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1 rounded text-xs font-bold transition-colors"
                      >
                        Configurar
                      </button>
                    )}
                  </div>
                </div>
              </div>`;

if (code.includes('const newMfa = !currentUser.mfaEnabled;')) {
    const startIndex = code.indexOf('<div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/20">');
    const endIndex = code.indexOf('</div>', startIndex) + 6;
    // Actually mfaSectionOld is much longer, it has nested divs. 
    // I will replace it accurately.
}

code = code.replace(mfaSectionOld, mfaSectionNew);

fs.writeFileSync('app/page.tsx', code);
