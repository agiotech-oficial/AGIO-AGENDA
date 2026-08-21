import React, { useState, useMemo, useRef } from 'react';
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
  itemType?: 'compromisso' | 'conta';
  alarmType?: 'text' | 'sound';
  customAudioUrl?: string;
}

interface AccountsManagementViewProps {
  appointments: Appointment[];
  onNavigate: (view: string) => void;
  onEditAppointment: (app: any) => void;
  onOpenModal: (type?: 'compromisso' | 'conta') => void;
  currentLang?: string;
  onLogout?: () => void;
}

export function AccountsManagementView({
  appointments,
  onNavigate,
  onEditAppointment,
  onOpenModal,
  currentLang,
  onLogout
}: AccountsManagementViewProps) {
  const isEs = currentLang === 'es';
  const isEn = currentLang === 'en';

  // Active status tab: 'a_pagar' | 'pago' | 'a_receber' | 'recebido'
  const [activeTab, setActiveTab] = useState<'a_pagar' | 'pago' | 'a_receber' | 'recebido'>('a_pagar');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);

  // Tab-specific filters: Period (Todos, Dia, Mês, Ano), Keyword, Category, Item Type
  const [periodFilter, setPeriodFilter] = useState<'todos' | 'dia' | 'mes' | 'ano'>('todos');
  
  const currentDateObj = new Date();
  const todayDateStr = currentDateObj.toISOString().split('T')[0];
  const currentMonthStr = todayDateStr.substring(0, 7);
  const currentYearStr = todayDateStr.substring(0, 4);

  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('todas');
  const [filterItemType, setFilterItemType] = useState<'todos' | 'conta' | 'compromisso'>('todos');
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc' | 'value_desc' | 'value_asc' | 'title_asc'>('date_asc');
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  // Filter only accounts / financial entries
  const accountAppointments = useMemo(() => {
    return appointments.filter(app => {
      if (app.itemType === 'conta') return true;
      if (app.itemType === 'compromisso') return false;
      return (app.value !== undefined && app.value !== null && app.value > 0) || Boolean(app.valueStatus);
    });
  }, [appointments]);

  // Totals calculations
  const totalValueDay = useMemo(() => {
    return accountAppointments
      .filter(app => app.date === todayDateStr)
      .reduce((totals, app) => {
        const val = app.value || 0;
        if (app.valueStatus === 'a_pagar') totals.a_pagar += val;
        else if (app.valueStatus === 'recebido') totals.recebido += val;
        else if (app.valueStatus === 'pago') totals.pago += val;
        else totals.a_receber += val;
        return totals;
      }, { a_receber: 0, recebido: 0, a_pagar: 0, pago: 0 });
  }, [accountAppointments, todayDateStr]);

  const totalValueMonth = useMemo(() => {
    return accountAppointments
      .filter(app => app.date.startsWith(currentMonthStr))
      .reduce((totals, app) => {
        const val = app.value || 0;
        if (app.valueStatus === 'a_pagar') totals.a_pagar += val;
        else if (app.valueStatus === 'recebido') totals.recebido += val;
        else if (app.valueStatus === 'pago') totals.pago += val;
        else totals.a_receber += val;
        return totals;
      }, { a_receber: 0, recebido: 0, a_pagar: 0, pago: 0 });
  }, [accountAppointments, currentMonthStr]);

  const totals = useMemo(() => {
    return accountAppointments.reduce((acc, app) => {
      const val = app.value || 0;
      if (app.valueStatus === 'a_pagar') acc.a_pagar += val;
      else if (app.valueStatus === 'recebido') acc.recebido += val;
      else if (app.valueStatus === 'pago') acc.pago += val;
      else if (app.valueStatus === 'a_receber') acc.a_receber += val;
      return acc;
    }, { a_receber: 0, recebido: 0, a_pagar: 0, pago: 0 });
  }, [accountAppointments]);

  // Counts of each category
  const counts = useMemo(() => {
    return accountAppointments.reduce((acc, app) => {
      const st = app.valueStatus || 'a_receber';
      if (st === 'a_pagar') acc.a_pagar += 1;
      else if (st === 'recebido') acc.recebido += 1;
      else if (st === 'pago') acc.pago += 1;
      else if (st === 'a_receber') acc.a_receber += 1;
      return acc;
    }, { a_receber: 0, recebido: 0, a_pagar: 0, pago: 0 });
  }, [accountAppointments]);

  // Distinct categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    accountAppointments.forEach(app => {
      if (app.category && app.category.trim()) {
        set.add(app.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [accountAppointments]);

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'a_pagar': return isEs ? 'A Pagar' : isEn ? 'To Pay' : 'A Pagar';
      case 'pago': return isEs ? 'Pagado' : isEn ? 'Paid' : 'Pago';
      case 'a_receber': return isEs ? 'A Recibir' : isEn ? 'To Receive' : 'À Receber';
      case 'recebido': return isEs ? 'Recibido' : isEn ? 'Received' : 'Recebido';
      default: return 'À Receber';
    }
  };

  const getStatusTheme = (status: string) => {
    switch(status) {
      case 'a_pagar':
        return {
          label: 'A Pagar',
          colorText: 'text-[#f87171]',
          bgLight: 'bg-[#f87171]/10',
          borderLight: 'border-[#f87171]/30',
          borderActive: 'border-[#f87171]',
          bgActive: 'bg-[#f87171]/20',
          badge: 'text-[#f87171] bg-[#f87171]/10 border-[#f87171]/30',
          icon: 'trending_down',
          desc: isEs ? 'Cuentas pendientes de pago' : isEn ? 'Pending payable bills' : 'Contas pendentes de pagamento'
        };
      case 'pago':
        return {
          label: 'Pago',
          colorText: 'text-[#fbbf24]',
          bgLight: 'bg-[#fbbf24]/10',
          borderLight: 'border-[#fbbf24]/30',
          borderActive: 'border-[#fbbf24]',
          bgActive: 'bg-[#fbbf24]/20',
          badge: 'text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/30',
          icon: 'task_alt',
          desc: isEs ? 'Cuentas ya pagadas' : isEn ? 'Bills already paid' : 'Contas já pagas'
        };
      case 'a_receber':
        return {
          label: 'À Receber',
          colorText: 'text-[#60a5fa]',
          bgLight: 'bg-[#60a5fa]/10',
          borderLight: 'border-[#60a5fa]/30',
          borderActive: 'border-[#60a5fa]',
          bgActive: 'bg-[#60a5fa]/20',
          badge: 'text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/30',
          icon: 'trending_up',
          desc: isEs ? 'Montos pendientes de cobro' : isEn ? 'Pending receivables' : 'Valores pendentes de recebimento'
        };
      case 'recebido':
        return {
          label: 'Recebido',
          colorText: 'text-[#4ade80]',
          bgLight: 'bg-[#4ade80]/10',
          borderLight: 'border-[#4ade80]/30',
          borderActive: 'border-[#4ade80]',
          bgActive: 'bg-[#4ade80]/20',
          badge: 'text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/30',
          icon: 'savings',
          desc: isEs ? 'Montos ya recibidos' : isEn ? 'Amounts already received' : 'Valores já recebidos'
        };
      default:
        return {
          label: 'Contas',
          colorText: 'text-[#60a5fa]',
          bgLight: 'bg-[#60a5fa]/10',
          borderLight: 'border-[#60a5fa]/30',
          borderActive: 'border-[#60a5fa]',
          bgActive: 'bg-[#60a5fa]/20',
          badge: 'text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/30',
          icon: 'receipt_long',
          desc: 'Gestão financeira'
        };
    }
  };

  const activeTheme = getStatusTheme(activeTab);

  // Global Quick Search Results
  const isGlobalSearchActive = globalSearchQuery.trim().length > 0;
  const accountSearchResults = useMemo(() => {
    if (!isGlobalSearchActive) return [];
    const query = globalSearchQuery.trim().toLowerCase();
    return accountAppointments.filter(app => {
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
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [accountAppointments, globalSearchQuery, isGlobalSearchActive]);

  // Filtered appointments for the ACTIVE CARD/TAB with Period, Keyword & Type/Category filters
  const filteredTabAppointments = useMemo(() => {
    return accountAppointments.filter(app => {
      // 1. Match card status
      const st = app.valueStatus || 'a_receber';
      if (st !== activeTab) return false;

      // 2. Match Period Filter
      if (periodFilter === 'dia') {
        if (app.date !== selectedDate) return false;
      } else if (periodFilter === 'mes') {
        if (!app.date.startsWith(selectedMonth)) return false;
      } else if (periodFilter === 'ano') {
        if (!app.date.startsWith(selectedYear)) return false;
      }

      // 3. Match Category Filter
      if (filterCategory !== 'todas') {
        if ((app.category || '').toLowerCase() !== filterCategory.toLowerCase()) {
          return false;
        }
      }

      // 4. Match Item Type Filter
      if (filterItemType !== 'todos') {
        if ((app.itemType || 'conta') !== filterItemType) {
          return false;
        }
      }

      // 5. Match Keyword Filter
      if (filterKeyword.trim()) {
        const kw = filterKeyword.trim().toLowerCase();
        const [y, m, d] = (app.date || '').split('-');
        const dateFormattedSlash = d && m && y ? `${d}/${m}/${y}` : '';
        const dateFormattedShortSlash = d && m && y ? `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}` : '';
        const valStr = app.value !== undefined ? app.value.toFixed(2).replace('.', ',') : '';
        const valRaw = app.value !== undefined ? String(app.value) : '';

        const fullText = [
          app.title || '',
          app.contact || '',
          app.date || '',
          dateFormattedSlash,
          dateFormattedShortSlash,
          app.time || '',
          app.category || '',
          app.address || '',
          app.notes || '',
          valStr,
          valRaw
        ].join(' ').toLowerCase();

        if (!fullText.includes(kw)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'date_desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'value_desc') {
        return (b.value || 0) - (a.value || 0);
      } else if (sortBy === 'value_asc') {
        return (a.value || 0) - (b.value || 0);
      } else if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [
    accountAppointments,
    activeTab,
    periodFilter,
    selectedDate,
    selectedMonth,
    selectedYear,
    filterCategory,
    filterItemType,
    filterKeyword,
    sortBy
  ]);

  // Sum of filtered items
  const filteredTotalValue = useMemo(() => {
    return filteredTabAppointments.reduce((sum, app) => sum + (app.value || 0), 0);
  }, [filteredTabAppointments]);

  // Handler when user clicks on any of the 4 cards
  const handleCardClick = (tab: 'a_pagar' | 'pago' | 'a_receber' | 'recebido') => {
    setActiveTab(tab);
    if (listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Date Navigation Helpers
  const shiftDay = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const shiftMonth = (months: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + months, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  const shiftYear = (years: number) => {
    const y = Number(selectedYear);
    setSelectedYear(String(y + years));
  };

  // Format date readable
  const formatReadableDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatReadableMonth = (monthStr: string) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    const monthNames = isEs
      ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      : isEn
      ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      : ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${monthNames[m - 1]} de ${y}`;
  };

  return (
    <div className="bg-brand text-white min-h-screen flex flex-col font-sans">
      {/* Top Header */}
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
          {/* Main Title & Action Bar */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
              {isEs ? 'Gestión de Cuentas' : isEn ? 'Account Management' : 'Gestão de Contas'}
            </h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCardModalOpen(true)} 
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border border-white/20"
                title="Expandir visualização em modal"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                <span className="hidden sm:inline">Visualizar em Modal</span>
              </button>
              <button onClick={() => onOpenModal('conta')} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-sm">
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span className="hidden sm:inline">{isEs ? 'Nova Conta' : isEn ? 'New Account' : 'Nova Conta'}</span>
              </button>
            </div>
          </div>

          {/* Header Row: Resumo Geral + Campo de Pesquisa Global */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <h2 className="text-lg font-bold text-white shrink-0">Resumo Geral</h2>

            <div className="flex justify-end w-full max-w-[50%]">
              <div className="relative flex items-center w-full min-w-[180px] sm:min-w-[220px]">
                <span className="material-symbols-outlined absolute left-2.5 sm:left-3 text-white/50 text-[16px] sm:text-[18px] pointer-events-none select-none" translate="no">search</span>
                <input
                  type="text"
                  placeholder="Pesquisa rápida geral..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 text-xs sm:text-sm text-white placeholder-white/50 outline-none focus:border-white/50 focus:bg-white/20 transition-all shadow-sm"
                />
                {globalSearchQuery && (
                  <button
                    onClick={() => setGlobalSearchQuery('')}
                    className="absolute right-1.5 sm:right-2 text-white/50 hover:text-white flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                    title="Limpar pesquisa"
                  >
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]" translate="no">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Resultado da Pesquisa Geral exibido se houver query global */}
          {isGlobalSearchActive && (
            <div className="mb-2 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]" translate="no">search</span>
                  Resultado da Pesquisa Geral ({accountSearchResults.length})
                </h3>
                <span className="text-[11px] text-white/60 hidden sm:inline">
                  Contas anteriores, atuais e futuras
                </span>
              </div>

              {accountSearchResults.length === 0 ? (
                <div className="text-center text-white/60 p-6 border border-dashed border-white/20 rounded-lg text-xs sm:text-sm">
                  Nenhuma conta encontrada para "{globalSearchQuery}".
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                  {accountSearchResults.map(app => {
                    const [y, m, d] = app.date.split('-');
                    const formattedDateShort = `${d}/${m}/${y}`;
                    const status = app.valueStatus || 'a_receber';
                    const stTheme = getStatusTheme(status);
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
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${stTheme.badge}`}>
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

          {/* 4 INTERACTIVE CARDS: "A Pagar", "Pago", "À Receber", "Recebido" */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Card 1: A Pagar */}
            <div 
              id="card-a-pagar"
              onClick={() => handleCardClick('a_pagar')}
              className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group shadow-sm ${
                activeTab === 'a_pagar' 
                  ? 'bg-[#f87171]/25 border-[#f87171] ring-2 ring-[#f87171]/50 scale-[1.02]' 
                  : 'bg-surface-container border-white/10 hover:border-[#f87171]/50 hover:bg-[#f87171]/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-sm text-white/80 font-semibold">
                  <span className="material-symbols-outlined text-[18px] text-[#f87171]">trending_down</span>
                  <span>A Pagar</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/30">
                  {counts.a_pagar}
                </span>
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-black text-[#f87171]">
                R$ {totals.a_pagar.toFixed(2).replace('.', ',')}
              </div>
              <div className="mt-2 text-[10px] text-white/60 flex items-center justify-between border-t border-white/10 pt-1.5">
                <span>Clique para filtrar</span>
                <span className="material-symbols-outlined text-[14px] text-[#f87171] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>

            {/* Card 2: Pago */}
            <div 
              id="card-pago"
              onClick={() => handleCardClick('pago')}
              className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group shadow-sm ${
                activeTab === 'pago' 
                  ? 'bg-[#fbbf24]/25 border-[#fbbf24] ring-2 ring-[#fbbf24]/50 scale-[1.02]' 
                  : 'bg-surface-container border-white/10 hover:border-[#fbbf24]/50 hover:bg-[#fbbf24]/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-sm text-white/80 font-semibold">
                  <span className="material-symbols-outlined text-[18px] text-[#fbbf24]">task_alt</span>
                  <span>Pago</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/30">
                  {counts.pago}
                </span>
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-black text-[#fbbf24]">
                R$ {totals.pago.toFixed(2).replace('.', ',')}
              </div>
              <div className="mt-2 text-[10px] text-white/60 flex items-center justify-between border-t border-white/10 pt-1.5">
                <span>Clique para filtrar</span>
                <span className="material-symbols-outlined text-[14px] text-[#fbbf24] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>

            {/* Card 3: À Receber */}
            <div 
              id="card-a-receber"
              onClick={() => handleCardClick('a_receber')}
              className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group shadow-sm ${
                activeTab === 'a_receber' 
                  ? 'bg-[#60a5fa]/25 border-[#60a5fa] ring-2 ring-[#60a5fa]/50 scale-[1.02]' 
                  : 'bg-surface-container border-white/10 hover:border-[#60a5fa]/50 hover:bg-[#60a5fa]/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-sm text-white/80 font-semibold">
                  <span className="material-symbols-outlined text-[18px] text-[#60a5fa]">trending_up</span>
                  <span>À Receber</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#60a5fa]/20 text-[#60a5fa] border border-[#60a5fa]/30">
                  {counts.a_receber}
                </span>
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-black text-[#60a5fa]">
                R$ {totals.a_receber.toFixed(2).replace('.', ',')}
              </div>
              <div className="mt-2 text-[10px] text-white/60 flex items-center justify-between border-t border-white/10 pt-1.5">
                <span>Clique para filtrar</span>
                <span className="material-symbols-outlined text-[14px] text-[#60a5fa] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>

            {/* Card 4: Recebido */}
            <div 
              id="card-recebido"
              onClick={() => handleCardClick('recebido')}
              className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group shadow-sm ${
                activeTab === 'recebido' 
                  ? 'bg-[#4ade80]/25 border-[#4ade80] ring-2 ring-[#4ade80]/50 scale-[1.02]' 
                  : 'bg-surface-container border-white/10 hover:border-[#4ade80]/50 hover:bg-[#4ade80]/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-sm text-white/80 font-semibold">
                  <span className="material-symbols-outlined text-[18px] text-[#4ade80]">savings</span>
                  <span>Recebido</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
                  {counts.recebido}
                </span>
              </div>
              <div className="text-lg sm:text-xl md:text-2xl font-black text-[#4ade80]">
                R$ {totals.recebido.toFixed(2).replace('.', ',')}
              </div>
              <div className="mt-2 text-[10px] text-white/60 flex items-center justify-between border-t border-white/10 pt-1.5">
                <span>Clique para filtrar</span>
                <span className="material-symbols-outlined text-[14px] text-[#4ade80] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>

          {/* Quick Resumo do Dia e Mês */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white/10 p-4 rounded-xl border border-white/20 flex flex-col gap-2.5">
                <span className="text-sm font-semibold text-white/90 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">today</span>
                  Resumo de Hoje ({formatReadableDate(todayDateStr)})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col">
                    <span className="text-[11px] text-white/60">A Pagar</span>
                    <span className="font-bold text-xs sm:text-sm text-[#f87171]">R$ {totalValueDay.a_pagar.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col">
                    <span className="text-[11px] text-white/60">Pago</span>
                    <span className="font-bold text-xs sm:text-sm text-[#fbbf24]">R$ {totalValueDay.pago.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col">
                    <span className="text-[11px] text-white/60">À Receber</span>
                    <span className="font-bold text-xs sm:text-sm text-[#60a5fa]">R$ {totalValueDay.a_receber.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col">
                    <span className="text-[11px] text-white/60">Recebido</span>
                    <span className="font-bold text-xs sm:text-sm text-[#4ade80]">R$ {totalValueDay.recebido.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
             </div>

             <div className="bg-white/10 p-4 rounded-xl border border-white/20 flex flex-col gap-2.5">
                <span className="text-sm font-semibold text-white/90 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
                  Resumo do Mês ({formatReadableMonth(currentMonthStr)})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col">
                    <span className="text-[11px] text-white/60">A Pagar</span>
                    <span className="font-bold text-xs sm:text-sm text-[#f87171]">R$ {totalValueMonth.a_pagar.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col">
                    <span className="text-[11px] text-white/60">Pago</span>
                    <span className="font-bold text-xs sm:text-sm text-[#fbbf24]">R$ {totalValueMonth.pago.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col">
                    <span className="text-[11px] text-white/60">À Receber</span>
                    <span className="font-bold text-xs sm:text-sm text-[#60a5fa]">R$ {totalValueMonth.a_receber.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col">
                    <span className="text-[11px] text-white/60">Recebido</span>
                    <span className="font-bold text-xs sm:text-sm text-[#4ade80]">R$ {totalValueMonth.recebido.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
             </div>
          </div>

          {/* MAIN FILTERED DRILL-DOWN PANEL FOR SELECTED CARD */}
          <div ref={listRef} className="bg-surface-container-low border border-white/15 rounded-2xl overflow-hidden shadow-xl">
            {/* Header of Active Tab */}
            <div className={`p-4 sm:p-5 border-b border-white/10 ${activeTheme.bgActive} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${activeTheme.bgLight} border ${activeTheme.borderLight} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined text-[24px] ${activeTheme.colorText}`}>
                    {activeTheme.icon}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      Contas: {activeTheme.label}
                    </h2>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${activeTheme.badge}`}>
                      {filteredTabAppointments.length} item(ns)
                    </span>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5">
                    {activeTheme.desc}
                  </p>
                </div>
              </div>

              {/* Total Sum badge */}
              <div className="flex items-center sm:flex-col sm:items-end justify-between bg-black/20 sm:bg-transparent p-2.5 sm:p-0 rounded-lg border border-white/5 sm:border-0">
                <span className="text-[11px] text-white/70 uppercase tracking-wider font-semibold">Total Selecionado:</span>
                <span className={`text-lg sm:text-xl font-black ${activeTheme.colorText}`}>
                  R$ {filteredTotalValue.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* FILTER CONTROLS TOOLBAR */}
            <div className="p-4 bg-surface-container border-b border-white/10 flex flex-col gap-3">
              {/* Row 1: Period selector Tabs (Todos, Dia, Mês, Ano) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-white/10 w-fit max-w-full overflow-x-auto">
                  <button
                    onClick={() => setPeriodFilter('todos')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      periodFilter === 'todos'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">all_inclusive</span>
                    <span>Todos os Períodos</span>
                  </button>
                  <button
                    onClick={() => setPeriodFilter('dia')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      periodFilter === 'dia'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">today</span>
                    <span>Por Dia</span>
                  </button>
                  <button
                    onClick={() => setPeriodFilter('mes')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      periodFilter === 'mes'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                    <span>Por Mês</span>
                  </button>
                  <button
                    onClick={() => setPeriodFilter('ano')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      periodFilter === 'ano'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">date_range</span>
                    <span>Por Ano</span>
                  </button>
                </div>

                {/* Period Active Navigator */}
                {periodFilter === 'dia' && (
                  <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded-xl border border-white/10">
                    <button 
                      onClick={() => shiftDay(-1)}
                      className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                      title="Dia anterior"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-primary"
                    />
                    <button 
                      onClick={() => shiftDay(1)}
                      className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                      title="Próximo dia"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                    <button 
                      onClick={() => setSelectedDate(todayDateStr)}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
                    >
                      Hoje
                    </button>
                  </div>
                )}

                {periodFilter === 'mes' && (
                  <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded-xl border border-white/10">
                    <button 
                      onClick={() => shiftMonth(-1)}
                      className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                      title="Mês anterior"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <input 
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-primary"
                    />
                    <button 
                      onClick={() => shiftMonth(1)}
                      className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                      title="Próximo mês"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                    <button 
                      onClick={() => setSelectedMonth(currentMonthStr)}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
                    >
                      Mês Atual
                    </button>
                  </div>
                )}

                {periodFilter === 'ano' && (
                  <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded-xl border border-white/10">
                    <button 
                      onClick={() => shiftYear(-1)}
                      className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                      title="Ano anterior"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-primary cursor-pointer"
                    >
                      {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(yr => (
                        <option key={yr} value={String(yr)} className="bg-[#1f2937] text-white">
                          {yr}
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={() => shiftYear(1)}
                      className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                      title="Próximo ano"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                    <button 
                      onClick={() => setSelectedYear(currentYearStr)}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
                    >
                      Ano Atual
                    </button>
                  </div>
                )}
              </div>

              {/* Row 2: Search by Keyword + Category / Type Filter + Sort */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Keyword search input */}
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-2.5 text-white/50 text-[16px] pointer-events-none select-none">
                    filter_alt
                  </span>
                  <input
                    type="text"
                    placeholder={`Filtrar por palavra-chave em ${activeTheme.label}...`}
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-white/50 outline-none focus:border-primary focus:bg-white/15 transition-all shadow-sm"
                  />
                  {filterKeyword && (
                    <button
                      onClick={() => setFilterKeyword('')}
                      className="absolute right-1.5 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10"
                      title="Limpar filtro"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}
                </div>

                {/* Category & Item Type filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary transition-all cursor-pointer truncate"
                  >
                    <option value="todas" className="bg-[#1f2937] text-white">Todas as Categorias</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat} className="bg-[#1f2937] text-white">
                        {cat}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterItemType}
                    onChange={(e) => setFilterItemType(e.target.value as any)}
                    className="w-[120px] shrink-0 bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="todos" className="bg-[#1f2937] text-white">Tipo: Todos</option>
                    <option value="conta" className="bg-[#1f2937] text-white">Apenas Contas</option>
                    <option value="compromisso" className="bg-[#1f2937] text-white">Compromissos</option>
                  </select>
                </div>

                {/* Sorting & Reset Filter */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="text-[11px] text-white/60 shrink-0 hidden sm:inline">Ordem:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="date_asc" className="bg-[#1f2937] text-white">Data (Mais antigas)</option>
                      <option value="date_desc" className="bg-[#1f2937] text-white">Data (Mais recentes)</option>
                      <option value="value_desc" className="bg-[#1f2937] text-white">Maior Valor (R$)</option>
                      <option value="value_asc" className="bg-[#1f2937] text-white">Menor Valor (R$)</option>
                      <option value="title_asc" className="bg-[#1f2937] text-white">Nome (A - Z)</option>
                    </select>
                  </div>

                  {(filterKeyword || filterCategory !== 'todas' || filterItemType !== 'todos' || periodFilter !== 'todos') && (
                    <button
                      onClick={() => {
                        setFilterKeyword('');
                        setFilterCategory('todas');
                        setFilterItemType('todos');
                        setPeriodFilter('todos');
                      }}
                      className="text-[11px] text-[#f87171] hover:text-white bg-[#f87171]/10 hover:bg-[#f87171]/20 border border-[#f87171]/30 px-2 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1 transition-all"
                      title="Limpar todos os filtros"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      <span className="hidden sm:inline">Limpar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* LIST OF FILTERED ACCOUNTS */}
            <div className="divide-y divide-white/10 max-h-[60vh] overflow-y-auto">
              {filteredTabAppointments.length === 0 ? (
                <div className="p-10 text-center text-white/50 flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-4xl opacity-40">filter_none</span>
                  <p className="text-sm font-medium">Nenhuma conta encontrada com os filtros selecionados.</p>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => {
                        setFilterKeyword('');
                        setFilterCategory('todas');
                        setFilterItemType('todos');
                        setPeriodFilter('todos');
                      }} 
                      className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Remover Filtros
                    </button>
                    <button 
                      onClick={() => onOpenModal('conta')} 
                      className="text-xs bg-primary text-on-primary font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Adicionar Nova Conta
                    </button>
                  </div>
                </div>
              ) : (
                filteredTabAppointments.map(app => {
                  const [y, m, d] = app.date.split('-');
                  const formattedDate = `${d}/${m}/${y}`;
                  return (
                    <div 
                      key={app.id} 
                      onClick={() => onEditAppointment(app)}
                      className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors group gap-3 relative overflow-hidden"
                      style={{ borderLeftWidth: '4px', borderLeftColor: app.color || '#10b981' }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="text-center flex flex-col min-w-[62px] px-2 py-1 bg-black/25 rounded-lg border border-white/10 shrink-0">
                          <span className="text-xs font-bold text-white">{formattedDate}</span>
                          {app.time ? (
                            <span className="text-[10px] text-white/70">{app.time}</span>
                          ) : (
                            <span className="text-[9px] text-white/40">Dia todo</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">
                              {app.title}
                            </span>
                            {app.category && (
                              <span className="text-[10px] font-medium bg-white/10 text-white/80 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                                {app.category}
                              </span>
                            )}
                            {app.itemType === 'compromisso' && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.2 rounded shrink-0">
                                Compromisso
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-white/60 mt-1 flex-wrap">
                            {app.contact && (
                              <span className="flex items-center gap-1 text-[#89e0ff]">
                                <span className="material-symbols-outlined text-[13px]">person</span>
                                <span className="truncate max-w-[150px]">{app.contact}</span>
                              </span>
                            )}
                            {app.address && (
                              <span className="flex items-center gap-1 text-white/70">
                                <span className="material-symbols-outlined text-[13px]">location_on</span>
                                <span className="truncate max-w-[150px]">{app.address}</span>
                              </span>
                            )}
                            {app.notes && (
                              <span className="text-white/50 truncate max-w-[200px]">
                                {app.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1 shrink-0">
                        <div className="font-black text-sm sm:text-base text-white">
                          R$ {(app.value || 0).toFixed(2).replace('.', ',')}
                        </div>
                        <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${activeTheme.badge}`}>
                          {getStatusLabel(activeTab)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FULL-SCREEN DRILL-DOWN MODAL FOR ACCOUNTS */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface-container-high border border-white/20 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b border-white/10 ${activeTheme.bgActive} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${activeTheme.bgLight} border ${activeTheme.borderLight} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined text-[24px] ${activeTheme.colorText}`}>
                    {activeTheme.icon}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    Contas: {activeTheme.label}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${activeTheme.badge}`}>
                      {filteredTabAppointments.length} itens
                    </span>
                  </h3>
                  <p className="text-xs text-white/70">
                    Total: <strong className={activeTheme.colorText}>R$ {filteredTotalValue.toFixed(2).replace('.', ',')}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Fechar"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Quick Filter Switching inside modal */}
            <div className="p-3 bg-surface-container border-b border-white/10 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-1.5 overflow-x-auto py-0.5">
                <button
                  onClick={() => setActiveTab('a_pagar')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'a_pagar' ? 'bg-[#f87171] text-white shadow-sm' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  A Pagar ({counts.a_pagar})
                </button>
                <button
                  onClick={() => setActiveTab('pago')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'pago' ? 'bg-[#fbbf24] text-black shadow-sm' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Pago ({counts.pago})
                </button>
                <button
                  onClick={() => setActiveTab('a_receber')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'a_receber' ? 'bg-[#60a5fa] text-white shadow-sm' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  À Receber ({counts.a_receber})
                </button>
                <button
                  onClick={() => setActiveTab('recebido')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'recebido' ? 'bg-[#4ade80] text-black shadow-sm' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Recebido ({counts.recebido})
                </button>
              </div>

              <button
                onClick={() => {
                  setIsCardModalOpen(false);
                  onOpenModal('conta');
                }}
                className="bg-primary text-on-primary font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm hover:opacity-90"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Nova Conta</span>
              </button>
            </div>

            {/* Modal Body List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/10 p-2">
              {filteredTabAppointments.length === 0 ? (
                <div className="p-8 text-center text-white/50">
                  Nenhuma conta encontrada nesta categoria com os filtros ativos.
                </div>
              ) : (
                filteredTabAppointments.map(app => {
                  const [y, m, d] = app.date.split('-');
                  const formattedDate = `${d}/${m}/${y}`;
                  return (
                    <div 
                      key={app.id} 
                      onClick={() => {
                        setIsCardModalOpen(false);
                        onEditAppointment(app);
                      }}
                      className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors rounded-lg gap-2"
                      style={{ borderLeftWidth: '4px', borderLeftColor: app.color || '#10b981' }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="text-center min-w-[55px] bg-black/30 p-1 rounded border border-white/10">
                          <span className="text-[11px] font-bold text-white block">{formattedDate}</span>
                          <span className="text-[9px] text-white/60">{app.time || 'Dia todo'}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-white truncate">{app.title}</div>
                          <div className="text-xs text-white/60 flex items-center gap-2 mt-0.5">
                            {app.category && <span>{app.category}</span>}
                            {app.contact && <span>• {app.contact}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-white">
                          R$ {(app.value || 0).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-surface-container-lowest border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
