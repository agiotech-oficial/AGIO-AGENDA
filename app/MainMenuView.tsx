import React, { useState } from 'react';
import { NavigationBar } from '../components/NavigationBar';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onTap: () => void;
  children: React.ReactNode;
}

export function TouchButton({ onTap, children, ...props }: TouchButtonProps) {
  const touchStartY = React.useRef<number | null>(null);
  const touchStartX = React.useRef<number | null>(null);
  const isTouchActive = React.useRef<boolean>(false);
  const lastTouchTime = React.useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    isTouchActive.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (touchStartY.current !== null && touchStartX.current !== null) {
      const touch = e.touches[0];
      const diffY = Math.abs(touch.clientY - touchStartY.current);
      const diffX = Math.abs(touch.clientX - touchStartX.current);
      // Cancel tap if the user moves or scrolls the finger significantly (more than 10px)
      if (diffY > 10 || diffX > 10) {
        isTouchActive.current = false;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (isTouchActive.current) {
      lastTouchTime.current = Date.now();
      e.preventDefault();
      onTap();
    }
    touchStartY.current = null;
    touchStartX.current = null;
    isTouchActive.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // If we processed a tap event recently, prevent the duplicate synthetic click event from firing
    if (Date.now() - lastTouchTime.current > 600) {
      onTap();
    }
  };

  return (
    <button
      {...props}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

interface MainMenuViewProps {
  onNavigate: (view: 'landing' | 'main_menu' | 'calendar' | 'dashboard' | 'daily_agenda' | 'admin' | 'instructions' | 'modules' | 'accounts' | 'meeting_room' | string) => void;
  onOpenProfile: () => void;
  onOpenAffiliate: () => void;
  onOpenSupport: () => void;
  onOpenSubscription: () => void;
  onLogout?: () => void;
  userName: string;
  currentUser?: any;
  isAccessExpired?: boolean;
  isAdmin?: boolean;
  currentLang?: string;
}

function getExpirationStatus(user: any) {
  if (!user) return { trialDaysRemaining: 0, planDaysRemaining: -1, planExpired: false, daysSinceTrialExpiration: 0 };
  
  const isDalecio = (user.name && (user.name.toUpperCase().includes('DALÉCIO') || user.name.toUpperCase().includes('DALECIO'))) || 
                    (user.cpf && user.cpf.replace(/\D/g, '') === '10896050726') ||
                    (user.email && user.email.toLowerCase().trim() === 'agiotech.oficial@gmail.com');
  if (isDalecio) {
    return { trialDaysRemaining: 99999, planDaysRemaining: 99999, planExpired: false, daysSinceTrialExpiration: 0, isLifetime: true };
  }

  const now = new Date();
  const createdDate = new Date(user.createdAt || new Date());
  const trialDays = user.freeTrialDays ?? 40;
  const trialEnd = new Date(createdDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 3600 * 24)));
  const daysSinceTrialExpiration = Math.max(0, Math.ceil((now.getTime() - trialEnd.getTime()) / (1000 * 3600 * 24)));
  
  let planDaysRemaining = -1;
  let planExpired = false;
  if (user.plan === 'premium' && user.planExpiresAt) {
    const expiresAt = new Date(user.planExpiresAt);
    planDaysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 3600 * 24)));
    if (planDaysRemaining <= 0) planExpired = true;
  }
  
  return { trialDaysRemaining, planDaysRemaining, planExpired, daysSinceTrialExpiration };
}

