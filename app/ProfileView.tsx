"use client";
import React, { useState } from 'react';
import { NavigationBar } from '../components/NavigationBar';

interface AffiliateUser {
  id: string;
  name: string;
  email?: string;
  cpf?: string;
  whatsapp: string;
  age?: string;
  gender?: string;
  profession?: string;
  city?: string;
  state?: string;
  country?: string;
  path: string;
  deviceId: string;
  allowedDeviceIds?: string[];
  maxDevices?: number;
  createdAt: string;
  plan: 'free' | 'premium';
  commissions: number;
  photoURL?: string;
  clicks?: number;
  isAffiliate?: boolean;
  referredBy?: string;
  visualEdits?: string;
  soundEnabled?: boolean;
  voiceEnabled?: boolean;
  firebaseUid?: string;
  indirectReferredBy?: string;
  directCommissionDuration?: number;
  indirectCommissionDuration?: number;
  freeTrialDays?: number;
  themeColor?: string;
  themeBg?: string;
  planExpiresAt?: string;
  pixKey?: string;
  totpEnabled?: boolean;
  totpSecret?: string;
  webAuthnEnabled?: boolean;
  webAuthnCredentialId?: string;
  installmentsPaid?: number;
  grantedDiscount?: {
    pct: number;
    months: number;
    grantedAt: string;
  };
}

