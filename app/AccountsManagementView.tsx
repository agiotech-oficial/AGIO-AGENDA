import React, { useState } from 'react';
import { NavigationBar } from '../components/NavigationBar';

interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  category: string;
  value?: number;
  valueStatus?: 'a_receber' | 'recebido' | 'a_pagar' | 'pago';
  contact?: string;
  address?: string;
  notes?: string;
  reminders?: string[];
  color?: string;
}

interface AccountsManagementViewProps {
  appointments: Appointment[];
  onNavigate: (view: string) => void;
  onEditAppointment: (app: any) => void;
  onOpenModal: () => void;
  currentLang?: string;
  onLogout?: () => void;
}

export function AccountsManagementView({ appointments, onNavigate, onEditAppointment, onOpenModal, currentLang, onLogout }: AccountsManagementViewProps) {
  const isEs = currentLang === 'es';
  const isEn = currentLang === 'en';
  const [activeTab, setActiveTab] = useState<'a_pagar' | 'pago' | 'a_receber' | 'recebido'>('a_pagar');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);

  const currentDateStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = currentDateStr.substring(0, 7);

  const totalValueDay = appointments
    .filter(app => app.date === currentDateStr)
    .reduce((totals, app) => {
      const val = app.value || 0;
      if (app.valueStatus === 'a_pagar') totals.a_pagar += val;
      else if (app.valueStatus === 'recebido') totals.recebido += val;
      else if (app.valueStatus === 'pago') totals.pago += val;
      else totals.a_receber += val;
      return totals;
    }, { a_receber: 0, recebido: 0, a_pagar: 0, pago: 0 });

  const totalValueMonth = appointments
    .filter(app => app.date.startsWith(currentMonthStr))
    .reduce((totals, app) => {
      const val = app.value || 0;
      if (app.valueStatus === 'a_pagar') totals.a_pagar += val;
      else if (app.valueStatus === 'recebido') totals.recebido += val;
      else if (app.valueStatus === 'pago') totals.pago += val;
      else totals.a_receber += val;
      return totals;
    }, { a_receber: 0, recebido: 0, a_pagar: 0, pago: 0 });

  // Calculate totals
  const totals = appointments.reduce((acc, app) => {
    const val = app.value || 0;
    if (app.valueStatus === 'a_pagar') acc.a_pagar += val;
    else if (app.valueStatus === 'recebido') acc.recebido += val;
    else if (app.valueStatus === 'pago') acc.pago += val;
    else if (app.valueStatus === 'a_receber') acc.a_receber += val;
    return acc;
  }, { a_receber: 0, recebido: 0, a_pagar: 0, pago: 0 });

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'a_pagar': return 'A Pagar';
      case 'pago': return 'Pago';
      case 'a_receber': return 'À Receber';
      case 'recebido': return 'Recebido';
      default: return 'À Receber';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'a_pagar': return 'text-[#f87171] bg-[#f87171]/10 border-[#f87171]/30';
      case 'pago': return 'text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/30';
      case 'a_receber': return 'text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/30';
      case 'recebido': return 'text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/30';
      default: return 'text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/30';
    }
  };

  const isSearchActive = searchQuery.trim().length > 0;

  const accountSearchResults = isSearchActive
    ? appointments.filter(app => {
        const isAccount = (app.value !== undefined && app.value !== null) || !!app.valueStatus;
        if (!isAccount) return false;

        const query = searchQuery.trim().toLowerCase();
        
        const [y, m, d] = (app.date || '').split('-');
        const dateFormattedSlash = d && m && y ? `${d}/${m}/${y}` : '';
        const dateFormattedShortSlash = d && m && y ? `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}` : '';

        const statusLabel = getStatusLabel(app.valueStatus || 'a_receber').toLowerCase();
        const valueStr = app.value !== undefined ? app.value.toString() : '';
        const valueFormatted = app.value !== undefined ? app.value.toFixed(2).replace('.', ',') : '';
        const valueFormattedDot = app.value !== undefined ? app.value.toFixed(2) : '';

        const searchableText = [
          app.title || '',
          app.contact || '',
          app.date || '',
          dateFormattedSlash,
          dateFormattedShortSlash,
          app.time || '',
          app.category || '',
          app.address || '',
          app.notes || '',
          statusLabel,
          valueStr,
          valueFormatted,
          valueFormattedDot,
        ].join(' ').toLowerCase();

        return searchableText.includes(query);
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const filteredAppointments = appointments.filter(app => {
    if (app.value === undefined || app.value === null) return false;
    const status = app.valueStatus || 'a_receber';
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = !searchQuery || 
                        app.title.toLowerCase().includes(searchLower) || 
                        (app.contact && app.contact.toLowerCase().includes(searchLower)) ||
                        app.date.includes(searchLower) || 
                        (app.category && app.category.toLowerCase().includes(searchLower)) ||
                        (app.notes && app.notes.toLowerCase().includes(searchLower));
    return status === activeTab && matchSearch;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="bg-brand text-white min-h-screen flex flex-col font-sans">
      <header className="bg-brand sticky w-full top-0 z-50 flex justify-between items-center px-5 py-2 shadow-sm relative">
        <div 
          className="relative flex items-center z-50 cursor-pointer select-none"
          onClick={(e) => {
            e.stopPropagation();
            setIsLogoMenuOpen((prev) => !prev);
          }}
        >
          <img 
            alt="Ágio Ícone" 
            className="w-[36px] h-[36px] object-contain rounded-full overflow-hidden hover:opacity-80 transition-opacity" 
            src="/2zguve.png" 
          />
          {isLogoMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent cursor-default" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLogoMenuOpen(false);
                }}
              />
              <div className="absolute left-0 top-12 w-auto min-w-[220px] max-w-[280px] bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl overflow-hidden flex flex-col p-2 gap-1 z-50 text-left cursor-default" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { onNavigate('calendar'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">calendar_month</span> Calendário
                </button>
                <button onClick={() => { onNavigate('daily_agenda'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">view_day</span> Agenda Diária
                </button>
                <button onClick={() => { onNavigate('dashboard'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">dashboard</span> Dashboard
                </button>
                <button onClick={() => { onNavigate('accounts'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent bg-surface-container-lowest text-primary font-bold shadow-sm cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_balance_wallet</span> Gestão de Contas
                </button>
                <button onClick={() => { onNavigate('affiliate'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">groups</span> Minha Rede
                </button>
                <button onClick={() => { onNavigate('profile'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_circle</span> Perfil
                </button>
                <button onClick={() => { onNavigate('instructions'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">menu_book</span> Instruções de uso
                </button>
                {onLogout && (
                  <button onClick={() => { onLogout(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-red-400 hover:border-red-500 hover:bg-red-500/10 cursor-pointer">
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">logout</span> Sair
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('main_menu')}>
          <img alt="Ágio Agenda" className="h-[34px] w-auto object-contain opacity-[0.85] drop-shadow-[0_1px_2px_rgba(255,255,255,0.2)] rounded-xl overflow-hidden" src="/2zguve2zguve2zgu.png" />
        </div>
        <div className="flex items-center gap-3 ml-auto z-10">
          <button onClick={() => onNavigate('main_menu')} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-white text-[28px]">arrow_back</span>
          </button>
        </div>
      </header>

      <NavigationBar />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
              {isEs ? 'Gestión de Cuentas' : isEn ? 'Account Management' : 'Gestão de Contas'}
            </h1>
            <button onClick={onOpenModal} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">{isEs ? 'Añadir' : isEn ? 'Add' : 'Adicionar'}</span>
            </button>
          </div>

          {/* Header Row: Resumo Geral + Campo de Pesquisa à direita (max-w-[50%]) */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <h2 className="text-lg font-bold text-white shrink-0">Resumo Geral</h2>

            <div className="flex justify-end w-full max-w-[50%]">
              <div className="relative flex items-center w-full min-w-[180px] sm:min-w-[220px]">
                <span className="material-symbols-outlined absolute left-2.5 sm:left-3 text-white/50 text-[16px] sm:text-[18px] pointer-events-none select-none" translate="no">search</span>
                <input
                  type="text"
                  placeholder="Pesquisar contas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 text-xs sm:text-sm text-white placeholder-white/50 outline-none focus:border-white/50 focus:bg-white/20 transition-all shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 sm:right-2 text-white/50 hover:text-white flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                    title="Limpar pesquisa"
                  >
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]" translate="no">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Resultado da Pesquisa exibido em campo próprio logo abaixo */}
          {isSearchActive && (
            <div className="mb-2 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]" translate="no">search</span>
                  Resultado da Pesquisa de Contas ({accountSearchResults.length})
                </h3>
                <span className="text-[11px] text-white/60 hidden sm:inline">
                  Contas anteriores, atuais e futuras
                </span>
              </div>

              {accountSearchResults.length === 0 ? (
                <div className="text-center text-white/60 p-6 border border-dashed border-white/20 rounded-lg text-xs sm:text-sm">
                  Nenhuma conta encontrada para "{searchQuery}".
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {accountSearchResults.map(app => {
                    const [y, m, d] = app.date.split('-');
                    const formattedDateShort = `${d}/${m}/${y}`;
                    const status = app.valueStatus || 'a_receber';
                    return (
                      <div 
                        key={app.id} 
                        onClick={() => onEditAppointment(app)}
                        className="bg-white/10 hover:bg-white/20 p-3 rounded-lg border border-white/10 flex justify-between items-center cursor-pointer transition-colors shadow-sm gap-2 relative overflow-hidden"
                        style={{ borderLeftWidth: '4px', borderLeftColor: app.color || '#10b981' }}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="text-center flex flex-col min-w-[62px] px-1.5 py-1 bg-white/15 rounded-md border border-white/10 shrink-0">
                            <span className="text-[11px] font-bold text-white">{formattedDateShort}</span>
                            {app.time && <span className="text-[10px] font-medium text-white/80">{app.time}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs sm:text-sm font-bold text-white truncate">{app.title}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${getStatusColor(status)}`}>
                                {getStatusLabel(status)}
                              </span>
                            </div>
                            {app.contact && (
                              <p className="text-[11px] text-[#89e0ff] truncate flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-[12px]">person</span>
                                {app.contact}
                              </p>
                            )}
                            {app.category && (
                              <p className="text-[11px] text-white/70 truncate flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-[12px]">category</span>
                                {app.category}
                              </p>
                            )}
                            {app.address && (
                              <p className="text-[11px] text-white/70 truncate flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-[12px]">location_on</span>
                                {app.address}
                              </p>
                            )}
                            {app.notes && (
                              <p className="text-[11px] text-white/60 truncate mt-0.5">{app.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-right">
                          {app.value !== undefined && (
                            <div className="font-bold text-sm sm:text-base text-white">
                              R$ {app.value.toFixed(2).replace('.', ',')}
                            </div>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); onEditAppointment(app); }}
                            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                            title="Editar Conta"
                          >
                            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">edit</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div 
              onClick={() => setActiveTab('a_pagar')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${activeTab === 'a_pagar' ? 'bg-[#f87171]/20 border-[#f87171]' : 'bg-surface-container border-white/10 hover:border-white/30'}`}
            >
              <div className="text-sm text-white/70 mb-1 font-medium">A Pagar</div>
              <div className="text-xl md:text-2xl font-bold text-[#f87171]">R$ {totals.a_pagar.toFixed(2).replace('.', ',')}</div>
            </div>
            <div 
              onClick={() => setActiveTab('pago')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${activeTab === 'pago' ? 'bg-[#fbbf24]/20 border-[#fbbf24]' : 'bg-surface-container border-white/10 hover:border-white/30'}`}
            >
              <div className="text-sm text-white/70 mb-1 font-medium">Pago</div>
              <div className="text-xl md:text-2xl font-bold text-[#fbbf24]">R$ {totals.pago.toFixed(2).replace('.', ',')}</div>
            </div>
            <div 
              onClick={() => setActiveTab('a_receber')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${activeTab === 'a_receber' ? 'bg-[#60a5fa]/20 border-[#60a5fa]' : 'bg-surface-container border-white/10 hover:border-white/30'}`}
            >
              <div className="text-sm text-white/70 mb-1 font-medium">À Receber</div>
              <div className="text-xl md:text-2xl font-bold text-[#60a5fa]">R$ {totals.a_receber.toFixed(2).replace('.', ',')}</div>
            </div>
            <div 
              onClick={() => setActiveTab('recebido')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${activeTab === 'recebido' ? 'bg-[#4ade80]/20 border-[#4ade80]' : 'bg-surface-container border-white/10 hover:border-white/30'}`}
            >
              <div className="text-sm text-white/70 mb-1 font-medium">Recebido</div>
              <div className="text-xl md:text-2xl font-bold text-[#4ade80]">R$ {totals.recebido.toFixed(2).replace('.', ',')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white/10 p-4 rounded-xl border border-white/20 flex flex-col gap-3">
                <span className="text-sm font-medium text-white/80">Resumo do Dia</span>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-sm"><span className="text-white/70">Recebido</span><span className="font-bold text-[#4ade80]">R$ {totalValueDay.recebido.toFixed(2).replace('.', ',')}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-white/70">A Receber</span><span className="font-bold text-[#60a5fa]">R$ {totalValueDay.a_receber.toFixed(2).replace('.', ',')}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-white/70">A Pagar</span><span className="font-bold text-[#f87171]">R$ {totalValueDay.a_pagar.toFixed(2).replace('.', ',')}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-white/70">Pago</span><span className="font-bold text-[#fbbf24]">R$ {totalValueDay.pago.toFixed(2).replace('.', ',')}</span></div>
                </div>
             </div>
             <div className="bg-white/10 p-4 rounded-xl border border-white/20 flex flex-col gap-3">
                <span className="text-sm font-medium text-white/80">Resumo do Mês</span>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-sm"><span className="text-white/70">Recebido</span><span className="font-bold text-[#4ade80]">R$ {totalValueMonth.recebido.toFixed(2).replace('.', ',')}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-white/70">A Receber</span><span className="font-bold text-[#60a5fa]">R$ {totalValueMonth.a_receber.toFixed(2).replace('.', ',')}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-white/70">A Pagar</span><span className="font-bold text-[#f87171]">R$ {totalValueMonth.a_pagar.toFixed(2).replace('.', ',')}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-white/70">Pago</span><span className="font-bold text-[#fbbf24]">R$ {totalValueMonth.pago.toFixed(2).replace('.', ',')}</span></div>
                </div>
             </div>
          </div>

          <div className="bg-surface-container-low border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-surface-container flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">receipt_long</span>
                Lançamentos: {getStatusLabel(activeTab)}
              </h2>
            </div>
            <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
              {filteredAppointments.length === 0 ? (
                <div className="p-8 text-center text-white/50 flex flex-col items-center">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">money_off</span>
                  <p>Nenhum lançamento encontrado nesta categoria.</p>
                </div>
              ) : (
                filteredAppointments.map(app => (
                  <div key={app.id} onClick={() => onEditAppointment(app)} className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors group">
                    <div className="flex-1">
                      <div className="font-medium text-white group-hover:text-primary transition-colors">{app.title}</div>
                      <div className="text-sm text-white/50 flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span>{app.date.split('-').reverse().join('/')}</span>
                        {app.time && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>{app.time}</span>}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="font-bold text-lg">R$ {(app.value || 0).toFixed(2).replace('.', ',')}</div>
                      <div className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${getStatusColor(activeTab)}`}>
                        {getStatusLabel(activeTab)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