export function MainMenuView({ onNavigate, onOpenProfile, onOpenAffiliate, onOpenSupport, onOpenSubscription, onLogout, userName, currentUser, isAccessExpired, isAdmin, currentLang: propLang }: MainMenuViewProps) {
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [lang, setLang] = useState<string>('pt');

  React.useEffect(() => {
    const getSavedLang = () => {
      try {
        const saved = localStorage.getItem('user_language');
        if (saved) return saved;
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookie = decodedCookie.match(/googtrans=\/(?:pt|auto)\/([a-z]{2})/);
        if (cookie && cookie[1]) return cookie[1];
        return 'pt';
      } catch (e) {
        return 'pt';
      }
    };

    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setLang(customEvent.detail);
      } else {
        setLang(getSavedLang());
      }
    };

    setLang(getSavedLang());
    window.addEventListener('appLanguageChanged', handleLangChange);
    return () => window.removeEventListener('appLanguageChanged', handleLangChange);
  }, []);

  const activeLang = propLang || lang;
  const isEs = activeLang === 'es';
  const isEn = activeLang === 'en';

  const t = (ptText: string, enText: string, esText: string) => {
    if (isEs) return esText;
    if (isEn) return enText;
    return ptText;
  };

  let buttons = [
    { label: t('Cadastro', 'Registration', 'Registro'), icon: 'app_registration', onClick: () => onNavigate('landing'), rawKey: 'Cadastro' },
    { label: t('Calendário', 'Calendar', 'Calendario'), icon: 'calendar_month', onClick: () => onNavigate('calendar'), rawKey: 'Calendário' },
    { label: t('Agenda Diária', 'Daily Agenda', 'Agenda Diaria'), icon: 'view_day', onClick: () => onNavigate('daily_agenda'), rawKey: 'Agenda Diária' },
    { label: t('Dashboard', 'Dashboard', 'Panel'), icon: 'dashboard', onClick: () => onNavigate('dashboard'), rawKey: 'Dashboard' },
    { label: t('Gestão de Contas', 'Account Management', 'Gestión de Cuentas'), icon: 'account_balance_wallet', onClick: () => onNavigate('accounts'), rawKey: 'Gestão de Contas' },
    { label: t('Minha Rede', 'My Network', 'Mi Red'), icon: 'groups', onClick: onOpenAffiliate, rawKey: 'Minha Rede' },
    { label: t('Sala Virtual', 'Meeting Room', 'Sala Virtual'), icon: 'videocam', onClick: () => onNavigate('meeting_room'), rawKey: 'Sala Virtual' },
    { label: t('Perfil', 'Profile', 'Perfil'), icon: 'account_circle', onClick: onOpenProfile, rawKey: 'Perfil' },
    { label: t('Planos de Assinatura', 'Subscription Plans', 'Planes de Suscripción'), icon: 'workspace_premium', onClick: onOpenSubscription, rawKey: 'Planos de Assinatura' },
    { label: t('Ajuda & Suporte', 'Help & Support', 'Ayuda y Soporte'), icon: 'support_agent', onClick: onOpenSupport, rawKey: 'Ajuda & Suporte' },
    { label: t('Instruções de uso', 'Instructions', 'Instrucciones de uso'), icon: 'menu_book', onClick: () => onNavigate('instructions'), rawKey: 'Instruções de uso' },
  ];

  if (currentUser && !isAdmin) {
    buttons = buttons.filter(b => b.rawKey !== 'Cadastro');
  }

  if (isAdmin) {
    buttons.push({ label: t('Admin', 'Admin', 'Admin'), icon: 'admin_panel_settings', onClick: () => onNavigate('admin'), rawKey: 'Admin' });
  }

  return (
    <div className="bg-brand text-white min-h-screen flex flex-col font-sans">
      {/* TopAppBar */}
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
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">calendar_month</span> {t('Calendário', 'Calendar', 'Calendario')}
                </button>
                <button onClick={() => { onNavigate('daily_agenda'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">view_day</span> {t('Agenda Diária', 'Daily Agenda', 'Agenda Diaria')}
                </button>
                <button onClick={() => { onNavigate('dashboard'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">dashboard</span> {t('Dashboard', 'Dashboard', 'Panel')}
                </button>
                <button onClick={() => { onNavigate('accounts'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_balance_wallet</span> {t('Gestão de Contas', 'Account Management', 'Gestión de Cuentas')}
                </button>
                <button onClick={() => { onOpenAffiliate(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">groups</span> {t('Minha Rede', 'My Network', 'Mi Red')}
                </button>
                <button onClick={() => { onNavigate('meeting_room'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">videocam</span> {t('Sala Virtual', 'Meeting Room', 'Sala Virtual')}
                </button>
                <button onClick={() => { onOpenProfile(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_circle</span> {t('Perfil', 'Profile', 'Perfil')}
                </button>
                <button onClick={() => { if (onOpenSupport) onOpenSupport(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">support_agent</span> {t('Ajuda & Suporte', 'Help & Support', 'Ayuda y Soporte')}
                </button>
                {isAdmin && (
                  <button onClick={() => { onNavigate('admin'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">admin_panel_settings</span> {t('Admin', 'Admin', 'Admin')}
                  </button>
                )}
                <button onClick={() => { onNavigate('instructions'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">menu_book</span> {t('Instruções de uso', 'Instructions', 'Instrucciones de uso')}
                </button>
                {(!currentUser || isAdmin) && (
                  <button onClick={() => { onNavigate('landing'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">person_add</span> {t('Cadastro', 'Registration', 'Registro')}
                  </button>
                )}
                {onLogout && (
                  <button onClick={() => { onLogout(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-red-400 hover:border-red-500 hover:bg-red-500/10 cursor-pointer">
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">logout</span> {t('Sair', 'Logout', 'Salir')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <TouchButton onTap={() => onNavigate('main_menu')} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none">
          <img alt="Ágio Agenda" className="h-[34px] w-auto object-contain rounded-xl overflow-hidden" src="/2zguve2zguve2zgu.png" />
        </TouchButton>
        <div className="w-[36px] z-10" />
      </header>

      <NavigationBar />

      <main className="flex-1 overflow-y-auto flex flex-col items-center p-6 bg-gradient-to-br from-[#1E0935] to-[#0A0214] pb-32">
        <div className="w-full max-w-lg flex flex-col gap-8 animate-in slide-in-from-bottom-5 fade-in duration-500 py-4 mt-8 mb-12">
          
          <section className="flex flex-col gap-2 items-center justify-center text-center">
            <span className="block text-sm text-white/80 font-medium">{t('Olá', 'Hello', 'Hola')}, {(userName || 'Usuário').split(' ')[0]} 👋</span>
            <div className="flex gap-2 justify-center flex-wrap">
              {currentUser && currentUser.plan === 'free' && getExpirationStatus(currentUser).trialDaysRemaining > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/20 text-white">
                    {t('Testando:', 'Trial:', 'Prueba:')} {getExpirationStatus(currentUser).trialDaysRemaining} {t('dias', 'days', 'días')}
                  </span>
              )}
              {currentUser && currentUser.plan === 'free' && getExpirationStatus(currentUser).trialDaysRemaining <= 0 && currentUser.isAffiliate && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">groups</span>
                    Afiliado Ativo (Gratuidade Agenda Expirada)
                  </span>
              )}
              {currentUser && currentUser.plan === 'premium' && currentUser.planExpiresAt && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getExpirationStatus(currentUser).planDaysRemaining <= 0 ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}>
                    {getExpirationStatus(currentUser).planDaysRemaining <= 0 ? t('VIP Vencido', 'VIP Expired', 'VIP Vencido') : `${t('VIP exp:', 'VIP exp:', 'VIP exp:')} ${getExpirationStatus(currentUser).planDaysRemaining}d`}
                  </span>
              )}
            </div>
          </section>

          {currentUser && currentUser.isAffiliate && (currentUser.plan === 'free' && getExpirationStatus(currentUser).trialDaysRemaining <= 0) && !isAdmin && (
            <div className="bg-gradient-to-r from-amber-900/40 via-amber-800/30 to-amber-900/40 border border-amber-400/40 rounded-2xl p-4 text-center flex flex-col items-center gap-2.5 shadow-lg">
              <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm uppercase tracking-wide">
                <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                <span>Acesso Restrito ao Painel de Afiliados</span>
              </div>
              <p className="text-xs text-white/90 leading-relaxed max-w-md">
                Seu teste gratuito de 40 dias para as funções de agenda expirou. Como afiliado, você continua com <strong>acesso total ao Painel de Afiliados</strong>. Para liberar o Calendário e demais ferramentas, assine um plano.
              </p>
              <div className="flex gap-2 w-full max-w-md mt-1">
                <button 
                  onClick={onOpenAffiliate}
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  Painel de Afiliados
                </button>
                <button 
                  onClick={onOpenSubscription}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-black text-xs py-2.5 rounded-xl font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">lock_open</span>
                  Desbloquear Agenda
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{t('O que você deseja fazer?', 'What would you like to do?', '¿Qué deseas hacer?')}</h2>
            <p className="text-on-surface-variant text-sm">{t('Escolha uma opção abaixo para navegar.', 'Choose an option below to navigate.', 'Elige una opción a continuación para navegar.')}</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {buttons.map((btn, i) => {
              const isAffiliateExpired = currentUser && currentUser.isAffiliate && (currentUser.plan === 'free' && getExpirationStatus(currentUser).trialDaysRemaining <= 0) && !isAdmin;
              const isRestrictedAgendaView = isAffiliateExpired && ['Calendário', 'Agenda Diária', 'Dashboard', 'Gestão de Contas', 'Instruções de uso'].includes(btn.rawKey);
              const isAffiliateView = isAffiliateExpired && btn.rawKey === 'Minha Rede';

              return (
                <TouchButton
                  key={i}
                  onTap={btn.onClick}
                  className={`relative flex flex-col items-center justify-center gap-2.5 p-3.5 rounded-xl border transition-all active:opacity-70 shadow-sm hover:shadow-md group min-h-[8.5rem] h-auto cursor-pointer touch-manipulation select-none focus:outline-none w-full ${
                    isAffiliateView 
                      ? 'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-900/40' 
                      : isRestrictedAgendaView 
                      ? 'bg-surface-container-low/60 border-amber-500/30 hover:border-amber-400/50 opacity-90' 
                      : 'bg-surface-container-low border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container'
                  }`}
                >
                  {isRestrictedAgendaView && (
                    <span className="absolute top-2 right-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[11px]">lock</span>
                      VIP
                    </span>
                  )}
                  {isAffiliateView && (
                    <span className="absolute top-2 right-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[11px]">check_circle</span>
                      Ativo
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none shrink-0 transition-colors ${
                    isAffiliateView ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30' : 'bg-primary/10 group-hover:bg-primary/20'
                  }`}>
                    <span className={`material-symbols-outlined text-[28px] pointer-events-none shrink-0 notranslate ${isAffiliateView ? 'text-emerald-300' : 'text-white'}`} translate="no">{btn.icon}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-on-surface text-center leading-snug pointer-events-none break-words max-w-full px-1">{btn.label}</span>
                </TouchButton>
              );
            })}
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface-container border-t border-white/10 flex justify-around items-center px-4 pb-6 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
        <TouchButton onTap={() => onNavigate('calendar')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors focus:outline-none">
          <span className="material-symbols-outlined pointer-events-none notranslate" translate="no">calendar_month</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide pointer-events-none">{t('MÊS', 'MONTH', 'MES')}</span>
        </TouchButton>
        <TouchButton onTap={() => onNavigate('dashboard')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors focus:outline-none">
          <span className="material-symbols-outlined pointer-events-none notranslate" translate="no">list_alt</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide pointer-events-none">{t('TAREFAS', 'TASKS', 'TAREAS')}</span>
        </TouchButton>
        <TouchButton onTap={onOpenAffiliate} className="flex flex-col items-center justify-center text-[#ffccd5] px-4 py-1.5 hover:text-white transition-colors focus:outline-none">
          <span className="material-symbols-outlined pointer-events-none notranslate" translate="no">groups</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide text-center pointer-events-none">{t('REDE', 'NETWORK', 'RED')}</span>
        </TouchButton>
        <TouchButton onTap={onOpenProfile} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors focus:outline-none">
          <span className="material-symbols-outlined pointer-events-none notranslate" translate="no">person</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide pointer-events-none">{t('PERFIL', 'PROFILE', 'PERFIL')}</span>
        </TouchButton>
      </nav>
    </div>
  );
}
