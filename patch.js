const fs = require('fs');
let code = fs.readFileSync('components/AffiliateLeads.tsx', 'utf-8');

// Add state variables
code = code.replace(
  "const [showLimitModal, setShowLimitModal] = useState(false);",
  "const [showLimitModal, setShowLimitModal] = useState(false);\n  const [activeTab, setActiveTab] = useState<'whatsapp' | 'social'>('whatsapp');\n  const [socialCopied, setSocialCopied] = useState(false);"
);

// Insert copySocialLink function above return
const copySocialLink = `
  const copySocialLink = () => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const currentSends = dailySends.filter((t: number) => t > twentyFourHoursAgo);
    
    if (currentSends.length >= MAX_DAILY_SENDS) {
      setShowLimitModal(true);
      setDailySends(currentSends);
      return;
    }
    
    const affiliateLink = window.location.href.split('?')[0] + '?ref=' + affiliateId;
    let materialText = '';
    
    if (selectedMaterialId) {
      const mat = marketingMaterials.find((m: any) => m.id === selectedMaterialId);
      if (mat && mat.type === 'text') {
        materialText = \`\${mat.content}\\n\\n\`;
      }
    }
    
    const msg = \`\${materialText}Conheça este aplicativo incrível! \${affiliateLink}\`;
    navigator.clipboard.writeText(msg).then(() => {
      setSocialCopied(true);
      setTimeout(() => setSocialCopied(false), 2000);
      
      const newSends = [...currentSends, Date.now()];
      setDailySends(newSends);
      localStorage.setItem(\`agenda_affiliate_daily_sends_\${affiliateId}\`, JSON.stringify(newSends));
    });
  };
`;
code = code.replace("return (", copySocialLink + "\n  return (");

// Replace return JSX
const originalReturn = `    <div className="bg-white/5 border border-white/20 rounded-xl p-4 mt-4 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-white">perm_contact_calendar</span>
          Captura e Gestão de Leads
        </h3>
        <button
          onClick={handleImportContacts}
          disabled={isImporting}
          className="bg-[#132215] text-white hover:bg-[#1b2f1e] border border-white/20 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px] text-green-400">import_contacts</span>
          {isImporting ? 'Importando...' : 'Importar da Agenda'}
        </button>
      </div>
      <p className="text-xs text-white/70 mb-4">
        Conecte sua agenda telefônica para capturar leads. Envie seu link de forma seletiva (anti-spam) e acompanhe o status de cada contato.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">`;

const newReturn = `    <div className="bg-white/5 border border-white/20 rounded-xl p-4 mt-4 w-full">
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
          <div className="flex flex-col sm:flex-row gap-2 mb-4">`;
          
code = code.replace(originalReturn, newReturn);

// Close the whatsapp tab and add the social tab
const closeTags = `        <div className="flex justify-between items-center mt-4">
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
      )}`;

const socialTabContent = `        <div className="flex justify-between items-center mt-4">
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
        <div className="flex flex-col gap-4">
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
            <span className="material-symbols-outlined">
              {socialCopied ? 'check' : 'content_copy'}
            </span>
            {socialCopied ? 'Copiado para Área de Transferência!' : 'Copiar Texto + Link'}
          </button>
        </div>
      )}`;

code = code.replace(closeTags, socialTabContent);

fs.writeFileSync('components/AffiliateLeads.tsx', code);
