"use client";
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { NavigationBar } from '../components/NavigationBar';

const Payment = dynamic(
  () => import('@mercadopago/sdk-react').then((mod) => mod.Payment),
  { ssr: false }
);

interface SystemModule {
  id: string;
  name: string;
  description: string;
  price: number;
  isHighlight?: boolean;
}

interface AffiliateUser {
  id: string;
  name: string;
  email?: string;
  cpf?: string;
  whatsapp: string;
  plan: 'free' | 'premium';
  planExpiresAt?: string;
  photoURL?: string;
  maxDevices?: number;
  referredBy?: string;
  indirectReferredBy?: string;
  installmentsPaid?: number;
  isAffiliate?: boolean;
  directCommissionDuration?: number;
  indirectCommissionDuration?: number;
  commissions?: number;
}

interface PaymentPlan {
  name: string;
  price: number;
  originalPrice?: number;
  type: 'monthly' | 'semiannual' | 'annual' | 'extra_device';
  months?: number;
}

interface SubscriptionViewProps {
  onNavigate: (view: 'landing' | 'main_menu' | 'calendar' | 'dashboard' | 'daily_agenda' | 'admin' | 'instructions' | 'modules' | 'accounts' | 'affiliate' | 'profile' | 'subscription' | string) => void;
  currentUser: AffiliateUser | null;
  systemModules: SystemModule[];
  selectedModulesIds: string[];
  handleToggleModule: (modId: string) => void;
  selectedMonths: number;
  setSelectedMonths: (months: number) => void;
  handleProceedToModulesPayment: () => void;
  paymentPlan: PaymentPlan | null;
  setPaymentPlan: (plan: PaymentPlan | null) => void;
  selectedPaymentMethod: 'pix' | 'credit_card' | null;
  setSelectedPaymentMethod: (method: 'pix' | 'credit_card' | null) => void;
  couponCode: string;
  setCouponCode: (code: string) => void;
  appliedDiscount: { code: string; pct: number } | null;
  setAppliedDiscount: (discount: { code: string; pct: number } | null) => void;
  pixData: { payment_id: number | string; qr_code: string; qr_code_base64: string } | null;
  setPixData: (data: any) => void;
  isPixLoading: boolean;
  mpConfig: { publicKey: string; accessToken: string };
  directCommissionPct: string;
  indirectCommissionPct: string;
  directCommissionMonths: number;
  indirectCommissionMonths: number;
  isCurrentlyAdmin?: boolean;
  onOpenSupport?: () => void;
  onLogout?: () => void;
}

