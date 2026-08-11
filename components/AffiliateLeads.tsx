"use client";
import React, { useState, useEffect } from 'react';
import { getNormalizedMediaUrl, DEFAULT_MARKETING_MATERIALS } from '../lib/utils';

export interface Lead {

  id: string;
  name: string;
  phone: string;
  status: 'Não enviado' | 'Link enviado' | 'Agendamento proposto';
  importedAt: string;
  selected?: boolean;
  lastSentAt?: string;
}

export function AffiliateLeads({ affiliateId }: { affiliateId: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [isImporting, setIsImporting] = useState(false);

  const [marketingMaterials, setMarketingMaterials] = useState<any[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');

  const [dailySends, setDailySends] = useState<number[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'social'>('whatsapp');
  const [socialCopied, setSocialCopied] = useState(false);
  const MAX_DAILY_SENDS = 30;

  useEffect(() => {
    const saved = localStorage.getItem(`agenda_affiliate_leads_${affiliateId}`);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLeads(JSON.parse(saved));
    }
    const mats = localStorage.getItem('agenda_marketing_materials');
    let parsedMats = DEFAULT_MARKETING_MATERIALS;
    if (mats) {
      try {
        const parsed = JSON.parse(mats);
        if (parsed && parsed.length > 0) {
          parsedMats = parsed;
        }
      } catch (e) {}
    }
    setMarketingMaterials(parsedMats);
    if (parsedMats.length > 0) {
      setSelectedMaterialId(parsedMats[0].id);
    }
    
    const savedSends = localStorage.getItem(`agenda_affiliate_daily_sends_${affiliateId}`);
    if (savedSends) {
      try {
        const parsedSends = JSON.parse(savedSends);
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const current = parsedSends.filter((t: number) => t > twentyFourHoursAgo);
        setDailySends(current);
      } catch (e) {
        // ignore
      }
    }
  }, [affiliateId]);

  const saveLeads = (newLeads: Lead[]) => {
    setLeads(newLeads);
    localStorage.setItem(`agenda_affiliate_leads_${affiliateId}`, JSON.stringify(newLeads));
  };

  const handleImportContacts = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      alert('Seu navegador ou dispositivo não suporta a importação automática de contatos. Você pode adicionar manualmente ou tentar em um dispositivo móvel compatível.');
      return;
    }

    try {
      setIsImporting(true);
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      // @ts-ignore
      const contacts = await navigator.contacts.select(props, opts);
      
      const newLeads: Lead[] = [];
      contacts.forEach((c: any) => {
        if (c.tel && c.tel.length > 0 && c.name && c.name.length > 0) {
          const phone = c.tel[0].replace(/\D/g, '');
          const name = c.name[0];
          // Check if already exists
          if (!leads.find((l) => l.phone === phone)) {
            newLeads.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              name,
              phone,
              status: 'Não enviado',
              importedAt: new Date().toISOString(),
              selected: false
            });
          }
        }
      });

      if (newLeads.length > 0) {
        saveLeads([...newLeads, ...leads]);
        alert(`${newLeads.length} novos contatos importados com sucesso!`);
      } else {
        alert('Nenhum contato novo com número de telefone foi selecionado.');
      }
    } catch (ex) {
      console.error('Erro ao importar contatos', ex);
      alert('Acesso aos contatos cancelado ou bloqueado.');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    saveLeads(leads.map(l => l.id === id ? { ...l, selected: !l.selected } : l));
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    saveLeads(leads.map(l => 
      (l.name.toLowerCase().includes(search.toLowerCase()) && (filterStatus === 'all' || l.status === filterStatus)) 
      ? { ...l, selected: checked } : l
    ));
  };

  const changeStatus = (id: string, status: Lead['status']) => {
    saveLeads(leads.map(l => l.id === id ? { ...l, status } : l));
  };

  const deleteSelected = () => {
    if (window.confirm('Remover contatos selecionados?')) {
      saveLeads(leads.filter(l => !l.selected));
    }
  };

  const sendLink = (lead: Lead) => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const currentSends = dailySends.filter(t => t > twentyFourHoursAgo);
    
    if (currentSends.length >= MAX_DAILY_SENDS) {
      setShowLimitModal(true);
      setDailySends(currentSends);
      return;
    }
    
    const newSends = [...currentSends, Date.now()];
    setDailySends(newSends);
    localStorage.setItem(`agenda_affiliate_daily_sends_${affiliateId}`, JSON.stringify(newSends));

    const affiliateLink = window.location.href.split('?')[0] + '?ref=' + affiliateId;
    let materialText = '';
    
    if (selectedMaterialId) {
      const mat = marketingMaterials.find(m => m.id === selectedMaterialId);
      if (mat) {
        materialText = `${mat.content}\n\n`;
      }
    }

    const msg = encodeURIComponent(`Olá ${lead.name},\n\n${materialText}Conheça este aplicativo incrível! ${affiliateLink}`);
    window.open(`https://wa.me/${lead.phone}?text=${msg}`, '_blank');
    
    const updatedLeads = leads.map(l => l.id === lead.id ? { ...l, status: 'Link enviado' as const, lastSentAt: new Date().toISOString() } : l);
    saveLeads(updatedLeads);
  };

  const filteredLeads = leads.filter(l => {
    const matchName = l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search);
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchName && matchStatus;
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const currentLeads = filteredLeads.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const someSelected = leads.some(l => l.selected);

  
  const getGeneratedMessage = () => {
    const affiliateLink = typeof window !== 'undefined' ? (window.location.href.split('?')[0] + '?ref=' + affiliateId) : '';
    if (!selectedMaterialId) {
      return `Conheça este aplicativo incrível! Acesse: ${affiliateLink}`;
    }
    const mat = marketingMaterials.find(m => m.id === selectedMaterialId);
    if (!mat) {
      return `Conheça este aplicativo incrível! Acesse: ${affiliateLink}`;
    }

    const normalizedPath = getNormalizedMediaUrl(mat.content);
    const fullMediaUrl = normalizedPath.startsWith('http') 
      ? normalizedPath 
      : ((typeof window !== 'undefined' ? window.location.origin : '') + normalizedPath);
    
    if (mat.type === 'text') {
      const mainText = mat.content;
      const subText = mat.description ? `\n\n${mat.description}` : '';
      return `${mainText}${subText}\n\nConheça este aplicativo incrível! Acesse: ${affiliateLink}`;
    } else if (mat.type === 'image') {
      const caption = mat.description ? `${mat.description}\n\n` : '';
      return `${caption}Confira nossa imagem de divulgação: ${fullMediaUrl}\n\nConheça este aplicativo incrível! Acesse: ${affiliateLink}`;
    } else if (mat.type === 'video') {
      const caption = mat.description ? `${mat.description}\n\n` : '';
      return `${caption}Confira nosso vídeo explicativo: ${fullMediaUrl}\n\nConheça este aplicativo incrível! Acesse: ${affiliateLink}`;
    } else if (mat.type === 'audio') {
      const caption = mat.description ? `${mat.description}\n\n` : '';
      return `${caption}Ouça nosso áudio de divulgação: ${fullMediaUrl}\n\nConheça este aplicativo incrível! Acesse: ${affiliateLink}`;
    }
    const caption = mat.description ? `${mat.description}\n\n` : '';
    return `${caption}${mat.content}\n\nConheça este aplicativo incrível! Acesse: ${affiliateLink}`;
  };

  const copySocialLink = () => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const currentSends = dailySends.filter((t: number) => t > twentyFourHoursAgo);
    
    if (currentSends.length >= MAX_DAILY_SENDS) {
      setShowLimitModal(true);
      setDailySends(currentSends);
      return;
    }
    
    const msg = getGeneratedMessage();
    navigator.clipboard.writeText(msg).then(() => {
      setSocialCopied(true);
      setTimeout(() => setSocialCopied(false), 2000);
      
      const newSends = [...currentSends, Date.now()];
      setDailySends(newSends);
      localStorage.setItem(`agenda_affiliate_daily_sends_${affiliateId}`, JSON.stringify(newSends));
    });
  };

  return (
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
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === 'whatsapp' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}`}
        >
          Agenda do WhatsApp
        </button>
        <button 
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === 'social' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}`}
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
                          className={`text-xs px-2 py-1 rounded outline-none border border-transparent font-medium
                            ${lead.status === 'Não enviado' ? 'bg-gray-500/20 text-gray-300 hover:border-gray-400/50' : 
                              lead.status === 'Link enviado' ? 'bg-blue-500/20 text-blue-300 hover:border-blue-400/50' : 
                              'bg-green-500/20 text-green-300 hover:border-green-400/50'}
                          `}
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
          <p className="text-xs text-white/70 leading-relaxed">
            Selecione um material de divulgação (Texto, Imagem ou Vídeo) para combinar automaticamente com seu link de afiliado. 
            Depois, copie com um clique e cole manualmente no Facebook, Instagram, WhatsApp, Telegram, Messenger ou grupos!
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#ff954c]">auto_awesome</span>
              Escolha o Material de Divulgação
            </label>
            {marketingMaterials.length > 0 ? (
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-white transition-all cursor-pointer"
              >
                <option value="" className="text-black">🔗 Apenas o meu Link de Afiliado</option>
                {marketingMaterials.map(mat => {
                  const emoji = mat.type === 'text' ? '📝 Texto' : mat.type === 'image' ? '🖼️ Imagem' : mat.type === 'video' ? '🎥 Vídeo' : '🎵 Áudio';
                  return (
                    <option key={mat.id} value={mat.id} className="text-black">
                      {emoji}: {mat.title || 'Sem título'}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
                <p className="text-xs text-yellow-300">Nenhum material de divulgação cadastrado pelo administrador no momento. Você ainda pode gerar e copiar o seu link de afiliado abaixo!</p>
              </div>
            )}
          </div>

          {/* Media Previews based on Selected Material */}
          {selectedMaterialId && (() => {
            const mat = marketingMaterials.find(m => m.id === selectedMaterialId);
            if (!mat) return null;
            const normalizedUrl = getNormalizedMediaUrl(mat.content);
            if (mat.type === 'image') {
              return (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col items-center gap-2">
                  <p className="text-xs text-white/50 self-start flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-blue-400">image</span> 
                    Visualização da Imagem/Banner de Divulgação:
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={normalizedUrl} 
                    alt={mat.title} 
                    className="max-h-64 object-contain rounded-lg border border-white/10 shadow-lg bg-white/5"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {mat.description && (
                    <div className="w-full mt-2 p-2 bg-white/5 border border-white/10 rounded-lg text-left">
                      <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">chat_bubble_outline</span> Texto / Legenda de Apoio
                      </p>
                      <p className="text-xs text-white/90">{mat.description}</p>
                    </div>
                  )}
                  <div className="w-full flex justify-between items-center mt-1 flex-wrap gap-2">
                    <span className="text-[10px] text-white/40 truncate max-w-[50%]">{mat.content}</span>
                    <div className="flex gap-2">
                      <a 
                        href={normalizedUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Abrir <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </a>
                      <a 
                        href={normalizedUrl} 
                        download={mat.title || 'imagem'} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Baixar <span className="material-symbols-outlined text-[12px]">download</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            }
            if (mat.type === 'video') {
              return (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-500 text-3xl">play_circle</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">Vídeo de Divulgação</p>
                      <p className="text-[10px] text-white/50 truncate">{mat.content}</p>
                    </div>
                    <a 
                      href={normalizedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      Assistir Vídeo <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                  {mat.description && (
                    <div className="p-2 bg-white/5 border border-white/10 rounded-lg text-left">
                      <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider mb-1">Legenda do Vídeo</p>
                      <p className="text-xs text-white/90">{mat.description}</p>
                    </div>
                  )}
                </div>
              );
            }
            if (mat.type === 'audio') {
              return (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-500 text-3xl">volume_up</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">Áudio de Divulgação</p>
                      <p className="text-[10px] text-white/50 truncate">{mat.content}</p>
                    </div>
                    <a 
                      href={normalizedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      Ouvir Áudio <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                  {mat.description && (
                    <div className="p-2 bg-white/5 border border-white/10 rounded-lg text-left">
                      <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider mb-1">Legenda do Áudio</p>
                      <p className="text-xs text-white/90">{mat.description}</p>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}

          <div className="bg-black/20 border border-white/10 rounded-lg p-4">
            <p className="text-xs text-white/50 mb-2">Mensagem que será copiada (com seu link exclusivo):</p>
            <div className="text-sm text-white whitespace-pre-wrap font-sans leading-relaxed break-words bg-black/30 p-3 rounded border border-white/5 max-h-48 overflow-y-auto">
              {getGeneratedMessage()}
            </div>
          </div>

          <button
            onClick={copySocialLink}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px]">
              {socialCopied ? 'check_circle' : 'content_copy'}
            </span>
            {socialCopied ? 'Copiado para Área de Transferência!' : (() => {
              const mat = marketingMaterials.find(m => m.id === selectedMaterialId);
              if (!mat) return 'Copiar Link de Afiliado';
              if (mat.type === 'text') return 'Copiar Mensagem + Link';
              if (mat.type === 'image') return 'Copiar Texto + Link da Imagem';
              if (mat.type === 'video') return 'Copiar Texto + Link do Vídeo';
              return 'Copiar Texto + Link do Áudio';
            })()}
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
