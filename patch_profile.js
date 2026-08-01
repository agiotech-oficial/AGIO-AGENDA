const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');
const searchStr = `<h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Personalização Visual</h4>`;
const replacement = `<h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Dados Demográficos</h4>
                <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-lg border border-white/20 mb-2">
                   <label className="text-sm font-medium text-white flex flex-col gap-1">
                     Idade
                     <input
                        type="number"
                        value={currentUser?.age || ''}
                       onChange={(e) => handleUpdateUserData({ age: e.target.value })}
                       className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg block p-2 mt-1 placeholder-white/30"
                       placeholder="Ex: 35"
                     />
                   </label>
                   <label className="text-sm font-medium text-white flex flex-col gap-1">
                     Sexo
                     <select
                        value={currentUser?.gender || ''}
                       onChange={(e) => handleUpdateUserData({ gender: e.target.value })}
                       className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg block p-2 mt-1"
                     >
                       <option value="" className="text-black">Selecione</option>
                       <option value="Masculino" className="text-black">Masculino</option>
                       <option value="Feminino" className="text-black">Feminino</option>
                       <option value="Outro" className="text-black">Outro</option>
                       <option value="Prefiro não dizer" className="text-black">Prefiro não dizer</option>
                     </select>
                   </label>
                   <label className="text-sm font-medium text-white flex flex-col gap-1">
                     Profissão
                     <input
                        type="text"
                        value={currentUser?.profession || ''}
                       onChange={(e) => handleUpdateUserData({ profession: e.target.value })}
                       className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg block p-2 mt-1 placeholder-white/30"
                       placeholder="Sua profissão"
                     />
                   </label>
                </div>
                ${searchStr}`;
code = code.replace(searchStr, replacement);
fs.writeFileSync('app/page.tsx', code);