export function SubscriptionView({
  onNavigate,
  currentUser,
  systemModules,
  selectedModulesIds,
  handleToggleModule,
  selectedMonths,
  setSelectedMonths,
  handleProceedToModulesPayment,
  paymentPlan,
  setPaymentPlan,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  couponCode,
  setCouponCode,
  appliedDiscount,
  setAppliedDiscount,
  pixData,
  setPixData,
  isPixLoading,
  mpConfig,
  directCommissionPct,
  indirectCommissionPct,
  directCommissionMonths,
  indirectCommissionMonths,
  isCurrentlyAdmin = false,
  onOpenSupport,
  onLogout
}: SubscriptionViewProps) {
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  const monthlyTotal = selectedModulesIds.includes('pacote_completo')
    ? (systemModules.find(m => m.id === 'pacote_completo')?.price || 0)
    : systemModules.filter(m => selectedModulesIds.includes(m.id)).reduce((sum, m) => sum + m.price, 0);

  const periodTotal = monthlyTotal * selectedMonths;

  const handleApplyCoupon = () => {
    if (!paymentPlan) return;
    const settingsStr = localStorage.getItem('agenda_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const coupons = settings.coupons || [];
    const validCoupon = coupons.find((c: any) => c.code === couponCode.toUpperCase() && c.active);

    if (validCoupon) {
      const discountPct = validCoupon.discountPct || 0;
      setAppliedDiscount({ code: validCoupon.code, pct: discountPct });
      const basePrice = paymentPlan.originalPrice || paymentPlan.price;
      const newPrice = Number((basePrice * (1 - discountPct / 100)).toFixed(2));
      setPaymentPlan({ ...paymentPlan, price: newPrice, originalPrice: basePrice });
      alert(`Cupom ${validCoupon.code} aplicado com sucesso! ${discountPct}% de desconto.`);
    } else {
      alert("Cupom inválido ou expirado.");
    }
  };

  const handleRemoveCoupon = () => {
    if (!paymentPlan) return;
    setAppliedDiscount(null);
    setCouponCode('');
    const base = paymentPlan.originalPrice || paymentPlan.price;
    setPaymentPlan({ ...paymentPlan, price: base, originalPrice: base });
    setSelectedPaymentMethod(null);
    setPixData(null);
  };

  const handleCheckPixPayment = async () => {
    if (!pixData || !paymentPlan || !currentUser) return;
    try {
      const res = await fetch(`/api/payment-status?id=${pixData.payment_id}&token=${mpConfig.accessToken}`);
      const data = await res.json();
      if (data.status === 'approved') {
        let updatedUser = { ...currentUser };
        if (paymentPlan.type === 'extra_device') {
          updatedUser.maxDevices = (updatedUser.maxDevices || 1) + 1;
        } else {
          const planExpNow = new Date();
          const expireDays = paymentPlan.type === 'annual' ? 365 : paymentPlan.type === 'semiannual' ? 180 : 30 * (paymentPlan.months || 1);
          planExpNow.setDate(planExpNow.getDate() + expireDays);
          updatedUser = { ...updatedUser, plan: 'premium' as const, planExpiresAt: planExpNow.toISOString() };
        }
        let storedUsers = JSON.parse(localStorage.getItem('agenda_users') || '[]');
        const userIndex = storedUsers.findIndex((u: any) => u.id === currentUser?.id);
        if (userIndex !== -1) storedUsers[userIndex] = updatedUser;
        localStorage.setItem('agenda_users', JSON.stringify(storedUsers));
        alert("Pagamento PIX confirmado com sucesso!");
        setPaymentPlan(null);
        window.location.reload();
      } else {
        alert("Ainda não recebemos a confirmação do pagamento. O sistema continua aguardando automaticamente. Se você acabou de pagar, aguarde alguns instantes.");
      }
    } catch (e) {
      alert("Ainda verificando... O sistema liberará seu acesso automaticamente assim que confirmado.");
    }
  };

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
                <button onClick={() => { onNavigate('profile'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_circle</span> Perfil
                </button>
                <button onClick={() => { onNavigate('subscription'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent bg-surface-container-lowest text-primary font-bold shadow-sm cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">workspace_premium</span> Planos de Assinatura
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
            <span className="material-symbols-outlined text-[32px] text-white">workspace_premium</span>
            Planos de Assinatura & Módulos
          </h1>
          <button onClick={() => onNavigate('main_menu')} className="text-sm text-white/70 hover:text-white flex items-center gap-1 font-medium transition-colors">
            &larr; Menu
          </button>
        </div>

        {!paymentPlan ? (
          /* Step 1: Module & Period Selection */
          <div className="bg-[#06402B]/80 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Assinar Módulos</h2>
              <p className="text-sm text-white/80">Escolha os módulos que deseja adicionar ao seu sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemModules.map((mod) => {
                const isSelected = selectedModulesIds.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => handleToggleModule(mod.id)}
                    className={`text-left border rounded-xl p-5 transition-all flex flex-col justify-between group relative overflow-hidden cursor-pointer ${
                      isSelected
                        ? 'bg-brand/30 border-primary shadow-[0_0_20px_rgba(0,189,174,0.3)] ring-1 ring-primary'
                        : 'bg-white/5 border-white/20 hover:border-white/40 hover:bg-white/10'
                    }`}
                  >
                    {mod.isHighlight && (
                      <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-bl-lg shadow-sm">
                        MAIS VANTAGOSO
                      </div>
                    )}

                    <div className="flex items-start gap-3.5 mb-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected ? 'bg-primary border-primary text-black font-bold' : 'border-white/40'
                      }`}>
                        {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                      </div>
                      <div>
                        <h3 className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-white'}`}>{mod.name}</h3>
                        <p className="text-xs text-white/70 mt-1 leading-relaxed">{mod.description}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex justify-between items-end mt-auto">
                      <span className="text-xs text-white/60">Valor mensal</span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-white">R$ {Number(mod.price).toFixed(2).replace('.', ',')}</span>
                        <span className="text-[10px] uppercase font-bold text-white/50 ml-1">/mês</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Hiring Period and Totals */}
            <div className="bg-white/5 border border-white/20 rounded-2xl p-5 flex flex-col gap-4 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-white font-semibold text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                  Período de Contratação:
                </span>
                <select
                  value={selectedMonths}
                  onChange={(e) => setSelectedMonths(Number(e.target.value))}
                  className="bg-[#06402B] border border-primary/50 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-bold cursor-pointer"
                >
                  <option value="1">1 Mês</option>
                  <option value="3">3 Meses (Trimestral)</option>
                  <option value="6">6 Meses (Semestral)</option>
                  <option value="12">12 Meses (Anual)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 pt-2 px-1">
                <div className="flex justify-between items-center text-sm text-white/70">
                  <span>Preço Mensal dos Módulos:</span>
                  <span className="font-semibold text-white">
                    R$ {monthlyTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-white font-bold text-base">
                    Total do Período ({selectedMonths} {selectedMonths === 1 ? 'mês' : 'meses'}):
                  </span>
                  <span className="text-3xl font-black text-primary">
                    R$ {periodTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <button
                onClick={handleProceedToModulesPayment}
                disabled={selectedModulesIds.length === 0}
                className="w-full mt-2 bg-primary hover:bg-primary/90 text-black font-bold py-4 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">payment</span>
                Prosseguir para Pagamento
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Payment Checkout Screen */
          <div className="bg-[#06402B]/90 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-white/20 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPaymentPlan(null);
                    setAppliedDiscount(null);
                    setCouponCode('');
                    setSelectedPaymentMethod(null);
                    setPixData(null);
                  }}
                  className="text-white/80 hover:text-white flex items-center gap-1 text-sm font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  Voltar para Seleção de Módulos
                </button>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 px-3 py-1 rounded-full">
                Finalizar Pagamento
              </span>
            </div>

            {/* Plan Summary */}
            <div className="bg-white/10 border border-white/15 rounded-xl p-5 flex flex-col gap-3">
              <p className="text-xs uppercase font-bold text-white/60 tracking-wider">Resumo do Pedido</p>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">{paymentPlan.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-black text-primary">R$ {paymentPlan.price.toFixed(2).replace('.', ',')}</span>
                    {appliedDiscount && paymentPlan.originalPrice && paymentPlan.originalPrice > paymentPlan.price && (
                      <span className="text-sm text-white/50 line-through">R$ {paymentPlan.originalPrice.toFixed(2).replace('.', ',')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Discount Coupon Section */}
              <div className="mt-2 pt-3 border-t border-white/10 flex flex-col gap-2">
                <p className="text-xs font-semibold text-white/80">Possui cupom de desconto?</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    disabled={appliedDiscount !== null}
                    placeholder="Ex: PROMO20"
                    className="flex-1 bg-surface-container-high border border-white/30 rounded-lg p-2.5 text-sm text-white outline-none focus:border-primary uppercase disabled:opacity-50 font-mono"
                  />
                  {!appliedDiscount ? (
                    <button
                      onClick={handleApplyCoupon}
                      className="bg-primary text-black font-bold px-4 py-2.5 rounded-lg text-sm hover:bg-primary/90 transition-all cursor-pointer shrink-0"
                    >
                      Aplicar
                    </button>
                  ) : (
                    <button
                      onClick={handleRemoveCoupon}
                      className="bg-red-500 text-white font-bold px-4 py-2.5 rounded-lg text-sm hover:bg-red-600 transition-all cursor-pointer shrink-0"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {appliedDiscount && (
                  <p className="text-xs text-primary font-bold bg-primary/10 w-fit px-2.5 py-1 rounded-md border border-primary/20 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Cupom {appliedDiscount.code} ({appliedDiscount.pct}% OFF) aplicado!
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method Selection / Checkout Controls */}
            <div className="flex flex-col gap-4">
              {!selectedPaymentMethod ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-bold text-white">Escolha a forma de pagamento:</p>
                  <button
                    onClick={() => setSelectedPaymentMethod('pix')}
                    className="w-full flex items-center gap-4 p-5 border border-white/20 rounded-xl hover:border-primary hover:bg-white/10 transition-all text-left group cursor-pointer bg-white/5"
                  >
                    <span className="material-symbols-outlined text-[36px] text-primary group-hover:scale-110 transition-transform">pix</span>
                    <div className="flex-1">
                      <p className="font-bold text-white text-base">PIX</p>
                      <p className="text-xs text-white/70">Aprovação imediata via QR Code ou Copia e Cola</p>
                    </div>
                    <span className="material-symbols-outlined text-white/50 group-hover:text-white transition-colors">chevron_right</span>
                  </button>

                  <button
                    onClick={() => setSelectedPaymentMethod('credit_card')}
                    className="w-full flex items-center gap-4 p-5 border border-white/20 rounded-xl hover:border-primary hover:bg-white/10 transition-all text-left group cursor-pointer bg-white/5"
                  >
                    <span className="material-symbols-outlined text-[36px] text-white group-hover:scale-110 transition-transform">credit_card</span>
                    <div className="flex-1">
                      <p className="font-bold text-white text-base">Cartão de Crédito</p>
                      <p className="text-xs text-white/70">Crédito ou Débito processado com segurança</p>
                    </div>
                    <span className="material-symbols-outlined text-white/50 group-hover:text-white transition-colors">chevron_right</span>
                  </button>
                </div>
              ) : selectedPaymentMethod === 'pix' && mpConfig.accessToken ? (
                /* PIX Option */
                <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="w-full flex items-center justify-between mb-4">
                    <button
                      onClick={() => { setSelectedPaymentMethod(null); setPixData(null); }}
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      &larr; Alterar Forma de Pagamento
                    </button>
                  </div>

                  <h4 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[28px]">pix</span>
                    Pagamento via PIX (Aprovação Imediata)
                  </h4>

                  {isPixLoading ? (
                    <div className="w-48 h-48 bg-white/10 flex flex-col items-center justify-center rounded-xl animate-pulse gap-2">
                      <span className="material-symbols-outlined animate-spin text-primary text-[36px]">refresh</span>
                      <span className="text-xs text-white/70 font-semibold">Gerando QR Code...</span>
                    </div>
                  ) : pixData ? (
                    <div className="flex flex-col items-center w-full max-w-md">
                      <div className="w-52 h-52 bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
                        <img
                          src={`data:image/jpeg;base64,${pixData.qr_code_base64}`}
                          alt="QR Code PIX"
                          className="max-w-full max-h-full rounded-lg"
                        />
                      </div>
                      <p className="text-xs text-white/80 text-center mt-4 mb-2">
                        Escaneie o QR Code acima no aplicativo do seu banco ou copie a chave PIX abaixo:
                      </p>

                      <div className="w-full flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          readOnly
                          value={pixData.qr_code}
                          className="flex-1 bg-black/30 border border-white/20 text-white text-[11px] p-3 rounded-xl outline-none font-mono"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pixData.qr_code);
                            setPixCopied(true);
                            setTimeout(() => setPixCopied(false), 2000);
                          }}
                          className="bg-primary text-black font-bold px-4 py-3 rounded-xl text-xs hover:bg-primary/90 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-md"
                        >
                          <span className="material-symbols-outlined text-[18px]">{pixCopied ? 'check' : 'content_copy'}</span>
                          {pixCopied ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>


                    </div>
                  ) : (
                    <p className="text-sm text-red-400">Não foi possível gerar código PIX. Tente novamente.</p>
                  )}
                </div>
              ) : selectedPaymentMethod === 'pix' && !mpConfig.accessToken ? (
                <div className="p-6 text-center bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="w-full flex items-center justify-between mb-3">
                    <button onClick={() => setSelectedPaymentMethod(null)} className="text-xs text-white underline font-medium">Voltar</button>
                  </div>
                  <span className="material-symbols-outlined text-red-400 text-4xl mb-2">warning</span>
                  <p className="text-sm font-bold text-red-300">Gateway não configurado</p>
                  <p className="text-xs text-white/70 mt-1">Configure as credenciais do Mercado Pago no painel Admin.</p>
                </div>
              ) : selectedPaymentMethod === 'credit_card' && mpConfig.publicKey ? (
                /* Credit Card Option */
                <div className="flex flex-col bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="w-full flex items-center justify-between mb-4">
                    <button
                      onClick={() => setSelectedPaymentMethod(null)}
                      className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      &larr; Alterar Forma de Pagamento
                    </button>
                  </div>
                  <Payment
                    initialization={{
                      amount: paymentPlan.price,
                    }}
                    customization={{
                      paymentMethods: {
                        creditCard: 'all',
                      },
                    }}
                    onSubmit={async (param) => {
                      return new Promise<void>((resolve, reject) => {
                        fetch('/api/process-payment', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            formData: param.formData,
                            userId: currentUser?.id,
                            planName: paymentPlan.name,
                            planType: paymentPlan.type,
                            months: paymentPlan.months,
                            mpAccessToken: mpConfig.accessToken,
                            cpf: currentUser?.cpf,
                            userName: currentUser?.name,
                          }),
                        })
                          .then((res) => res.json())
                          .then((response) => {
                            if (response.error) {
                              alert(response.error);
                              reject(new Error(response.error));
                            } else if (response.status === 'approved') {
                              if (currentUser) {
                                let updatedUser = { ...currentUser };
                                if (paymentPlan.type === 'extra_device') {
                                  updatedUser.maxDevices = (updatedUser.maxDevices || 1) + 1;
                                } else {
                                  const planExpNow = new Date();
                                  const expireDays = paymentPlan.type === 'annual' ? 365 : paymentPlan.type === 'semiannual' ? 180 : 30 * (paymentPlan.months || 1);
                                  planExpNow.setDate(planExpNow.getDate() + expireDays);
                                  updatedUser = {
                                    ...updatedUser,
                                    plan: 'premium' as const,
                                    planExpiresAt: planExpNow.toISOString()
                                  };
                                }
                                let storedUsers = JSON.parse(localStorage.getItem('agenda_users') || '[]');
                                const userIndex = storedUsers.findIndex((u: any) => u.id === currentUser.id);
                                if (userIndex !== -1) {
                                  storedUsers[userIndex] = updatedUser;
                                }

                                updatedUser.installmentsPaid = (updatedUser.installmentsPaid || 0) + 1;

                                const paymentPrice = paymentPlan.price;
                                const directPctVal = parseFloat(directCommissionPct) / 100 || 0.20;
                                const indirectPctVal = parseFloat(indirectCommissionPct) / 100 || 0.10;
                                const directCommission = paymentPrice * directPctVal;
                                const indirectCommission = paymentPrice * indirectPctVal;

                                if (updatedUser.referredBy) {
                                  const directIndex = storedUsers.findIndex((u: any) => u.id === updatedUser.referredBy);
                                  if (directIndex !== -1 && storedUsers[directIndex].isAffiliate) {
                                    const duration = storedUsers[directIndex].directCommissionDuration || directCommissionMonths;
                                    if ((updatedUser.installmentsPaid || 1) <= duration) {
                                      storedUsers[directIndex].commissions = (storedUsers[directIndex].commissions || 0) + directCommission;
                                    }
                                  }
                                }

                                if (updatedUser.indirectReferredBy) {
                                  const indirectIndex = storedUsers.findIndex((u: any) => u.id === updatedUser.indirectReferredBy);
                                  if (indirectIndex !== -1 && storedUsers[indirectIndex].isAffiliate) {
                                    const duration = storedUsers[indirectIndex].indirectCommissionDuration || indirectCommissionMonths;
                                    if ((updatedUser.installmentsPaid || 1) <= duration) {
                                      storedUsers[indirectIndex].commissions = (storedUsers[indirectIndex].commissions || 0) + indirectCommission;
                                    }
                                  }
                                }

                                localStorage.setItem('agenda_users', JSON.stringify(storedUsers));
                                alert("Pagamento APROVADO com sucesso! Seu plano foi ativado.");
                                setPaymentPlan(null);
                                window.location.reload();
                              }
                              resolve();
                            } else {
                              alert(`Status do Pagamento: ${response.status}`);
                              resolve();
                            }
                          })
                          .catch((error) => {
                            alert("Erro ao processar pagamento com cartão.");
                            reject(error);
                          });
                      });
                    }}
                  />
                </div>
              ) : (
                <div className="p-6 text-center bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="w-full flex items-center justify-between mb-3">
                    <button onClick={() => setSelectedPaymentMethod(null)} className="text-xs text-white underline font-medium">Voltar</button>
                  </div>
                  <span className="material-symbols-outlined text-red-400 text-4xl mb-2">warning</span>
                  <p className="text-sm font-bold text-red-300">Gateway não configurado</p>
                  <p className="text-xs text-white/70 mt-1">Configure a chave pública do Mercado Pago no painel Admin.</p>
                </div>
              )}
            </div>
          </div>
        )}
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
        <button onClick={() => onNavigate('profile')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide">PERFIL</span>
        </button>
      </nav>
    </div>
  );
}
