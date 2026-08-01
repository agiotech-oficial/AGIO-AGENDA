const fs = require('fs');
let code = fs.readFileSync('components/AffiliateLeads.tsx', 'utf-8');

const returnIndex = code.indexOf('  return (\n    <div className="bg-white/5 border border-white/20 rounded-xl p-4 mt-4 w-full">');

if (returnIndex === -1) {
  console.log("Could not find return statement");
  process.exit(1);
}

const beforeReturn = code.substring(0, returnIndex);

const newReturn = `  return (
    <div className="bg-white/5 border border-white/20 rounded-xl p-4 mt-4 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-white">perm_contact_calendar</span>
          Captura e Gestão de Leads
        </h3>
      </div>

      <div className="flex gap-2 mb-4 border-b border-white/10 pb-2 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('whatsapp')}
          className={\`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors \${activeTab === 'whatsapp' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}\`}
        >
          Agenda do WhatsApp
        </button>
        <button 
          onClick={() => setActiveTab('social')}
          className={\`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors \${activeTab === 'social' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}\`}
        >
          Gerador para Redes Sociais
        </button>
      </div>

      {activeTab === 'whatsapp' && (
        <>
          <div className="flex justify-between items-start sm:items-center mb-4 gap-2 flex-col sm:flex-row">
            <p className="text-xs text-white/70">
              Conecte sua agenda telefônica para capturar leads. Envie seu link de forma seletiva (anti-spam).
            </p>
            <button
              onClick={handleImportContacts}
              disabled={isImporting}
              className="bg-[#132215] text-white hover:bg-[#1b2f1e] border border-white/20 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px] text-green-400">import_contacts</span>
              {isImporting ? 'Importando...' : 'Importar da Agenda'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..." 
              value={search}
              onChange={(e) => {setSearch(e.target.value); setPage(1);}}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white"
            />
            <select
              value={filterStatus}
              onChange={(e) => {setFilterStatus(e.target.value); setPage(1);}}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white"
            >
              <option value="all" className="text-black">Todos os Status</option>
              <option value="Não enviado" className="text-black">Não enviado</option>
              <option value="Link enviado" className="text-black">Link enviado</option>
              <option value="Agendamento proposto" className="text-black">Agendamento proposto</option>
            </select>
            {marketingMaterials.length > 0 && (
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white max-w-xs"
                title="Selecione um material de divulgação para enviar junto com o link"
              >
                <option value="" className="text-black">Apenas o link de afiliado</option>
                {marketingMaterials.map(mat => (
                  <option key={mat.id} value={mat.id} className="text-black">{mat.title}</option>
                ))}
              </select>
            )}
          </div>

          {someSelected && (
            <div className="mb-2 p-2 bg-yellow-400/20 rounded-lg flex items-center justify-between border border-yellow-400/30">
              <span className="text-xs text-yellow-100 font-medium">{leads.filter(l => l.selected).length} selecionados</span>
              <button onClick={deleteSelected} className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded hover:bg-red-500/40 transition-colors">
                Remover Selecionados
              </button>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-white/20 bg-black/20">
            <table className="w-full text-left text-sm text-white/90">
              <thead className="bg-white/10 text-xs uppercase text-white/70">
                <tr>
                  <th className="px-4 py-3 w-[40px]">
                    <input 
                      type="checkbox" 
                      className="rounded bg-white/10 border-white/30 text-green-500 focus:ring-green-500"
                      onChange={toggleSelectAll}
                      checked={filteredLeads.length > 0 && filteredLeads.every(l => l.selected)}
                    />
                  </th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {currentLeads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                      Nenhum contato encontrado. Importe de sua agenda.
                    </td>
                  </tr>
                ) : (
                  currentLeads.map(lead => (
                    <tr key={lead.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="rounded bg-white/10 border-white/30 text-green-500 focus:ring-green-500"
                          checked={lead.selected || false}
                          onChange={() => toggleSelect(lead.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{lead.name}</div>
                        <div className="text-xs text-white/60">{lead.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => changeStatus(lead.id, e.target.value as Lead['status'])}
                          className={\`text-xs px-2 py-1 rounded outline-none border border-transparent font-medium
                            \${lead.status === 'Não enviado' ? 'bg-gray-500/20 text-gray-300 hover:border-gray-400/50' : 
                              lead.status === 'Link enviado' ? 'bg-blue-500/20 text-blue-300 hover:border-blue-400/50' : 
                              'bg-green-500/20 text-green-300 hover:border-green-400/50'}
                          \`}
                        >
                          <option value="Não enviado" className="text-black">Não enviado</option>
                          <option value="Link enviado" className="text-black">Link enviado</option>
                          <option value="Agendamento proposto" className="text-black">Agendamento proposto</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => sendLink(lead)}
                          className="bg-[#25D366]/20 hover:bg-[#25D366]/40 text-[#25D366] px-2 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 border border-[#25D366]/30"
                          title="Enviar via WhatsApp"
                        >
                          <span className="material-symbols-outlined text-[14px]">send</span> Enviar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button 
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white/10 border border-white/20 rounded text-sm text-white disabled:opacity-50 transition-colors hover:bg-white/20"
              >
                Anterior
              </button>
              <span className="text-xs text-white/70">
                Página {page} de {totalPages}
              </span>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white/10 border border-white/20 rounded text-sm text-white disabled:opacity-50 transition-colors hover:bg-white/20"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'social' && (
        <div className="flex flex-col gap-4 mt-2">
          <p className="text-xs text-white/70">
            Selecione um material de divulgação para combinar com seu link de afiliado. Você pode copiar e colar manualmente no Facebook, Instagram, Messenger ou Grupos, mantendo controle sobre quem recebe.
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white">Selecione o Material</label>
            {marketingMaterials.length > 0 ? (
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white"
              >
                <option value="" className="text-black">Apenas o link de afiliado</option>
                {marketingMaterials.map(mat => (
                  <option key={mat.id} value={mat.id} className="text-black">{mat.title}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-yellow-300">Nenhum material de divulgação disponível no momento. Será copiado apenas o seu link.</p>
            )}
          </div>

          <div className="bg-black/20 border border-white/10 rounded-lg p-4">
            <p className="text-xs text-white/50 mb-2">Pré-visualização do texto (O link será incluído automaticamente):</p>
            <p className="text-sm text-white whitespace-pre-wrap">
              {selectedMaterialId && marketingMaterials.find(m => m.id === selectedMaterialId)?.type === 'text'
                ? marketingMaterials.find(m => m.id === selectedMaterialId)?.content + "\\n\\nConheça este aplicativo incrível! [SEU LINK AQUI]"
                : "Conheça este aplicativo incrível! [SEU LINK AQUI]"}
            </p>
          </div>

          <button
            onClick={copySocialLink}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">
              {socialCopied ? 'check' : 'content_copy'}
            </span>
            {socialCopied ? 'Copiado para Área de Transferência!' : 'Copiar Texto + Link'}
          </button>
        </div>
      )}

      {showLimitModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-white/10 p-6 rounded-2xl max-w-md w-full relative">
            <div className="flex items-center gap-3 text-yellow-400 mb-4">
              <span className="material-symbols-outlined text-4xl">warning</span>
              <h3 className="text-xl font-bold text-white">Limite Diário Atingido</h3>
            </div>
            
            <p className="text-sm text-white/80 mb-4 leading-relaxed">
              Você atingiu o limite máximo de <strong>{MAX_DAILY_SENDS} envios</strong> por dia (últimas 24 horas).
            </p>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
              <p className="text-xs text-red-200 leading-relaxed font-medium">
                <strong>Por que existe esse limite?</strong><br/>
                Para proteger você. O envio em massa de links, mesmo que um por um, pode fazer com que a Meta (dona do WhatsApp) classifique o seu número como emissor de SPAM, resultando no <strong>banimento permanente da sua conta do WhatsApp</strong>.
              </p>
            </div>
            
            <p className="text-xs text-white/60 mb-6 text-center">
              Aguarde 24 horas desde o seu primeiro envio para que o limite seja renovado.
            </p>
            
            <button 
              onClick={() => setShowLimitModal(false)}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('components/AffiliateLeads.tsx', beforeReturn + newReturn);
