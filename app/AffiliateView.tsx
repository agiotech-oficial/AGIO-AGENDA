"use client";
import React, { useState } from 'react';
import { NavigationBar } from '../components/NavigationBar';
import { AffiliateLeads } from '../components/AffiliateLeads';

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

interface AffiliateViewProps {
  onNavigate: (view: 'landing' | 'main_menu' | 'calendar' | 'dashboard' | 'daily_agenda' | 'admin' | 'instructions' | 'modules' | 'accounts' | 'affiliate' | 'subscription' | string) => void;
  currentUser: AffiliateUser | null;
  setCurrentUser: (user: AffiliateUser | null) => void;
  handleUpdateUserData: (data: Partial<AffiliateUser>) => void;
  directCommissionPct: string;
  indirectCommissionPct: string;
  directCommissionMonths: number;
  indirectCommissionMonths: number;
  automaticCommissionPayment: boolean;
  onOpenProfile: () => void;
  onOpenSupport?: () => void;
  onOpenSubscription?: () => void;
  isAdmin?: boolean;
  onLogout?: () => void;
}

function isValidCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

function getExpirationStatus(user: AffiliateUser | null) {
  if (!user) return { trialDaysRemaining: 0, planDaysRemaining: -1, planExpired: false, daysSinceTrialExpiration: 0 };
  const isDalecio = (user.name && (user.name.toUpperCase().includes('DALÉCIO') || user.name.toUpperCase().includes('DALECIO'))) ||
                    (user.cpf && user.cpf.replace(/\D/g, '') === '10896050726') ||
                    (user.email && user.email.toLowerCase().trim() === 'agiotech.oficial@gmail.com');
  if (isDalecio) {
    return { trialDaysRemaining: 99999, planDaysRemaining: 99999, planExpired: false, daysSinceTrialExpiration: 0, isLifetime: true };
  }
  const createdAt = new Date(user.createdAt || Date.now());
  const trialDays = user.freeTrialDays !== undefined ? user.freeTrialDays : 30;
  const trialEnd = new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const daysSinceTrialExpiration = Math.max(0, Math.floor((now.getTime() - trialEnd.getTime()) / (1000 * 60 * 60 * 24)));

  if (user.plan === 'premium') {
    const expiresAt = user.planExpiresAt ? new Date(user.planExpiresAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const planDaysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { trialDaysRemaining, planDaysRemaining, planExpired: planDaysRemaining <= 0, daysSinceTrialExpiration };
  }
  return { trialDaysRemaining, planDaysRemaining: -1, planExpired: false, daysSinceTrialExpiration };
}

export function AffiliateView({
  onNavigate,
  currentUser,
  setCurrentUser,
  handleUpdateUserData,
  directCommissionPct,
  indirectCommissionPct,
  directCommissionMonths,
  indirectCommissionMonths,
  automaticCommissionPayment,
  onOpenProfile,
  onOpenSupport,
  onOpenSubscription,
  isAdmin,
  onLogout
}: AffiliateViewProps) {
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
                <button onClick={() => { onNavigate('affiliate'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent bg-surface-container-lowest text-primary font-bold shadow-sm cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">groups</span> Minha Rede
                </button>
                <button onClick={() => { onOpenProfile(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_circle</span> Perfil
                </button>
                <button onClick={() => { if (onOpenSupport) onOpenSupport(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">support_agent</span> Ajuda & Suporte
                </button>
                {isAdmin && (
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
            <span className="material-symbols-outlined text-[32px] text-white">groups</span>
            Minha Rede
          </h1>
          <button onClick={() => onNavigate('main_menu')} className="text-sm text-white/70 hover:text-white flex items-center gap-1 font-medium transition-colors">
            &larr; Menu
          </button>
        </div>

        <div className="bg-[#06402B]/80 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
          {currentUser && !currentUser.isAffiliate ? (
            <div className="flex flex-col items-center gap-4 text-center max-w-2xl mx-auto py-6">
              <span className="material-symbols-outlined text-[64px] text-white/90 mb-2">monetization_on</span>
              <h2
                className="font-bold tracking-tight leading-tight text-center bg-gradient-to-b from-gray-100 to-gray-300 bg-clip-text text-transparent"
                style={{ fontFamily: "'Public Sans', sans-serif", fontSize: '2em' }}
              >
                Programa de Afiliados
              </h2>
              <p className="text-base font-bold text-white drop-shadow-sm text-center">
                Compartilhe o aplicativo com outras pessoas, através do seu link de afiliado, e ganhe comissões incríveis por cada assinatura confirmada!
              </p>
              <ul className="text-sm md:text-base text-white/80 text-left list-disc list-inside mt-2 mb-4 bg-white/5 border border-white/20 p-5 rounded-xl w-full">
                <li><strong className="text-white text-base md:text-xl">{directCommissionPct} de comissão direta</strong><br /><span className="text-white font-semibold">por {directCommissionMonths} meses para cada indicado seu.</span></li>
                <li className="mt-3"><strong className="text-white text-base md:text-xl">{indirectCommissionPct} de comissão indireta</strong><br /><span className="text-white font-semibold">por {indirectCommissionMonths} meses se sua rede indicar alguém.</span></li>
                <li className="mt-4"><strong className="text-white">Saque via PIX {automaticCommissionPayment ? 'automático' : 'manual'}:</strong> A comissão ficará disponível a cada 15 dias (dias 1 e 16 de cada mês), {automaticCommissionPayment ? 'enviada automaticamente' : 'e o pagamento deverá ser solicitado pelo aplicativo, sendo enviado'} exclusivamente para a conta bancária do mesmo titular (Nome e CPF idênticos).</li>
              </ul>
              <button
                onClick={() => {
                  const updatedUser = { ...currentUser, isAffiliate: true };
                  const storedUsers = JSON.parse(localStorage.getItem('agenda_users') || '[]');
                  const userIndex = storedUsers.findIndex((u: any) => u.id === currentUser.id);
                  if (userIndex !== -1) {
                    storedUsers[userIndex] = updatedUser;
                    localStorage.setItem('agenda_users', JSON.stringify(storedUsers));
                  }
                  setCurrentUser(updatedUser);
                  alert('Bem-vindo ao Programa de Afiliados!');
                }}
                className="w-full max-w-md bg-white text-black hover:-translate-y-0.5 hover:shadow-lg py-3.5 rounded-xl font-bold text-base transition-all active:scale-95 cursor-pointer"
              >
                Aderir Gratuitamente
              </button>
            </div>
          ) : (
            <>
              {(() => {
                const expStatus = getExpirationStatus(currentUser);
                const isAccessExpired = currentUser && ((currentUser.plan === 'free' && expStatus.trialDaysRemaining <= 0) || (currentUser.plan === 'premium' && expStatus.planExpired));
                if (isAccessExpired && !isAdmin) {
                  return (
                    <div className="bg-gradient-to-r from-amber-900/50 via-amber-800/40 to-amber-900/50 border border-amber-400/40 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 text-white shadow-lg mb-4">
                      <div className="flex items-center gap-3 text-left">
                        <span className="material-symbols-outlined text-[32px] text-amber-300 shrink-0">workspace_premium</span>
                        <div>
                          <h4 className="font-extrabold text-sm text-amber-200 uppercase tracking-wide">Período de Teste da Agenda Expirado (Acesso de Afiliado Liberado)</h4>
                          <p className="text-xs text-white/90 mt-0.5 leading-relaxed">
                            Seu teste de 40 dias expirou. Seu acesso a este <strong>Painel de Afiliados</strong> e saldo de comissões continua 100% ativo! Para desbloquear o Calendário, Tarefas e Clientes, assine um plano.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate('subscription')}
                        className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs px-4 py-2.5 rounded-lg transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">lock_open</span>
                        Desbloquear Agenda (VIP)
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Sala de Reuniões & Treinamentos Virtuais Banner */}
              <div className="bg-gradient-to-r from-emerald-900/60 via-teal-900/50 to-emerald-900/60 border border-emerald-400/40 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg mb-6">
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[28px]">videocam</span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      Sala de Reuniões Virtual & Treinamentos
                      <span className="text-[10px] font-black uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">Ao Vivo</span>
                    </h3>
                    <p className="text-xs text-white/80 mt-1 leading-relaxed">
                      Assista a palestras, cursos, mentorias e reuniões de orientação ministradas diretamente pela administração.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('meeting_room')}
                  className="bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs px-5 py-3 rounded-xl transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-2 hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Acessar Sala Virtual
                </button>
              </div>

              {/* Link e QR Code */}
              <div className="bg-white/5 border border-white/20 rounded-xl p-5 text-center">
                <p className="text-sm font-medium text-white mb-2">Seu Link de Afiliado</p>
                <div className="flex items-center bg-white/10 rounded-lg border border-white/20 overflow-hidden max-w-2xl mx-auto">
                  <input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.href.split('?')[0]}?ref=${(currentUser || { id: 'demo123' }).id}` : ''}
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none"
                  />
                  <button
                    onClick={() => {
                      const affiliateLink = window.location.href.split('?')[0] + '?ref=' + (currentUser || { id: 'demo123' }).id;
                      navigator.clipboard.writeText(affiliateLink);
                      alert('Link copiado!');
                    }}
                    className="bg-white text-black px-4 py-2.5 text-sm font-bold flex items-center gap-1 hover:bg-white/90 transition-colors cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px] text-black">content_copy</span>
                    Copiar
                  </button>
                </div>

                <div className="mt-5 flex flex-col items-center justify-center p-5 bg-white/5 rounded-xl border border-white/20 max-w-md mx-auto">
                  <p className="text-xs text-white/70 mb-3 font-medium">Seu QR Code de Captação</p>
                  <div className="bg-white p-3 border-2 border-white/40 rounded-2xl shadow-md mb-4">
                    <img
                      src={typeof window !== 'undefined' ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${window.location.href.split('?')[0]}?ref=${(currentUser || { id: 'demo123' }).id}`)}` : ''}
                      alt="QR Code Afiliado"
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                  <div className="flex gap-2 w-full max-w-[220px]">
                    <button
                      onClick={() => {
                        const affiliateLink = window.location.href.split('?')[0] + '?ref=' + (currentUser || { id: 'demo123' }).id;
                        const link = document.createElement('a');
                        link.href = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(affiliateLink)}`;
                        link.download = `qrcode_${(currentUser || { id: 'demo123' }).id}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-white">download</span> Salvar
                    </button>
                  </div>
                </div>

                <p className="text-base font-bold text-white bg-white/10 border border-white/30 p-4 rounded-xl mt-5 mb-3 shadow-sm max-w-2xl mx-auto">
                  Envie este link para convidar pessoas. Você ganha <strong className="text-green-400 text-lg">{directCommissionPct}</strong> em comissões diretas (por {directCommissionMonths} meses) e <strong className="text-blue-400 text-lg">{indirectCommissionPct}</strong> em comissões indiretas (por {indirectCommissionMonths} meses)!
                </p>

                <div className="bg-yellow-400/10 rounded-xl p-4 text-left border border-yellow-400/30 shadow-sm max-w-2xl mx-auto">
                  <p className="text-sm text-yellow-100 font-medium leading-relaxed block">
                    <strong className="text-yellow-300 font-black block mb-2 text-base uppercase">Saques via PIX:</strong> {automaticCommissionPayment ? 'Disponibilizados na sua conta automaticamente via PIX' : 'A liberação das comissões deverá ser solicitada no aplicativo e será processada via PIX'} de 15 em 15 dias (dias 1 e 16 de cada mês subsequente). <strong className="font-bold underline">Exclusivo para conta com seu CPF/Nome titular.</strong>
                  </p>
                </div>

                {/* Leads / Indicação Direct Captures */}
                <div className="mt-5 text-left max-w-2xl mx-auto">
                  <AffiliateLeads affiliateId={currentUser?.id || 'demo123'} />
                </div>

                {/* Materiais de Divulgação */}
                {(() => {
                  const materials = JSON.parse(localStorage.getItem('agenda_marketing_materials') || '[]');
                  if (materials.length === 0) return null;
                  return (
                    <div className="mt-5 flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/20 text-left max-w-2xl mx-auto">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2 self-start"><span className="material-symbols-outlined text-white">campaign</span>Materiais de Divulgação</h4>
                      <p className="text-xs text-white/60 mb-4 self-start">Utilize os materiais prontos abaixo para impulsionar suas captações.</p>
                      <div className="flex flex-col gap-3 w-full">
                        {materials.map((mat: any, i: number) => (
                          <div key={i} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 rounded-lg border border-white/20 hover:bg-white/10 transition-colors">
                            <div className="p-2 bg-white/10 text-white rounded-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-[20px] text-white">
                                {mat.type === 'video' ? 'movie' : mat.type === 'audio' ? 'music_note' : mat.type === 'text' ? 'article' : 'image'}
                              </span>
                            </div>
                            <div className="flex-1 truncate w-full">
                              <p className="text-sm font-bold text-white truncate">{mat.title}</p>
                              {mat.type === 'text' ? (
                                <p className="text-xs text-white/60 truncate">{mat.content}</p>
                              ) : (
                                <p className="text-xs text-white/60 truncate">Download disponível</p>
                              )}
                            </div>
                            <div className="flex gap-2 self-end sm:self-auto">
                              {mat.type === 'text' ? (
                                <button
                                  onClick={() => {
                                    const affiliateLink = window.location.href.split('?')[0] + '?ref=' + (currentUser || { id: 'demo123' }).id;
                                    navigator.clipboard.writeText(`${mat.content} Meu link: ${affiliateLink}`);
                                    alert('Texto copiado com seu link de afiliado inserido no final!');
                                  }}
                                  className="text-xs bg-white/10 text-white hover:bg-white/20 px-3 py-1.5 rounded font-medium transition-colors border border-white/20 cursor-pointer"
                                >
                                  Copiar Texto
                                </button>
                              ) : (
                                <a
                                  href={mat.content}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs bg-white/10 text-white hover:bg-white/20 px-3 py-1.5 rounded font-medium transition-colors border border-white/20 flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">download</span> Baixar
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Saldo e Saque PIX */}
              <div className="flex flex-col gap-3 items-center bg-white/5 border border-white/20 rounded-xl p-6 text-center">
                <p className="text-sm text-white/70 uppercase tracking-wider font-semibold">
                  Saldo Disponível para Saque {automaticCommissionPayment ? 'Automático ' : ''}via PIX
                </p>
                <p className="text-4xl font-black text-white my-1">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentUser ? (currentUser.commissions || 0) : 0)}
                </p>
                <p className="text-sm font-medium text-white max-w-md text-center mb-3 bg-white/10 py-2 px-4 rounded-lg border border-white/20">
                  Os pagamentos são processados de <strong className="text-green-400">15 em 15 dias (dias 1 e 16 de cada mês)</strong>.
                </p>

                <div className="w-full bg-white/5 rounded-xl p-5 border border-white/20 text-left max-w-xl">
                  <p className="text-sm font-bold text-white mb-2">Sua Conta para Recebimento (PIX)</p>
                  <p className="text-xs text-yellow-300 font-bold mb-3 p-2.5 bg-yellow-400/10 border border-yellow-400/30 rounded-lg leading-relaxed">
                    Importante: A conta bancária recebedora deve estar no seu nome e ter o seu CPF idênticos ao do cadastro.
                  </p>
                  <label className="text-sm text-white font-bold mb-1 block">Chave PIX (Apenas CPF)</label>
                  <input
                    type="text"
                    value={currentUser?.pixKey || ''}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 11) val = val.slice(0, 11);
                      let formatted = val;
                      if (val.length > 9) {
                        formatted = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
                      } else if (val.length > 6) {
                        formatted = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                      } else if (val.length > 3) {
                        formatted = val.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                      }
                      handleUpdateUserData({ pixKey: formatted });
                    }}
                    placeholder="000.000.000-00"
                    className={`w-full bg-white/10 border ${currentUser?.pixKey && (!isValidCPF(currentUser.pixKey) || currentUser.pixKey !== currentUser.cpf) ? 'border-red-400' : 'border-white/20'} px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-white transition-colors text-white placeholder-white/40`}
                  />
                  {currentUser?.pixKey && !isValidCPF(currentUser.pixKey) && (
                    <p className="text-[11px] text-red-300 mt-1">O CPF informado é inválido.</p>
                  )}
                  {currentUser?.pixKey && currentUser?.cpf && currentUser.pixKey !== currentUser.cpf && isValidCPF(currentUser.pixKey) && (
                    <p className="text-[11px] text-red-300 mt-1">A chave PIX deve ser idêntica ao CPF cadastrado do titular.</p>
                  )}
                  <p className="text-xs text-white font-medium mt-2 bg-white/5 p-2.5 rounded border border-white/10">
                    O seu CPF cadastrado é: <strong className="text-green-400 text-sm block mt-0.5">{currentUser?.cpf || 'Não informado (Por favor, edite em seu perfil)'}</strong>
                  </p>

                  <button
                    onClick={async () => {
                      if (!currentUser?.cpf) {
                        alert("Cadastre seu CPF no perfil primeiro.");
                        return;
                      }
                      if (!currentUser?.pixKey || !isValidCPF(currentUser.pixKey) || currentUser.pixKey !== currentUser.cpf) {
                        alert("A chave PIX deve ser um CPF válido e idêntico ao cadastrado.");
                        return;
                      }
                      if ((currentUser?.commissions || 0) <= 0) {
                        alert("Você não possui saldo para saque.");
                        return;
                      }
                      try {
                        alert("Processando solicitação de saque...");
                        const newReq = {
                          id: Math.random().toString(36).substr(2, 9),
                          userId: currentUser.id,
                          userName: currentUser.name,
                          pixKey: currentUser.pixKey,
                          amount: currentUser.commissions,
                          date: new Date().toISOString(),
                          status: 'pendente'
                        };
                        let wds = JSON.parse(localStorage.getItem('agenda_withdrawals') || '[]');
                        wds.push(newReq);
                        localStorage.setItem('agenda_withdrawals', JSON.stringify(wds));
                        const updatedUser = { ...currentUser, commissions: 0 };
                        let storedUsers = JSON.parse(localStorage.getItem('agenda_users') || '[]');
                        const userIndex = storedUsers.findIndex((u: any) => u.id === currentUser.id);
                        if (userIndex !== -1) storedUsers[userIndex] = updatedUser;
                        localStorage.setItem('agenda_users', JSON.stringify(storedUsers));
                        setCurrentUser(updatedUser);
                        alert("Solicitação de PIX recebida! O valor será processado pelo administrador no próximo ciclo de pagamento (dia 1 ou 16).");
                      } catch (err) {
                        alert("Erro ao processar a solicitação de saque.");
                      }
                    }}
                    disabled={!currentUser?.pixKey || !isValidCPF(currentUser.pixKey) || currentUser?.pixKey !== currentUser?.cpf || (currentUser?.commissions || 0) <= 0}
                    className={`w-full mt-4 py-3 font-bold text-sm rounded-xl transition-all cursor-pointer ${!currentUser?.pixKey || !isValidCPF(currentUser.pixKey) || currentUser?.pixKey !== currentUser?.cpf || (currentUser?.commissions || 0) <= 0 ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-white text-black hover:-translate-y-0.5 hover:shadow-lg active:scale-95'}`}
                  >
                    Solicitar PIX (Saque)
                  </button>
                </div>
              </div>

              {/* Histórico de Saques */}
              {(() => {
                const safeUser = currentUser || { id: 'demo123', path: '', name: 'Demo', clicks: 0, isAffiliate: true } as any;
                const withdrawals = JSON.parse(localStorage.getItem('agenda_withdrawals') || '[]');
                const myWithdrawals = withdrawals.filter((w: any) => w.userId === safeUser.id);
                if (myWithdrawals.length === 0) return null;
                return (
                  <div className="bg-white/5 border border-white/20 p-5 rounded-xl shadow-sm">
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[18px]">history</span>
                      Histórico de Saques
                    </h4>
                    <div className="space-y-3">
                      {myWithdrawals.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((w: any) => (
                        <div key={w.id} className="flex flex-col gap-2 p-3.5 bg-black/20 rounded-xl text-sm border border-white/5">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className="text-white/60 text-xs">{new Date(w.date).toLocaleDateString('pt-BR')} às {new Date(w.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-white font-bold text-base mt-0.5">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(w.amount)}</span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${w.status === 'pago' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                              {w.status === 'pago' ? 'Efetuado' : 'Solicitado'}
                            </span>
                          </div>
                          {w.status === 'pago' && w.receipt && (
                            <div className="mt-1 pt-2 border-t border-white/5">
                              {w.receipt.startsWith('data:image/') ? (
                                <a href={w.receipt} download={`comprovante-${w.id}.png`} className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
                                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                  Baixar Comprovante
                                </a>
                              ) : (
                                <a href={w.receipt} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
                                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                  Acessar Comprovante
                                </a>
                              )}
                            </div>
                          )}
                          {w.status === 'pago' && !w.receipt && (
                            <div className="mt-1 pt-2 border-t border-white/5">
                              <span className="text-xs text-green-400/80 font-medium">Pagamento efetuado.</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Desempenho e Rede */}
              {(() => {
                const safeUser = currentUser || { id: 'demo123', path: '', name: 'Demo', clicks: 0, isAffiliate: true } as any;
                const allUsers: AffiliateUser[] = JSON.parse(localStorage.getItem('agenda_users') || '[]');

                const level1 = allUsers.filter(u => u.referredBy === safeUser.id);
                const level2 = allUsers.filter(u => u.indirectReferredBy === safeUser.id);
                const numClicks = safeUser.clicks || 0;
                const diretos = level1.length;
                const indiretos = level2.length;
                const conversionRate = numClicks > 0 ? ((diretos / numClicks) * 100).toFixed(1) : '0.0';

                const renderUserList = (title: string, list: AffiliateUser[], commissionPctStr: string, maxInstallments: number) => {
                  if (list.length === 0) return null;
                  return (
                    <div className="mt-2">
                      <p className="text-xs font-bold text-white flex justify-between mb-2">
                        <span>{title} <span className="text-white/80">({commissionPctStr})</span></span>
                        <span className="text-white/60">{list.length} usuário(s)</span>
                      </p>
                      <div className="flex flex-col gap-2">
                        {list.map(u => {
                          const expStatus = getExpirationStatus(u);
                          const paid = u.installmentsPaid || 0;

                          let statusBadge = null;
                          let detailsText = "";

                          if (u.plan === 'premium') {
                            if (paid >= maxInstallments) {
                              statusBadge = <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider border border-cyan-500/30">Concluído</span>;
                              detailsText = `Ciclo completo: ${paid} de ${maxInstallments} parcelas pagas`;
                            } else if (expStatus.planExpired) {
                              statusBadge = <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider border border-rose-500/30">Inadimplente (Vencido)</span>;
                              detailsText = `${paid} de ${maxInstallments} parcelas pagas (Atrasado/Inativo)`;
                            } else {
                              statusBadge = <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider border border-emerald-500/30">Ativo</span>;
                              detailsText = `${paid} de ${maxInstallments} parcelas pagas (${expStatus.planDaysRemaining} dias restantes)`;
                            }
                          } else { // plan === 'free' (Trial)
                            if (expStatus.trialDaysRemaining <= 0) {
                              statusBadge = <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider border border-rose-500/30">Inadimplente</span>;
                              detailsText = "Período de teste esgotado e pendente de pagamento";
                            } else {
                              statusBadge = <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider border border-blue-500/30">Em Teste</span>;
                              detailsText = `Período gratuito (${expStatus.trialDaysRemaining} dias restantes)`;
                            }
                          }

                          return (
                            <div key={u.id} className="flex justify-between items-center bg-white/5 py-2.5 px-3.5 rounded-xl text-sm border border-white/10 hover:bg-white/10 transition-colors">
                              <div className="truncate pr-2 flex flex-col">
                                <p className="font-medium text-white leading-tight truncate flex items-center gap-1.5">
                                  {u.name}
                                  {statusBadge}
                                </p>
                                <p className="text-[10px] text-white/60 truncate mt-1">
                                  {detailsText}
                                </p>
                              </div>
                              <span className={`text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${u.plan === 'premium' ? 'bg-white text-black' : 'bg-white/10 text-white/80'}`}>
                                {u.plan === 'premium' ? 'VIP' : 'Grátis'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    <div className="bg-white/5 border border-white/20 rounded-xl p-5 flex flex-col gap-3 shadow-sm">
                      <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider border-b border-white/20 pb-2">Desempenho e Rede</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white/10 p-3 rounded-xl flex flex-col items-center shadow-sm">
                          <span className="material-symbols-outlined text-white/60 mb-1 text-xl">ads_click</span>
                          <span className="text-xl font-bold text-white">{numClicks}</span>
                          <span className="text-[10px] text-white/60 uppercase tracking-wider mt-0.5">Cliques</span>
                        </div>
                        <div className="bg-white/10 p-3 rounded-xl flex flex-col items-center shadow-sm">
                          <span className="material-symbols-outlined text-white/60 mb-1 text-xl">person</span>
                          <span className="text-xl font-bold text-white">{diretos}</span>
                          <span className="text-[10px] text-white/60 uppercase tracking-wider mt-0.5">Diretos</span>
                        </div>
                        <div className="bg-white/10 p-3 rounded-xl flex flex-col items-center shadow-sm">
                          <span className="material-symbols-outlined text-white/60 mb-1 text-xl">groups</span>
                          <span className="text-xl font-bold text-white">{indiretos}</span>
                          <span className="text-[10px] text-white/60 uppercase tracking-wider mt-0.5 text-center">Indiretos</span>
                        </div>
                        <div className="bg-white/10 p-3 rounded-xl flex flex-col items-center shadow-sm">
                          <span className="material-symbols-outlined text-white mb-1 text-xl">monitoring</span>
                          <span className="text-xl font-bold text-white">{conversionRate}%</span>
                          <span className="text-[10px] text-white uppercase tracking-wider mt-0.5">Conversão</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <h4 className="text-sm font-semibold text-white/70 uppercase tracking-wider border-b border-white/20 pb-2">Seus Indicados (Rede)</h4>
                      {level1.length === 0 && level2.length === 0 && (
                        <p className="text-sm text-white/60 text-center py-6 bg-white/5 rounded-xl border border-white/20">Sua rede está vazia. Comece a indicar compartilhando seu link!</p>
                      )}
                      {renderUserList("1º Nível (Diretos)", level1, directCommissionPct, Number(directCommissionMonths) || 12)}
                      {renderUserList("2º Nível (Indiretos)", level2, indirectCommissionPct, Number(indirectCommissionMonths) || 12)}
                    </div>
                  </>
                );
              })()}
            </>
          )}
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
        <button className="flex flex-col items-center justify-center text-brand bg-white px-4 py-1.5 hover:bg-white/90 rounded-xl transition-colors shadow-inner">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide text-center">REDE</span>
        </button>
        <button onClick={onOpenProfile} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide">PERFIL</span>
        </button>
      </nav>
    </div>
  );
}
