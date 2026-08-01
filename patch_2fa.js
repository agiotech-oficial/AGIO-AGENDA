const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const backupSection = `<div className="flex flex-col gap-2">
                <button onClick={handleSyncGoogleDrive} disabled={isSyncingDrive} className="w-full flex items-center justify-center gap-2 bg-[#4285F4] hover:bg-[#3367D6] text-white py-3 px-4 rounded-lg font-bold transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined">cloud_sync</span>
                  {isSyncingDrive ? 'Sincronizando...' : 'Fazer Backup no Google Drive'}
                </button>
              </div>`;

const mfaSection = `<div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/20">
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

code = code.replace(backupSection, backupSection + "\\n" + mfaSection);

fs.writeFileSync('app/page.tsx', code);
console.log('2FA added to profile');