interface ProfileViewProps {
  onNavigate: (view: 'landing' | 'main_menu' | 'calendar' | 'dashboard' | 'daily_agenda' | 'admin' | 'instructions' | 'modules' | 'accounts' | 'affiliate' | 'profile' | string) => void;
  currentUser: AffiliateUser | null;
  userName: string;
  userWhatsapp: string;
  userAppColor: string;
  userAppBg: string;
  isProcessingPayment?: boolean;
  isCurrentlyAdmin?: boolean;
  handleUpdateUserData: (data: Partial<AffiliateUser>) => void;
  getExpirationStatus: (user: any) => any;
  handleExport: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStart2FASetup: () => void;
  handleStartWebAuthnSetup: () => void;
  onOpenSupport?: () => void;
  onOpenSubscription?: () => void;
  onLogout: () => void;
  setPaymentPlan?: (plan: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ProfileView({
  onNavigate,
  currentUser,
  userName,
  userWhatsapp,
  userAppColor,
  userAppBg,
  isProcessingPayment = false,
  isCurrentlyAdmin = false,
  handleUpdateUserData,
  getExpirationStatus,
  handleExport,
  handleImport,
  handleStart2FASetup,
  handleStartWebAuthnSetup,
  onOpenSupport,
  onOpenSubscription,
  onLogout,
  setPaymentPlan,
  fileInputRef
}: ProfileViewProps) {
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);

  return (
    <div className="bg-brand text-white min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="bg-brand sticky w-full top-0 z-50 flex justify-between items-center px-5 py-2 shadow-sm relative border-b border-white/10">
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
                <button onClick={() => { onNavigate('accounts'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_balance_wallet</span> Gestão de Contas
                </button>
                <button onClick={() => { onNavigate('affiliate'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">groups</span> Minha Rede
                </button>
                <button onClick={() => { onNavigate('profile'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent bg-surface-container-lowest text-primary font-bold shadow-sm cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_circle</span> Perfil
                </button>
                <button onClick={() => { if (onOpenSupport) onOpenSupport(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">support_agent</span> Ajuda & Suporte
                </button>
                {isCurrentlyAdmin && (
                  <button onClick={() => { onNavigate('admin'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">admin_panel_settings</span> Admin
                  </button>
                )}
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-5 pb-32 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-white">person</span>
            Perfil & Backup
          </h1>
          <button onClick={() => onNavigate('main_menu')} className="text-sm text-white/70 hover:text-white flex items-center gap-1 font-medium transition-colors">
            &larr; Menu
          </button>
        </div>

        <div className="bg-[#06402B]/80 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
          {/* User Info Header */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/20 p-5 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
              {(userName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-white truncate">{userName || 'Usuário'}</p>
              {userWhatsapp && <p className="text-sm font-medium text-white/90 mt-0.5">{userWhatsapp}</p>}
              <p className="text-xs text-white/60 mt-1">Autosalvamento: Nuvem e Local Ativos</p>

              {currentUser && (
                <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-white/10">
                  <p className={`text-xs font-bold uppercase tracking-wider ${currentUser.plan === 'premium' ? 'text-green-300' : 'text-white/70'}`}>
                    Plano: {currentUser.plan === 'premium' ? 'VIP' : 'Grátis'}
                  </p>
                  {currentUser.plan === 'free' && getExpirationStatus(currentUser).trialDaysRemaining > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium w-fit bg-white/10 text-white border border-white/20">
                      {getExpirationStatus(currentUser).trialDaysRemaining} dias de teste restante(s)
                    </span>
                  )}
                  {currentUser.plan === 'premium' && currentUser.planExpiresAt && (
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium w-fit ${getExpirationStatus(currentUser).planDaysRemaining <= 0 ? 'bg-error/20 text-red-200 border border-red-500/30' : 'bg-white/10 text-white border border-white/20'}`}>
                      {getExpirationStatus(currentUser).planDaysRemaining > 0 ? `Expira em ${getExpirationStatus(currentUser).planDaysRemaining} dias` : 'Plano Vencido'}
                    </span>
                  )}
                  <p className="text-xs font-bold uppercase tracking-wider text-white mt-1">
                    Licença: {currentUser.maxDevices || 1} APARELHO(S) ({currentUser.allowedDeviceIds?.length || 1} ATIVOS)
                  </p>
                  <button
                    onClick={() => {
                      if (setPaymentPlan) {
                        setPaymentPlan({ name: 'Licença Dispositivo Adicional', price: 9.90, originalPrice: 9.90, type: 'extra_device' });
                      }
                      if (onOpenSubscription) onOpenSubscription();
                    }}
                    disabled={isProcessingPayment}
                    className="mt-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-medium text-xs transition-colors border border-white/20 flex items-center justify-center gap-1.5 text-center px-3 cursor-pointer w-fit"
                  >
                    <span className="material-symbols-outlined text-[16px] text-white">add_circle</span>
                    Comprar Licença Extra (R$ 9,90)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Shortcut Action Buttons */}
          {currentUser && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => onNavigate('affiliate')}
                className="bg-white/10 text-white hover:bg-white/20 py-3 px-4 rounded-xl font-medium text-sm transition-colors border border-white/20 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px] text-white">groups</span>
                Minha Rede
              </button>

              {currentUser.plan === 'free' && (
                <button
                  onClick={() => { if (onOpenSubscription) onOpenSubscription(); }}
                  disabled={isProcessingPayment}
                  className="bg-white text-black hover:-translate-y-0.5 hover:shadow-lg py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:-translate-y-0 cursor-pointer shadow-sm"
                >
                  {isProcessingPayment ? (
                    <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                  )}
                  {isProcessingPayment ? 'Aguarde...' : 'Assinar VIP'}
                </button>
              )}

              {isCurrentlyAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="bg-white text-black hover:-translate-y-0.5 hover:shadow-lg py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px] text-black">admin_panel_settings</span>
                  Painel Admin
                </button>
              )}
            </div>
          )}

          {/* Dados Demográficos */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider border-b border-white/20 pb-2">
              Dados Demográficos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white/5 rounded-xl border border-white/20">
              <label className="text-sm font-medium text-white flex flex-col gap-1.5">
                Idade
                <input
                  type="number"
                  value={currentUser?.age || ''}
                  onChange={(e) => handleUpdateUserData({ age: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg block p-2.5 placeholder-white/30 outline-none focus:border-white transition-colors"
                  placeholder="Ex: 35"
                />
              </label>

              <label className="text-sm font-medium text-white flex flex-col gap-1.5">
                Sexo
                <select
                  value={currentUser?.gender || ''}
                  onChange={(e) => handleUpdateUserData({ gender: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg block p-2.5 outline-none focus:border-white transition-colors"
                >
                  <option value="" className="text-black">Selecione</option>
                  <option value="Masculino" className="text-black">Masculino</option>
                  <option value="Feminino" className="text-black">Feminino</option>
                  <option value="Outro" className="text-black">Outro</option>
                  <option value="Prefiro não dizer" className="text-black">Prefiro não dizer</option>
                </select>
              </label>

              <label className="text-sm font-medium text-white flex flex-col gap-1.5">
                Profissão
                <input
                  type="text"
                  value={currentUser?.profession || ''}
                  onChange={(e) => handleUpdateUserData({ profession: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg block p-2.5 placeholder-white/30 outline-none focus:border-white transition-colors"
                  placeholder="Sua profissão"
                />
              </label>
            </div>
          </div>

          {/* Personalização Visual */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider border-b border-white/20 pb-2">
              Personalização Visual
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white/5 rounded-xl border border-white/20">
              <label className="text-sm font-medium text-white flex flex-col gap-1.5">
                Cor Principal (Tema)
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={userAppColor}
                    onChange={(e) => handleUpdateUserData({ themeColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border-none cursor-pointer p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={userAppColor}
                    onChange={(e) => handleUpdateUserData({ themeColor: e.target.value })}
                    className="flex-1 bg-white/10 border border-white/20 text-white text-sm rounded-lg block p-2.5 placeholder-white/30 outline-none focus:border-white transition-colors"
                    placeholder="#263E2A"
                  />
                </div>
              </label>

              <label className="text-sm font-medium text-white flex flex-col gap-1.5">
                Imagem ou Cor de Fundo
                <input
                  type="text"
                  value={userAppBg}
                  onChange={(e) => handleUpdateUserData({ themeBg: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white text-sm rounded-lg block p-2.5 placeholder-white/30 outline-none focus:border-white transition-colors"
                  placeholder="URL da imagem ou Cor (ex: #06402B)"
                />
              </label>
            </div>
          </div>

          {/* Segurança */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider border-b border-white/20 pb-2">
              Segurança
            </h4>
            <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-xl border border-white/20">
              <div className="flex justify-between items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Verificação em Duas Etapas</span>
                  <span className="text-xs text-white/60 mt-0.5">Google Authenticator</span>
                </div>
                {currentUser?.totpEnabled ? (
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja desativar a verificação em duas etapas?')) {
                        handleUpdateUserData({ totpEnabled: false, totpSecret: undefined });
                        alert('Verificação em duas etapas desativada com sucesso.');
                      }
                    }}
                    className="bg-error/20 text-red-200 hover:bg-error/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-500/30 cursor-pointer shrink-0"
                  >
                    DESATIVAR
                  </button>
                ) : (
                  <button
                    onClick={handleStart2FASetup}
                    className="bg-white/10 text-white hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/20 cursor-pointer shrink-0"
                  >
                    ATIVAR
                  </button>
                )}
              </div>

              <div className="flex justify-between items-center gap-4 border-t border-white/10 pt-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Verificação em Duas Etapas</span>
                  <span className="text-xs text-white/60 mt-0.5">Digital / Face ID (Aparelhos Móveis)</span>
                </div>
                {currentUser?.webAuthnEnabled ? (
                  <button
                    onClick={() => {
                      if (confirm('Tem certeza que deseja desativar a verificação por biometria?')) {
                        handleUpdateUserData({ webAuthnEnabled: false, webAuthnCredentialId: undefined });
                        alert('Verificação por biometria desativada com sucesso.');
                      }
                    }}
                    className="bg-error/20 text-red-200 hover:bg-error/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-500/30 cursor-pointer shrink-0"
                  >
                    DESATIVAR
                  </button>
                ) : (
                  <button
                    onClick={handleStartWebAuthnSetup}
                    className="bg-white/10 text-white hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/20 cursor-pointer shrink-0"
                  >
                    ATIVAR
                  </button>
                )}
              </div>

              {/* Login Automático */}
              <div className="flex justify-between items-center gap-4 border-t border-white/10 pt-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-400 text-lg">bolt</span>
                    Login Automático (Lembrar Acesso)
                  </span>
                  <span className="text-xs text-white/60 mt-0.5">
                    {typeof window !== 'undefined' && localStorage.getItem('agio_remember_login') === 'true'
                      ? `Ativado para ${localStorage.getItem('agio_saved_email') || 'sua conta'}`
                      : 'Entrar automaticamente nas próximas visitas sem digitar senha'}
                  </span>
                </div>
                {typeof window !== 'undefined' && localStorage.getItem('agio_remember_login') === 'true' ? (
                  <button
                    onClick={() => {
                      localStorage.removeItem('agio_remember_login');
                      localStorage.removeItem('agio_saved_email');
                      localStorage.removeItem('agio_saved_password');
                      alert('Configuração de login automático removida.');
                      window.location.reload();
                    }}
                    className="bg-error/20 text-red-200 hover:bg-error/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-500/30 cursor-pointer shrink-0"
                  >
                    DESATIVAR
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const emailPrompt = prompt('Informe seu e-mail ou WhatsApp para o login automático:', currentUser?.email || currentUser?.whatsapp || '');
                      if (!emailPrompt) return;
                      const passPrompt = prompt('Informe a sua senha para salvar:');
                      if (!passPrompt) return;

                      localStorage.setItem('agio_remember_login', 'true');
                      localStorage.setItem('agio_saved_email', emailPrompt.trim());
                      localStorage.setItem('agio_saved_password', passPrompt);
                      alert('Login automático configurado e ativado com sucesso!');
                      window.location.reload();
                    }}
                    className="bg-white/10 text-white hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/20 cursor-pointer shrink-0"
                  >
                    ATIVAR
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Backup e Restauração */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider border-b border-white/20 pb-2">
              Backup e Restauração
            </h4>
            <p className="text-xs md:text-sm text-white/70">
              Seus dados são salvos localmente e na nuvem automaticamente. Você também pode exportar e restaurar seus dados manualmente baixando um arquivo de backup.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <button
                onClick={handleExport}
                className="w-full bg-white/5 hover:bg-white/10 text-white py-3.5 px-4 rounded-xl flex items-center gap-3 transition-colors border border-white/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-white text-[24px]">cloud_download</span>
                <div className="text-left leading-tight">
                  <span className="block font-semibold text-sm">Baixar Arquivo de Backup</span>
                  <span className="block text-xs text-white/60">Fazer download (.json) do calendário</span>
                </div>
              </button>

              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-white/5 hover:bg-white/10 text-white py-3.5 px-4 rounded-xl flex items-center gap-3 transition-colors border border-white/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-white text-[24px]">cloud_upload</span>
                <div className="text-left leading-tight">
                  <span className="block font-semibold text-sm">Restaurar de arquivo .json</span>
                  <span className="block text-xs text-white/60">Carregar calendário de backup</span>
                </div>
              </button>
            </div>
          </div>

          {/* Support & Logout Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => { if (onOpenSupport) onOpenSupport(); }}
              className="w-full py-3.5 rounded-xl border border-white/30 text-white hover:bg-white/10 transition-colors font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-white">support_agent</span>
              Central de Ajuda & Suporte
            </button>

            <button
              onClick={onLogout}
              className="w-full py-3.5 rounded-xl border border-red-500/50 text-red-300 hover:bg-red-500/10 transition-colors font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined">logout</span>
              Sair da Conta
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface-container border-t border-white/10 flex justify-around items-center px-4 pb-6 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
        <button onClick={() => onNavigate('calendar')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors">
          <span className="material-symbols-outlined">calendar_month</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide">MÊS</span>
        </button>
        <button onClick={() => onNavigate('dashboard')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors">
          <span className="material-symbols-outlined">list_alt</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide">TAREFAS</span>
        </button>
        <button onClick={() => onNavigate('daily_agenda')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors">
          <span className="material-symbols-outlined">today</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide text-center">DIA</span>
        </button>
        <button onClick={() => onNavigate('affiliate')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors">
          <span className="material-symbols-outlined">groups</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide text-center">REDE</span>
        </button>
        <button className="flex flex-col items-center justify-center text-brand bg-white px-4 py-1.5 hover:bg-white/90 rounded-xl transition-colors shadow-inner">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide">PERFIL</span>
        </button>
      </nav>
    </div>
  );
}
