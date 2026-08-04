"use client";

/* eslint-disable no-use-before-define */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { trackEvent } from '../lib/trackEvent';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { loginWithEmail, registerWithEmail, signOut as signOutAuth, sendResetPasswordEmail } from '../lib/authFunctions';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { AdminDashboardView } from './AdminDashboardView';
import { MainMenuView } from './MainMenuView';
import { InstructionsView } from './InstructionsView';
import { AccountsManagementView } from './AccountsManagementView';
import { AffiliateView } from './AffiliateView';
import { ProfileView } from './ProfileView';
import { SubscriptionView } from './SubscriptionView';
import { VirtualMeetingRoom } from '../components/VirtualMeetingRoom';
import { SupportModal } from '../components/SupportModal';
import { PwaSplashScreen } from '../components/PwaSplashScreen';
import { InstructionsModal } from '../components/InstructionsModal';
import { LanguageSelector } from '../components/LanguageSelector';
import { NavigationBar } from '../components/NavigationBar';
import { AutoUpdater } from '../components/AutoUpdater';
import nextDynamic from 'next/dynamic';
import { AffiliateLeads } from '../components/AffiliateLeads';
import { CurrencyInput } from '../components/CurrencyInput';

const Payment = nextDynamic(
  () => import('@mercadopago/sdk-react').then((mod) => mod.Payment),
  { ssr: false }
);

const safeInitMercadoPago = (publicKey: string) => {
  if (typeof window !== 'undefined' && publicKey) {
    import('@mercadopago/sdk-react')
      .then((mod) => {
        try {
          if (mod && mod.initMercadoPago) {
            mod.initMercadoPago(publicKey);
          }
        } catch (e) {
          console.warn('Mercado Pago init warning:', e);
        }
      })
      .catch(() => {});
  }
};

type CategoryType = 'Trabalho' | 'Pessoal' | 'Urgente';

const CLASSIFICATION_COLORS = [
  { id: 'emerald', hex: '#10b981', name: 'Verde' },
  { id: 'blue', hex: '#3b82f6', name: 'Azul' },
  { id: 'red', hex: '#ef4444', name: 'Vermelho' },
  { id: 'yellow', hex: '#f59e0b', name: 'Amarelo' },
  { id: 'purple', hex: '#8b5cf6', name: 'Roxo' },
  { id: 'orange', hex: '#f97316', name: 'Laranja' },
  { id: 'pink', hex: '#ec4899', name: 'Rosa' },
  { id: 'cyan', hex: '#06b6d4', name: 'Ciano' },
];

interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  category: CategoryType;
  address?: string;
  contact?: string;
  notes?: string;
  reminders?: string[];
  value?: number;
  valueStatus?: 'a_receber' | 'recebido' | 'a_pagar' | 'pago';
  googleDocId?: string;
  googleDocUrl?: string;
  color?: string;
}

const shareAppointment = (app: Appointment) => {
  const formattedDate = new Date(app.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  let text = `Você foi convidado para o compromisso "${app.title}".

📅 Data: ${formattedDate}
⏰ Horário: ${app.time}`;
  if (app.address) text += `
📍 Local: ${app.address}`;
  if (app.contact) text += `
📞 Contato: ${app.contact}`;
  if (app.notes) text += `
📝 Observações: ${app.notes}`;
  text += `

Para visualizar os detalhes e confirmar sua participação, é necessário ter um cadastro na Ágio Agenda.

Ainda não tem uma conta?
Cadastre-se agora para organizar sua rotina com eficiência e inicie seus 40 dias grátis. Acesse o link e faça parte:
https://agioagenda.app/cadastro`;
  
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
};

const handleWhatsAppReminder = (app: Appointment) => {
  const formattedDate = new Date(app.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  let text = `Olá! Passando para relembrar o nosso compromisso: "${app.title}".

📅 Data: ${formattedDate}
⏰ Horário: ${app.time}`;
  if (app.address) text += `
📍 Local: ${app.address}`;
  
  const formattedContact = app.contact ? app.contact.replace(/\D/g, '') : '';
  const whatsappUrl = formattedContact 
    ? `https://wa.me/${formattedContact}?text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    
  window.open(whatsappUrl, '_blank');
};

const handleGoogleCalendar = (app: Appointment) => {
  const [year, month, day] = app.date.split('-');
  const [hour, minute] = app.time.split(':');
  const startDate = `${year}${month}${day}T${hour}${minute}00`;
  
  // Create an end date 1 hour after the start date
  let endHour = parseInt(hour, 10) + 1;
  const endHourStr = endHour < 10 ? `0${endHour}` : `${endHour}`;
  const endDate = `${year}${month}${day}T${endHourStr}${minute}00`;

  let details = app.notes || "";
  if (app.contact) details += `
Contato: ${app.contact}`;

  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(app.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(app.address || '')}`;
  window.open(gcalUrl, '_blank');
};

function LandingView({ onNavigate, onLogin, onGoogleLogin, systemPrices, systemModules, directCommissionPct, indirectCommissionPct, directCommissionMonths, indirectCommissionMonths, affiliateSpotsOpen = true, onOpenSupport, onOpenAffiliate, onOpenProfile, currentUser }: { onNavigate: (view: string) => void, onLogin: (name: string, whatsapp: string, isAffiliateOptIn: boolean, email?: string, cpf?: string, city?: string, state?: string, country?: string, password?: string) => void, onGoogleLogin: (isAffiliateOptIn: boolean) => void, systemPrices: { monthly: number, semiannual: number, annual: number }, systemModules?: any[], directCommissionPct: string, indirectCommissionPct: string, directCommissionMonths: number, indirectCommissionMonths: number, affiliateSpotsOpen?: boolean, onOpenSupport: () => void, onOpenAffiliate: () => void, onOpenProfile: () => void, currentUser?: any }) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [isAffiliateOptIn, setIsAffiliateOptIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLandingMobileMenuOpen, setIsLandingMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('agio_saved_email') || '';
      const savedPassword = localStorage.getItem('agio_saved_password') || '';
      const savedRemember = localStorage.getItem('agio_remember_login') === 'true';
      if (savedEmail) setLoginEmail(savedEmail);
      if (savedPassword) setLoginPassword(savedPassword);
      if (savedRemember) setRememberMe(savedRemember);
    }
  }, []);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const autoLoginAttemptedRef = useRef(false);

  // Estados para Recuperação de Senha
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToReset = resetEmailInput.trim();
    const isEs = currentLang === 'es';
    const isEn = currentLang === 'en';

    if (!emailToReset || !emailToReset.includes('@')) {
      const errMsg = isEs 
        ? 'Por favor, ingrese un correo electrónico válido.' 
        : isEn 
        ? 'Please enter a valid email address.' 
        : 'Por favor, informe um e-mail válido.';
      setResetStatus({ type: 'error', message: errMsg });
      return;
    }

    setIsSendingReset(true);
    setResetStatus(null);

    try {
      await sendResetPasswordEmail(emailToReset);
      const successMsg = isEs
        ? '¡Correo de restablecimiento enviado con éxito! Verifique su bandeja de entrada y la carpeta de correo no deseado (spam).'
        : isEn
        ? 'Password reset email sent successfully! Please check your inbox and spam folder.'
        : 'E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada e a pasta de spam.';
      setResetStatus({
        type: 'success',
        message: successMsg
      });
    } catch (err: any) {
      console.error('Erro ao enviar e-mail de redefinição:', err);
      let errMsg = isEs
        ? 'No se pudo enviar el correo electrónico de redefinición de contraseña.'
        : isEn
        ? 'Could not send the password reset email.'
        : 'Não foi possível enviar o e-mail de redefinição de senha.';

      if (err.code === 'auth/user-not-found') {
        errMsg = isEs
          ? 'Ninguna cuenta registrada con este correo electrónico.'
          : isEn
          ? 'No account registered with this email address.'
          : 'Nenhuma conta cadastrada com este e-mail.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = isEs
          ? 'El formato del correo electrónico no es válido.'
          : isEn
          ? 'The email format is invalid.'
          : 'O formato do e-mail é inválido.';
      } else if (err.code === 'auth/too-many-requests') {
        errMsg = isEs
          ? 'Demasiados intentos en poco tiempo. Espere unos minutos e intente de nuevo.'
          : isEn
          ? 'Too many attempts in a short time. Please wait a few minutes and try again.'
          : 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setResetStatus({ type: 'error', message: errMsg });
    } finally {
      setIsSendingReset(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isRemember = localStorage.getItem('agio_remember_login') === 'true';
    const savedEmail = localStorage.getItem('agio_saved_email');
    const savedPassword = localStorage.getItem('agio_saved_password');

    if (isRemember && savedEmail && savedPassword && !currentUser && !autoLoginAttemptedRef.current) {
      autoLoginAttemptedRef.current = true;
      setIsAutoLoggingIn(true);
      const timer = setTimeout(() => {
        const isEmail = savedEmail.includes('@');
        if (isEmail) {
          onLogin('', '', false, savedEmail, undefined, undefined, undefined, undefined, savedPassword);
        } else {
          onLogin('', savedEmail, false, undefined, undefined, undefined, undefined, undefined, savedPassword);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentUser, onLogin]);
  const [password, setPassword] = useState('');
  
  const handleProtectedNav = (action: () => void) => {
    if (currentUser) {
      action();
    } else {
      alert('É necessário fazer o login para acessar esta tela.');
    }
    setIsLandingMobileMenuOpen(false);
  };
  
  const [selectedModuleDetail, setSelectedModuleDetail] = useState<any | null>(null);
  const [selectedCommissionDetail, setSelectedCommissionDetail] = useState<'direta' | 'indireta' | null>(null);

  const [currentLang, setCurrentLang] = useState<string>('pt');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const getSavedLang = () => {
      try {
        const saved = localStorage.getItem('user_language');
        if (saved) return saved;
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookie = decodedCookie.match(/googtrans=\/pt\/([a-z]{2})/);
        if (cookie && cookie[1]) return cookie[1];
        return 'pt';
      } catch (e) {
        return 'pt';
      }
    };

    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentLang(customEvent.detail);
      } else {
        setCurrentLang(getSavedLang());
      }
    };

    window.addEventListener('appLanguageChanged', handleLangChange);

    const interval = setInterval(() => {
      const l = getSavedLang();
      setCurrentLang(prev => {
        if (prev !== l) return l;
        return prev;
      });
    }, 1000);

    return () => {
      window.removeEventListener('appLanguageChanged', handleLangChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (selectedCommissionDetail) {
      setTimeout(() => {
        try {
          let lang = typeof localStorage !== 'undefined' ? localStorage.getItem('user_language') : null;
          if (!lang) {
            const decodedCookie = decodeURIComponent(document.cookie);
            const cookie = decodedCookie.match(/googtrans=\/pt\/([a-z]{2})/);
            if (cookie && cookie[1]) lang = cookie[1];
          }

          if (lang && lang !== 'pt') {
            const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
            if (select) {
              if (select.value !== lang) {
                select.value = lang;
                select.dispatchEvent(new Event('change'));
              }
            }
          }
        } catch (e) {
          console.error('Error triggering translation update on commission detail change', e);
        }
      }, 300);
    }
  }, [selectedCommissionDetail]);

  const commissionTranslations: Record<string, Record<string, string | ((...args: any[]) => string)>> = {
    pt: {
      titleDireta: "Regras de Comissão Direta",
      subtitleDireta: (pct: string) => `Receba ${pct} de comissão recorrente`,
      titleIndireta: "Regras de Comissão Indireta",
      subtitleIndireta: (pct: string) => `Receba ${pct} de comissão recorrente`,
      howItWorks: "Como funciona o ganho:",
      
      diretaTitle1: "Indicação Direta",
      diretaText1: "Quando um usuário se cadastra e efetua a contratação do plano de assinatura utilizando diretamente o seu link exclusivo de afiliado.",
      
      diretaTitle2: "Ganho Recorrente Mensal",
      diretaText2: (pct: string) => `Você ganha ${pct} de cada parcela paga pelo seu indicado durante o período elegível. Se ele pagar mensalmente, você recebe todo mês! OBS: No período de comissionamento, caso o usuário indicado pelo afiliado fique inadimplente a comissão é suspensa até que o indicado realize o pagamento. No caso em que o usuário indicado cancele o plano de assinatura, a comissão por sua vez também será cancelada.`,
      
      diretaTitle3: (months: number) => `Duração dos Ganhos (${months} meses)`,
      diretaText3: (months: number) => `A comissão direta permanece ativa pelos primeiros ${months} meses da contratação do plano de assinatura do usuário indicado.`,
      
      indiretaTitle1: "Indicação por sua Rede",
      indiretaText1: "Quando as pessoas que você indicou (afiliados diretos) convidam novos assinantes. Você também ganha sobre o trabalho da sua rede direta de afiliados!",
      
      indiretaTitle2: "Ganho Recorrente Indireto",
      indiretaText2: (pct: string) => `Você ganha ${pct} sobre os pagamentos de cada parcela dos indicados de 2º nível, durante o período elegível, gerados pela sua rede de afiliados diretos. Se o usuário indicado pelo seu afiliado direto pagar mensalmente, você recebe todo mês! OBS: No período de comissionamento, caso o usuário indicado pelo seu afiliado direto fique inadimplente a comissão é automaticamente suspensa até que seja realizado o pagamento. No caso em que o usuário indicado pelo seu afiliado direto cancele o plano de assinatura, o pagamento da comissão por sua vez será automaticamente cancelada.`,
      
      indiretaTitle3: (months: number) => `Duração dos Ganhos (${months} meses)`,
      indiretaText3: (months: number) => `A comissão indireta permanece ativa pelos primeiros ${months} meses de contratação do plano de assinatura de cada usuário indicado indiretamente.`,
      
      pixTitle: "Pagamento e Saques via PIX",
      pixText: "Os valores acumulados ficam visíveis no seu Painel de Afiliado. Os saques podem ser solicitados quinzenalmente (dias 1 e 16 de cada mês) e são transferidos por PIX diretamente na conta bancária vinculada ao seu CPF cadastrado.",
      
      bottomText: "Torne-se um afiliado de sucesso convidando amigos e profissionais para a nossa plataforma!",
      bottomBtn: "Cadastrar Agora",
      
      affiliateProgram: "Programa de Afiliados",
      affiliateDesc: "Compartilhe o aplicativo com outras pessoas, através do seu link de afiliado, e ganhe comissões incríveis por cada assinatura confirmada!",
      directCommTitle: (pct: string) => `${pct} de comissão direta`,
      directCommDesc: (months: number) => `por ${months} meses para cada indicado seu.`,
      indirectCommTitle: (pct: string) => `${pct} de comissão indireta`,
      indirectCommDesc: (months: number) => `por ${months} meses na sua rede.`,
      viewRules: "Ver Regras"
    },
    en: {
      titleDireta: "Direct Commission Rules",
      subtitleDireta: (pct: string) => `Receive ${pct} recurring commission`,
      titleIndireta: "Indirect Commission Rules",
      subtitleIndireta: (pct: string) => `Receive ${pct} recurring commission`,
      howItWorks: "How earnings work:",
      
      diretaTitle1: "Direct Referral",
      diretaText1: "When a user registers and subscribes directly using your exclusive affiliate link.",
      
      diretaTitle2: "Monthly Recurring Earnings",
      diretaText2: (pct: string) => `You earn ${pct} of each payment made by your referral during the eligible period. If they pay monthly, you receive it every month! NOTE: During the commissioning period, if the referred user becomes delinquent, the commission is suspended until they make the payment. If the referred user cancels their subscription, the commission will also be cancelled.`,
      
      diretaTitle3: (months: number) => `Duration of Earnings (${months} months)`,
      diretaText3: (months: number) => `The direct commission remains active for the first ${months} months of the referred user's subscription.`,
      
      indiretaTitle1: "Referral by Your Network",
      indiretaText1: "When the people you referred (direct affiliates) invite new subscribers. You also earn from the work of your direct affiliate network!",
      
      indiretaTitle2: "Indirect Recurring Earnings",
      indiretaText2: (pct: string) => `You earn ${pct} on each payment made by 2nd-level referrals generated by your direct affiliate network during the eligible period. If the user referred by your direct affiliate pays monthly, you receive it every month! NOTE: During the commissioning period, if the user referred by your direct affiliate becomes delinquent, the commission is automatically suspended until payment is made. If the user referred by your direct affiliate cancels their subscription, the commission will also be automatically cancelled.`,
      
      indiretaTitle3: (months: number) => `Duration of Earnings (${months} months)`,
      indiretaText3: (months: number) => `The indirect commission remains active for the first ${months} months of the subscription of each indirectly referred user.`,
      
      pixTitle: "Payment and Withdrawals via PIX",
      pixText: "Accumulated values are visible on your Affiliate Dashboard. Withdrawals can be requested bi-weekly (on the 1st and 16th of each month) and are transferred via PIX directly to the bank account linked to your registered CPF.",
      
      bottomText: "Become a successful affiliate by inviting friends and professionals to our platform!",
      bottomBtn: "Register Now",
      
      affiliateProgram: "Affiliate Program",
      affiliateDesc: "Share the app with others using your affiliate link and earn incredible commissions for each confirmed subscription!",
      directCommTitle: (pct: string) => `${pct} direct commission`,
      directCommDesc: (months: number) => `for ${months} months for each of your referrals.`,
      indirectCommTitle: (pct: string) => `${pct} indirect commission`,
      indirectCommDesc: (months: number) => `for ${months} months in your network.`,
      viewRules: "View Rules"
    },
    es: {
      titleDireta: "Reglas de Comisión Directa",
      subtitleDireta: (pct: string) => `Reciba ${pct} de comisión recurrente`,
      titleIndireta: "Reglas de Comisión Indirecta",
      subtitleIndireta: (pct: string) => `Reciba ${pct} de comisión recurrente`,
      howItWorks: "Cómo funcionan las ganancias:",
      
      diretaTitle1: "Referencia Directa",
      diretaText1: "Cuando un usuario se registra y contrata el plan de suscripción utilizando directamente su enlace de afiliado exclusivo.",
      
      diretaTitle2: "Ganancia Recurrente Mensual",
      diretaText2: (pct: string) => `Usted gana el ${pct} de cada cuota pagada por su referido durante el período elegible. ¡Si paga mensualmente, usted recibe cada mes! NOTA: En el período de comisión, si el usuario referido se atrasa en el pago, la comisión se suspende hasta que realice el pago. En caso de que el usuario referido cancele la suscripción, la comisión también será cancelada.`,
      
      diretaTitle3: (months: number) => `Duración de las Ganancias (${months} meses)`,
      diretaText3: (months: number) => `La comisión directa permanece activa durante los primeros ${months} meses de la contratación de la suscripción del usuario referido.`,
      
      indiretaTitle1: "Referencia por su Red",
      indiretaText1: "Cuando las personas que usted recomendó (afiliados directos) invitan a nuevos suscriptores. ¡Usted también gana sobre el trabajo de su red directa de afiliados!",
      
      indiretaTitle2: "Ganancia Recurrente Indirecta",
      indiretaText2: (pct: string) => `Usted gana el ${pct} sobre los pagos de cada cuota de los referidos de 2º nivel, durante el período elegible, generados por su red de afiliados directos. ¡Si el usuario referido por su afiliado directo paga mensualmente, usted recibe cada mes! NOTA: En el período de comisión, si el usuario referido por su afiliado directo se atrasa en el pago, la comisión se suspende automáticamente hasta que se realice el pago. En caso de que el usuario referido por su afiliado directo cancele la suscripción, la comisión también será cancelada automáticamente.`,
      
      indiretaTitle3: (months: number) => `Duración de las Ganancias (${months} meses)`,
      indiretaText3: (months: number) => `La comisión indirecta permanece activa durante los primeros ${months} meses de la contratación de la suscripción de cada usuario referido indirectamente.`,
      
      pixTitle: "Pago y Retiros vía PIX",
      pixText: "Los montos acumulados están visibles en su Panel de Afiliados. Los retiros se pueden solicitar quincenalmente (los días 1 y 16 de cada mes) y se transfieren por PIX directamente a la cuenta bancaria vinculada a su CPF registrado.",
      
      bottomText: "¡Conviértase en un afiliado exitoso invitando a amigos y profesionales a nuestra plataforma!",
      bottomBtn: "Registrarse Ahora",
      
      affiliateProgram: "Programa de Afiliados",
      affiliateDesc: "¡Comparta la aplicación con otros a través de su enlace de afiliado y gane comisiones increíbles por cada suscripción confirmada!",
      directCommTitle: (pct: string) => `${pct} de comisión directa`,
      directCommDesc: (months: number) => `por ${months} meses por cada referido suyo.`,
      indirectCommTitle: (pct: string) => `${pct} de comisión indirecta`,
      indirectCommDesc: (months: number) => `por ${months} meses en su red.`,
      viewRules: "Ver Reglas"
    }
  };

  const t = (key: string, ...args: any[]): string => {
    const lang = currentLang === 'en' || currentLang === 'es' ? currentLang : 'pt';
    const translation = commissionTranslations[lang][key];
    if (typeof translation === 'function') {
      return (translation as Function)(...args);
    }
    return (translation as string) || commissionTranslations['pt'][key] as string;
  };

  const moduleFeatures: Record<string, { title: string, desc: string, icon: string }[]> = {
    agenda: [
      { title: 'Calendário Interativo', desc: 'Marque, remarque e gerencie compromissos de forma rápida e dinâmica.', icon: 'calendar_month' },
      { title: 'Lembretes por Voz Automáticos', desc: 'Receba alertas sonoros personalizados para não esquecer seus horários.', icon: 'campaign' },
      { title: 'Envio por WhatsApp integrado', desc: 'Dispare lembretes de confirmação rápidos com apenas um toque.', icon: 'chat' },
      { title: 'Sincronização com Google Agenda', desc: 'Integre em tempo real com seu Google Calendar de forma bidirecional.', icon: 'sync' },
      { title: 'Bloco de Anotações', desc: 'Anote ideias, lembretes e detalhes importantes com salvamento em tempo real.', icon: 'edit_note' }
    ]
  };
  
  const [themeConfig, setThemeConfig] = useState({
    headlinePart1: 'Inicie e Desbloqueie',
    headlinePart2: '40 dias Grátis.',
    headlineSize: 'text-4xl md:text-5xl lg:text-7xl',
    headlineColor: 'text-white',
    headlineGradient: 'bg-gradient-to-b from-gray-300 to-white bg-clip-text text-transparent',
    useGradient: false,
    fontFamily: "'Public Sans', sans-serif",
    fontWeight: 'font-bold'
  });

  useEffect(() => {
    const configStr = localStorage.getItem('agenda_theme_settings');
    if (configStr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeConfig(prev => ({ ...prev, ...JSON.parse(configStr) }));
    }
  }, []);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.city) setCity(data.city);
        if (data.region_code) setState(data.region_code);
        if (data.country_name) setCountry(data.country_name);
      })
      .catch((e) => console.log('Location fetch failed', e));
  }, []);

  const isAnyLandingModalActive = isLoginModalOpen || isInstructionsModalOpen || !!selectedModuleDetail || !!selectedCommissionDetail || isVideoModalOpen;

  const currentUserExpStatus = currentUser ? getExpirationStatus(currentUser) : null;
  const hasExhaustedTrial = currentUser ? (
    currentUser.plan === 'premium' ||
    (currentUserExpStatus ? currentUserExpStatus.trialDaysRemaining <= 0 : false) ||
    currentUser.hasUsedFreeTrial === true
  ) : false;

  useEffect(() => {
    if (isAnyLandingModalActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyLandingModalActive]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf && !isValidCPF(cpf)) {
      alert('O CPF informado é inválido. Por favor, verifique.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      onLogin(name || 'Visitante', whatsapp, isAffiliateOptIn, email, cpf, city, state, country, password);
    }, 800);
  };

  const defaultModules = [
    { id: 'agenda', name: 'Módulo Agenda', price: 9.90, description: 'Lembretes, IA e agendamentos.', icon: 'calendar_month', isHighlight: true }
  ];

  const modulesToDisplay = systemModules && systemModules.length > 0 ? systemModules : defaultModules;

  return (
    <div className="bg-[#263E2A] text-on-background min-h-screen flex flex-col items-center">
      <div className={`w-full flex flex-col items-center ${isAnyLandingModalActive ? "pointer-events-none select-none opacity-40 transition-all duration-300 filter blur-[0.5px]" : "transition-all duration-300"}`}>
        {/* Top Bar Navigation */}
      <header className="relative flex justify-between items-center w-full px-container-padding py-stack-md bg-[#263E2A] shadow-lg sticky top-0 z-50">
        <div className="flex items-center z-10 flex-1 justify-start gap-2">
          <LanguageSelector />
        </div>
        <div className="flex items-center justify-center z-0 shrink-0 mx-2">
           <img alt="Sistema Ágio" style={{ mixBlendMode: 'multiply' }} className="w-auto object-contain h-[36px] sm:h-[40px] md:h-[61px] drop-shadow-[0_1px_2px_rgba(255,255,255,0.2)] rounded-2xl overflow-hidden" src="/399-agenda%20%C3%A1gio.png" />
        </div>
        <div className="flex items-center justify-end z-10 flex-1 gap-4">
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setIsInstructionsModalOpen(true)}
              className="text-label-sm font-label-sm text-white/90 hover:text-white flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-green-400">menu_book</span>
              Instruções de Uso
            </button>
            <button
              onClick={onOpenSupport}
              className="text-label-sm font-label-sm text-white/90 hover:text-white flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-green-400">support_agent</span>
              Ajuda & Suporte
            </button>
            <div className="h-4 w-px bg-white/20"></div>
            <span className="text-label-sm font-label-sm text-white whitespace-nowrap">Já tem uma conta?</span>
            <button onClick={() => setIsLoginModalOpen(true)} className="text-label-sm font-label-sm text-white font-bold hover:underline cursor-pointer">Entrar</button>
          </div>
          <div className="md:hidden relative">
            <button onClick={() => setIsLandingMobileMenuOpen(!isLandingMobileMenuOpen)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">{isLandingMobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
            <div className={`absolute right-0 top-full mt-2 w-56 bg-[#132215] border border-white/20 rounded-xl shadow-2xl overflow-hidden flex flex-col p-2 gap-1 transition-all duration-200 z-[100] ${isLandingMobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
              <span className="text-xs text-white/50 font-medium px-4 py-2 border-b border-white/10">Já tem uma conta?</span>
              <button 
                onClick={() => { setIsLoginModalOpen(true); setIsLandingMobileMenuOpen(false); }} 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-white font-bold hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] text-green-400">login</span>
                Entrar
              </button>
              
              <span className="text-xs text-white/50 font-medium px-4 py-2 border-b border-white/10 mt-2">Navegação</span>
              <button
                onClick={() => { onOpenSupport(); setIsLandingMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-white hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] text-green-400">support_agent</span>
                Ajuda & Suporte
              </button>
              <button
                onClick={() => { setIsInstructionsModalOpen(true); setIsLandingMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-white hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] text-green-400">menu_book</span>
                Instruções de uso
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow w-full max-w-6xl px-container-padding py-stack-lg flex flex-col md:flex-row items-center justify-center gap-10">
        {/* Left Column: Marketing / Offers */}
        <section className="w-full md:w-1/2 flex flex-col gap-stack-lg">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-container-highest to-surface-container border border-white/10 p-10 text-white shadow-2xl">
            {/* Decorative blurs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] -ml-10 -mb-10 pointer-events-none"></div>
            
            <div className="relative z-10">
              
              <h1 
                className={`${themeConfig.headlineSize} ${themeConfig.fontWeight} tracking-tight mb-6 leading-tight text-center md:text-left ${themeConfig.useGradient ? themeConfig.headlineGradient : themeConfig.headlineColor}`}
                style={{ fontFamily: themeConfig.fontFamily || "'Public Sans', sans-serif" }}
              >
                {themeConfig.headlinePart1 === 'Inicie e Desbloqueie' && themeConfig.headlinePart2 === '40 dias Grátis.' ? (
                  hasExhaustedTrial ? (
                    <>
                      <span className="block md:inline">Inicie</span>{' '}
                      <span className="block md:inline">e desbloqueie</span>{' '}
                      <br className="hidden md:block" />
                      <span className="block md:inline">sua produtividade.</span>
                    </>
                  ) : (
                    <>
                      <span className="block md:inline">Inicie</span>{' '}
                      <span className="block md:inline">e desbloqueie</span>{' '}
                      <br className="hidden md:block" />
                      <span className="block md:inline">40 dias grátis.</span>
                    </>
                  )
                ) : (
                  <>
                    {themeConfig.headlinePart1} <br className="hidden md:block" />
                    {hasExhaustedTrial ? themeConfig.headlinePart2.replace(/40\s*dias\s*grátis\.?/i, 'sua produtividade.') : themeConfig.headlinePart2}
                  </>
                )}
              </h1>
              
              <div className="mb-8 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-purple-500/10 rounded-2xl blur-xl transition-all duration-500"></div>
                <div className="relative bg-black/20 p-6 md:p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md text-left">
                  <h3 className="text-xl md:text-2xl font-extrabold text-white mb-3 tracking-tight drop-shadow-md leading-snug">
                    Diga adeus à velha agenda de papel! Conheça o <span className="text-emerald-400">ÁGIO AGENDA</span>, a sua solução definitiva para o controle total do seu tempo e das suas finanças.
                  </h3>
                  
                  <p className="text-white/90 leading-relaxed font-medium mb-4 text-sm md:text-base">
                    Com o Ágio Agenda, você gerencia seus compromissos e contas em um só lugar. Ele conta com lembretes automáticos com alertas por texto e áudio personalizado, bloco de anotações integrado, sincronização segura na nuvem e até otimização de rotas e logística para o seu dia a dia.
                  </p>

                  <div className="space-y-2.5 my-4 text-sm md:text-base text-white/85 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/10">
                    <p className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0 mt-0.5" translate="no">verified</span>
                      <span><strong>Ele é perfeito para quem vive na rotina de plantões</strong> — como Guardas Municipais, Policiais, Bombeiros e profissionais da Saúde.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0 mt-0.5" translate="no">verified</span>
                      <span><strong>É ideal para quem organiza horários e clientes</strong> — como Professores, Barbeiros, Cabeleireiras, Manicures, Personal Trainers, Mecânicos, Veterinários, Guias de Turismo, Restaurantes e Profissionais Liberais.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0 mt-0.5" translate="no">verified</span>
                      <span><strong>E essencial para quem vende e presta serviços</strong> — como Corretores de imóveis e seguros, Vendedores, Músicos, Diaristas, Engenheiros e Construtores.</span>
                    </p>
                  </div>

                  <p className="text-emerald-300 font-semibold leading-relaxed mb-5 text-sm md:text-base text-center md:text-left">
                    Seja qual for a sua profissão ou rotina, o Ágio Agenda foi feito para você. Simplifique sua vida e assuma o controle hoje mesmo!
                  </p>
                  <div className="w-full md:w-[70%] mx-auto rounded-xl overflow-hidden shadow-lg border border-white/10 mt-4 aspect-video relative bg-black">
                      <div className="w-full h-full cursor-pointer relative group" onClick={() => setIsVideoModalOpen(true)}>
                        <img 
                          src="/uve2zgu.png" 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover object-[center_30%]" 
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                          <div className="w-[68px] h-[48px] bg-[#FF0000] rounded-xl flex items-center justify-center shadow-lg group-hover:bg-red-700 group-hover:scale-110 transition-all">
                            <span className="material-symbols-outlined text-white text-4xl">play_arrow</span>
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl flex flex-col gap-4 shadow-inner w-full mb-8 backdrop-blur-md">
                <h4 
                  className={`flex flex-col md:flex-row items-center justify-center gap-3 drop-shadow-sm ${themeConfig.headlineSize} ${themeConfig.fontWeight} tracking-tight leading-tight text-center ${themeConfig.useGradient ? themeConfig.headlineGradient : themeConfig.headlineColor}`}
                  style={{ fontFamily: themeConfig.fontFamily || "'Public Sans', sans-serif" }}
                >
                  <span>{t('affiliateProgram')}</span>
                </h4>
                <p className="text-sm md:text-base font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-center whitespace-normal max-w-3xl mx-auto leading-relaxed px-2">{t('affiliateDesc')}</p>
                 <ul className="flex flex-row justify-between items-stretch gap-2 md:gap-4 mt-2 list-none text-white/90 drop-shadow-sm text-center w-full max-w-4xl mx-auto">
                   <div 
                     onClick={() => setSelectedCommissionDetail('direta')}
                     className="bg-black/20 p-3 md:p-4 rounded-xl border border-white/10 hover:border-green-400/50 hover:bg-black/40 transition-all flex-1 flex flex-col items-center justify-start cursor-pointer group/comm"
                   >
                     <span className="material-symbols-outlined text-green-400 mb-2 text-[28px] md:text-[32px] group-hover/comm:scale-110 transition-transform">payments</span>
                     <strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-base md:text-2xl font-extrabold leading-tight group-hover/comm:text-green-300 transition-colors">{t('directCommTitle', directCommissionPct)}</strong>
                     <span className="text-sm md:text-lg font-bold mt-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight">{t('directCommDesc', directCommissionMonths)}</span>
                     <span className="text-[9px] text-green-300 underline font-black uppercase mt-auto pt-2 opacity-85 group-hover/comm:opacity-100 flex items-center gap-0.5">
                       <span className="material-symbols-outlined text-[11px]">info</span> {t('viewRules')}
                     </span>
                   </div>
                   <div 
                     onClick={() => setSelectedCommissionDetail('indireta')}
                     className="bg-black/20 p-3 md:p-4 rounded-xl border border-white/10 hover:border-blue-400/50 hover:bg-black/40 transition-all flex-1 flex flex-col items-center justify-start cursor-pointer group/comm"
                   >
                     <span className="material-symbols-outlined text-blue-400 mb-2 text-[28px] md:text-[32px] group-hover/comm:scale-110 transition-transform">account_tree</span>
                     <strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-base md:text-2xl font-extrabold leading-tight group-hover/comm:text-blue-300 transition-colors">{t('indirectCommTitle', indirectCommissionPct)}</strong>
                     <span className="text-sm md:text-lg font-bold mt-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight">{t('indirectCommDesc', indirectCommissionMonths)}</span>
                     <span className="text-[9px] text-blue-300 underline font-black uppercase mt-auto pt-2 opacity-85 group-hover/comm:opacity-100 flex items-center gap-0.5">
                       <span className="material-symbols-outlined text-[11px]">info</span> {t('viewRules')}
                     </span>
                   </div>
                 </ul>
              </div>

            </div>
            {/* Decorative background image */}
            <div className="absolute top-0 right-0 w-full h-full opacity-30 pointer-events-none">
              <img alt="" className="w-full h-full object-cover mix-blend-overlay" src="/399-agenda%20%C3%A1gio.png" />
            </div>
          </div>
          
          {/* TUDO O QUE VOCÊ PRECISA - Features Outside of Card */}
          <div className="w-full mt-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <span className="text-[12px] md:text-[13px] font-black uppercase tracking-widest text-white drop-shadow-md">TUDO O QUE VOCÊ PRECISA</span>
              <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 p-4 bg-surface-container-high rounded-2xl border border-white/10 hover:border-white/30 transition-all shadow-md hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#4ade80] to-[#22c55e] text-white flex items-center justify-center shadow-[0_0_15px_rgba(74,222,128,0.4)]">
                    <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                  </div>
                  <span className="text-[15px] font-black text-white leading-tight">Lembretes<br/>Automáticos</span>
                </div>
                <p className="text-[13px] text-white font-medium leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Reduza faltas com integração ao Google Agenda, notificações automáticas, avisos por texto e áudio personalizados.</p>
              </div>
              
              <div className="flex flex-col gap-2 p-4 bg-surface-container-high rounded-2xl border border-white/10 hover:border-white/30 transition-all shadow-md hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#818cf8] to-[#6366f1] text-white flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                    <span className="material-symbols-outlined text-[20px]">edit_note</span>
                  </div>
                  <span className="text-[15px] font-black text-white leading-tight">Bloco de<br/>Anotações</span>
                </div>
                <p className="text-[13px] text-white font-medium leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Anote ideias, lembretes e detalhes importantes de forma rápida com salvamento em tempo real.</p>
              </div>

              <div className="flex flex-col gap-2 p-4 bg-surface-container-high rounded-2xl border border-white/10 hover:border-white/30 transition-all shadow-md hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#38bdf8] to-[#0ea5e9] text-white flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.4)]">
                    <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
                  </div>
                  <span className="text-[15px] font-black text-white leading-tight">Sincronização<br/>em Nuvem</span>
                </div>
                <p className="text-[13px] text-white font-medium leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Acesso simultâneo do celular, tablet ou PC de qualquer lugar.</p>
              </div>

              <div className="flex flex-col gap-2 p-4 bg-surface-container-high rounded-2xl border border-white/10 hover:border-white/30 transition-all shadow-md hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#fb7185] to-[#e11d48] text-white flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.4)]">
                    <span className="material-symbols-outlined text-[20px]">route</span>
                  </div>
                  <span className="text-[15px] font-black text-white leading-tight">Otimização de<br/>Rota & Logística</span>
                </div>
                <p className="text-[13px] text-white font-medium leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Agrupamento inteligente e otimização de rotas por localização dos compromissos.</p>
              </div>

              <div className="flex flex-col gap-2 p-4 bg-surface-container-high rounded-2xl border border-white/10 hover:border-white/30 transition-all shadow-md hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white flex items-center justify-center shadow-[0_0_15px_rgba(217,119,6,0.4)]">
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_balance_wallet</span>
                  </div>
                  <span className="text-[15px] font-black text-white leading-tight">Gestão de<br/>Contas</span>
                </div>
                <p className="text-[13px] text-white font-medium leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Acompanhe relatórios financeiros com painéis diários e mensais.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Right Column: Registration Form Card */}
        <section className="w-full md:w-1/2 lg:w-5/12">
          <div className="bg-surface-container p-8 rounded-2xl shadow-[0px_8px_32px_rgba(0,0,0,0.3)] flex flex-col gap-stack-lg border border-white/5">
            <div className="text-center md:text-left">
              <h2 className="text-headline-lg font-headline-lg text-white">Criar sua conta</h2>
              <p className="text-body-md font-body-md text-on-surface-variant mt-2">
                {hasExhaustedTrial ? 'Organize sua rotina com máxima eficiência.' : 'Inicie seu teste gratuito de 40 dias agora.'}
              </p>
            </div>

            {/* Banner de Oferta Promocional no Topo do Cadastro */}
            <div className="bg-gradient-to-r from-[#063322] via-[#094730] to-[#063322] border-2 border-emerald-400/80 rounded-xl p-3.5 shadow-[0_0_20px_rgba(52,211,153,0.35)] flex flex-col items-center sm:items-start gap-1.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-400/15 rounded-full blur-xl pointer-events-none"></div>
              
              {/* Selo / Etiqueta Pequena */}
              <div className="inline-flex items-center gap-1.5 bg-amber-400 text-gray-950 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm">
                <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                <span>Oferta por tempo limitado</span>
              </div>

              {/* Preço Antigo Riscado x Preço Promocional */}
              <div className="flex items-baseline gap-3 mt-0.5 flex-wrap">
                <span className="text-xs sm:text-sm text-gray-300/80 font-semibold line-through decoration-gray-400">
                  De R$ 12,90
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-emerald-300 text-xl sm:text-2xl font-black tracking-tight drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]">
                    Por R$ 9,90
                  </span>
                  <span className="text-[11px] text-emerald-200/90 font-bold uppercase">/mês</span>
                </div>
              </div>
            </div>
            <form className="flex flex-col gap-stack-md" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-label-sm text-on-surface-variant" htmlFor="name">Nome Completo</label>
                <input 
                  className="w-full bg-white/10 border-0 border-b-2 border-primary/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-lg transition-colors text-white placeholder-white/40" 
                  id="name" 
                  placeholder="Ex: Maria Silva" 
                  type="text" 
                  required 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-label-sm text-on-surface-variant" htmlFor="email">E-mail Profissional</label>
                <input 
                  className="w-full bg-white/10 border-0 border-b-2 border-primary/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-lg transition-colors text-white placeholder-white/40" 
                  id="email" 
                  placeholder="maria@empresa.com" 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required 
                  disabled={isSubmitting} 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-label-sm text-on-surface-variant" htmlFor="cpf">CPF</label>
                <input 
                  className="w-full bg-white/10 border-0 border-b-2 border-primary/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-lg transition-colors text-white placeholder-white/40" 
                  id="cpf" 
                  placeholder="000.000.000-00" 
                  type="text" 
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  required 
                  disabled={isSubmitting} 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-label-sm text-on-surface-variant" htmlFor="whatsapp">WhatsApp (com DDD)</label>
                <input 
                  className="w-full bg-white/10 border-0 border-b-2 border-primary/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-lg transition-colors text-white placeholder-white/40" 
                  id="whatsapp" 
                  placeholder="(11) 99999-9999" 
                  type="tel" 
                  required 
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  disabled={isSubmitting} 
                />
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-label-sm font-label-sm text-on-surface-variant" htmlFor="city">Cidade</label>
                  <input 
                    className="w-full bg-white/10 border-0 border-b-2 border-primary/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-lg transition-colors text-white placeholder-white/40" 
                    id="city" 
                    placeholder="Cidade" 
                    type="text" 
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    disabled={isSubmitting} 
                  />
                </div>
                <div className="flex flex-col gap-1 w-[80px]">
                  <label className="text-label-sm font-label-sm text-on-surface-variant" htmlFor="state">UF</label>
                  <input 
                    className="w-full bg-white/10 border-0 border-b-2 border-primary/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-lg transition-colors text-white placeholder-white/40 uppercase" 
                    id="state" 
                    placeholder="UF" 
                    type="text"
                    maxLength={2} 
                    value={state}
                    onChange={e => setState(e.target.value.toUpperCase())}
                    disabled={isSubmitting} 
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-label-sm text-white" htmlFor="password">Senha</label>
                <div className="relative">
                  <input className="w-full bg-white/10 border-0 border-b-2 border-primary/30 focus:border-primary focus:ring-0 px-4 py-3 rounded-t-lg transition-colors text-white placeholder-white/40" id="password" placeholder="••••••••" type="password" required disabled={isSubmitting} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/60 cursor-pointer">visibility</span>
                </div>
                <p className="text-[10px] text-white mt-1">Mínimo de 8 caracteres com letras e números.</p>
              </div>
              <div className="flex items-start gap-3 mt-2">
                <input className="mt-1 rounded border-white/20 bg-white/10 text-primary focus:ring-primary" id="terms" type="checkbox" required disabled={isSubmitting} />
                <label className="text-label-sm font-label-sm text-white leading-tight" htmlFor="terms">
                  Eu aceito os <a className="text-white font-bold hover:underline" href="#">Termos de Uso</a> e a <a className="text-white font-bold hover:underline" href="#">Política de Privacidade</a>.
                </label>
              </div>
              {affiliateSpotsOpen ? (
                <div className="flex items-start gap-3 mt-1">
                  <input className="mt-1 rounded border-white/20 bg-white/10 text-primary focus:ring-primary" id="affiliate" type="checkbox" checked={isAffiliateOptIn} onChange={(e) => setIsAffiliateOptIn(e.target.checked)} disabled={isSubmitting} />
                  <label className="text-label-sm font-label-sm text-white leading-tight" htmlFor="affiliate">
                    Quero participar gratuitamente do <span className="text-white font-bold">Programa de Afiliados</span> e faturar indicando o app.
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs">
                  <span className="material-symbols-outlined text-sm shrink-0">info</span>
                  <span>Inscrições para o Programa de Afiliados temporariamente esgotadas.</span>
                </div>
              )}
              
              <button 
                className="w-full bg-primary text-on-primary-fixed py-4 px-6 rounded-xl font-title-md text-title-md flex justify-center items-center gap-2 hover:bg-white hover:text-surface-container active:scale-[0.98] transition-all mt-4 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed" 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-on-primary-fixed/30 border-t-on-primary-fixed rounded-full animate-spin"></div>
                ) : (
                  hasExhaustedTrial ? (
                    <>Acessar Plataforma <span className="material-symbols-outlined">arrow_forward</span></>
                  ) : (
                    <>Iniciar 40 dias grátis <span className="material-symbols-outlined">arrow_forward</span></>
                  )
                )}
              </button>
            </form>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-label-sm font-label-sm text-on-surface-variant">OU</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button type="button" onClick={() => onGoogleLogin(isAffiliateOptIn)} className="w-full bg-white/10 border border-white/20 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-label-sm font-label-sm text-white hover:bg-white/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Entre com Conta Google
              </button>
            </div>
             <div className="text-center text-xs text-white/70 mt-4 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <p>
                  Já tem uma conta? <button type="button" onClick={() => setIsLoginModalOpen(true)} className="text-white font-bold hover:underline cursor-pointer">Entrar</button>
                </p>
                <span className="text-white/40">•</span>
                <button 
                  type="button" 
                  onClick={() => {
                    setResetEmailInput(email || loginEmail || '');
                    setResetStatus(null);
                    setIsForgotPasswordModalOpen(true);
                  }} 
                  className="text-amber-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px] shrink-0 notranslate" translate="no">lock_reset</span>
                  {currentLang === 'es' ? '¿Olvidaste tu contraseña?' : currentLang === 'en' ? 'Forgot your password?' : 'Esqueceu sua senha?'}
                </button>
              </div>
              <div className="text-white/80 flex flex-col items-center gap-1">
                <span>Dúvidas? Acesse as</span>
                <button type="button" onClick={() => setIsInstructionsModalOpen(true)} className="text-green-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"><span className="material-symbols-outlined text-[14px]">menu_book</span>Instruções de Uso</button>
              </div>
            </div>
          </div>
        </section>
      </main>
      

      <footer className="w-full bg-[#263E2A] py-stack-md mt-auto border-t border-white/5">
        <div className="max-w-6xl mx-auto px-container-padding flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-label-sm font-label-sm text-on-surface-variant">© 2026 ÁGiO Tech. Todos os direitos reservados.</span>
            <span className="text-[10px] text-on-surface-variant font-medium text-center md:text-left">DALECIO L. MACEDO - CNPJ 20361238/0001-50</span>
          </div>
          <div className="flex gap-gutter items-center">
            <button onClick={onOpenSupport} className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">support_agent</span>
              Ajuda & Suporte
            </button>
          </div>
        </div>
      </footer>
      </div>
      
      {/* FAB: Help/Support */}
      
      {/* Module Detail Modal */}
      {selectedModuleDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#06402B] border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="p-6 flex flex-col gap-5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 shrink-0">
                    <span className="material-symbols-outlined text-[32px] text-yellow-300">{selectedModuleDetail.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-white leading-tight">{selectedModuleDetail.name}</h3>
                    <p className="text-sm text-yellow-300 font-bold mt-0.5">R$ {Number(selectedModuleDetail.price).toFixed(2).replace('.', ',')} /mês</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedModuleDetail(null)} 
                  className="text-white/60 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="h-px bg-white/10 w-full"></div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white/50 mb-3">Funcionalidades e Recursos Inclusos:</h4>
                <div className="flex flex-col gap-4">
                  {(moduleFeatures[selectedModuleDetail.id] || []).map((feat, index) => (
                    <div key={index} className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <span className="material-symbols-outlined text-primary text-[24px] mt-0.5 shrink-0">{feat.icon}</span>
                      <div>
                        <p className="text-sm font-black text-white leading-tight">{feat.title}</p>
                        <p className="text-xs text-white/70 mt-1 leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/10 w-full mt-2"></div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-1 bg-primary/10 p-4 rounded-xl border border-primary/20">
                <p className="text-xs text-white/80 leading-relaxed font-medium">
                  {hasExhaustedTrial ? (
                    <>Todos os módulos disponíveis com <strong className="text-white">tecnologia completa e alta eficiência</strong>. Acesso imediato!</>
                  ) : (
                    <>Todos os módulos contam com <strong className="text-white">40 dias de período de teste gratuito</strong>. Comece sem compromisso hoje mesmo!</>
                  )}
                </p>
                <button 
                  onClick={() => {
                    setSelectedModuleDetail(null);
                    const emailInput = document.getElementById('name');
                    if (emailInput) {
                      emailInput.focus();
                      emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="bg-primary text-on-primary-fixed hover:bg-white hover:text-black font-bold py-2.5 px-4 rounded-lg text-xs transition-all whitespace-nowrap active:scale-95 shadow-md shrink-0"
                >
                  {hasExhaustedTrial ? 'Conhecer Módulos' : 'Experimentar Grátis'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Rules Modal */}
      {selectedCommissionDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#06402B] border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col text-left animate-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col gap-5">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${selectedCommissionDetail === 'direta' || !selectedCommissionDetail ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                    <span className={`material-symbols-outlined text-[32px] ${selectedCommissionDetail === 'direta' || !selectedCommissionDetail ? 'text-green-400' : 'text-blue-400'}`}>
                    {selectedCommissionDetail === 'direta' || !selectedCommissionDetail ? 'payments' : 'account_tree'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white leading-tight relative">
                    <span className={selectedCommissionDetail === 'direta' || !selectedCommissionDetail ? 'inline' : 'opacity-0 absolute h-0 overflow-hidden pointer-events-none'}>{t('titleDireta')}</span>
                    <span className={selectedCommissionDetail === 'indireta' ? 'inline' : 'opacity-0 absolute h-0 overflow-hidden pointer-events-none'}>{t('titleIndireta')}</span>
                  </h3>
                  <p className={`text-sm font-bold mt-0.5 relative ${selectedCommissionDetail === 'direta' || !selectedCommissionDetail ? 'text-green-400' : 'text-blue-400'}`}>
                    <span className={selectedCommissionDetail === 'direta' || !selectedCommissionDetail ? 'inline' : 'opacity-0 absolute h-0 overflow-hidden pointer-events-none'}>{t('subtitleDireta', directCommissionPct)}</span>
                    <span className={selectedCommissionDetail === 'indireta' ? 'inline' : 'opacity-0 absolute h-0 overflow-hidden pointer-events-none'}>{t('subtitleIndireta', indirectCommissionPct)}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCommissionDetail(null)} 
                className="text-white/60 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-colors shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="h-px bg-white/10 w-full"></div>

            <div className="relative">
              <h4 className="text-xs font-black uppercase tracking-wider text-white/50 mb-3">{t('howItWorks')}</h4>
              <div className="flex flex-col gap-4">
                {/* Direta Content */}
                <div className={`flex-col gap-4 ${selectedCommissionDetail === 'direta' || !selectedCommissionDetail ? 'flex relative' : 'opacity-0 absolute h-0 overflow-hidden pointer-events-none'}`}>
                  <div className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <span className="material-symbols-outlined text-green-400 text-[24px] mt-0.5 shrink-0">link</span>
                    <div>
                      <p className="text-sm font-black text-white leading-tight">{t('diretaTitle1')}</p>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">
                        {t('diretaText1')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <span className="material-symbols-outlined text-green-400 text-[24px] mt-0.5 shrink-0">history</span>
                    <div>
                      <p className="text-sm font-black text-white leading-tight">{t('diretaTitle2')}</p>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">
                        {t('diretaText2', directCommissionPct)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <span className="material-symbols-outlined text-green-400 text-[24px] mt-0.5 shrink-0">calendar_today</span>
                    <div>
                      <p className="text-sm font-black text-white leading-tight">{t('diretaTitle3', directCommissionMonths)}</p>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">
                        {t('diretaText3', directCommissionMonths)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Indireta Content */}
                <div className={`flex-col gap-4 ${selectedCommissionDetail === 'indireta' ? 'flex relative' : 'opacity-0 absolute h-0 overflow-hidden pointer-events-none'}`}>
                  <div className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <span className="material-symbols-outlined text-blue-400 text-[24px] mt-0.5 shrink-0">group</span>
                    <div>
                      <p className="text-sm font-black text-white leading-tight">{t('indiretaTitle1')}</p>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">
                        {t('indiretaText1')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <span className="material-symbols-outlined text-blue-400 text-[24px] mt-0.5 shrink-0">autorenew</span>
                    <div>
                      <p className="text-sm font-black text-white leading-tight">{t('indiretaTitle2')}</p>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">
                        {t('indiretaText2', indirectCommissionPct)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <span className="material-symbols-outlined text-blue-400 text-[24px] mt-0.5 shrink-0">hourglass_empty</span>
                    <div>
                      <p className="text-sm font-black text-white leading-tight">{t('indiretaTitle3', indirectCommissionMonths)}</p>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">
                        {t('indiretaText3', indirectCommissionMonths)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-start bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors mt-2">
                  <span className="material-symbols-outlined text-amber-400 text-[24px] mt-0.5 shrink-0">account_balance_wallet</span>
                  <div>
                    <p className="text-sm font-black text-white leading-tight">{t('pixTitle')}</p>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">
                      {t('pixText')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/10 w-full mt-2"></div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-1 bg-primary/10 p-4 rounded-xl border border-primary/20">
              <p className="text-xs text-white/80 leading-relaxed font-medium">{t('bottomText')}</p>
              <button 
                onClick={() => {
                  setSelectedCommissionDetail(null);
                  const nameInput = document.getElementById('name');
                  if (nameInput) {
                    nameInput.focus();
                    nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className="bg-primary text-on-primary-fixed hover:bg-white hover:text-black font-bold py-2.5 px-4 rounded-lg text-xs transition-all whitespace-nowrap active:scale-95 shadow-md shrink-0"
              >
                {t('bottomBtn')}
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsVideoModalOpen(false)}>
          <div className="w-full max-w-5xl relative">
            <button 
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-4xl drop-shadow-md">close</span>
            </button>
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <iframe 
                className="w-full h-full"
                src="https://www.youtube.com/embed/2bHQlDm90nM?autoplay=1&mute=0&modestbranding=1&rel=0&showinfo=0" 
                title="O aplicativo ideal onde você gerencia seus compromissos e responsabilidades pessoais, profissionais e financeiras em um só lugar"
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Auto Login Banner */}
      {isAutoLoggingIn && !currentUser && (
        <div className="fixed bottom-6 right-6 z-[200] bg-[#06402B] border border-emerald-400/50 rounded-2xl shadow-2xl p-4 flex items-center gap-4 text-white max-w-md animate-in slide-in-from-bottom-5">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-emerald-400 animate-spin">sync</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Login Automático Ativado</p>
            <p className="text-sm font-semibold truncate">Entrando como {loginEmail || 'usuário'}...</p>
          </div>
          <button
            onClick={() => {
              setIsAutoLoggingIn(false);
              autoLoginAttemptedRef.current = true;
              localStorage.setItem('agio_remember_login', 'false');
              setRememberMe(false);
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors shrink-0"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setIsLoginModalOpen(false)}>
          <div className="bg-[#06402B] border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in fade-in zoom-in-95 duration-200 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
              <h3 className="text-lg font-bold text-on-surface">
                {currentLang === 'es' ? 'Iniciar sesión en su cuenta' : currentLang === 'en' ? 'Sign in to your account' : 'Entrar na sua conta'}
              </h3>
              <button onClick={() => setIsLoginModalOpen(false)} className="text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                <span className="material-symbols-outlined shrink-0 notranslate" translate="no">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white" htmlFor="loginEmail">
                  {currentLang === 'es' ? 'Correo o WhatsApp' : currentLang === 'en' ? 'Email or WhatsApp' : 'E-mail ou WhatsApp'}
                </label>
                <input 
                  type="text" 
                  id="loginEmail"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-white/10 border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary px-4 py-3 rounded-lg text-white placeholder-white/40 text-sm"
                  placeholder={currentLang === 'es' ? 'Ej: tu@email.com o 11999999999' : currentLang === 'en' ? 'Ex: your@email.com or 11999999999' : 'Ex: seu@email.com ou 11999999999'}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white" htmlFor="loginPassword">
                  {currentLang === 'es' ? 'Contraseña' : currentLang === 'en' ? 'Password' : 'Senha'}
                </label>
                <div className="relative">
                  <input 
                    type={showLoginPassword ? "text" : "password"} 
                    id="loginPassword"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-white/10 border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary px-4 py-3 pr-10 rounded-lg text-white placeholder-white/40 text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg shrink-0 notranslate" translate="no">
                      {showLoginPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-white/90 hover:text-white">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/30 bg-white/10 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span className="font-medium">
                    {currentLang === 'es' ? 'Recordar mis datos' : currentLang === 'en' ? 'Remember me' : 'Lembrar meus dados'}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setResetEmailInput(loginEmail || email || '');
                    setResetStatus(null);
                    setIsForgotPasswordModalOpen(true);
                  }}
                  className="text-amber-300 font-bold hover:underline cursor-pointer text-right shrink-0"
                >
                  {currentLang === 'es' ? '¿Olvidaste tu contraseña?' : currentLang === 'en' ? 'Forgot your password?' : 'Esqueceu a senha?'}
                </button>
              </div>

              <button 
                onClick={() => {
                  if (loginEmail.trim() === '' || loginPassword.trim() === '') {
                    const alertMsg = currentLang === 'es' 
                      ? 'Por favor, ingrese su correo/WhatsApp y contraseña.' 
                      : currentLang === 'en' 
                      ? 'Please enter your email/WhatsApp and password.' 
                      : 'Por favor, informe seu e-mail/WhatsApp e senha.';
                    alert(alertMsg);
                    return;
                  }
                  if (rememberMe) {
                    localStorage.setItem('agio_remember_login', 'true');
                    localStorage.setItem('agio_saved_email', loginEmail.trim());
                    localStorage.setItem('agio_saved_password', loginPassword);
                  } else {
                    localStorage.removeItem('agio_remember_login');
                    localStorage.removeItem('agio_saved_email');
                    localStorage.removeItem('agio_saved_password');
                  }
                  setIsLoginModalOpen(false);
                  
                  const isEmail = loginEmail.includes('@');
                  if (isEmail) {
                    onLogin('', '', false, loginEmail.trim(), undefined, undefined, undefined, undefined, loginPassword);
                  } else {
                    onLogin('', loginEmail.trim(), false, undefined, undefined, undefined, undefined, undefined, loginPassword);
                  }
                }}
                className="w-full bg-primary text-on-primary-fixed hover:opacity-90 py-3 rounded-lg font-bold text-sm transition-opacity mt-2 cursor-pointer"
              >
                {currentLang === 'es' ? 'Avanzar' : currentLang === 'en' ? 'Continue' : 'Avançar'}
              </button>
              
              <div className="flex items-center gap-4 my-2">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-xs text-white/50 uppercase tracking-widest font-medium">
                  {currentLang === 'es' ? 'O' : currentLang === 'en' ? 'OR' : 'OU'}
                </span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
              
              <button 
                type="button" 
                onClick={() => { setIsLoginModalOpen(false); onGoogleLogin(false); }}
                className="w-full bg-white hover:bg-gray-100 text-black py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {currentLang === 'es' ? 'Iniciar sesión con Google' : currentLang === 'en' ? 'Sign in with Google' : 'Entrar com Conta Google'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Recuperação de Senha */}
      {isForgotPasswordModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm cursor-pointer" onClick={() => setIsForgotPasswordModalOpen(false)}>
          <div className="bg-[#06402B] border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in fade-in zoom-in-95 duration-200 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <span className="material-symbols-outlined text-amber-400 shrink-0 notranslate" translate="no">lock_reset</span>
                <h3>
                  {currentLang === 'es' ? 'Recuperar Contraseña' : currentLang === 'en' ? 'Recover Password' : 'Recuperar Senha'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsForgotPasswordModalOpen(false);
                  setResetStatus(null);
                }} 
                className="text-on-surface-variant hover:text-error transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-white shrink-0 notranslate" translate="no">close</span>
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="p-6 flex flex-col gap-4">
              <p className="text-xs text-white/80 leading-relaxed">
                {currentLang === 'es' 
                  ? 'Ingrese el correo electrónico registrado en su cuenta para recibir el enlace de restablecimiento de contraseña.'
                  : currentLang === 'en'
                  ? 'Enter the email registered to your account to receive the password reset link.'
                  : 'Informe o e-mail cadastrado em sua conta para receber o link de redefinição de senha.'}
              </p>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white" htmlFor="resetEmailInput">
                  {currentLang === 'es' ? 'Correo Electrónico Registrado' : currentLang === 'en' ? 'Registered Email' : 'E-mail Cadastrado'}
                </label>
                <input 
                  type="email" 
                  id="resetEmailInput"
                  required
                  value={resetEmailInput}
                  onChange={(e) => setResetEmailInput(e.target.value)}
                  className="w-full bg-white/10 border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary px-4 py-3 rounded-lg text-white placeholder-white/40 text-sm outline-none"
                  placeholder={currentLang === 'es' ? 'tu@email.com' : currentLang === 'en' ? 'your@email.com' : 'seu@email.com'}
                  autoFocus
                />
              </div>

              {resetStatus && (
                <div className={`p-3 rounded-lg text-xs font-semibold border flex items-start gap-2 ${
                  resetStatus.type === 'success' 
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' 
                    : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                }`}>
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 notranslate" translate="no">
                    {resetStatus.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span>{resetStatus.message}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
                <button 
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full bg-primary text-on-primary-fixed hover:opacity-90 py-3 rounded-lg font-bold text-sm transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingReset ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin shrink-0 notranslate" translate="no">refresh</span>
                      {currentLang === 'es' ? 'Enviando...' : currentLang === 'en' ? 'Sending...' : 'Enviando...'}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm shrink-0 notranslate" translate="no">send</span>
                      {currentLang === 'es' ? 'Enviar Correo de Recuperación' : currentLang === 'en' ? 'Send Recovery Email' : 'Enviar E-mail de Recuperação'}
                    </>
                  )}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordModalOpen(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg font-semibold transition-colors text-xs text-center cursor-pointer"
                >
                  {currentLang === 'es' ? 'Volver al Inicio de Sesión' : currentLang === 'en' ? 'Back to Login' : 'Voltar para o Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Instruções de Uso */}
      <InstructionsModal 
        isOpen={isInstructionsModalOpen} 
        onClose={() => setIsInstructionsModalOpen(false)} 
      />
    </div>
  );
}

function DashboardView({ onNavigate, onLogout, appointments, onOpenModal, onOpenProfile, onOpenAffiliate, onOptimize, onOpenNotes, onEditAppointment, onDeleteAppointment, userName, currentUser, onOpenSubscription, currentLang }: { onNavigate: (view: string) => void, onLogout: () => void, appointments: Appointment[], onOpenModal: () => void, onOpenProfile: () => void, onOpenAffiliate: () => void, onOptimize: () => void, onOpenNotes: (id: string) => void, onEditAppointment: (app: Appointment) => void, onDeleteAppointment: (id: string) => void, userName: string, currentUser?: AffiliateUser | null, onOpenSubscription: () => void, currentLang?: string }) {
  const isEs = currentLang === 'es';
  const isEn = currentLang === 'en';
  const [activeFilter, setActiveFilter] = useState<CategoryType | 'Todos'>('Todos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);

  const filteredAppointments = activeFilter === 'Todos'
    ? appointments
    : appointments.filter(app => app.category === activeFilter);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  const totalValueToday = filteredAppointments
    .filter(app => app.date === todayStr)
    .reduce((totals, app) => {
      const val = app.value || 0;
      if (app.valueStatus === 'a_pagar') totals.a_pagar += val;
      else if (app.valueStatus === 'recebido') totals.recebido += val;
      else if (app.valueStatus === 'pago') totals.pago += val;
      else totals.a_receber += val;
      return totals;
    }, { a_receber: 0, recebido: 0, a_pagar: 0, pago: 0 });

  const totalValueMonth = filteredAppointments
    .filter(app => app.date.startsWith(currentMonthStr))
    .reduce((totals, app) => {
      const val = app.value || 0;
      if (app.valueStatus === 'a_pagar') totals.a_pagar += val;
      else if (app.valueStatus === 'recebido') totals.recebido += val;
      else if (app.valueStatus === 'pago') totals.pago += val;
      else totals.a_receber += val;
      return totals;
    }, { a_receber: 0, recebido: 0, a_pagar: 0, pago: 0 });

  return (
    <div className="flex h-screen overflow-hidden bg-brand text-white font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-brand border-r border-white/20 flex flex-col pt-6 z-50 fixed inset-y-0 left-0 transition-transform duration-300 md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:flex`}>
        <div className="px-container-padding pt-2 pb-6 mb-2 border-b border-white/20 flex items-center justify-center gap-2 h-16 relative">
          <img alt="Ágio Agenda" className="w-auto object-contain h-[35px] rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity z-0 drop-shadow-[0_1px_2px_rgba(255,255,255,0.2)]" src="/399-agenda%20%C3%A1gio.png" onClick={() => onNavigate('main_menu')} />
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2 mt-4">
          <p className="text-label-sm text-white/60 uppercase tracking-wider mb-2 px-2">Filtros</p>
          {(['Todos', 'Trabalho', 'Pessoal', 'Urgente'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => { setActiveFilter(filter); setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === filter ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10'}`}
            >
              <span className="material-symbols-outlined text-lg">
                {filter === 'Todos' ? 'inbox' : filter === 'Trabalho' ? 'work' : filter === 'Pessoal' ? 'person' : 'warning'}
              </span>
              {filter}
            </button>
          ))}
          
          <div className="my-4 border-t border-white/20"></div>
          
          <p className="text-label-sm text-white/60 uppercase tracking-wider mb-2 px-2">Afiliados</p>
          <button
            onClick={() => { onOpenAffiliate(); setIsSidebarOpen(false); }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-white/80 hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-lg text-white">groups</span>
            Minha Rede
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-container-padding bg-brand shadow-sm shrink-0 relative">
          <div className="flex items-center gap-4 z-10">
            <button onClick={() => setIsSidebarOpen(true)} className="flex items-center hover:bg-white/10 p-1 rounded-full transition-colors md:hidden">
              <span className="material-symbols-outlined text-white">menu</span>
            </button>
            <div 
              className="relative flex items-center z-50 cursor-pointer select-none"
              onClick={(e) => {
                e.stopPropagation();
                setIsLogoMenuOpen((prev) => !prev);
              }}
            >
              <img 
                alt="Ágio Ícone" 
                className="w-[32px] h-[32px] object-contain rounded-full overflow-hidden hover:opacity-80 transition-opacity" 
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
                  <div className="absolute left-0 top-10 w-auto min-w-[220px] max-w-[280px] bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl overflow-hidden flex flex-col p-2 gap-1 z-50 text-left cursor-default" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { onNavigate('calendar'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent bg-surface-container-lowest text-primary font-bold shadow-sm cursor-pointer">
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
                    <button onClick={() => { onOpenAffiliate(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                      <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">groups</span> Minha Rede
                    </button>
                    <button onClick={() => { onOpenProfile(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
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
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 md:hidden">
            <img alt="Ágio Agenda" className="w-auto object-contain h-[33px] rounded-xl overflow-hidden" src="/2zguve2zguve2zgu.png" />
          </div>
          <div className="hidden md:block">
            <h2 className="text-title-md font-medium text-white">Painel de Eventos</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end sm:flex pr-[60px]">
                <span className="text-sm font-medium text-white/80">Olá, {(userName || 'Usuário').split(' ')[0]}</span>
                {currentUser && currentUser.plan === 'free' && getExpirationStatus(currentUser).trialDaysRemaining > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 mt-0.5 rounded bg-white/10 text-white">
                    Testando: {getExpirationStatus(currentUser).trialDaysRemaining} dias restantes
                  </span>
                )}
                {currentUser && currentUser.plan === 'premium' && currentUser.planExpiresAt && (
                  <span className={`text-[10px] px-1.5 py-0.5 mt-0.5 rounded ${getExpirationStatus(currentUser).planDaysRemaining <= 0 ? 'bg-error text-on-error' : 'bg-white/20 text-white'}`}>
                    {getExpirationStatus(currentUser).planDaysRemaining <= 0 ? 'VIP Vencido' : `VIP expira em ${getExpirationStatus(currentUser).planDaysRemaining} dias`}
                  </span>
                )}
            </div>
          </div>
        </header>

        <NavigationBar />

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-container-padding flex flex-col gap-6 px-4 md:px-8 max-w-5xl mx-auto w-full pt-4">
          
          {currentUser && currentUser.plan === 'free' && currentUser.grantedDiscount && (
            <div className="bg-gradient-to-r from-purple-900/60 via-pink-900/60 to-blue-900/60 border-2 border-[#ec4899] p-5 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.3)] flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse shrink-0">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <span className="material-symbols-outlined text-[40px] text-[#ec4899]">local_activity</span>
                <div>
                  <h4 className="font-extrabold text-white text-lg">Oferta de Desconto Concedida!</h4>
                  <p className="text-sm text-pink-200 mt-1">
                    O administrador concedeu a você um desconto especial de <strong className="text-white text-base">{currentUser.grantedDiscount.pct}% OFF</strong> nos 3 primeiros meses de assinatura!
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onOpenSubscription()}
                className="bg-[#ec4899] hover:bg-[#db2777] text-white font-extrabold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap"
              >
                Garantir Desconto
              </button>
            </div>
          )}
          


          <div className="flex justify-between items-end pt-2">
             <div>
                <h3 className="text-headline-lg font-semibold text-white">{isEs ? 'Optimización Logística' : isEn ? 'Logistics Optimization' : 'Otimização Logística'}</h3>
                <p className="text-body-md text-white/60 mt-1">{isEs ? `Sus citas ${activeFilter === 'Todos' ? 'generales' : `de ${activeFilter.toLowerCase()}`}.` : isEn ? `Your ${activeFilter === 'Todos' ? 'general' : activeFilter.toLowerCase()} appointments.` : `Seus compromissos ${activeFilter === 'Todos' ? 'gerais' : `de ${activeFilter.toLowerCase()}`}.`}</p>
             </div>
             <div className="flex items-center gap-2 mb-1 shrink-0">
               <button
                  onClick={onOptimize}
                  className="bg-white text-brand py-2.5 px-3 rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:bg-white/90 transition-opacity"
                >
                  <span className="material-symbols-outlined">route</span>
                  <span className="hidden sm:inline">{isEs ? 'Optimizar' : isEn ? 'Optimize' : 'Otimizar'}</span>
               </button>
               <button
                  onClick={onOpenModal}
                  className="bg-green-500 text-black px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm hover:bg-green-400 transition-colors"
                >
                  <span className="material-symbols-outlined">add</span>
                  <span className="hidden sm:inline">{isEs ? 'Nueva Cita' : isEn ? 'New Appointment' : 'Novo Compromisso'}</span>
               </button>
             </div>
          </div>

          {/* Agenda List */}
          <div className="w-full flex-1 flex flex-col gap-3 pb-24 md:pb-8">
            {filteredAppointments.length === 0 ? (
              <div className="p-12 text-center text-white/60 border border-dashed border-white/20 rounded-xl flex flex-col items-center gap-3">
                 <span className="material-symbols-outlined text-4xl">event_busy</span>
                 <p>{isEs ? 'Ninguna cita encontrada.' : isEn ? 'No appointments found.' : 'Nenhum compromisso encontrado.'}</p>
              </div>
            ) : (
              filteredAppointments.map(app => (
                <div key={app.id} 
                     onClick={() => onEditAppointment(app)}
                     className="bg-white/5 p-5 rounded-xl border border-white/20 shadow-sm flex items-start gap-4 transition-all hover:bg-white/10 cursor-pointer group">
                  <div className="flex flex-col items-center justify-center bg-white/10 rounded-xl p-3 min-w-[70px] text-white shadow-inner">
                    <span className="text-lg font-bold">{app.date.split('-')[2]}</span>
                    <span className="text-xs uppercase font-medium mt-1">{new Date(app.date).toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}</span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                    <h4 className="text-white font-semibold truncate text-[17px]">{app.title}</h4>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <p className="text-sm text-white/60 flex items-center gap-1.5 font-medium">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {app.time}
                      </p>
                      {app.address && (
                        <p className="text-sm text-white/60 flex items-center gap-1.5 font-medium truncate max-w-[200px]">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                          <span className="truncate">{app.address}</span>
                        </p>
                      )}
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide
                        ${app.category === 'Urgente' ? 'bg-red-500 text-white h-[fit-content]' : 
                          app.category === 'Trabalho' ? 'bg-white/10 text-white/80' : 
                          'bg-blue-500/20 text-blue-300'}`}>
                        {app.category}
                      </span>
                      {app.value ? (
                        <div className={`text-sm font-bold flex items-center gap-1 ${app.valueStatus === 'a_pagar' ? 'text-[#f87171]' : app.valueStatus === 'a_receber' ? 'text-[#60a5fa]' : app.valueStatus === 'pago' ? 'text-[#fbbf24]' : 'text-[#4ade80]'}`}>
                          <span className="material-symbols-outlined text-[16px]">payments</span> 
                          R$ {app.value.toFixed(2).replace('.', ',')}
                          <span className="font-medium text-[10px] ml-1 opacity-80 uppercase tracking-wide">
                            ({app.valueStatus === 'a_pagar' ? 'a pagar' : app.valueStatus === 'a_receber' ? 'à receber' : app.valueStatus === 'pago' ? 'pago' : 'recebido'})
                          </span>
                        </div>
                      ) : null}
                      {app.reminders && app.reminders.length > 0 && (
                        <span className="text-primary flex items-center gap-1 text-[11px] font-bold bg-primary/10 px-2 py-0.5 rounded-full" title="Lembrete ativo">
                          <span className="material-symbols-outlined text-[14px]">alarm</span>
                          {app.reminders.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-wrap sm:flex-nowrap">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenNotes(app.id); }} 
                      className={`p-2 rounded-lg transition-colors ${app.notes ? 'text-primary hover:bg-primary/10' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'}`}
                      title="Bloco de Anotações"
                    >
                      <span className="material-symbols-outlined" style={{fontVariationSettings: app.notes ? "'FILL' 1" : "'FILL' 0"}}>edit_note</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditAppointment(app); }} 
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                      title="Editar Compromisso"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleGoogleCalendar(app); }} 
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                      title="Adicionar ao Google Agenda"
                    >
                      <span className="material-symbols-outlined">event</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleWhatsAppReminder(app); }} 
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-green-600 transition-colors"
                      title="Enviar Lembrete via WhatsApp"
                    >
                      <span className="material-symbols-outlined">chat</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); shareAppointment(app); }} 
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                      title="Compartilhar Convite"
                    >
                      <span className="material-symbols-outlined">share</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteAppointment(app.id); }} 
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors"
                      title="Excluir Compromisso"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Nav (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-surface-container border-t border-white/10 flex justify-around items-center px-4 pb-6 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
          <button onClick={() => onNavigate('calendar')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            <span className="text-[10px] font-bold mt-1 tracking-wide">MÊS</span>
          </button>
          <button className="flex flex-col items-center justify-center bg-white/20 text-white rounded-xl px-4 py-1.5 transition-transform duration-150 active:scale-95 shadow-inner">
            <span className="material-symbols-outlined">list_alt</span>
            <span className="text-[10px] font-bold mt-1 tracking-wide">TAREFAS</span>
          </button>
          <button onClick={onOpenAffiliate} className="flex flex-col items-center justify-center text-[#ffccd5] px-4 py-1.5 hover:text-white transition-colors">
            <span className="material-symbols-outlined">groups</span>
            <span className="text-[10px] font-bold mt-1 tracking-wide text-center">REDE</span>
          </button>
          <button onClick={onOpenProfile} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors">
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] font-bold mt-1 tracking-wide">PERFIL</span>
          </button>
        </nav>
      </main>
    </div>
  );
}

function CalendarMobileView({
  appointments,
  onNavigate,
  onOpenModal,
  onOpenProfile,
  onOpenAffiliate,
  onOpenNotes,
  onEditAppointment,
  onDeleteAppointment,
  onDayClick,
  userName,
  currentUser,
  systemPrices,
  onUpgradeToPremium,
  onOpenSupport,
  isCurrentlyAdmin,
  isUserAdmin,
  onLogout
}: {
  appointments: Appointment[],
  onNavigate: (view: string) => void,
  onOpenModal: () => void,
  onOpenProfile: () => void,
  onOpenAffiliate: () => void,
  onOpenNotes: (id: string) => void,
  onEditAppointment: (app: Appointment) => void,
  onDeleteAppointment: (id: string) => void,
  onDayClick: (dateStr: string) => void,
  userName: string,
  currentUser?: AffiliateUser | null,
  systemPrices: { monthly: number, semiannual: number, annual: number },
  onUpgradeToPremium: () => void,
  onOpenSupport?: () => void,
  isCurrentlyAdmin?: boolean,
  isUserAdmin?: boolean,
  onLogout?: () => void
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const baseYear = new Date().getFullYear();
  const years = Array.from({length: 21}, (_, i) => baseYear - 10 + i); // 21 anos de exibição (10 antes, atual, 10 depois do base)

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();

  const prevMonthDays = Array.from({length: firstDayOfMonth}, (_, i) => daysInPrevMonth - firstDayOfMonth + i + 1);
  const currentMonthDays = Array.from({length: daysInMonth}, (_, i) => i + 1);
  
  const totalDaysSoFar = prevMonthDays.length + currentMonthDays.length;
  // Make sure we have 6 rows if necessary or just fill remainder
  // Many calendars use a fixed 42 cells (6 weeks) for layout stability
  const nextMonthDaysCount = 42 - totalDaysSoFar;
  const nextMonthDays = Array.from({length: nextMonthDaysCount}, (_, i) => i + 1);

  const monthAppointments = appointments.filter(app => {
    const [appYear, appMonth] = app.date.split('-');
    return parseInt(appYear) === currentDate.getFullYear() && parseInt(appMonth) === currentDate.getMonth() + 1;
  });

  const getMonthNamePt = (m: number) => {
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return months[m - 1] || '';
  };

  const isSearchActive = searchQuery.trim().length > 0;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredAppointments = isSearchActive
    ? appointments.filter(app => {
        if (!normalizedQuery) return true;
        if (app.title?.toLowerCase().includes(normalizedQuery)) return true;
        if (app.contact?.toLowerCase().includes(normalizedQuery)) return true;
        if (app.category?.toLowerCase().includes(normalizedQuery)) return true;
        if (app.address?.toLowerCase().includes(normalizedQuery)) return true;
        if (app.notes?.toLowerCase().includes(normalizedQuery)) return true;
        if (app.time?.toLowerCase().includes(normalizedQuery)) return true;
        if (app.date) {
          if (app.date.toLowerCase().includes(normalizedQuery)) return true;
          const [y, m, d] = app.date.split('-');
          if (y && m && d) {
            const monthNum = parseInt(m, 10);
            const dayNum = parseInt(d, 10);
            const monthName = getMonthNamePt(monthNum);
            const formattedShort = `${d}/${m}`;
            const formattedFull = `${d}/${m}/${y}`;
            const formattedText = `${dayNum} de ${monthName}`;
            if (formattedShort.includes(normalizedQuery) || formattedFull.includes(normalizedQuery) || formattedText.includes(normalizedQuery) || monthName.includes(normalizedQuery)) {
              return true;
            }
          }
        }
        return false;
      }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    : monthAppointments.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

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
                <button
                  onClick={() => { onNavigate('calendar'); setIsLogoMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">calendar_month</span>
                  Calendário
                </button>
                <button
                  onClick={() => { onNavigate('daily_agenda'); setIsLogoMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">view_day</span>
                  Agenda Diária
                </button>
                <button
                  onClick={() => { onNavigate('dashboard'); setIsLogoMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent bg-surface-container-lowest text-primary font-bold shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">dashboard</span>
                  Dashboard
                </button>
                <button
                  onClick={() => { onNavigate('accounts'); setIsLogoMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_balance_wallet</span>
                  Gestão de Contas
                </button>
                <button
                  onClick={() => { onOpenAffiliate(); setIsLogoMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">groups</span>
                  Minha Rede
                </button>
                <button
                  onClick={() => { onOpenProfile(); setIsLogoMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_circle</span>
                  Perfil
                </button>
                <button
                  onClick={() => { onOpenSupport && onOpenSupport(); setIsLogoMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">support_agent</span>
                  Ajuda & Suporte
                </button>
                {isCurrentlyAdmin && (
                  <button
                    onClick={() => { onNavigate('admin'); setIsLogoMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">admin_panel_settings</span>
                    Admin
                  </button>
                )}
                <button
                  onClick={() => { onNavigate('instructions'); setIsLogoMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">menu_book</span>
                  Instruções de uso
                </button>
                {(!currentUser || isUserAdmin) && (
                  <button
                    onClick={() => { onNavigate('landing'); setIsLogoMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">person_add</span>
                    Cadastro
                  </button>
                )}
                {onLogout && (
                  <button
                    onClick={() => { onLogout(); setIsLogoMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-red-400 hover:border-red-500 hover:bg-red-500/10 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">logout</span>
                    Sair
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('main_menu')}>
          <img alt="Ágio Agenda" className="h-[34px] w-auto rounded-xl overflow-hidden" src="/2zguve2zguve2zgu.png" />
        </div>
        <div className="w-[36px] z-10" />
      </header>

      <NavigationBar />

      <main className="flex-grow pt-4 pb-28 px-5 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Navigation */}
        <section className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="block text-sm text-white/80 font-medium">Olá, {(userName || 'Usuário').split(' ')[0]} 👋</span>
              {currentUser && currentUser.plan === 'free' && getExpirationStatus(currentUser).trialDaysRemaining > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/20 text-white">
                    Testando: {getExpirationStatus(currentUser).trialDaysRemaining} dias
                  </span>
              )}
              {currentUser && currentUser.plan === 'premium' && currentUser.planExpiresAt && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getExpirationStatus(currentUser).planDaysRemaining <= 0 ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}>
                    {getExpirationStatus(currentUser).planDaysRemaining <= 0 ? 'VIP Vencido' : `VIP exp: ${getExpirationStatus(currentUser).planDaysRemaining}d`}
                  </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-white capitalize">
                {currentDate.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' })}
              </h2>
              <select 
                value={currentDate.getFullYear()} 
                onChange={e => setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth(), 1))}
                className="bg-transparent text-2xl font-semibold text-white/80 outline-none border-b border-white/30 pb-[2px] cursor-pointer appearance-none pr-5 hover:text-white transition-colors"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '0.65rem auto' }}
              >
                {years.map(year => (
                  <option key={year} value={year} className="text-black bg-white">{year}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-white/10 text-white/80 active:scale-95 transition-all">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-white/10 text-white/80 active:scale-95 transition-all">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </section>

        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start w-full">
          <div className="w-full md:w-5/12 lg:w-1/3 flex flex-col gap-6 md:sticky top-24">
            {/* Calendar Grid */}
            <section className="bg-white/10 backdrop-blur-md rounded-xl p-4 lg:p-5 border border-white/10 shadow-lg">
          <div className="grid grid-cols-7 mb-3">
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-white/60">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1 gap-x-1">
            {prevMonthDays.map(d => (
              <div key={`prev-${d}`} className="aspect-square flex flex-col items-center justify-center text-base text-white/30">{d}</div>
            ))}
            {currentMonthDays.map(d => {
              const dayAppts = appointments.filter(a => {
                const parts = a.date.split('-');
                return parseInt(parts[0]) === currentDate.getFullYear() && 
                       parseInt(parts[1]) === currentDate.getMonth() + 1 && 
                       parseInt(parts[2]) === d;
              });

              const hasAppt = dayAppts.length > 0;
              const dayColors = Array.from(new Set(dayAppts.map(a => a.color || '#10b981')));
              
              const isToday = new Date().getFullYear() === currentDate.getFullYear() && 
                              new Date().getMonth() === currentDate.getMonth() && 
                              new Date().getDate() === d;
              
              const isVisualToday = isToday;

              return (
                <div 
                  key={d} 
                  onClick={() => onDayClick(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)}
                  className={`aspect-square flex flex-col items-center justify-center text-base cursor-pointer rounded-lg transition-all relative ${isVisualToday ? 'bg-white text-brand shadow-lg font-bold active:scale-95' : 'text-white hover:bg-white/20'}`}
                >
                  <span>{d}</span>
                  {hasAppt && (
                    <div className="flex items-center justify-center gap-1 mt-0.5 max-w-full px-1 flex-wrap">
                      {dayColors.slice(0, 4).map((colorHex, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-sm ${isVisualToday ? 'ring-1 ring-black/20' : 'ring-1 ring-white/20'}`}
                          style={{ backgroundColor: colorHex }}
                        />
                      ))}
                      {dayColors.length > 4 && (
                        <span className={`text-[8px] font-bold leading-none ${isVisualToday ? 'text-brand' : 'text-white'}`}>
                          +
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {nextMonthDays.map(d => (
              <div key={`next-${d}`} className="aspect-square flex flex-col items-center justify-center text-base text-white/30">{d}</div>
            ))}
          </div>
            </section>

            {/* Persuasive Upgrade Card */}
        {currentUser?.plan === 'free' && (
          <section className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-700/10 border border-yellow-500/50 backdrop-blur-md rounded-xl p-5 shadow-[0_0_30px_rgba(234,179,8,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
              
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <span className="material-symbols-outlined text-yellow-400 animate-pulse">workspace_premium</span>
                <h3 className="text-xl font-extrabold text-white drop-shadow-md">
                  Seu tempo é valioso.
                </h3>
              </div>
              
              <p className="text-sm text-white/90 mb-5 leading-relaxed relative z-10">
                Profissionais de alto nível não deixam a rotina ao acaso. Seu período gratuito está acabando! Garanta seu acesso vital e continue destravando o <strong>poder absoluto</strong> da sua agenda. Evite perder seu histórico.
              </p>
              
              <div className="flex flex-col gap-3 relative z-10">
                <button 
                  onClick={() => onUpgradeToPremium()}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 border border-yellow-400/50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center px-4 hover:scale-[1.02] active:scale-[0.98] shadow-lg transition-transform"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
                    <span className="text-sm uppercase tracking-widest font-black text-white drop-shadow-sm">VER MÓDULOS DISPONÍVEIS</span>
                  </div>
                </button>
                <p className="text-center text-[10px] text-white/50 mt-1 uppercase tracking-widest font-bold">
                  Acesso imediato após o pagamento
                </p>
              </div>
            </div>
              </section>
            )}
          </div>

          <div className="w-full md:w-7/12 lg:w-2/3 flex flex-col gap-6">
            {/* Events */}
            <section className="mt-0">
          <div className="flex items-center justify-between gap-3 mb-4 w-full">
            <h3 className="text-sm sm:text-lg font-semibold text-white shrink-0 whitespace-nowrap">
              {isSearchActive ? `Resultado (${filteredAppointments.length})` : 'Compromissos do Mês'}
            </h3>
            <div className="relative flex items-center flex-1 max-w-[50%] min-w-[150px]">
              <span className="material-symbols-outlined absolute left-2.5 sm:left-3 text-white/50 text-[16px] sm:text-[18px] pointer-events-none select-none" translate="no">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 text-xs sm:text-sm text-white placeholder-white/50 outline-none focus:border-white/50 focus:bg-white/20 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 sm:right-2 text-white/50 hover:text-white flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition-colors"
                  title="Limpar pesquisa"
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]" translate="no">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <div className="text-center text-white/60 p-8 border border-dashed border-white/20 rounded-xl">
                {isSearchActive ? `Nenhum compromisso encontrado para "${searchQuery}".` : 'Nenhum compromisso neste mês.'}
              </div>
            ) : (
              filteredAppointments.map(app => (
                <div key={app.id} 
                     onClick={() => onEditAppointment(app)}
                     className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 flex justify-between items-center group cursor-pointer hover:bg-white/20 transition-colors shadow-sm relative overflow-hidden"
                     style={{ borderLeftWidth: '4px', borderLeftColor: app.color || '#10b981' }}>
                  <div className="flex gap-4 items-center flex-1 min-w-0 pr-2">
                    <div className="text-center flex flex-col min-w-[50px]">
                      <span className="block text-[13px] font-semibold text-white whitespace-nowrap">
                        {app.date.split('-')[2]} {new Date(app.date).toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}
                        {app.date.split('-')[0] !== currentDate.getFullYear().toString() && ` /${app.date.split('-')[0].slice(2)}`}
                      </span>
                      <span className="block text-[11px] font-medium text-white/80 whitespace-nowrap mt-0.5">{app.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[15px] font-semibold text-white line-clamp-1">{app.title}</h4>
                      {app.contact && (
                        <p className="text-[11px] text-white/80 mt-0.5 truncate flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">person</span>
                          {app.contact}
                        </p>
                      )}
                      {app.address && (
                        <p className="text-[11px] text-white/80 mt-0.5 truncate flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {app.address}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/20 text-white uppercase tracking-wider">{app.category}</span>
                        {app.reminders && app.reminders.length > 0 && (
                          <span className="text-white flex items-center gap-1 text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded" title="Lembrete ativo">
                            <span className="material-symbols-outlined text-[12px]">alarm</span>
                            {app.reminders.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenNotes(app.id); }} 
                      className={`p-2 rounded-lg transition-colors focus:text-white ${app.notes ? 'text-white bg-white/20 hover:bg-white/30' : 'text-white/60 hover:text-white hover:bg-white/20'}`}
                      title="Bloco de Anotações"
                    >
                      <span className="material-symbols-outlined" style={{fontVariationSettings: app.notes ? "'FILL' 1" : "'FILL' 0"}}>edit_note</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditAppointment(app); }} 
                      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors focus:text-white"
                      title="Editar Compromisso"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleGoogleCalendar(app); }} 
                      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors focus:text-white"
                      title="Adicionar ao Google Agenda"
                    >
                      <span className="material-symbols-outlined">event</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleWhatsAppReminder(app); }} 
                      className="p-2 rounded-lg text-white/60 hover:text-green-400 hover:bg-white/20 transition-colors focus:text-green-400"
                      title="Enviar Lembrete via WhatsApp"
                    >
                      <span className="material-symbols-outlined">chat</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); shareAppointment(app); }} 
                      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors focus:text-white"
                      title="Compartilhar Convite"
                    >
                      <span className="material-symbols-outlined">share</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteAppointment(app.id); }} 
                      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/20 hover:text-red-400 transition-colors focus:text-red-400 -mr-2"
                      title="Excluir Compromisso"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        </div>
        </div>
      </main>

      {/* FAB */}
      <button onClick={onOpenModal} className="fixed bottom-24 right-6 w-14 h-14 bg-white text-brand rounded-full shadow-xl flex items-center justify-center z-40 active:scale-95 transition-transform hover:scale-105 border border-transparent">
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface-container border-t border-white/10 flex justify-around items-center px-4 pb-6 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
        <button className="flex flex-col items-center justify-center bg-white/20 text-white rounded-xl px-4 py-1.5 transition-transform duration-150 active:scale-95 shadow-inner">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide">MES</span>
        </button>
        <button onClick={() => onNavigate('dashboard')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors">
          <span className="material-symbols-outlined">list_alt</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide">TAREFAS</span>
        </button>
        <button onClick={onOpenAffiliate} className="flex flex-col items-center justify-center text-[#ffccd5] px-4 py-1.5 hover:text-white transition-colors">
          <span className="material-symbols-outlined">groups</span>
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

const LEAD_TIME_OPTIONS = [
  { value: '0', label: 'No evento' },
  { value: '15', label: '15 min antes' },
  { value: '30', label: '30 min antes' },
  { value: '60', label: '1 hora antes' },
  { value: '1440', label: '24 horas antes' },
];

function DailyAgendaView({
  selectedDate,
  userName,
  appointments,
  setAppointments,
  onNavigate,
  onOpenModal,
  onOpenProfile,
  onOpenAffiliate,
  onEditAppointment,
  onOpenNotes,
  onDeleteAppointment,
  currentUser,
  defaultReminders,
  setDefaultReminders,
  soundEnabled,
  setSoundEnabled,
  voiceEnabled,
  setVoiceEnabled,
  onLogout
}: {
  selectedDate: string;
  userName: string;
  appointments: Appointment[];
  setAppointments: (apps: Appointment[]) => void;
  onNavigate: (view: 'landing' | 'main_menu' | 'calendar' | 'dashboard' | 'daily_agenda' | 'admin' | 'instructions' | 'modules' | 'accounts') => void;
  onOpenModal: () => void;
  onOpenProfile: () => void;
  onOpenAffiliate: () => void;
  onEditAppointment: (app: Appointment) => void;
  onOpenNotes: (id: string) => void;
  onDeleteAppointment: (id: string) => void;
  currentUser?: AffiliateUser | null;
  defaultReminders: string[];
  setDefaultReminders: (reminders: string[]) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  onLogout?: () => void;
}) {
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [rowCount, setRowCount] = useState<number>(30);
  const [agendaSearchQuery, setAgendaSearchQuery] = useState('');

  const getMonthNamePt = useCallback((m: number) => {
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return months[m - 1] || '';
  }, []);

  const isAgendaSearchActive = agendaSearchQuery.trim().length > 0;
  const normalizedAgendaQuery = agendaSearchQuery.trim().toLowerCase();

  const searchResults = isAgendaSearchActive
    ? appointments.filter(app => {
        if (!normalizedAgendaQuery) return true;
        if (app.title?.toLowerCase().includes(normalizedAgendaQuery)) return true;
        if (app.contact?.toLowerCase().includes(normalizedAgendaQuery)) return true;
        if (app.category?.toLowerCase().includes(normalizedAgendaQuery)) return true;
        if (app.address?.toLowerCase().includes(normalizedAgendaQuery)) return true;
        if (app.notes?.toLowerCase().includes(normalizedAgendaQuery)) return true;
        if (app.time?.toLowerCase().includes(normalizedAgendaQuery)) return true;
        if (app.date) {
          if (app.date.toLowerCase().includes(normalizedAgendaQuery)) return true;
          const [y, m, d] = app.date.split('-');
          if (y && m && d) {
            const monthNum = parseInt(m, 10);
            const dayNum = parseInt(d, 10);
            const monthName = getMonthNamePt(monthNum);
            const formattedShort = `${d}/${m}`;
            const formattedFull = `${d}/${m}/${y}`;
            const formattedText = `${dayNum} de ${monthName}`;
            if (
              formattedShort.includes(normalizedAgendaQuery) ||
              formattedFull.includes(normalizedAgendaQuery) ||
              formattedText.includes(normalizedAgendaQuery) ||
              monthName.includes(normalizedAgendaQuery)
            ) {
              return true;
            }
          }
        }
        return false;
      }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    : [];

  const dayAppointments = appointments.filter(a => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));

  const totalRows = Math.min(100, Math.max(rowCount, dayAppointments.length, 30));

  // Create totalRows rows, populate the first few with existing appointments
  const rows = Array.from({length: totalRows}, (_, i) => {
    const appInfo = dayAppointments[i];
    return {
      id: i + 1,
      appId: appInfo?.id || null,
      app: appInfo || null,
      text: appInfo ? `${appInfo.time ? appInfo.time + ' - ' : ''}${appInfo.title}` : ''
    };
  });
  
  const [rowDrafts, setRowDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    setRowDrafts({});
  }, [selectedDate]);

  const handleCommitRow = useCallback((index: number) => {
    const val = rowDrafts[index];
    if (!val || val.trim() === '') return;

    const text = val.trim();
    const newApp: Appointment = {
      id: crypto.randomUUID(),
      title: text,
      date: selectedDate,
      time: `${String(8 + Math.floor(index / 2)).padStart(2, '0')}:${index % 2 === 0 ? '00' : '30'}`,
      category: 'Trabalho',
      value: 0,
      reminders: defaultReminders
    };

    setAppointments([...appointments, newApp]);
    setRowDrafts(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, [rowDrafts, selectedDate, defaultReminders, appointments, setAppointments]);

  const dateObj = new Date(selectedDate || new Date().toISOString().split('T')[0]);
  const displayDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
  const formattedDate = displayDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const currentMonthStr = selectedDate.substring(0, 7);

  // --- ALARME INTELIGENTE STATES ---
  const [alarmLeadTimes, setAlarmLeadTimes] = useState<string[]>(['0']);
  const [alarmType, setAlarmType] = useState<'text' | 'sound'>('text');
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeAlerts, setActiveAlerts] = useState<Appointment[]>([]);
  const alertTriggeredRef = useRef<Record<string, boolean>>({});

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const synthTimerRef = useRef<any>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const stopActiveAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (synthTimerRef.current) {
      clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
    setIsAudioPlaying(false);
  };

  const playAlarmSound = (audioUrl?: string | null) => {
    stopActiveAudio();
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        audio.loop = true;
        audio.play().then(() => {
          activeAudioRef.current = audio;
          setIsAudioPlaying(true);
        }).catch(err => {
          console.error("Erro ao tocar áudio personalizado:", err);
          setIsAudioPlaying(false);
        });
      } catch (e) {
        console.error(e);
        setIsAudioPlaying(false);
      }
    } else {
      // Fallback Web Audio API synthesized alarm sound loop
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const playBeep = () => {
            if (ctx.state === 'suspended') {
              ctx.resume();
            }
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          };
          playBeep();
          synthTimerRef.current = setInterval(playBeep, 1200);
          setIsAudioPlaying(true);
        }
      } catch (e) {
        console.error("Erro Web Audio API:", e);
      }
    }
  };

  const toggleLeadTime = (val: string) => {
    setAlarmLeadTimes(prev => {
      if (prev.includes(val)) {
        const next = prev.filter(v => v !== val);
        return next.length > 0 ? next : ['0'];
      } else {
        return [...prev, val];
      }
    });
  };

  // Carrega configurações iniciais do alarme
  useEffect(() => {
    import('localforage').then((localforage) => {
      localforage.default.getItem('agenda_alarm_settings').then((saved: any) => {
        if (saved) {
          if (Array.isArray(saved.alarmLeadTimes) && saved.alarmLeadTimes.length > 0) {
            setAlarmLeadTimes(saved.alarmLeadTimes);
          } else if (saved.alarmLeadTime) {
            setAlarmLeadTimes([String(saved.alarmLeadTime)]);
          }
          if (saved.alarmType) setAlarmType(saved.alarmType);
          if (saved.customAudioUrl) setCustomAudioUrl(saved.customAudioUrl);
        } else {
          // fallback
          const oldSaved = localStorage.getItem('agenda_alarm_settings');
          if (oldSaved) {
            try {
              const parsed = JSON.parse(oldSaved);
              if (Array.isArray(parsed.alarmLeadTimes) && parsed.alarmLeadTimes.length > 0) {
                setAlarmLeadTimes(parsed.alarmLeadTimes);
              } else if (parsed.alarmLeadTime) {
                setAlarmLeadTimes([String(parsed.alarmLeadTime)]);
              }
              if (parsed.alarmType) setAlarmType(parsed.alarmType);
              if (parsed.customAudioUrl) setCustomAudioUrl(parsed.customAudioUrl);
            } catch (e) {
              console.error('Erro ao ler agenda_alarm_settings', e);
            }
          }
        }
      });
    });
    
    // Solicitar permissão de notificação nativa do navegador
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Salva configurações sempre que houver alteração
  useEffect(() => {
    import('localforage').then((localforage) => {
      localforage.default.setItem('agenda_alarm_settings', {
        alarmLeadTimes,
        alarmLeadTime: alarmLeadTimes[0] || '0',
        alarmType,
        customAudioUrl
      }).catch((err) => console.error('Erro ao salvar agenda_alarm_settings no localforage', err));
    });
  }, [alarmLeadTimes, alarmType, customAudioUrl]);

  // Lógica de disparo contínuo em background (setInterval)
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      // Milissegundos desde o início do dia
      const nowMs = (now.getHours() * 60 + now.getMinutes()) * 60 * 1000 + now.getSeconds() * 1000;

      appointments.forEach(app => {
        if (app.date === selectedDate && app.time) {
          const [hours, minutes] = app.time.split(':').map(Number);
          const appTimeMs = (hours * 60 + minutes) * 60 * 1000;

          alarmLeadTimes.forEach(ltStr => {
            const leadTimeMs = parseInt(ltStr, 10) * 60 * 1000;
            const targetTimeMs = appTimeMs - leadTimeMs;

            // Dispara se a hora atual for exatamente a target time (Tolerância de 30 segundos do setInterval)
            if (nowMs >= targetTimeMs && nowMs < targetTimeMs + 30000) {
              const alertId = `${app.id}-${targetTimeMs}-${ltStr}`;
              if (!alertTriggeredRef.current[alertId]) {
                alertTriggeredRef.current[alertId] = true;

                if (alarmType === 'text') {
                  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('Ágio Agenda', { body: `Lembrete: ${app.title} às ${app.time}` });
                  }
                  setActiveAlerts(prev => [...prev, app]);
                } else if (alarmType === 'sound') {
                  playAlarmSound(customAudioUrl);
                  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('Ágio Agenda', { body: `Lembrete: ${app.title} às ${app.time}` });
                  }
                  setActiveAlerts(prev => [...prev, app]);
                }
              }
            }
          });
        }
      });
    };

    checkIntervalRef.current = setInterval(checkAlarms, 10000); // Check a cada 10 segundos
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [appointments, selectedDate, alarmLeadTimes, alarmType, customAudioUrl]);

  // Função para gravar áudio com Microfone (MediaRecorder API)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setCustomAudioUrl(reader.result as string);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Função para upload de arquivo de áudio
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setCustomAudioUrl(reader.result as string);
      };
    }
  };

  const testAlarm = () => {
    if (isAudioPlaying) {
      stopActiveAudio();
    } else if (alarmType === 'sound') {
      playAlarmSound(customAudioUrl);
    } else {
      stopActiveAudio();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Ágio Agenda - Teste', { body: 'Este é um teste de notificação do sistema.' });
      } else {
        alert("Ative as notificações do navegador para testar o alerta de texto.");
      }
    }
  };

  return (
    <div className="bg-brand text-white min-h-screen flex flex-col font-sans">
      <header className="bg-primary-container w-full top-0 z-40 sticky relative">
        <div className="flex justify-between items-center w-full px-container-padding py-stack-md">
          <div 
            className="relative flex items-center z-50 cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              setIsLogoMenuOpen((prev) => !prev);
            }}
          >
            <img 
              alt="Ágio Ícone" 
              className="w-[40px] h-[40px] object-contain rounded-full overflow-hidden hover:opacity-80 transition-opacity" 
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
                  <button onClick={() => { onNavigate('daily_agenda'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent bg-surface-container-lowest text-primary font-bold shadow-sm cursor-pointer">
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">view_day</span> Agenda Diária
                  </button>
                  <button onClick={() => { onNavigate('dashboard'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">dashboard</span> Dashboard
                  </button>
                  <button onClick={() => { onNavigate('accounts'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_balance_wallet</span> Gestão de Contas
                  </button>
                  <button onClick={() => { onOpenAffiliate(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                    <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">groups</span> Minha Rede
                  </button>
                  <button onClick={() => { onOpenProfile(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
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
            <img src="/2zguve2zguve2zgu.png" alt="Ágio Agenda" className="h-[38px] w-auto object-contain rounded-xl overflow-hidden" />
          </div>
          <div className="flex flex-col items-end gap-1 z-10">
            {currentUser && currentUser.plan === 'free' && getExpirationStatus(currentUser).trialDaysRemaining > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-white/20 text-white">
                Teste: {getExpirationStatus(currentUser).trialDaysRemaining}d
              </span>
            )}
            {currentUser && currentUser.plan === 'premium' && currentUser.planExpiresAt && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${getExpirationStatus(currentUser).planDaysRemaining <= 0 ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}>
                {getExpirationStatus(currentUser).planDaysRemaining <= 0 ? 'VIP Vencido' : `VIP exp: ${getExpirationStatus(currentUser).planDaysRemaining}d`}
              </span>
            )}
          </div>
        </div>
      </header>

      <NavigationBar />

      <main className="flex-1 px-container-padding pt-stack-lg pb-32 max-w-4xl mx-auto w-full">
        {/* Selected Date Header */}
        <div className="mb-stack-lg">
          <div className="flex items-center justify-between gap-3 sm:gap-4 border-b-2 border-white/20 pb-stack-sm">
            <div className="min-w-0 flex-1">
              <p className="text-label-sm font-label-sm text-white/70 uppercase tracking-widest cursor-pointer hover:text-white mb-1" onClick={() => onNavigate('calendar')}>
                &larr; Voltar
              </p>
              <h2 className="text-title-lg sm:text-headline-lg font-headline-lg text-white capitalize truncate">{formattedDate}</h2>
            </div>
            <div className="flex justify-end w-full max-w-[50%] shrink-0">
               <button onClick={() => onNavigate('accounts')} className="flex items-center justify-center gap-2 cursor-pointer group bg-white text-primary px-3 sm:px-5 py-2.5 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-xs sm:text-sm font-bold tracking-wide w-full">
                 <span className="material-symbols-outlined text-[18px] sm:text-[22px] shrink-0">account_balance_wallet</span>
                 <span className="whitespace-nowrap truncate">Gestão de Contas</span>
               </button>
            </div>
          </div>
        </div>

        {/* Configurações de Alerta Section */}
        <div className="mb-stack-lg bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex flex-col gap-unit">
            <div className="flex items-center gap-unit mb-4 border-b border-white/10 pb-2">
              <span className="material-symbols-outlined text-white">notifications_active</span>
              <h3 className="text-title-md font-title-md text-white">Configurações de Alerta Inteligente</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
               {/* Coluna 1: Configurações Gerais */}
               <div className="flex-1 flex flex-col gap-4">
                  {/* Seletor de Antecedência (Múltipla Seleção) */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-label-sm text-white/70 uppercase font-bold">Antecedência Padrão</label>
                      <span className="text-xs text-emerald-400 font-semibold">
                        {alarmLeadTimes.length} selecionada{alarmLeadTimes.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {LEAD_TIME_OPTIONS.map((opt) => {
                        const isSelected = alarmLeadTimes.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleLeadTime(opt.value)}
                            className={`flex-1 min-w-[120px] sm:min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-400 text-gray-950 border-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.7)] scale-[1.02] ring-2 ring-emerald-300/50'
                                : 'bg-[#091e15]/80 border-white/15 text-white/70 hover:bg-white/15 hover:text-white'
                            }`}
                          >
                            <span className={`material-symbols-outlined text-[16px] shrink-0 ${isSelected ? 'text-gray-950 font-bold' : 'text-white/40'}`}>
                              {isSelected ? 'check_circle' : 'notifications'}
                            </span>
                            <span className="whitespace-nowrap">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Seletor de Tipo de Alarme */}
                  <div className="flex flex-col gap-2">
                    <label className="text-label-sm text-white/70 uppercase">Tipo de Alarme</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" value="text" checked={alarmType === 'text'} onChange={() => setAlarmType('text')} className="text-primary bg-white/10 border-white/20 focus:ring-primary accent-primary w-4 h-4"/>
                        <span className="text-white text-sm">Apenas Texto (Aviso em tela)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" value="sound" checked={alarmType === 'sound'} onChange={() => setAlarmType('sound')} className="text-primary bg-white/10 border-white/20 focus:ring-primary accent-primary w-4 h-4"/>
                        <span className="text-white text-sm">Alerta Sonoro</span>
                      </label>
                    </div>
                  </div>
               </div>

               {/* Coluna 2: Gerenciador de Mídia (Condicional) */}
               {alarmType === 'sound' && (
                 <div className="flex-1 flex flex-col gap-4 bg-black/20 p-4 rounded-lg border border-white/10">
                    <label className="text-label-sm text-white/70 uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">library_music</span> 
                      Mídia do Alarme Sonoro
                    </label>
                    
                    <div className="flex flex-col gap-3">
                       {/* Upload de Audio */}
                       <div>
                         <label className="flex items-center gap-2 text-sm text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg cursor-pointer transition-colors w-fit border border-white/10">
                            <span className="material-symbols-outlined text-[20px]">audio_file</span>
                            Fazer Upload de Áudio
                            <input type="file" accept=".mp3, .wav, .ogg" className="hidden" onChange={handleFileUpload} />
                         </label>
                       </div>
                       
                       <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase before:flex-1 before:h-px before:bg-white/10 after:flex-1 after:h-px after:bg-white/10">OU</div>

                       {/* Gravação de Voz */}
                       <div>
                         <button 
                           onClick={isRecording ? stopRecording : startRecording}
                           className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors w-fit font-bold shadow-md ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-primary text-on-primary hover:bg-primary/90'}`}
                         >
                           <span className="material-symbols-outlined text-[20px]">{isRecording ? 'stop_circle' : 'mic'}</span>
                           {isRecording ? 'Parar Gravação' : 'Gravar Áudio de Alerta'}
                         </button>
                       </div>
                       
                       {customAudioUrl && (
                         <div className="mt-2 flex items-center gap-2 text-xs text-green-400 bg-green-900/20 px-3 py-2 rounded-lg border border-green-500/30">
                           <span className="material-symbols-outlined text-[16px]">check_circle</span>
                           Áudio configurado com sucesso.
                         </div>
                       )}
                    </div>
                 </div>
               )}
            </div>
            
            {/* Action Bar / Painel de Pré-escuta */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
               <div className="flex items-center gap-2 text-xs text-white/60">
                 {isAudioPlaying ? (
                   <span className="flex items-center gap-1.5 text-amber-300 font-bold animate-pulse">
                     <span className="material-symbols-outlined text-[18px]">volume_up</span>
                     Alerta sonoro em execução...
                   </span>
                 ) : (
                   <span className="flex items-center gap-1.5">
                     <span className="material-symbols-outlined text-[18px]">info</span>
                     Selecione múltiplos tempos de antecedência e teste o som do alerta.
                   </span>
                 )}
               </div>
               <div className="flex items-center gap-2">
                 {isAudioPlaying && (
                   <button
                     onClick={stopActiveAudio}
                     className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors text-sm font-bold border border-red-500/40 cursor-pointer"
                   >
                     <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                     Pausar Som
                   </button>
                 )}
                 <button onClick={testAlarm} className="flex items-center gap-2 px-5 py-2 rounded-full bg-surface-container-highest text-white hover:bg-white/20 transition-colors text-sm font-bold border border-white/10 shadow-sm cursor-pointer">
                   <span className="material-symbols-outlined text-[20px]">{isAudioPlaying ? 'stop_circle' : 'play_circle'}</span>
                   {isAudioPlaying ? 'Parar Teste' : 'Testar Alarme'}
                 </button>
               </div>
            </div>
          </div>
        </div>

        {/* Campo de Pesquisa - Posicionado à direita, max-w-[50%], abaixo do card de Alerta Inteligente */}
        <div className="flex justify-end mb-4 w-full">
          <div className="relative flex items-center w-full max-w-[50%] min-w-[180px] sm:min-w-[220px]">
            <span className="material-symbols-outlined absolute left-2.5 sm:left-3 text-white/50 text-[16px] sm:text-[18px] pointer-events-none select-none" translate="no">search</span>
            <input
              type="text"
              value={agendaSearchQuery}
              onChange={(e) => setAgendaSearchQuery(e.target.value)}
              placeholder="Pesquisar compromissos..."
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 text-xs sm:text-sm text-white placeholder-white/50 outline-none focus:border-white/50 focus:bg-white/20 transition-all shadow-sm"
            />
            {agendaSearchQuery && (
              <button
                onClick={() => setAgendaSearchQuery('')}
                className="absolute right-1.5 sm:right-2 text-white/50 hover:text-white flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Limpar pesquisa"
              >
                <span className="material-symbols-outlined text-[14px] sm:text-[16px]" translate="no">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Resultado da Pesquisa exibido em campo próprio logo abaixo */}
        {isAgendaSearchActive && (
          <div className="mb-6 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]" translate="no">search</span>
                Resultado da Pesquisa ({searchResults.length})
              </h3>
              <span className="text-[11px] text-white/60 hidden sm:inline">
                Compromissos anteriores, atuais e futuros
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center text-white/60 p-6 border border-dashed border-white/20 rounded-lg text-xs sm:text-sm">
                Nenhum compromisso encontrado para "{agendaSearchQuery}".
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                {searchResults.map(app => {
                  const [y, m, d] = app.date.split('-');
                  const formattedDateShort = `${d}/${m}/${y}`;
                  const isSelectedDay = app.date === selectedDate;
                  return (
                    <div 
                      key={app.id} 
                      onClick={() => onEditAppointment(app)}
                      className="bg-white/10 hover:bg-white/20 p-3 rounded-lg border border-white/10 flex justify-between items-center cursor-pointer transition-colors shadow-sm gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="text-center flex flex-col min-w-[62px] px-1.5 py-1 bg-white/15 rounded-md border border-white/10 shrink-0">
                          <span className="text-[11px] font-bold text-white">{formattedDateShort}</span>
                          <span className="text-[10px] font-medium text-white/80">{app.time}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs sm:text-sm font-bold text-white truncate">{app.title}</p>
                            {isSelectedDay && (
                              <span className="text-[9px] bg-emerald-500/30 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-400/30 shrink-0">
                                Data selecionada
                              </span>
                            )}
                          </div>
                          {app.contact && (
                            <p className="text-[11px] text-[#89e0ff] truncate flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[12px]">person</span>
                              {app.contact}
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
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditAppointment(app); }}
                          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                          title="Editar Compromisso"
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

        {/* Task List / Rows */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl overflow-hidden border border-white/10">
          <div className="divide-y divide-white/10">
            {rows.map((row, index) => (
              <div key={row.id} className="agenda-row flex items-center px-4 py-3 group transition-all duration-200 border-b border-white/5 hover:bg-white/5 focus-within:bg-white/10 min-h-[60px]">
                <span className="text-label-sm font-label-sm text-white/50 w-8 flex-shrink-0 self-start mt-2">{row.id.toString().padStart(2, '0')}</span>
                {row.app ? (
                  <div className="flex-1 flex flex-col cursor-pointer pl-2" onClick={() => onEditAppointment(row.app!)}>
                    <div className="flex items-center gap-2">
                       <span className="text-body-md font-bold text-white">{row.app.time}</span>
                       <span className="text-body-md text-white font-medium">{row.app.title}</span>
                    </div>
                    {row.app.contact && (
                       <a href={`https://wa.me/${row.app.contact.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[#89e0ff] hover:underline mt-1" onClick={e => e.stopPropagation()}>
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                          {row.app.contact}
                       </a>
                    )}
                    {row.app.address && (
                       <div className="flex items-center gap-1 text-sm text-white/60 mt-0.5">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                          {row.app.address}
                       </div>
                    )}
                    {row.app.value ? (
                       <div className={`flex items-center gap-1 text-sm font-bold mt-0.5 ${row.app.valueStatus === 'a_pagar' ? 'text-[#f87171]' : row.app.valueStatus === 'a_receber' ? 'text-[#60a5fa]' : row.app.valueStatus === 'pago' ? 'text-[#fbbf24]' : 'text-[#4ade80]'}`}>
                          <span className="material-symbols-outlined text-[16px]">payments</span>
                          R$ {row.app.value.toFixed(2).replace('.', ',')}
                          <span className="font-medium text-xs ml-1 opacity-80">
                            ({row.app.valueStatus === 'a_pagar' ? 'A Pagar' : row.app.valueStatus === 'a_receber' ? 'À Receber' : row.app.valueStatus === 'pago' ? 'Pago' : 'Recebido'})
                          </span>
                       </div>
                    ) : null}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Adicionar tarefa ou compromisso..." 
                    className="flex-1 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/10 focus:border-white/30 outline-none focus:ring-1 focus:ring-white/30 text-body-md font-body-md text-white placeholder:text-white/50 placeholder:font-light ml-2 px-4 py-2.5 rounded-lg transition-all shadow-inner"
                    value={rowDrafts[index] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRowDrafts(prev => ({ ...prev, [index]: val }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCommitRow(index);
                      }
                    }}
                    onBlur={() => {
                      handleCommitRow(index);
                    }}
                  />
                )}
                {row.app && (
                  <div className="flex shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenNotes(row.app!.id); }} 
                      className={`p-2 rounded-lg transition-colors focus:text-white ${row.app!.notes ? 'text-white bg-white/20 hover:bg-white/30' : 'text-white/60 hover:text-white hover:bg-white/20'}`}
                      title="Bloco de Anotações"
                    >
                      <span className="material-symbols-outlined" style={{fontVariationSettings: row.app!.notes ? "'FILL' 1" : "'FILL' 0"}}>edit_note</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleGoogleCalendar(row.app!); }} 
                      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors focus:text-white"
                      title="Adicionar ao Google Agenda"
                    >
                      <span className="material-symbols-outlined">event</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleWhatsAppReminder(row.app!); }} 
                      className="p-2 rounded-lg text-white/60 hover:text-green-400 hover:bg-white/20 transition-colors focus:text-green-400"
                      title="Enviar Lembrete via WhatsApp"
                    >
                      <span className="material-symbols-outlined">chat</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); shareAppointment(row.app!); }} 
                      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors focus:text-white"
                      title="Compartilhar Convite"
                    >
                      <span className="material-symbols-outlined">share</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditAppointment(row.app!); }} 
                      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors focus:text-white"
                      title="Editar Compromisso"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteAppointment(row.app!.id); }} 
                      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/20 hover:text-red-400 transition-colors focus:text-red-400 -mr-2"
                      title="Excluir Compromisso"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                )}
                {!row.app && (
                  <span className="material-symbols-outlined opacity-100 md:opacity-0 md:group-hover:opacity-100 text-white/60 cursor-pointer hover:text-white transition-opacity">more_vert</span>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/5">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              <span>Exibindo <strong>{totalRows}</strong> de <strong>100</strong> linhas ({dayAppointments.length} compromissos agendados)</span>
            </div>
            <div className="flex items-center gap-2">
              {totalRows < 100 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setRowCount(prev => Math.min(100, Math.max(prev, totalRows) + 5))}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    +5 Linhas
                  </button>
                  <button
                    type="button"
                    onClick={() => setRowCount(prev => Math.min(100, Math.max(prev, totalRows) + 10))}
                    className="px-3 py-1.5 bg-primary text-on-primary hover:opacity-90 active:scale-95 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    +10 Linhas
                  </button>
                </>
              ) : (
                <span className="text-xs text-amber-300 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  Limite máximo de 100 linhas atingido
                </span>
              )}
            </div>
          </div>
        </div>
      </main>

      <button onClick={onOpenModal} className="fixed bottom-28 right-6 w-14 h-14 bg-white text-primary-container rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform z-50">
        <span className="material-symbols-outlined text-3xl font-bold">add</span>
      </button>

      {/* Modal de Alerta Ativo */}
      {activeAlerts.length > 0 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#091e15] border border-primary/50 w-full max-w-md rounded-2xl shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3 text-primary">
                <span className="material-symbols-outlined text-[32px] animate-bounce">alarm</span>
                <h2 className="text-2xl font-bold text-white">Lembrete Ativo!</h2>
              </div>
              {isAudioPlaying && (
                <button
                  onClick={stopActiveAudio}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 rounded-full text-xs font-bold transition-all animate-pulse cursor-pointer"
                  title="Pausar Som"
                >
                  <span className="material-symbols-outlined text-[16px]">volume_off</span>
                  <span>Pausar Som</span>
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-6">
              {activeAlerts.map((alert, idx) => (
                <div key={`${alert.id}-${idx}`} className="bg-white/10 p-4 rounded-xl border border-white/20">
                  <p className="text-xl font-semibold text-white">{alert.title}</p>
                  <p className="text-primary font-medium mt-1">Horário: {alert.time}</p>
                  {alert.contact && <p className="text-sm text-white/60 mt-1">Contato: {alert.contact}</p>}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5 mt-auto">
              {isAudioPlaying && (
                <button
                  onClick={stopActiveAudio}
                  className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">pause_circle</span>
                  Pausar Alarme Sonoro
                </button>
              )}
              <button 
                onClick={() => {
                  stopActiveAudio();
                  setActiveAlerts([]);
                }}
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Ciente (Fechar Alerta)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface-container border-t border-white/10 flex justify-around items-center px-4 pb-6 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
        <button onClick={() => onNavigate('calendar')} className="flex flex-col items-center justify-center bg-white/20 text-white rounded-xl px-4 py-1.5 transition-transform duration-150 active:scale-95 shadow-inner">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide">MÊS</span>
        </button>
        <button onClick={() => onNavigate('dashboard')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1.5 hover:text-white transition-colors">
          <span className="material-symbols-outlined">list_alt</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide">TAREFAS</span>
        </button>
        <button className="flex flex-col items-center justify-center text-brand bg-white px-4 py-1.5 hover:bg-white/90 rounded-xl transition-colors">
          <span className="material-symbols-outlined">today</span>
          <span className="text-[10px] font-bold mt-1 tracking-wide text-center">DIA</span>
        </button>
        <button onClick={onOpenAffiliate} className="flex flex-col items-center justify-center text-[#ffccd5] px-4 py-1.5 hover:text-white transition-colors">
          <span className="material-symbols-outlined">groups</span>
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
  hasUsedFreeTrial?: boolean;
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

function base64urlToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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

  const now = new Date();
  const createdDate = new Date(user.createdAt || new Date());
  const trialDays = user.freeTrialDays ?? 40;
  const trialEnd = new Date(createdDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const trialDiff = trialEnd.getTime() - now.getTime();
  const trialDaysRemaining = Math.max(0, Math.ceil(trialDiff / (1000 * 60 * 60 * 24)));
  const daysSinceTrialExpiration = trialDiff < 0 ? Math.ceil(-trialDiff / (1000 * 60 * 60 * 24)) : 0;

  let planDaysRemaining = -1;
  let planExpired = false;
  if (user.plan === 'premium' && user.planExpiresAt) {
    const planEnd = new Date(user.planExpiresAt);
    const planDiff = planEnd.getTime() - now.getTime();
    planDaysRemaining = Math.max(0, Math.ceil(planDiff / (1000 * 60 * 60 * 24)));
    planExpired = planDiff <= 0;
  }
  
  return { trialDaysRemaining, planDaysRemaining, planExpired, daysSinceTrialExpiration };
}

import { useAccessTracker } from "./useAccessTracker";

export default function AgendaApp() {

  const [adminEnvMode, setAdminEnvMode] = useState<'admin' | 'user'>('admin');
  const [currentLang, setCurrentLang] = useState<string>('pt');
  const isEs = currentLang === 'es';
  const isEn = currentLang === 'en';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
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
        setCurrentLang(customEvent.detail);
      } else {
        setCurrentLang(getSavedLang());
      }
    };

    setCurrentLang(getSavedLang());
    window.addEventListener('appLanguageChanged', handleLangChange);

    const interval = setInterval(() => {
      const l = getSavedLang();
      setCurrentLang(prev => {
        if (prev !== l) return l;
        return prev;
      });
    }, 1000);

    return () => {
      window.removeEventListener('appLanguageChanged', handleLangChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_env_mode') as 'admin' | 'user';
      if (saved) setAdminEnvMode(saved);
    }
  }, []);
  const [view, setActualView] = useState<string>('landing');
  const [viewHistory, setViewHistory] = useState<string[]>(['landing']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const setView = (newView: 'landing' | 'main_menu' | 'calendar' | 'dashboard' | 'daily_agenda' | 'admin' | 'instructions' | string | any) => {
    if (currentUser) {
      const expStatus = getExpirationStatus(currentUser);
      const isAccessExpired = (currentUser.plan === 'free' && expStatus.trialDaysRemaining <= 0) || (currentUser.plan === 'premium' && expStatus.planExpired);
      const isAdmin = isUserAdmin && adminEnvMode === 'admin';
      const restrictedViews = ['calendar', 'dashboard', 'daily_agenda', 'accounts', 'instructions'];

      if (!isAdmin && isAccessExpired) {
        if (currentUser.isAffiliate) {
          if (restrictedViews.includes(newView)) {
            setIsAffiliateExpirationModalOpen(true);
            return;
          }
        } else {
          if (restrictedViews.includes(newView)) {
            setIsExpirationModalOpen(true);
            return;
          }
        }
      }
      
      if (!isAdmin && newView === 'admin') {
         alert('Acesso negado.');
         return;
      }
    }
    
    if (viewHistory[historyIndex] === newView) return;
    const newHist = viewHistory.slice(0, historyIndex + 1);
    newHist.push(newView);
    setViewHistory(newHist);
    setHistoryIndex(newHist.length - 1);
    setActualView(newView);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setActualView(viewHistory[newIdx] as any);
    }
  };

  const handleForward = () => {
    if (historyIndex < viewHistory.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setActualView(viewHistory[newIdx] as any);
    }
  };

  useEffect(() => {
    const onBack = () => handleBack();
    const onForward = () => handleForward();
    window.addEventListener('history_back', onBack);
    window.addEventListener('history_forward', onForward);
    return () => {
      window.removeEventListener('history_back', onBack);
      window.removeEventListener('history_forward', onForward);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, viewHistory]);

  


  const initFormDate = new Date();
  const [selectedDateFilter, setSelectedDateFilter] = useState(`${initFormDate.getFullYear()}-${String(initFormDate.getMonth() + 1).padStart(2, '0')}-${String(initFormDate.getDate()).padStart(2, '0')}`);
  const [userName, setUserName] = useState('Usuário');
  const [userWhatsapp, setUserWhatsapp] = useState('');
  const [currentUser, setCurrentUser] = useState<AffiliateUser | null>(null);
  useAccessTracker(currentUser);

  const handleLogout = async () => {
    try {
      await signOutAuth();
    } catch(e) {}
    setCurrentUser(null); setAppointments([]); setView('landing');
  };


  useEffect(() => {
    if (!currentUser) return;
    
    const resetActivity = () => {
      localStorage.setItem('agenda_last_activity', Date.now().toString());
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('click', resetActivity);
    window.addEventListener('scroll', resetActivity);

    const checkTimeout = setInterval(() => {
      const lastActivity = parseInt(localStorage.getItem('agenda_last_activity') || '0');
      if (lastActivity && Date.now() - lastActivity > 10 * 60 * 1000) {
        alert("Sessão expirada por inatividade (10 minutos).");
        handleLogout();
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('click', resetActivity);
      window.removeEventListener('scroll', resetActivity);
      clearInterval(checkTimeout);
    };
  }, [currentUser]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRes = await fetch(`/api/users?firebaseUid=${firebaseUser.uid}`);
          if (userRes.ok) {
            const dbUser = await userRes.json();
            const isDalecioAdmin = 
              (dbUser?.email && dbUser.email.toLowerCase().trim() === 'agiotech.oficial@gmail.com') ||
              (firebaseUser.email && firebaseUser.email.toLowerCase().trim() === 'agiotech.oficial@gmail.com') ||
              (dbUser?.cpf && dbUser.cpf.replace(/\D/g, '') === '10896050726') ||
              (dbUser?.name && (dbUser.name.toUpperCase().includes('DALÉCIO') || dbUser.name.toUpperCase().includes('DALECIO')));

            const resolvedUser = {
              id: (dbUser?.id ?? dbUser?.firebaseUid ?? firebaseUser?.uid ?? Math.random()).toString(),
              name: dbUser?.name || (isDalecioAdmin ? "Dalécio L. Macedo" : (firebaseUser.displayName || "Usuário")),
              whatsapp: dbUser?.whatsapp || "",
              email: dbUser?.email || firebaseUser.email || (isDalecioAdmin ? "agiotech.oficial@gmail.com" : ""),
              cpf: dbUser?.cpf || (isDalecioAdmin ? "10896050726" : ""),
              city: dbUser?.city || "",
              state: dbUser?.state || "",
              country: dbUser?.country || "",
              plan: dbUser?.plan || (isDalecioAdmin ? "premium" : "free"),
              createdAt: dbUser?.createdAt || new Date().toISOString(),
              firebaseUid: firebaseUser.uid,
              mfaEnabled: Boolean(dbUser?.mfaEnabled),
              totpEnabled: Boolean(dbUser?.totpEnabled),
              totpSecret: dbUser?.totpSecret || "",
              webAuthnEnabled: Boolean(dbUser?.webAuthnEnabled),
              webAuthnCredentialId: dbUser?.webAuthnCredentialId || "",
              themeColor: dbUser?.themeColor || "",
              themeBg: dbUser?.themeBg || "",
              age: dbUser?.age || "",
              gender: dbUser?.gender || "",
              profession: dbUser?.profession || "",
              pixKey: dbUser?.pixKey || "",
              language: dbUser?.language || "pt-BR",
              soundEnabled: dbUser?.soundEnabled,
              voiceEnabled: dbUser?.voiceEnabled,
              mfaPin: dbUser?.mfaPin || "",
              visualEdits: dbUser?.visualEdits || ""
            };

            setCurrentUser(resolvedUser as any);
            setUserName(resolvedUser.name);
            setUserWhatsapp(resolvedUser.whatsapp);
            
            // Apply configurations from central database
            if (dbUser?.themeColor) setAppColor(dbUser.themeColor);
            if (dbUser?.themeBg) setAppBgImage(dbUser.themeBg);
            if (dbUser?.soundEnabled !== null && dbUser?.soundEnabled !== undefined) setSoundEnabled(dbUser.soundEnabled);
            if (dbUser?.voiceEnabled !== null && dbUser?.voiceEnabled !== undefined) setVoiceEnabled(dbUser.voiceEnabled);
            if (dbUser?.visualEdits) {
              try {
                setVisualEdits(JSON.parse(dbUser.visualEdits));
              } catch (e) {
                console.error("Erro ao carregar visualEdits", e);
              }
            }
            
            const appsRes = await fetch(`/api/appointments?userId=${firebaseUser.uid}`);
            if (appsRes.ok) {
               const appsData = await appsRes.json();
               if (Array.isArray(appsData)) {
                 setAppointments(appsData.map((a: any) => ({ ...a, id: (a?.id ?? a?._id ?? Math.random()).toString() })));
               }
            }
            
            if (view === 'landing') setView('main_menu');
          }
        } catch(e) {
          console.error("Error restoring session", e);
        }
      }
    });
    return () => unsubscribe();
  }, [view]); // Add view dependency to re-eval if needed

  const isUserAdmin = (currentUser && (
    currentUser.name?.toUpperCase().includes('DALÉCIO') || 
    currentUser.name?.toUpperCase().includes('DALECIO') || 
    currentUser.cpf?.replace(/\D/g, '') === '10896050726' ||
    currentUser.email?.toLowerCase().trim() === 'agiotech.oficial@gmail.com'
  )) || userName?.toUpperCase().includes('DALÉCIO') || userName?.toUpperCase().includes('DALECIO') || false;
  const isCurrentlyAdmin = isUserAdmin && adminEnvMode === 'admin';

  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const initDate = new Date();
  const initDateStr = `${initDate.getFullYear()}-${String(initDate.getMonth() + 1).padStart(2, '0')}-${String(initDate.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    trackEvent('navigation', `Acessou a tela: ${view}`, currentUser);
  }, [view, currentUser]);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      let text = target.innerText?.slice(0, 50) || target.title || target.id;
      if (!text && target.closest('button')) {
        text = (target.closest('button') as HTMLElement).innerText?.slice(0, 50);
      }
      if (text && text.trim().length > 0) {
        trackEvent('click', `Clicou em: ${text.trim().replace(/\\n/g, ' ')}`, currentUser);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [currentUser]);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [optimizationAlert, setOptimizationAlert] = useState<{type: 'conflict' | 'proximity', message: string, dataParams: any} | null>(null);
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState(false);
  const [ setIsSubscriptionModalOpen] = useState(false);
  const [isExpirationModalOpen, setIsExpirationModalOpen] = useState(false);
  const [isAffiliateExpirationModalOpen, setIsAffiliateExpirationModalOpen] = useState(false);
  
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [pendingLoginUser, setPendingLoginUser] = useState<{name: string, whatsapp: string, isAffiliateOptIn?: boolean, email?: string, cpf?: string, city?: string, state?: string, country?: string, userFound: AffiliateUser | null} | null>(null);

  const [pendingGoogleUser, setPendingGoogleUser] = useState<{name: string, email: string, isAffiliateOptIn?: boolean} | null>(null);
  const [authError, setAuthError] = useState<{ code: string; message: string; hostname?: string } | null>(null);

  const [is2FASetupModalOpen, setIs2FASetupModalOpen] = useState(false);
  const [setup2FASecret, setSetup2FASecret] = useState('');
  const [setup2FAQrCode, setSetup2FAQrCode] = useState('');
  const [setup2FAToken, setSetup2FAToken] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [systemPrices, setSystemPrices] = useState(() => {
    if (typeof window !== 'undefined') {
      const settingsStr = localStorage.getItem('agenda_settings');
      if (settingsStr) {
        try {
          const s = JSON.parse(settingsStr);
          return {
            monthly: s.monthlyPrice || 9.90,
            semiannual: (s.semiannualPrice && s.semiannualPrice !== 152.49) ? s.semiannualPrice : 101.95,
            annual: s.annualPrice || 97.00
          };
        } catch (e) {}
      }
    }
    return { monthly: 9.90, semiannual: 101.95, annual: 97.00 };
  });
  const [systemModules, setSystemModules] = useState(() => {
    let initialPrice = 9.90;
    if (typeof window !== 'undefined') {
      const settingsStr = localStorage.getItem('agenda_settings');
      if (settingsStr) {
        try {
          const s = JSON.parse(settingsStr);
          if (s.monthlyPrice) {
            initialPrice = parseFloat(s.monthlyPrice);
          }
        } catch (e) {}
      }
    }
    return [
      { id: 'agenda', name: 'Módulo Agenda', price: initialPrice, description: 'Lembretes, IA e agendamentos.', icon: 'calendar_month', isHighlight: true }
    ];
  });
  const [selectedModulesIds, setSelectedModulesIds] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{code: string, pct: number} | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<{name: string, price: number, originalPrice?: number, type: 'monthly' | 'semiannual' | 'annual' | 'extra_device', months?: number} | null>(null);
  const [mpConfig, setMpConfig] = useState({ publicKey: '', accessToken: '' });
  const [appColor, setAppColor] = useState('#263E2A');
  const [appBgImage, setAppBgImage] = useState('');
  const [defaultReminders, setDefaultReminders] = useState<string[]>(['15m']);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [directCommissionPct, setDirectCommissionPct] = useState('20%');
  const [indirectCommissionPct, setIndirectCommissionPct] = useState('10%');
  const [directCommissionMonths, setDirectCommissionMonths] = useState(12);
  const [indirectCommissionMonths, setIndirectCommissionMonths] = useState(12);
  const [automaticCommissionPayment, setAutomaticCommissionPayment] = useState(false);
  const [affiliateSpotsOpen, setAffiliateSpotsOpen] = useState(true);
  
  const [isVisualEditorActive, setIsVisualEditorActive] = useState(false);
  const [visualEdits, setVisualEdits] = useState<Record<string, any>>({});
  const [visualEditorTarget, setVisualEditorTarget] = useState<any>(null);
  const [visualUndoStack, setVisualUndoStack] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    // Force Google Translate to re-translate newly rendered views/menus
    setTimeout(() => {
      try {
        let lang = typeof localStorage !== 'undefined' ? localStorage.getItem('user_language') : null;
        if (!lang) {
          const decodedCookie = decodeURIComponent(document.cookie);
          const cookie = decodedCookie.match(/googtrans=\/pt\/([a-z]{2})/);
          if (cookie && cookie[1]) lang = cookie[1];
        }

        if (lang && lang !== 'pt') {
          const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
          if (select) {
            if (select.value !== lang) {
              select.value = lang;
              select.dispatchEvent(new Event('change'));
            }
          }
        }
      } catch (e) {
        console.error('Error triggering translation update', e);
      }
    }, 300);
  }, [view, currentUser, isHamburgerOpen, isSupportModalOpen, isModalOpen, isOptimizationModalOpen,  isExpirationModalOpen, isTwoFactorModalOpen, is2FASetupModalOpen]);

  useEffect(() => {
    const loaded = localStorage.getItem('agenda_visual_edits');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loaded) setVisualEdits(JSON.parse(loaded));
  }, []);

  useEffect(() => {
    if (Object.keys(visualEdits).length > 0) {
      localStorage.setItem('agenda_visual_edits', JSON.stringify(visualEdits));
      if (currentUser && currentUser.visualEdits !== JSON.stringify(visualEdits)) {
        handleUpdateUserData({ visualEdits: JSON.stringify(visualEdits) });
      }
    }
  }, [visualEdits, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const soundDiff = currentUser.soundEnabled !== soundEnabled;
      const voiceDiff = currentUser.voiceEnabled !== voiceEnabled;
      if (soundDiff || voiceDiff) {
        handleUpdateUserData({ soundEnabled, voiceEnabled });
      }
    }
  }, [soundEnabled, voiceEnabled, currentUser]);

  const getElementCssSelector = (el: HTMLElement) => {
    const path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE && current.tagName.toLowerCase() !== 'body' && current.tagName.toLowerCase() !== 'html') {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        selector += `:nth-of-type(${index})`;
      }
      path.unshift(selector);
      current = current.parentElement!;
    }
    return path.join(' > ');
  };

  useEffect(() => {
    if (!isVisualEditorActive) {
      document.body.style.cursor = '';
      return;
    }
    
    document.body.style.cursor = 'crosshair';

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target.closest('#visual-editor-toolbar')) return;
      target.style.outline = '2px dashed #ec4899';
    };
    
    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target.closest('#visual-editor-toolbar')) return;
      target.style.outline = '';
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target.closest('#visual-editor-toolbar')) return;
      e.preventDefault();
      e.stopPropagation();
      
      target.style.outline = '';
      const selector = getElementCssSelector(target);
      const computed = window.getComputedStyle(target);
      
      setVisualEditorTarget({
        selector,
        element: target,
        tagName: target.tagName,
        text: target.childNodes.length === 1 && target.firstChild?.nodeType === Node.TEXT_NODE ? target.innerText : '',
        current: {
           color: computed.color,
           fontSize: computed.fontSize,
           fontWeight: computed.fontWeight,
           fontFamily: computed.fontFamily,
           background: computed.background,
        }
      });
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, [isVisualEditorActive]);

  useEffect(() => {
    let styleEl = document.getElementById('visual-editor-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'visual-editor-styles';
      document.head.appendChild(styleEl);
    }
    
    const cssRules = Object.entries(visualEdits).map(([selector, edit]) => {
      const rules = [];
      if (edit.color) rules.push(`color: ${edit.color} !important;`);
      if (edit.fontSize) rules.push(`font-size: ${edit.fontSize} !important;`);
      if (edit.fontWeight) rules.push(`font-weight: ${edit.fontWeight} !important;`);
      if (edit.fontFamily) rules.push(`font-family: ${edit.fontFamily} !important;`);
      if (edit.background) rules.push(`background: ${edit.background} !important;`);
      if (edit.backgroundClip) {
         rules.push(`background-clip: ${edit.backgroundClip} !important;`);
         rules.push(`-webkit-background-clip: ${edit.backgroundClip} !important;`);
         rules.push(`text-fill-color: transparent !important;`);
         rules.push(`-webkit-text-fill-color: transparent !important;`);
      }
      if (rules.length === 0) return '';
      return `${selector} { ${rules.join(' ')} }`;
    }).join('\
');
    
    styleEl.innerHTML = cssRules;

    const observer = new MutationObserver(() => {
       Object.entries(visualEdits).forEach(([selector, edit]) => {
          if (edit.text) {
             const el = document.querySelector(selector) as HTMLElement;
             if (el && el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE && el.innerText !== edit.text) {
                el.innerText = edit.text;
             }
          }
       });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    
    // Initial apply
    Object.entries(visualEdits).forEach(([selector, edit]) => {
      if (edit.text) {
         const el = document.querySelector(selector) as HTMLElement;
         if (el && el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE && el.innerText !== edit.text) {
            el.innerText = edit.text;
         }
      }
    });

    return () => observer.disconnect();
  }, [visualEdits]);

  useEffect(() => {
    if (currentUser) {
      const storedUsers = JSON.parse(localStorage.getItem('agenda_users') || '[]');
      const dbUser = storedUsers.find((u: any) => u.id === currentUser.id);
      if (dbUser && dbUser.grantedDiscount) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAppliedDiscount({
          code: `OFERTA_ADMIN_${dbUser.grantedDiscount.pct}`,
          pct: dbUser.grantedDiscount.pct
        });
      }
    }
  }, [ currentUser]);

  const handleUpdateUserData = async (changes: Partial<AffiliateUser>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...changes };
    setCurrentUser(updatedUser);
    
    let storedUsers: AffiliateUser[] = JSON.parse(localStorage.getItem('agenda_users') || '[]');
    const index = storedUsers.findIndex(u => u.id === currentUser.id);
    if (index !== -1) {
      storedUsers[index] = updatedUser;
      localStorage.setItem('agenda_users', JSON.stringify(storedUsers));
    }

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: currentUser.firebaseUid,
          ...changes
        })
      });
    } catch (e) {
      console.error("Erro ao sincronizar dados com o banco central:", e);
    }
  };

  // eslint-disable-next-line react-hooks/preserve-manual-memoization, react-hooks/exhaustive-deps
  const loadSettings = useCallback(async () => {
    // 1. Check local storage first for immediate render
    let settingsStr = localStorage.getItem('agenda_settings');
    let settings: any = settingsStr ? JSON.parse(settingsStr) : {};
    
    const applySettings = (s: any) => {
      if (s.appColor) setAppColor(s.appColor);
      if (s.appBgImage) setAppBgImage(s.appBgImage);
      const newMonthlyPrice = s.monthlyPrice || 9.90;
      setSystemPrices({
         monthly: newMonthlyPrice,
         semiannual: (s.semiannualPrice && s.semiannualPrice !== 152.49) ? s.semiannualPrice : 101.95,
         annual: s.annualPrice || 97.00
      });
      setSystemModules([
         { id: 'agenda', name: 'Módulo Agenda', price: newMonthlyPrice, description: 'Lembretes, IA e agendamentos.', icon: 'calendar_month', isHighlight: true }
      ]);
      if (s.mpPublicKey && s.mpAccessToken) {
         setMpConfig({ publicKey: s.mpPublicKey, accessToken: s.mpAccessToken });
         safeInitMercadoPago(s.mpPublicKey);
      }
      if (s.defaultReminders) setDefaultReminders(s.defaultReminders);
      if (typeof s.soundEnabled === 'boolean') setSoundEnabled(s.soundEnabled);
      if (typeof s.voiceEnabled === 'boolean') setVoiceEnabled(s.voiceEnabled);
      if (s.directCommissionPct) setDirectCommissionPct(s.directCommissionPct);
      if (s.indirectCommissionPct) setIndirectCommissionPct(s.indirectCommissionPct);
      if (s.directCommissionMonths) setDirectCommissionMonths(parseInt(s.directCommissionMonths));
      if (s.indirectCommissionMonths) setIndirectCommissionMonths(parseInt(s.indirectCommissionMonths));
      if (s.automaticCommissionPayment !== undefined) setAutomaticCommissionPayment(s.automaticCommissionPayment);
      if (s.affiliateSpotsOpen !== undefined) setAffiliateSpotsOpen(s.affiliateSpotsOpen);
    };

    if (Object.keys(settings).length > 0) {
      applySettings(settings);
    }

    // 2. Fetch from Firestore to sync updates
    if (typeof window !== 'undefined') {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const docSnap = await getDoc(doc(db, 'app_settings', 'config'));
        if (docSnap.exists()) {
          const fsSettings = docSnap.data();
          // Merge with local settings preferences (like soundEnabled) that might be local only
          const mergedSettings = { ...settings, ...fsSettings };
          localStorage.setItem('agenda_settings', JSON.stringify(mergedSettings));
          applySettings(mergedSettings);
          settings = mergedSettings; // update for next step
        }
      } catch (e: any) {
        console.warn("Could not fetch settings from Firestore (using local fallbacks):", e?.message || e);
      }
    }

    // 3. Fetch environment defaults as fallback if local/Firestore settings are missing or incomplete
    if (typeof window !== 'undefined') {
      fetch('/api/payments')
        .then(res => res.json())
        .then(data => {
          if (data.publicKey || data.hasAccessToken) {
            setMpConfig(prev => {
              const finalPublicKey = prev.publicKey || data.publicKey || '';
              const finalAccessToken = prev.accessToken || (data.hasAccessToken ? 'env_token' : '');
              
              if (finalPublicKey && !prev.publicKey) {
                safeInitMercadoPago(finalPublicKey);
              }
              return { publicKey: finalPublicKey, accessToken: finalAccessToken };
            });
          }
        }).catch(err => console.warn("Error fetching payment env fallback:", err));
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  const [selectedAppointmentForNotes, setSelectedAppointmentForNotes] = useState<string | null>(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesDisplayMode, setNotesDisplayMode] = useState<'iframe' | 'direct'>('iframe');
  const [showEmbeddedIframe, setShowEmbeddedIframe] = useState(false);
  const [isDocsSyncing, setIsDocsSyncing] = useState(false);
  const [currentDocUrl, setCurrentDocUrl] = useState<string | null>(null);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [docsSyncStatus, setDocsSyncStatus] = useState<string | null>(null);

  const isRealGoogleDoc = Boolean(
    currentDocId && 
    !currentDocId.startsWith('agio_doc_') && 
    !currentDocId.startsWith('doc_') && 
    currentDocId.length > 15
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pixData, setPixData] = useState<{ qr_code_base64: string, qr_code: string, payment_id: string | number } | null>(null);
  const [isPixLoading, setIsPixLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'pix' | 'credit_card' | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallPromptOpen, setIsInstallPromptOpen] = useState(false);
  const [osName, setOsName] = useState('');

  const isAnyModalActive = 
    isModalOpen ||
    isOptimizationModalOpen ||
    isExpirationModalOpen ||
    isAffiliateExpirationModalOpen ||
    isTwoFactorModalOpen ||
    is2FASetupModalOpen ||
    isSupportModalOpen ||
    !!selectedAppointmentForNotes ||
    isInstallPromptOpen ||
    isHamburgerOpen;

  useEffect(() => {
    if (isAnyModalActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalActive]);

  // Handle Mercado Pago redirect status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const userId = urlParams.get('userId');
      const planType = urlParams.get('plan') || 'monthly'; // 'monthly' ou 'annual'
      const planMonths = parseInt(urlParams.get('months') || '1', 10);

      if (paymentStatus === 'success' && userId) {
        let storedUsers: AffiliateUser[] = JSON.parse(localStorage.getItem('agenda_users') || '[]');
        const userIndex = storedUsers.findIndex(u => u.id === userId);
        
        if (userIndex !== -1 && storedUsers[userIndex].plan !== 'premium') {
          storedUsers[userIndex].plan = 'premium';
          
          const now = new Date();
          const expireDays = planType === 'annual' ? 365 : 30 * planMonths;
          now.setDate(now.getDate() + expireDays);
          storedUsers[userIndex].planExpiresAt = now.toISOString();

          // Distribute commissions
          const PLAN_PRICE = planType === 'annual' ? 97.00 : 9.90 * planMonths * (1 - (planMonths - 1) * 0.02);
          const directPctVal = parseFloat(directCommissionPct) / 100 || 0.20;
          const indirectPctVal = parseFloat(indirectCommissionPct) / 100 || 0.10;
          const directCommission = PLAN_PRICE * directPctVal;
          const indirectCommission = PLAN_PRICE * indirectPctVal;
          
          const createdAt = new Date(storedUsers[userIndex].createdAt || now.toISOString());
          const monthsSinceRegistration = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

          if (storedUsers[userIndex].referredBy) {
              const directIndex = storedUsers.findIndex((u: any) => u.id === storedUsers[userIndex].referredBy);
              if (directIndex !== -1 && storedUsers[directIndex].isAffiliate) {
                  const duration = storedUsers[directIndex].directCommissionDuration || directCommissionMonths;
                  if (monthsSinceRegistration <= duration) {
                    storedUsers[directIndex].commissions = (storedUsers[directIndex].commissions || 0) + directCommission;
                  }
              }
          }
          
          if (storedUsers[userIndex].indirectReferredBy) {
              const indirectIndex = storedUsers.findIndex((u: any) => u.id === storedUsers[userIndex].indirectReferredBy);
              if (indirectIndex !== -1 && storedUsers[indirectIndex].isAffiliate) {
                  const duration = storedUsers[indirectIndex].indirectCommissionDuration || indirectCommissionMonths;
                  if (monthsSinceRegistration <= duration) {
                    storedUsers[indirectIndex].commissions = (storedUsers[indirectIndex].commissions || 0) + indirectCommission;
                  }
              }
          }
          
          localStorage.setItem('agenda_users', JSON.stringify(storedUsers));
          
          // If this is the current active user, update state
          if (currentUser && currentUser.id === userId) {
             
            setTimeout(() => setCurrentUser(storedUsers[userIndex]), 0);
          }
          
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          alert("Pagamento aprovado! Plano Premium (R$ 97,00) ativado com sucesso.");
        }
      } else if (paymentStatus === 'failure') {
        window.history.replaceState({}, document.title, window.location.pathname);
        alert("Ops! Houve um problema com o pagamento. Tente novamente.");
      } else if (paymentStatus === 'pending') {
        window.history.replaceState({}, document.title, window.location.pathname);
        alert("Seu pagamento está em análise. O plano será ativado assim que for confirmado.");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (paymentPlan && mpConfig.accessToken && selectedPaymentMethod === 'pix') {
      if (!pixData && !isPixLoading) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsPixLoading(true);
        fetch('/api/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: {
              transaction_amount: paymentPlan.price,
              payment_method_id: 'pix',
              payer: {
                email: currentUser?.email || "contato@exemplo.com",
                first_name: currentUser?.name ? currentUser.name.split(' ')[0] : undefined,
                last_name: currentUser?.name ? currentUser.name.split(' ').slice(1).join(' ') : undefined,
                identification: currentUser?.cpf ? { type: 'CPF', number: currentUser.cpf.replace(/\D/g, '') } : undefined
              }
            },
            userId: currentUser?.id,
            planName: paymentPlan.name,
            planType: paymentPlan.type,
            months: paymentPlan.months,
            mpAccessToken: mpConfig.accessToken,
            cpf: currentUser?.cpf,
            userName: currentUser?.name,
          }),
        })
        .then(res => res.json())
        .then(data => {
          if (data.point_of_interaction?.transaction_data) {
            setPixData({
              ...data.point_of_interaction.transaction_data,
              payment_id: data.id
            });
          } else {
            console.error("No PIX data found:", data);
            setPixData(null);
          }
        })
        .catch(err => {
          console.error("PIX Generation Error:", err);
          setPixData(null);
        })
        .finally(() => {
          setIsPixLoading(false);
        });
      }
    } else {
      setPixData(null);
      setIsPixLoading(false);
      setPixCopied(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentPlan, mpConfig.accessToken, selectedPaymentMethod, currentUser?.email, currentUser?.id, currentUser?.cpf]);

  // Polling for PIX payment status
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout;
    if (pixData?.payment_id && paymentPlan && mpConfig.accessToken && currentUser) {
      pollingInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/payment-status?id=${pixData.payment_id}&token=${mpConfig.accessToken}`);
          const data = await res.json();
          if (data.status === 'approved') {
            clearInterval(pollingInterval);
            let updatedUser = { ...currentUser };
            if (paymentPlan.type === 'extra_device') {
               updatedUser.maxDevices = (updatedUser.maxDevices || 1) + 1;
            } else {
               const planExpNow = new Date();
               const expireDays = paymentPlan.type === 'annual' ? 365 : paymentPlan.type === 'semiannual' ? 180 : 30 * (paymentPlan.months || 1);
               planExpNow.setDate(planExpNow.getDate() + expireDays);
               updatedUser = { ...updatedUser, plan: 'premium' as const, planExpiresAt: planExpNow.toISOString() };
               
               updatedUser.installmentsPaid = (updatedUser.installmentsPaid || 0) + 1;
            }
            let storedUsers = JSON.parse(localStorage.getItem('agenda_users') || '[]');
            
            if (paymentPlan.type !== 'extra_device') {
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
            }

            const userIndex = storedUsers.findIndex((u: any) => u.id === currentUser.id);
            if (userIndex !== -1) storedUsers[userIndex] = updatedUser;
            localStorage.setItem('agenda_users', JSON.stringify(storedUsers));
            alert("Pagamento PIX confirmado com sucesso! Seu acesso foi liberado.");
            setPaymentPlan(null);
            window.location.reload();
          }
        } catch (e) {
          console.error("PIX Polling error", e);
        }
      }, 5000);
    }
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixData?.payment_id, paymentPlan, mpConfig.accessToken, currentUser]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const determineOS = () => {
    const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera;
    if (/windows phone/i.test(userAgent)) return "Windows Phone";
    if (/android/i.test(userAgent)) return "Android";
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) return "iOS";
    if (/Macintosh|Mac OS X/i.test(userAgent)) return "macOS";
    if (/windows/i.test(userAgent)) return "Windows";
    if (/linux/i.test(userAgent)) return "Linux";
    return "Desconhecido";
  };

  const triggerInstallPrompt = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (!isStandalone) {
      const os = determineOS();
      setOsName(os);
      setTimeout(() => setIsInstallPromptOpen(true), 1000);
    }
  };

  useEffect(() => {
    // Process Google redirect login result if user returns from Google auth redirect
    if (typeof window !== 'undefined') {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result && result.user) {
            const email = result.user.email || '';
            const name = result.user.displayName || email.split('@')[0] || 'Usuário Google';
            const pendingOptIn = sessionStorage.getItem('pending_affiliate_opt_in') === 'true';
            
            try {
              const dbCheckRes = await fetch(`/api/users?firebaseUid=${result.user.uid}&email=${encodeURIComponent(email)}`);
              if (dbCheckRes.ok) {
                const dbUser = await dbCheckRes.json();
                if (dbUser && dbUser.cpf && dbUser.whatsapp) {
                  await handleUserLogin(
                    dbUser.name || name,
                    dbUser.whatsapp,
                    dbUser.isAffiliate || pendingOptIn,
                    email,
                    dbUser.cpf,
                    dbUser.city || '',
                    dbUser.state || '',
                    dbUser.country || ''
                  );
                  sessionStorage.removeItem('pending_affiliate_opt_in');
                  sessionStorage.removeItem('google_login_in_progress');
                  return;
                } else if (dbUser && (dbUser.name || dbUser.email)) {
                  setPendingGoogleUser({ name: dbUser.name || name, email, isAffiliateOptIn: pendingOptIn });
                  sessionStorage.removeItem('pending_affiliate_opt_in');
                  sessionStorage.removeItem('google_login_in_progress');
                  return;
                }
              }
            } catch (dbErr) {
              console.error("Erro ao buscar usuário no servidor após redirect:", dbErr);
            }

            let storedUsers: AffiliateUser[] = JSON.parse(localStorage.getItem('agenda_users') || '[]');
            let existingUser = storedUsers.find(u => u.email === email) || storedUsers.find(u => u.name === name);
            if (existingUser && existingUser.cpf && existingUser.whatsapp) {
              handleUserLogin(
                existingUser.name,
                existingUser.whatsapp,
                existingUser.isAffiliate || pendingOptIn,
                email,
                existingUser.cpf
              );
            } else {
              setPendingGoogleUser({ name, email, isAffiliateOptIn: pendingOptIn });
            }
            sessionStorage.removeItem('pending_affiliate_opt_in');
            sessionStorage.removeItem('google_login_in_progress');
          }
        })
        .catch((err: any) => {
          console.error("Erro no getRedirectResult:", err);
          if (sessionStorage.getItem('google_login_in_progress') === 'true') {
            sessionStorage.removeItem('google_login_in_progress');
            setAuthError({
              code: err.code || 'unknown',
              message: err.message || 'Erro na autenticação do Google.',
              hostname: window.location.hostname
            });
          }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    
    if (ref) {
      if (!sessionStorage.getItem(`tracked_click_${ref}`)) {
        let storedUsers: AffiliateUser[] = JSON.parse(localStorage.getItem('agenda_users') || '[]');
        const refUserIndex = storedUsers.findIndex(u => u.id === ref);
        if (refUserIndex !== -1) {
          storedUsers[refUserIndex].clicks = (storedUsers[refUserIndex].clicks || 0) + 1;
          localStorage.setItem('agenda_users', JSON.stringify(storedUsers));
        }
        sessionStorage.setItem(`tracked_click_${ref}`, 'true');
      }

      if (!localStorage.getItem('first_click_ref')) {
        localStorage.setItem('first_click_ref', ref);
      }
    }

    const saved = localStorage.getItem('agenda_appointments');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove old mock data that might have been saved in previous sessions
          parsed = parsed.filter((a: any) => !(['1', '2', '3'].includes(a.id) && ['Reunião de Alinhamento', 'Consulta Médica', 'Entrega do Relatório Stitch'].includes(a.title)));
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAppointments(parsed);
      } catch(e) {}
    }
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Server-side synchronization for currentUser appointments and Gestão de Contas data
  const userSyncKey = currentUser?.id || currentUser?.email || currentUser?.whatsapp;

  useEffect(() => {
    if (!userSyncKey) return;

    let isCancelled = false;

    // Fetch server appointments for this user
    fetch(`/api/appointments?userId=${encodeURIComponent(userSyncKey)}`)
      .then(res => res.json())
      .then(serverApps => {
        if (isCancelled) return;
        if (Array.isArray(serverApps) && serverApps.length > 0) {
          setAppointments(prev => {
            const combinedMap = new Map<string, Appointment>();
            serverApps.forEach((sa: any) => {
              if (sa.id) combinedMap.set(String(sa.id), sa);
            });
            prev.forEach(pa => {
              if (pa.id && !combinedMap.has(String(pa.id))) {
                combinedMap.set(String(pa.id), pa);
              }
            });
            const merged = Array.from(combinedMap.values());
            localStorage.setItem('agenda_appointments', JSON.stringify(merged));
            return merged;
          });
        } else if (appointments.length > 0) {
          fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userSyncKey, appointments })
          }).catch(err => console.error("Auto upload appointments failed:", err));
        }
      })
      .catch(err => console.error("Fetch server appointments failed:", err));

    return () => {
      isCancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSyncKey]);

  useEffect(() => {
    localStorage.setItem('agenda_appointments', JSON.stringify(appointments));

    if (userSyncKey && appointments) {
      const syncTimer = setTimeout(() => {
        fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userSyncKey, appointments })
        }).catch(err => console.error("Server auto-save error:", err));
      }, 800);

      return () => clearTimeout(syncTimer);
    }

    const interval = setInterval(() => {
      const now = new Date();
      appointments.forEach(app => {
        if (!app.reminders || app.reminders.length === 0) return;
        
        const appDate = new Date(`${app.date}T${app.time}:00`);
        const diffMs = appDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        const checkAndNotify = (minutes: number, label: string) => {
          if (diffMinutes === minutes) {
            const settingsStr = localStorage.getItem('agenda_settings');
            const settings = settingsStr ? JSON.parse(settingsStr) : {};
            const isSoundEnabled = typeof settings.soundEnabled === 'boolean' ? settings.soundEnabled : true;
            const isVoiceEnabled = typeof settings.voiceEnabled === 'boolean' ? settings.voiceEnabled : false;

            const alarmMsg = `⏰ Lembrete: Seu compromisso "${app.title}" é em ${label}!`;
            const whatsAppMsg = userWhatsapp 
              ? `📱 WhatsApp para ${userWhatsapp} (ÁgioBot): Olá! Passando para lembrar do seu compromisso "${app.title}" marcado para ${app.date.split('-').reverse().join('/')} às ${app.time}.`
              : `📱 Mensagem não enviada: WhatsApp não cadastrado.`;
            
            // Text to speech (Voz)
            if (isVoiceEnabled && 'speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(`Lembrete de compromisso: ${app.title} em ${label}.`);
              utterance.lang = 'pt-BR';
              window.speechSynthesis.speak(utterance);
            }

            // Fallback beep if sound is enabled but voice is disabled or not supported
            if (isSoundEnabled && !isVoiceEnabled && 'AudioContext' in window) {
                try {
                  const audioCtx = new window.AudioContext();
                  const oscillator = audioCtx.createOscillator();
                  oscillator.type = 'sine';
                  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                  oscillator.connect(audioCtx.destination);
                  oscillator.start();
                  oscillator.stop(audioCtx.currentTime + 0.5);
                } catch(e) {}
            }

            if ('Notification' in window && Notification.permission === 'granted') {
              if (isSoundEnabled) {
                new Notification('Ágio Agenda Alarme', { body: alarmMsg });
              } else {
                new Notification('Ágio Agenda Alarme', { body: alarmMsg, silent: true });
              }
              setTimeout(() => new Notification('Mensagem WhatsApp', { body: whatsAppMsg, silent: !isSoundEnabled }), 1000);
            } else {
              alert(`${alarmMsg}

${whatsAppMsg}`);
            }
          }
        };

        if (app.reminders.includes('0') || app.reminders.includes('0m')) checkAndNotify(0, 'no evento');
        if (app.reminders.includes('15') || app.reminders.includes('15m')) checkAndNotify(15, '15 minutos');
        if (app.reminders.includes('30') || app.reminders.includes('30m')) checkAndNotify(30, '30 minutos');
        if (app.reminders.includes('60') || app.reminders.includes('1h')) checkAndNotify(60, '1 hora');
        if (app.reminders.includes('1440') || app.reminders.includes('24h')) checkAndNotify(1440, '24 horas');
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [appointments, userWhatsapp]);

  const handleExport = () => {
    let backupData: any = {};
    if (isUserAdmin) {
      backupData = {
        type: "admin_backup",
        appointments: appointments,
        allUsers: JSON.parse(localStorage.getItem('agenda_affiliate_users') || '[]'),
        systemSettings: JSON.parse(localStorage.getItem('agenda_theme_settings') || '{}'),
        systemFiles: "Acesso total ao sistema, código fonte, html, telas, e pastas do sistema"
      };
    } else {
      const allUsers = JSON.parse(localStorage.getItem('agenda_affiliate_users') || '[]');
      const myAffiliates = allUsers.filter((u: any) => u.referredBy === currentUser?.whatsapp || u.indirectReferredBy === currentUser?.whatsapp);
      backupData = {
        type: "user_backup",
        accountConfig: { themeColor: userAppColor, themeBg: userAppBg },
        personalData: currentUser,
        appointments: appointments,
        affiliateNetwork: myAffiliates,
        subscriptionPlan: currentUser?.plan
      };
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `backup_agenda_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if(e.target.files && e.target.files.length > 0) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = event => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setAppointments(parsed);
          } else if (parsed && parsed.appointments) {
            setAppointments(parsed.appointments);
          }
          alert("Backup restaurado com sucesso!");
          
        } catch (error) {
          alert("Erro ao ler o arquivo de backup.");
        }
      };
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    category: 'Trabalho' as CategoryType,
    address: '',
    contact: '',
    reminders: [] as string[],
    value: 0,
    valueStatus: 'a_receber' as 'a_receber' | 'recebido' | 'a_pagar' | 'pago',
    color: '#10b981',
  });

  const handleOpenCreateModal = () => {
    setFormData(prev => ({ ...prev, reminders: defaultReminders, color: prev.color || '#10b981' }));
    setIsModalOpen(true);
  };

  const saveAppointmentDirectly = (dataToSave: any, editId: string | null) => {
    if (editId) {
      setAppointments(appointments.map(app => 
        app.id === editId ? { ...app, ...dataToSave, category: dataToSave.category as CategoryType, color: dataToSave.color || '#10b981' } : app
      ).sort((a, b) => a.date.localeCompare(b.date)));
    } else {
      const newAppointment: Appointment = {
        id: Math.random().toString(36).substr(2, 9),
        ...dataToSave,
        category: dataToSave.category as CategoryType,
        color: dataToSave.color || '#10b981',
      };
      setAppointments([...appointments, newAppointment].sort((a, b) => a.date.localeCompare(b.date)));
    }
    
    setIsModalOpen(false);
    setEditingAppointmentId(null);
    setOptimizationAlert(null);
    setFormData({ title: '', date: '', time: '', category: 'Trabalho' as CategoryType, address: '', contact: '', reminders: [] as string[], value: 0, valueStatus: 'a_receber', color: '#10b981' });
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    if ('Notification' in window && formData.reminders && formData.reminders.length > 0) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    if (!editingAppointmentId) {
      const appointmentsOnDate = appointments.filter(app => app.date === formData.date);
      if (appointmentsOnDate.length >= 30) {
        alert(`Limite de agendamentos atingido! Você pode marcar no máximo 30 compromissos para a data ${new Date(formData.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`);
        return;
      }
    }

    // Check for conflicts and proximity optimizations
    const conflict = appointments.find(app => app.date === formData.date && app.time === formData.time && app.id !== editingAppointmentId);
    
    let proximityMsg = '';
    if (!conflict && formData.address && formData.address.trim().length > 3) {
      const addrLower = formData.address.toLowerCase().trim();
      const proximity = appointments.find(app => app.id !== editingAppointmentId && app.address && app.address.toLowerCase().trim() === addrLower && (app.date !== formData.date || app.time !== formData.time));
      if (proximity) {
        proximityMsg = `Encontramos outro compromisso agendado para o mesmo local (ou local próximo) no dia ${new Date(proximity.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} às ${proximity.time} ("${proximity.title}"). Deseja reagendar este novo compromisso para o mesmo local e otimizar seu tempo?`;
      }
    }

    if (conflict) {
      setOptimizationAlert({
        type: 'conflict',
        message: `Você já possui um agendamento neste mesmo dia e horário: "${conflict.title}". Deseja salvar mesmo assim e sobrepor os horários?`,
        dataParams: { editId: editingAppointmentId, formData }
      });
      return;
    } else if (proximityMsg) {
      setOptimizationAlert({
        type: 'proximity',
        message: proximityMsg,
        dataParams: { editId: editingAppointmentId, formData }
      });
      return;
    }

    saveAppointmentDirectly(formData, editingAppointmentId);
  };

  const handleOpenEdit = (app: Appointment) => {
    setFormData({
      title: app.title,
      date: app.date,
      time: app.time,
      category: app.category,
      address: app.address || '',
      contact: app.contact || '',
      reminders: app.reminders || [],
      value: app.value || 0,
      valueStatus: app.valueStatus || 'a_receber',
      color: app.color || '#10b981',
    });
    setEditingAppointmentId(app.id);
    setIsModalOpen(true);
  };

  const handleDeleteAppointment = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este compromisso?')) {
      setAppointments(appointments.filter(app => app.id !== id));
    }
  };

  const handleOptimizeAgenda = () => {
    // Scan for any two appointments with same/similar address on different days
    let foundA: Appointment | null = null;
    let foundB: Appointment | null = null;

    for (let i = 0; i < appointments.length; i++) {
        const a1 = appointments[i];
        if (!a1.address || a1.address.trim().length <= 3) continue;
        const addrLower = a1.address.toLowerCase().trim();

        for (let j = i + 1; j < appointments.length; j++) {
            const a2 = appointments[j];
            if (a2.address && a2.address.toLowerCase().trim() === addrLower && (a1.date !== a2.date || a1.time !== a2.time)) {
                foundA = a1;
                foundB = a2;
                break;
            }
        }
        if (foundA) break;
    }

    if (foundA && foundB) {
        setOptimizationAlert({
            type: 'proximity',
            message: `Encontramos compromissos em locais próximos/iguais ("${foundA.address}"): "${foundA.title}" em ${new Date(foundA.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} às ${foundA.time} e "${foundB.title}" em ${new Date(foundB.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} às ${foundB.time}. Que tal editar um deles para ficarem juntos e otimizar seu deslocamento?`,
            dataParams: { editId: null, formData: null, isScan: true }
        });
    } else {
        alert('Nenhuma oportunidade de otimização logística (mesmo endereço em horários diferentes) foi encontrada na sua agenda atual.');
    }
  };

  const handleOpenNotes = async (id: string) => {
    const app = appointments.find(a => a.id === id);
    if (app) {
      setNotesDraft(app.notes || '');
      setSelectedAppointmentForNotes(id);
      setCurrentDocId(app.googleDocId || null);
      setCurrentDocUrl(app.googleDocUrl || null);
      setNotesDisplayMode('iframe');
      setShowEmbeddedIframe(false);
      setDocsSyncStatus(null);

      // Check server for existing doc if missing
      if (!app.googleDocId) {
        try {
          const userKey = currentUser?.id || currentUser?.email || currentUser?.whatsapp || 'guest';
          const res = await fetch(`/api/docs?appointmentId=${encodeURIComponent(id)}&userId=${encodeURIComponent(userKey)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.googleDocId) {
              setCurrentDocId(data.googleDocId);
              setCurrentDocUrl(data.googleDocUrl);
              setAppointments(prev => prev.map(aItem => aItem.id === id ? { ...aItem, googleDocId: data.googleDocId, googleDocUrl: data.googleDocUrl } : aItem));
            }
          }
        } catch (e) {
          console.warn("Could not fetch doc from server:", e);
        }
      }
    }
  };

  const handleSyncGoogleDocs = async (autoOpenNewTab = false) => {
    if (!selectedAppointmentForNotes) return;
    const app = appointments.find(a => a.id === selectedAppointmentForNotes);
    if (!app) return;

    setIsDocsSyncing(true);
    setDocsSyncStatus('Sincronizando...');

    try {
      const userKey = currentUser?.id || currentUser?.email || currentUser?.whatsapp || 'guest';
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userKey,
          appointmentId: app.id,
          title: app.title,
          content: notesDraft,
          googleDocId: currentDocId
        })
      });

      const data = await res.json();
      if (data.success && data.doc) {
        const docId = data.doc.googleDocId;
        const docUrl = data.doc.googleDocUrl || `https://docs.google.com/document/d/${docId}/edit`;

        setCurrentDocId(docId);
        setCurrentDocUrl(docUrl);

        setAppointments(prev => prev.map(aItem => 
          aItem.id === app.id ? { ...aItem, notes: notesDraft, googleDocId: docId, googleDocUrl: docUrl } : aItem
        ));

        setDocsSyncStatus('Sincronizado automaticamente ✓');

        if (autoOpenNewTab) {
          window.open(docUrl, '_blank');
        }
      } else {
        setDocsSyncStatus('Salvo no servidor ✓');
        if (autoOpenNewTab && currentDocUrl) {
          window.open(currentDocUrl, '_blank');
        } else if (autoOpenNewTab) {
          window.open('https://docs.google.com/document/create', '_blank');
        }
      }
    } catch (e: any) {
      console.error("Docs sync error:", e);
      setDocsSyncStatus('Salvo localmente ✓');
      if (autoOpenNewTab) {
        window.open('https://docs.google.com/document/create', '_blank');
      }
    } finally {
      setIsDocsSyncing(false);
    }
  };

  // Real-time Auto-Save with Debounce (1.2s after typing stops)
  useEffect(() => {
    if (!selectedAppointmentForNotes) return;

    const currentApp = appointments.find(a => a.id === selectedAppointmentForNotes);
    if (!currentApp) return;

    // Immediately keep local state and localStorage updated in real-time
    if (currentApp.notes !== notesDraft) {
      setAppointments(prev => prev.map(a => a.id === selectedAppointmentForNotes ? { ...a, notes: notesDraft } : a));
    }

    setDocsSyncStatus('Salvando alterações...');

    const timer = setTimeout(async () => {
      try {
        setIsDocsSyncing(true);
        const userKey = currentUser?.id || currentUser?.email || currentUser?.whatsapp || 'guest';
        const res = await fetch('/api/docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userKey,
            appointmentId: selectedAppointmentForNotes,
            title: currentApp.title || 'Anotação',
            content: notesDraft,
            googleDocId: currentDocId
          })
        });

        const data = await res.json();
        if (data.success && data.doc) {
          if (data.doc.googleDocId) {
            setCurrentDocId(data.doc.googleDocId);
            setCurrentDocUrl(data.doc.googleDocUrl || `https://docs.google.com/document/d/${data.doc.googleDocId}/edit`);
            setAppointments(prev => prev.map(a => 
              a.id === selectedAppointmentForNotes ? { ...a, googleDocId: data.doc.googleDocId, googleDocUrl: data.doc.googleDocUrl } : a
            ));
          }
          setDocsSyncStatus('Sincronizado automaticamente ✓');
        } else {
          setDocsSyncStatus('Salvo no servidor ✓');
        }
      } catch (e) {
        console.error("Auto-save notes error:", e);
        setDocsSyncStatus('Salvo localmente ✓');
      } finally {
        setIsDocsSyncing(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft, selectedAppointmentForNotes]);

  const handleSaveNotes = async () => {
    if (selectedAppointmentForNotes) {
      setAppointments(appointments.map(app => 
        app.id === selectedAppointmentForNotes ? { ...app, notes: notesDraft } : app
      ));
      setSelectedAppointmentForNotes(null);
    }
  };

  const handleShareNotes = () => {
    const app = appointments.find(a => a.id === selectedAppointmentForNotes);
    if (!app || !notesDraft.trim()) return;

    const formattedDate = new Date(app.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const text = `Anotações do compromisso "${app.title}" (${formattedDate} às ${app.time}):

${notesDraft}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Anotações: ${app.title}`,
        text: text,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert('Anotações copiadas para a área de transferência!');
    }
  };

  const handleStart2FASetup = async () => {
    
    try {
      const res = await fetch('/api/2fa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser?.email || currentUser?.name })
      });
      const data = await res.json();
      if (data.secret && data.qrCodeUrl) {
        setSetup2FASecret(data.secret);
        setSetup2FAQrCode(data.qrCodeUrl);
        setSetup2FAToken('');
        setIs2FASetupModalOpen(true);
      } else {
        alert('Erro ao gerar código 2FA.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao configurar 2FA.');
    }
  };

  const handleStartWebAuthnSetup = async () => {
    if (!window.PublicKeyCredential) {
      alert("Seu navegador ou dispositivo não suporta autenticação por biometria (WebAuthn).");
      return;
    }
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);
      
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { name: "Ágio Agenda", id: window.location.hostname },
          user: {
            id: userId,
            name: currentUser?.email || currentUser?.name || "usuario",
            displayName: currentUser?.name || "Usuário"
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000
        }
      }) as PublicKeyCredential;
      
      if (cred) {
        handleUpdateUserData({ webAuthnEnabled: true, webAuthnCredentialId: cred.id });
        alert('Autenticação por biometria (Digital / Face ID) ativada com sucesso!');
      }
    } catch (e: any) {
      console.error(e);
      if (e.name === 'NotAllowedError') {
        alert('Para ativar a biometria, por favor abra o aplicativo em uma nova aba (clique no ícone de "Abrir em nova aba" no canto superior direito). Se estiver no celular, instale o app clicando em "Instalar App".');
      } else {
        alert('Erro ao configurar biometria. Verifique se o seu dispositivo suporta esta funcionalidade e se você permitiu o acesso.');
      }
    }
  };

  const handleVerify2FASetup = async () => {
    if (!setup2FAToken) return alert('Insira o código do aplicativo.');
    setIsVerifying2FA(true);
    try {
      const res = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: setup2FASecret, token: setup2FAToken })
      });
      const data = await res.json();
      if (data.verified) {
        handleUpdateUserData({ totpEnabled: true, totpSecret: setup2FASecret });
        setIs2FASetupModalOpen(false);
        setView('profile');
        alert('Verificação em duas etapas (Google Authenticator) ativada com sucesso!');
      } else {
        alert('Código incorreto. Digite o código atualizado do seu app Google Authenticator.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao verificar 2FA.');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleUserLogin = async (name: string, whatsapp: string, isAffiliateOptIn?: boolean, email?: string, cpf?: string, city?: string, state?: string, country?: string, password?: string) => {
    if (name === 'Visitante' && whatsapp === '') {
      setUserName(name);
      setUserWhatsapp(whatsapp);
      setView('main_menu');
      triggerInstallPrompt();
      return;
    }

    try {
      let firebaseUser = null;
      let isNewUser = false;
      
      // Determine if it's login or registration
      if (email && password && name) {
        // Registration
        try {
          const userCredential = await registerWithEmail(email, password);
          firebaseUser = userCredential.user;
          isNewUser = true;
        } catch(e: any) {
          if (e.code === 'auth/email-already-in-use') {
             // Fallback to login if already exists
             const userCredential = await loginWithEmail(email, password);
             firebaseUser = userCredential.user;
          } else {
             throw e;
          }
        }
      } else if (email && password && !name) {
        // Login
        const userCredential = await loginWithEmail(email, password);
        firebaseUser = userCredential.user;
      } else if (auth.currentUser) {
        // Google login or already authenticated
        firebaseUser = auth.currentUser;
      } else {
        alert("E-mail e senha são obrigatórios.");
        return;
      }

      // Sync with our PostgreSQL DB safely
      let dbUser: any = null;
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseUid: firebaseUser.uid,
            name: name || undefined,
            email: email || firebaseUser.email || undefined,
            whatsapp,
            cpf,
            city,
            state,
            country
          })
        });
        
        if (res.ok) {
          const userRes = await fetch(`/api/users?firebaseUid=${firebaseUser.uid}`);
          if (userRes.ok) {
            dbUser = await userRes.json();
          }
        } else {
          console.warn("API /api/users returned non-ok status:", res.status);
        }
      } catch (syncError) {
        console.warn("DB Sync failed, using fallback user record:", syncError);
      }

      // If DB sync or fetch was unavailable, construct fallback user record
      if (!dbUser) {
        let storedUsers: AffiliateUser[] = JSON.parse(localStorage.getItem('agenda_users') || '[]');
        let existingLocal: any = storedUsers.find(u => u.email === (email || firebaseUser.email)) || storedUsers.find(u => u.name === name);
        const resolvedEmail = email || firebaseUser.email || existingLocal?.email || `${firebaseUser.uid}@user.local`;
        const resolvedName = name || existingLocal?.name || firebaseUser.displayName || resolvedEmail.split('@')[0] || "Usuário";
        
        dbUser = {
          id: existingLocal?.id || firebaseUser.uid,
          firebaseUid: firebaseUser.uid,
          name: resolvedName,
          email: resolvedEmail,
          whatsapp: whatsapp || existingLocal?.whatsapp || '',
          cpf: cpf || existingLocal?.cpf || '',
          city: city || existingLocal?.city || '',
          state: state || existingLocal?.state || '',
          country: country || existingLocal?.country || '',
          plan: existingLocal?.plan || 'free',
          createdAt: existingLocal?.createdAt || new Date().toISOString(),
          mfaEnabled: existingLocal?.mfaEnabled || false,
          totpEnabled: existingLocal?.totpEnabled || false,
          webAuthnEnabled: existingLocal?.webAuthnEnabled || false,
        };
      }
      
      if (dbUser?.webAuthnEnabled) {
         let webAuthnSuccess = false;
         try {
             if (!window.PublicKeyCredential) throw new Error("WebAuthn não suportado");
             const challenge = new Uint8Array(32);
             window.crypto.getRandomValues(challenge);
             await navigator.credentials.get({
               publicKey: {
                 challenge: challenge,
                 rpId: window.location.hostname,
                 userVerification: "required",
                 timeout: 60000
               }
             });
             webAuthnSuccess = true;
         } catch(e) {
             console.error("Biometrics failed/not supported", e);
             // Safe fallback for device/webview compatibility using CPF, PIN or email verification
             const hasCpf = dbUser?.cpf && dbUser.cpf.trim().length >= 3;
             const hasMfaPin = dbUser?.mfaPin && dbUser.mfaPin.trim().length > 0;
             
             if (hasMfaPin) {
                const userPin = prompt("A autenticação por digital falhou ou não é suportada neste dispositivo.\n\nInforme seu PIN de segurança de backup:");
                if (userPin && userPin === dbUser.mfaPin) {
                   webAuthnSuccess = true;
                } else {
                   alert("PIN incorreto!");
                }
             } else if (hasCpf) {
                const cleanCpf = dbUser.cpf.replace(/\D/g, "");
                const cpfPart = cleanCpf.substring(0, 3);
                const userCpfPart = prompt("A autenticação por digital falhou ou não é suportada neste dispositivo.\n\nPara confirmar sua identidade, digite os 3 primeiros dígitos do seu CPF:");
                if (userCpfPart && userCpfPart.trim() === cpfPart) {
                   webAuthnSuccess = true;
                } else {
                   alert("Dígitos de CPF incorretos!");
                }
             } else {
                const confirmEmail = prompt(`A autenticação por digital falhou.\n\nPara confirmar sua identidade, digite seu e-mail completo (${dbUser?.email || ''}):`);
                if (confirmEmail && confirmEmail.trim().toLowerCase() === (dbUser?.email || '').toLowerCase()) {
                   webAuthnSuccess = true;
                } else {
                   alert("E-mail incorreto!");
                }
             }
         }
         if (!webAuthnSuccess) {
            await signOutAuth();
            return;
         }
      } else if (dbUser?.totpEnabled) {
         const totpCode = prompt("Verificação de duas etapas (Google Authenticator) ativada. Informe o código de 6 dígitos:");
         if (!totpCode) {
            await signOutAuth();
            return;
         }
         const verRes = await fetch('/api/2fa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: dbUser.totpSecret, token: totpCode })
         });
         const verData = await verRes.json();
         if (!verData.verified) {
            alert("Código incorreto!");
            await signOutAuth();
            return;
         }
       } else if (dbUser?.mfaEnabled) {
         const mfaCode = prompt("Verificação de duas etapas ativada. Informe o PIN de segurança:");
         const correctPin = dbUser.mfaPin || localStorage.getItem('mfa_pin_' + firebaseUser.uid);
         if (mfaCode !== correctPin) {
            alert("PIN incorreto!");
            await signOutAuth();
            return;
         }
       }

       const isDalecioAdmin = 
         (dbUser?.email && dbUser.email.toLowerCase().trim() === 'agiotech.oficial@gmail.com') ||
         (firebaseUser.email && firebaseUser.email.toLowerCase().trim() === 'agiotech.oficial@gmail.com') ||
         (dbUser?.cpf && dbUser.cpf.replace(/\D/g, '') === '10896050726') ||
         (dbUser?.name && (dbUser.name.toUpperCase().includes('DALÉCIO') || dbUser.name.toUpperCase().includes('DALECIO')));

       const affiliateUser = {
          id: (dbUser?.id ?? dbUser?.firebaseUid ?? firebaseUser?.uid ?? Math.random()).toString(),
          name: dbUser?.name || (isDalecioAdmin ? "Dalécio L. Macedo" : "Usuário"),
          whatsapp: dbUser?.whatsapp || "",
          email: dbUser?.email || firebaseUser?.email || (isDalecioAdmin ? "agiotech.oficial@gmail.com" : ""),
          cpf: dbUser?.cpf || (isDalecioAdmin ? "10896050726" : ""),
          city: dbUser?.city || "",
          state: dbUser?.state || "",
          country: dbUser?.country || "",
          plan: dbUser?.plan || (isDalecioAdmin ? "premium" : "free"),
          createdAt: dbUser?.createdAt || new Date().toISOString(),
          firebaseUid: firebaseUser.uid,
          mfaEnabled: Boolean(dbUser?.mfaEnabled),
          totpEnabled: Boolean(dbUser?.totpEnabled),
          totpSecret: dbUser?.totpSecret || "",
          webAuthnEnabled: Boolean(dbUser?.webAuthnEnabled),
          webAuthnCredentialId: dbUser?.webAuthnCredentialId || "",
          themeColor: dbUser?.themeColor || "",
          themeBg: dbUser?.themeBg || "",
          age: dbUser?.age || "",
          gender: dbUser?.gender || "",
          profession: dbUser?.profession || "",
          pixKey: dbUser?.pixKey || "",
          language: dbUser?.language || "pt-BR",
          soundEnabled: dbUser?.soundEnabled,
          voiceEnabled: dbUser?.voiceEnabled,
          mfaPin: dbUser?.mfaPin || "",
          visualEdits: dbUser?.visualEdits || ""
       };
       
       setCurrentUser(affiliateUser as any);
       setUserName(affiliateUser.name);
       setUserWhatsapp(affiliateUser.whatsapp);
       
       // Apply configurations from central database
       if (dbUser?.themeColor) setAppColor(dbUser.themeColor);
       if (dbUser?.themeBg) setAppBgImage(dbUser.themeBg);
       if (dbUser?.soundEnabled !== null && dbUser?.soundEnabled !== undefined) setSoundEnabled(dbUser.soundEnabled);
       if (dbUser?.voiceEnabled !== null && dbUser?.voiceEnabled !== undefined) setVoiceEnabled(dbUser.voiceEnabled);
       if (dbUser?.visualEdits) {
         try {
           setVisualEdits(JSON.parse(dbUser.visualEdits));
         } catch (e) {
           console.error("Erro ao carregar visualEdits", e);
         }
       }

       localStorage.setItem('agenda_last_activity', Date.now().toString());
      
      // Load appointments from Postgres
      const appsRes = await fetch(`/api/appointments?userId=${firebaseUser.uid}`);
      if (appsRes.ok) {
         const appsData = await appsRes.json();
         if (Array.isArray(appsData)) {
           setAppointments(appsData.map((a: any) => ({
              ...a,
              id: (a?.id ?? a?._id ?? Math.random()).toString()
           })));
         }
      }
      
      setView('main_menu');
      triggerInstallPrompt();
      
    } catch (error: any) {
       console.error("Login Error", error);
       alert("Erro ao realizar login: " + error.message);
    }
  };

  const handleConfirmTwoFactor = async () => {
    try {
      setIsVerifying2FA(true);
      if (twoFactorCode === 'GOOGLE_AUTH') {
        if (!pendingLoginUser?.userFound?.totpSecret) {
          alert("Erro interno: secret não encontrado.");
          setIsVerifying2FA(false);
          return;
        }
        try {
          const res = await fetch('/api/2fa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: pendingLoginUser.userFound.totpSecret, token: twoFactorInput })
          });
          const data = await res.json();
          if (!data.verified) {
            alert('Código inválido. Tente novamente.');
            setIsVerifying2FA(false);
            return;
          }
        } catch (e) {
          console.error(e);
          alert('Erro ao validar código.');
          setIsVerifying2FA(false);
          return;
        }
      } else if (twoFactorInput !== twoFactorCode) {
        alert("Código inválido. Tente novamente.");
        setIsVerifying2FA(false);
        return;
      }

      if (!pendingLoginUser) {
        alert("Erro: Sessão não encontrada.");
        setIsVerifying2FA(false);
        return;
      }
    const { name, whatsapp, isAffiliateOptIn, email, cpf, city, state, country, userFound } = pendingLoginUser;

    let storedUsers: AffiliateUser[] = JSON.parse(localStorage.getItem('agenda_users') || '[]');
    let deviceId = localStorage.getItem('device_id') || '';

    let user: AffiliateUser | null | undefined = null;
    if (userFound) {
      if (userFound.id) {
        user = storedUsers.find(u => u.id === userFound.id);
      }
      if (!user && userFound.email) {
        user = storedUsers.find(u => u.email === userFound.email);
      }
      if (!user && userFound.whatsapp) {
        user = storedUsers.find(u => u.whatsapp === userFound.whatsapp);
      }
      if (!user && userFound.name) {
        user = storedUsers.find(u => u.name === userFound.name);
      }
    }

    if (user && !user.id) {
      user.id = Math.random().toString(36).substr(2, 9);
    }

    if (!user) {
      const ref = localStorage.getItem('first_click_ref');
      let parentPath = '';
      let referredBy = undefined;
      let indirectReferredBy = undefined;
      if (ref) {
        const parentUser = storedUsers.find(u => u.id === ref);
        if (parentUser) {
          parentPath = parentUser.path ? `${parentUser.path}${parentUser.id}/` : `${parentUser.id}/`;
          referredBy = parentUser.id;
          if (parentUser.referredBy) {
            indirectReferredBy = parentUser.referredBy;
          }
        }
      }
      
      user = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        email,
        cpf,
        whatsapp,
        city,
        state,
        country,
        path: parentPath,
        deviceId: deviceId, // Atrelando ao Device ID local
        allowedDeviceIds: [deviceId],
        maxDevices: 1,
        createdAt: new Date().toISOString(),
        plan: 'free',
        commissions: 0,
        isAffiliate: !!isAffiliateOptIn,
        referredBy,
        indirectReferredBy,
        directCommissionDuration: directCommissionMonths,
        indirectCommissionDuration: indirectCommissionMonths,
        freeTrialDays: 40,
      };
      
      storedUsers.push(user);
      localStorage.setItem('agenda_users', JSON.stringify(storedUsers));
    } else {
      let isUpdated = false;
      if (isAffiliateOptIn && !user.isAffiliate) {
        user.isAffiliate = true;
        isUpdated = true;
      }
      if (email && !user.email) {
        user.email = email;
        isUpdated = true;
      }
      if (cpf && !user.cpf) {
        user.cpf = cpf;
        isUpdated = true;
      }
      if (whatsapp && (!user.whatsapp || user.whatsapp === '')) {
         user.whatsapp = whatsapp;
         isUpdated = true;
      }
      if (city && user.city !== city) { user.city = city; isUpdated = true; }
      if (state && user.state !== state) { user.state = state; isUpdated = true; }
      if (country && user.country !== country) { user.country = country; isUpdated = true; }
      if (!user.deviceId) {
         user.deviceId = deviceId;
         isUpdated = true;
      }
      if (!user.allowedDeviceIds) {
         user.allowedDeviceIds = [];
      }
      if (!user.allowedDeviceIds.includes(deviceId)) {
         user.allowedDeviceIds.push(deviceId);
         isUpdated = true;
      }
      if (isUpdated) {
        localStorage.setItem('agenda_users', JSON.stringify(storedUsers));
      }
    }
    
    setCurrentUser(user);
    setUserName(user.name);
    setUserWhatsapp(user.whatsapp || '');
    
    setIsTwoFactorModalOpen(false);
    setTwoFactorInput('');
    setPendingLoginUser(null);
    setIsVerifying2FA(false);
    
    setView('main_menu');
    triggerInstallPrompt();

    // Check expiration immediately on login
    const expStatus = getExpirationStatus(user);
    const isAdmin = (user && (
      user.name?.toUpperCase().includes('DALÉCIO') || 
      user.name?.toUpperCase().includes('DALECIO') || 
      user.cpf?.replace(/\D/g, '') === '10896050726' ||
      user.email?.toLowerCase().trim() === 'agiotech.oficial@gmail.com'
    )) || false;
    const isAccessExpired = (user.plan === 'free' && expStatus.trialDaysRemaining <= 0) || (user.plan === 'premium' && expStatus.planExpired);
    if (!isAdmin && isAccessExpired) {
      if (user.isAffiliate) {
        setView('affiliate');
      } else {
        setTimeout(() => {
          setIsExpirationModalOpen(true);
        }, 500);
      }
    }
    } catch (err: any) {
      console.error(err);
      alert('Erro interno ao fazer login: ' + err.message);
      setIsVerifying2FA(false);
    }
  };

  
  
  const handleGoogleLogin = async (isAffiliateOptIn?: boolean) => {
    try {
      if (isAffiliateOptIn) {
        sessionStorage.setItem('pending_affiliate_opt_in', 'true');
      } else {
        sessionStorage.removeItem('pending_affiliate_opt_in');
      }

      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (isIframe) {
        setAuthError({
          code: 'iframe',
          message: 'O login do Google é bloqueado pelos navegadores dentro de janelas incorporadas (iframes). Por favor, abra o aplicativo em uma nova aba para fazer o login com a sua conta Google com segurança.',
          hostname: window.location.hostname
        });
        return;
      }

      sessionStorage.setItem('google_login_in_progress', 'true');

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      try {
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          sessionStorage.removeItem('google_login_in_progress');
          const email = result.user.email || '';
          const name = result.user.displayName || email.split('@')[0] || 'Usuário Google';
          
          // Verificação no banco/servidor se o usuário existe
          try {
            const dbCheckRes = await fetch(`/api/users?firebaseUid=${result.user.uid}&email=${encodeURIComponent(email)}`);
            if (dbCheckRes.ok) {
              const dbUser = await dbCheckRes.json();
              if (dbUser && (dbUser.id || dbUser.email)) {
                await handleUserLogin(
                  dbUser.name || name,
                  dbUser.whatsapp || '',
                  dbUser.isAffiliate || isAffiliateOptIn,
                  email,
                  dbUser.cpf || '',
                  dbUser.city || '',
                  dbUser.state || '',
                  dbUser.country || ''
                );
                return;
              }
            }
          } catch (dbErr) {
            console.error("Erro ao buscar usuário no servidor:", dbErr);
          }

          let storedUsers: AffiliateUser[] = JSON.parse(localStorage.getItem('agenda_users') || '[]');
          let existingUser = storedUsers.find(u => u.email === email) || storedUsers.find(u => u.name === name);
          if (existingUser) {
            handleUserLogin(existingUser.name, existingUser.whatsapp || '', existingUser.isAffiliate || isAffiliateOptIn, email, existingUser.cpf || '');
          } else {
            setPendingGoogleUser({ name, email, isAffiliateOptIn });
          }
        }
      } catch (popupError: any) {
        console.warn("Popup result/error:", popupError);
        if (popupError.code === 'auth/popup-closed-by-user' || popupError.code === 'auth/cancelled-popup-request') {
          sessionStorage.removeItem('google_login_in_progress');
          return;
        }

        // Tenta redirect somente se for bloqueio de popup pelo navegador e não for dentro de iframe
        if (popupError.code === 'auth/popup-blocked') {
          try {
            await signInWithRedirect(auth, provider);
            return;
          } catch (redirectErr: any) {
            throw redirectErr;
          }
        }

        // Erros de configuração (auth/configuration-not-found, auth/operation-not-allowed, auth/unauthorized-domain, etc)
        throw popupError;
      }
    } catch (error: any) {
      sessionStorage.removeItem('google_login_in_progress');
      console.error("Erro ao fazer login com Google:", error);
      setAuthError({
        code: error.code || 'unknown',
        message: error.message || 'Não foi possível concluir o login com o Google.',
        hostname: window.location.hostname
      });
    }
  };


  const handleUpgradeToPremium = () => {
    setView('subscription');
  };

  const handleToggleModule = (moduleId: string) => {
    if (moduleId === 'pacote_completo') {
      if (selectedModulesIds.includes('pacote_completo')) {
         setSelectedModulesIds([]);
      } else {
         setSelectedModulesIds(['pacote_completo']);
      }
      return;
    }
    
    if (selectedModulesIds.includes('pacote_completo')) {
       setSelectedModulesIds([moduleId]);
       return;
    }
    
    if (selectedModulesIds.includes(moduleId)) {
      setSelectedModulesIds(selectedModulesIds.filter(id => id !== moduleId));
    } else {
      setSelectedModulesIds([...selectedModulesIds, moduleId]);
    }
  };

  const handleProceedToModulesPayment = () => {
    if (!currentUser) {
      alert("Apenas usuários registrados podem assinar módulos.");
      return;
    }
    
    if (selectedModulesIds.length === 0) {
      alert("Selecione pelo menos um módulo para continuar.");
      return;
    }

    let isComplete = selectedModulesIds.includes('pacote_completo');
    let totalPrice = 0;
    let originalPrice = 0;
    let planName = '';
    
    if (isComplete) {
      const pkg = systemModules.find(m => m.id === 'pacote_completo');
      totalPrice = pkg ? pkg.price : 49.90;
      originalPrice = systemModules.filter(m => m.id !== 'pacote_completo').reduce((sum, m) => sum + m.price, 0);
      planName = pkg ? pkg.name : 'Pacote Completo';
    } else {
      const selected = systemModules.filter(m => selectedModulesIds.includes(m.id));
      totalPrice = selected.reduce((sum, m) => sum + m.price, 0);
      originalPrice = totalPrice;
      planName = selected.map(m => m.name).join(' + ');
    }

    const monthsMultiplier = selectedMonths || 1;
    totalPrice = totalPrice * monthsMultiplier;
    originalPrice = originalPrice * monthsMultiplier;

    if (monthsMultiplier > 1) {
      planName = `${planName} (${monthsMultiplier} meses)`;
    } else {
      planName = `${planName} (1 mês)`;
    }

    const calculatedPrice = appliedDiscount ? totalPrice * (1 - appliedDiscount.pct / 100) : totalPrice;
    const finalPrice = Number(calculatedPrice.toFixed(2));

    setPaymentPlan({ name: planName, price: finalPrice, originalPrice: originalPrice, type: 'monthly', months: monthsMultiplier });
    // closed subscription modal;
  };


  const userAppColor = currentUser?.themeColor || appColor;
  const userAppBg = currentUser?.themeBg || appBgImage;

  return (
    <>
      <AutoUpdater />
      <style>{`
        :root {
          --app-primary-color: ${userAppColor};
        }
        ${userAppBg ? `
          body {
            background: ${userAppBg.includes('http') || userAppBg.includes('/') ? `url('${userAppBg}')` : userAppBg} !important;
            background-size: cover !important;
            background-position: center !important;
            background-attachment: fixed !important;
          }
          .min-h-screen, .bg-brand, .bg-surface-container-lowest, .bg-background, .bg-surface-container {
            background-color: ${userAppBg.includes('http') || userAppBg.includes('/') ? 'rgba(0,0,0,0.4)' : 'transparent'} !important;
            backdrop-filter: blur(8px) !important;
          }
          header.bg-surface-container {
             background-color: ${userAppBg.includes('http') || userAppBg.includes('/') ? 'rgba(0,0,0,0.6)' : 'transparent'} !important;
          }
          header.bg-brand {
            background-color: rgba(0,0,0,0.5) !important;
            backdrop-filter: blur(10px);
          }
        ` : ''}
      `}</style>
      
      <div suppressHydrationWarning className={isAnyModalActive ? "pointer-events-none select-none opacity-40 transition-all duration-300 filter blur-[0.5px]" : "transition-all duration-300"}>
        {view === 'landing' && <LandingView onNavigate={setView} currentUser={currentUser} onLogin={handleUserLogin} onGoogleLogin={handleGoogleLogin} systemPrices={systemPrices} systemModules={systemModules} directCommissionPct={directCommissionPct} indirectCommissionPct={indirectCommissionPct} directCommissionMonths={directCommissionMonths} indirectCommissionMonths={indirectCommissionMonths} affiliateSpotsOpen={affiliateSpotsOpen} onOpenSupport={() => setIsSupportModalOpen(true)} onOpenAffiliate={() => setView('affiliate')} onOpenProfile={() => setView('profile')} />}
        
        {view === 'main_menu' && <MainMenuView onNavigate={setView} onOpenProfile={() => setView('profile')} onOpenAffiliate={() => setView('affiliate')} onOpenSupport={() => setIsSupportModalOpen(true)} onOpenSubscription={() => setView('subscription')} onLogout={() => handleLogout()} userName={userName} currentUser={currentUser} isAccessExpired={currentUser ? ((currentUser.plan === 'free' && getExpirationStatus(currentUser).trialDaysRemaining <= 0) || (currentUser.plan === 'premium' && getExpirationStatus(currentUser).planExpired)) : false} isAdmin={isCurrentlyAdmin} currentLang={currentLang} />}
        
        {view === 'calendar' && <CalendarMobileView appointments={appointments} userName={userName} currentUser={currentUser} systemPrices={systemPrices} onUpgradeToPremium={handleUpgradeToPremium} onNavigate={setView} onOpenModal={handleOpenCreateModal} onOpenProfile={() => setView('profile')} onOpenAffiliate={() => setView('affiliate')} onOpenNotes={handleOpenNotes} onEditAppointment={handleOpenEdit} onDeleteAppointment={handleDeleteAppointment} onDayClick={(dateStr) => { setSelectedDateFilter(dateStr); setView('daily_agenda'); }} onOpenSupport={() => setIsSupportModalOpen(true)} isCurrentlyAdmin={isCurrentlyAdmin} isUserAdmin={isUserAdmin} onLogout={() => handleLogout()} />}
        
        {view === 'dashboard' && <DashboardView onNavigate={setView} onLogout={() => { handleLogout(); }} userName={userName} currentUser={currentUser} appointments={appointments} onOpenModal={handleOpenCreateModal} onOpenProfile={() => setView('profile')} onOpenAffiliate={() => setView('affiliate')} onOptimize={handleOptimizeAgenda} onOpenNotes={handleOpenNotes} onEditAppointment={handleOpenEdit} onDeleteAppointment={handleDeleteAppointment} onOpenSubscription={() => setView('subscription')} />}

        {view === 'daily_agenda' && <DailyAgendaView selectedDate={selectedDateFilter} appointments={appointments} setAppointments={setAppointments} userName={userName} currentUser={currentUser} onNavigate={setView} onOpenModal={handleOpenCreateModal} onOpenProfile={() => setView('profile')} onOpenAffiliate={() => setView('affiliate')} onEditAppointment={handleOpenEdit} onOpenNotes={handleOpenNotes} onDeleteAppointment={handleDeleteAppointment} defaultReminders={defaultReminders} setDefaultReminders={setDefaultReminders} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} voiceEnabled={voiceEnabled} setVoiceEnabled={setVoiceEnabled} onLogout={() => handleLogout()} />}
        
        {view === 'admin' && isCurrentlyAdmin && <AdminDashboardView onNavigate={setView} appColor={appColor} setAppColor={setAppColor} appBgImage={appBgImage} setAppBgImage={setAppBgImage} onOpenSupport={() => setIsSupportModalOpen(true)} onSettingsUpdated={loadSettings} onLogout={() => handleLogout()} />}

        {view === 'accounts' && <AccountsManagementView appointments={appointments} onNavigate={setView} onEditAppointment={handleOpenEdit} onOpenModal={handleOpenCreateModal} onLogout={() => handleLogout()} />}

        {view === 'instructions' && <InstructionsView onNavigate={setView} onOpenProfile={() => setView('profile')} onOpenAffiliate={() => setView('affiliate')} onOpenSupport={() => setIsSupportModalOpen(true)} onOpenSubscription={() => setView('subscription')} currentUser={currentUser} isAdmin={isCurrentlyAdmin} onLogout={() => handleLogout()} />}
        {view === 'affiliate' && <AffiliateView onNavigate={setView} currentUser={currentUser} setCurrentUser={setCurrentUser} handleUpdateUserData={handleUpdateUserData} directCommissionPct={directCommissionPct} indirectCommissionPct={indirectCommissionPct} directCommissionMonths={directCommissionMonths} indirectCommissionMonths={indirectCommissionMonths} automaticCommissionPayment={automaticCommissionPayment} affiliateSpotsOpen={affiliateSpotsOpen} onOpenProfile={() => setView('profile')} onOpenSupport={() => setIsSupportModalOpen(true)} onOpenSubscription={() => setView('subscription')} isAdmin={isCurrentlyAdmin} onLogout={() => handleLogout()} />}
        {view === 'meeting_room' && <VirtualMeetingRoom currentUser={currentUser} isAdmin={isCurrentlyAdmin} onNavigate={setView} onOpenSupport={() => setIsSupportModalOpen(true)} />}
        {view === 'profile' && <ProfileView onNavigate={setView} currentUser={currentUser} userName={userName} userWhatsapp={userWhatsapp} userAppColor={userAppColor} userAppBg={userAppBg} isProcessingPayment={isProcessingPayment} isCurrentlyAdmin={isCurrentlyAdmin} handleUpdateUserData={handleUpdateUserData} getExpirationStatus={getExpirationStatus} handleExport={handleExport} handleImport={handleImport} handleStart2FASetup={handleStart2FASetup} handleStartWebAuthnSetup={handleStartWebAuthnSetup} onOpenSupport={() => setIsSupportModalOpen(true)} onOpenSubscription={() => setView('subscription')} onLogout={() => { handleLogout(); setView('landing'); }} setPaymentPlan={setPaymentPlan} fileInputRef={fileInputRef} />}
        {view === 'subscription' && (
          <SubscriptionView
            onNavigate={setView}
            currentUser={currentUser}
            systemModules={systemModules}
            selectedModulesIds={selectedModulesIds}
            handleToggleModule={handleToggleModule}
            selectedMonths={selectedMonths}
            setSelectedMonths={setSelectedMonths}
            handleProceedToModulesPayment={handleProceedToModulesPayment}
            paymentPlan={paymentPlan}
            setPaymentPlan={setPaymentPlan}
            selectedPaymentMethod={selectedPaymentMethod}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            appliedDiscount={appliedDiscount}
            setAppliedDiscount={setAppliedDiscount}
            pixData={pixData}
            setPixData={setPixData}
            isPixLoading={isPixLoading}
            mpConfig={mpConfig}
            directCommissionPct={directCommissionPct}
            indirectCommissionPct={indirectCommissionPct}
            directCommissionMonths={directCommissionMonths}
            indirectCommissionMonths={indirectCommissionMonths}
            isCurrentlyAdmin={isCurrentlyAdmin}
            onOpenSupport={() => setIsSupportModalOpen(true)}
            onLogout={() => handleLogout()}
          />
        )}
      </div>
      
      <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} userName={userName} userEmail={currentUser?.email} />
      <PwaSplashScreen />

      {/* Install Prompt (PWA) Modal */}
      {isInstallPromptOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950 flex items-center justify-center mb-4 overflow-hidden shadow-lg ring-4 ring-emerald-500/20 border border-emerald-500/30">
                <img src="/%C3%ADcone-%C3%A1rea%20de%20trabalho.png" alt="Ágio Agenda" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Instale o Ágio Agenda</h3>
              <p className="text-sm text-on-surface-variant mb-6">
                Identificamos que você está usando <strong>{osName}</strong>. 
                Para acesso rápido e melhor desempenho, instale o aplicativo na sua tela inicial!
              </p>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setIsInstallPromptOpen(false)}
                  className="flex-1 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors font-medium"
                >
                  Agora Não
                </button>
                <button 
                  onClick={async () => {
                    if (deferredPrompt) {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === 'accepted') {
                        setDeferredPrompt(null);
                      }
                      setIsInstallPromptOpen(false);
                    } else if (osName === 'iOS') {
                      alert('No iPhone/iPad, por favor, toque no ícone "Compartilhar" (quadrado com seta para cima) na barra do navegador e logo após selecione "Adicionar à Tela de Início".');
                      setIsInstallPromptOpen(false);
                    } else {
                      alert('Para instalar o aplicativo, acesse as opções do seu navegador (três pontos) e escolha "Instalar Aplicativo" ou "Adicionar à Tela Inicial".');
                      setIsInstallPromptOpen(false);
                    }
                  }}
                  className="flex-1 py-3 rounded-lg bg-primary text-on-primary font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  Instalar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal is generic and shared between Calendar and Dashboard views */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] border border-white/20 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/20 bg-surface-container-low">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <span className="material-symbols-outlined text-white">{view === 'accounts' ? 'account_balance_wallet' : 'edit_calendar'}</span>
                 {view === 'accounts'
                   ? (editingAppointmentId 
                       ? (isEs ? 'Editar Cuenta' : isEn ? 'Edit Account' : 'Editar Conta') 
                       : (isEs ? 'Nueva Cuenta' : isEn ? 'New Account' : 'Nova Conta'))
                   : (editingAppointmentId 
                       ? (isEs ? 'Editar Cita' : isEn ? 'Edit Appointment' : 'Editar Compromisso') 
                       : (isEs ? 'Nueva Cita' : isEn ? 'New Appointment' : 'Novo Compromisso'))
                 }
              </h3>
              <div className="flex items-center gap-2">
                {editingAppointmentId && (
                  <button 
                    type="button"
                    onClick={() => {
                      const confirmText = view === 'accounts'
                        ? (isEs ? '¿Está seguro de que desea eliminar esta cuenta?' : isEn ? 'Are you sure you want to delete this account?' : 'Tem certeza que deseja excluir esta conta?')
                        : (isEs ? '¿Está seguro de que desea eliminar esta cita?' : isEn ? 'Are you sure you want to delete this appointment?' : 'Tem certeza que deseja excluir este compromisso?');
                      if (confirm(confirmText)) {
                        setAppointments(appointments.filter(app => app.id !== editingAppointmentId));
                        setIsModalOpen(false);
                        setEditingAppointmentId(null);
                        setFormData({ title: '', date: '', time: '', category: 'Trabalho' as CategoryType, address: '', contact: '', reminders: [] as string[], value: 0, valueStatus: 'a_receber', color: '#10b981' });
                      }
                    }}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                    title={view === 'accounts' 
                      ? (isEs ? 'Eliminar Cuenta' : isEn ? 'Delete Account' : 'Excluir Conta')
                      : (isEs ? 'Eliminar Cita' : isEn ? 'Delete Appointment' : 'Excluir Compromisso')
                    }
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAppointmentId(null);
                    setFormData({ title: '', date: '', time: '', category: 'Trabalho' as CategoryType, address: '', contact: '', reminders: [] as string[], value: 0, valueStatus: 'a_receber', color: '#10b981' });
                  }}
                  className="text-white hover:text-white/70 transition-colors p-1"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white" htmlFor="title">{isEs ? 'Título de la Cita' : isEn ? 'Appointment Title' : 'Título do Compromisso'}</label>
                <div className="relative">
                   <span className="material-symbols-outlined absolute left-3 top-3.5 text-white/70">match_case</span>
                   <textarea 
                      id="title"
                      required
                      rows={1}
                      className="w-full bg-surface-container border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white outline-none transition-all placeholder:text-white/50 focus:border-white focus:ring-1 focus:ring-white resize-none overflow-hidden min-h-[50px] leading-tight"
                      placeholder={isEs ? 'Ej: Reunión de Planificación' : isEn ? 'E.g., Planning Meeting' : 'Ex: Reunião de Planejamento'}
                      value={formData.title}
                      onChange={e => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                        setFormData({...formData, title: e.target.value});
                      }}
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white" htmlFor="date">{isEs ? 'Fecha' : isEn ? 'Date' : 'Data'}</label>
                  <div className="relative">
                     <input 
                        id="date"
                        type="date" 
                        required
                        className="w-full bg-surface-container border border-white/20 rounded-lg px-4 py-3 text-white outline-none transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert focus:border-white focus:ring-1 focus:ring-white"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                     />
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white" htmlFor="time">{isEs ? 'Hora' : isEn ? 'Time' : 'Horário'}</label>
                  <div className="relative">
                     <input 
                        id="time"
                        type="time" 
                        required
                        className="w-full bg-surface-container border border-white/20 rounded-lg px-4 py-3 text-white outline-none transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert focus:border-white focus:ring-1 focus:ring-white"
                        value={formData.time}
                        onChange={e => setFormData({...formData, time: e.target.value})}
                     />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white" htmlFor="address">{isEs ? 'Dirección / Lugar' : isEn ? 'Address / Location' : 'Endereço / Local'}</label>
                <div className="relative">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/70">location_on</span>
                   <input 
                      id="address"
                      type="text" 
                      className="w-full bg-surface-container border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white outline-none transition-all placeholder:text-gray-400 focus:border-white focus:ring-1 focus:ring-white"
                      placeholder={isEs ? 'Ej: Av. Paulista, 1000 (Opcional)' : isEn ? 'E.g., 100 Main St (Optional)' : 'Ex: Av. Paulista, 1000 (Opcional)'}
                      value={formData.address || ''}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                   />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white" htmlFor="contact">{isEs ? 'Teléfono / WhatsApp' : isEn ? 'Phone / WhatsApp' : 'Telefone / WhatsApp'}</label>
                <div className="relative">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/70">call</span>
                   <input 
                      id="contact"
                      type="text" 
                      className="w-full bg-surface-container border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white outline-none transition-all placeholder:text-gray-400 focus:border-white focus:ring-1 focus:ring-white"
                      placeholder={isEs ? 'Ej: +55 11 99999-9999 (Opcional)' : isEn ? 'E.g., +1 555 123-4567 (Optional)' : 'Ex: +55 11 99999-9999 (Opcional)'}
                      value={formData.contact || ''}
                      onChange={e => setFormData({...formData, contact: e.target.value})}
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-white" htmlFor="category">{isEs ? 'Categoría' : isEn ? 'Category' : 'Categoria'}</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/70 z-10 pointer-events-none">category</span>
                    <select 
                      id="category"
                      required
                      className="w-full appearance-none bg-surface-container border border-white/20 rounded-lg pl-10 pr-10 py-3 text-white outline-none transition-all focus:border-white focus:ring-1 focus:ring-white"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as CategoryType})}
                    >
                      <option value="Trabalho">{isEs ? 'Trabajo' : isEn ? 'Work' : 'Trabalho'}</option>
                      <option value="Pessoal">{isEs ? 'Personal' : isEn ? 'Personal' : 'Pessoal'}</option>
                      <option value="Urgente">{isEs ? 'Urgente' : isEn ? 'Urgent' : 'Urgente'}</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none">expand_more</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex flex-col gap-2 flex-auto">
                    <label className="text-sm font-medium text-white" htmlFor="value">{isEs ? 'Valor ($)' : isEn ? 'Amount ($)' : 'Valor (R$)'}</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/70 z-10 pointer-events-none">payments</span>
                      <CurrencyInput 
                        id="value"
                        className="w-full bg-surface-container border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white outline-none transition-all placeholder:text-gray-400 focus:border-white focus:ring-1 focus:ring-white font-bold text-base"
                        placeholder="0,00"
                        showSymbol={true}
                        value={formData.value || 0}
                        onChange={numVal => setFormData({...formData, value: numVal})}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 flex-auto md:max-w-[200px]">
                    <label className="text-sm font-medium text-white" htmlFor="valueStatus">{isEs ? 'Estado del Valor' : isEn ? 'Amount Status' : 'Status do Valor'}</label>
                    <div className="relative">
                      <select 
                        id="valueStatus"
                        className="w-full bg-surface-container border border-white/20 rounded-lg px-4 py-3 text-white appearance-none outline-none transition-all focus:border-white focus:ring-1 focus:ring-white"
                        value={formData.valueStatus}
                        onChange={e => setFormData({...formData, valueStatus: e.target.value as 'a_receber' | 'recebido' | 'a_pagar' | 'pago'})}
                      >
                        <option value="a_receber">{isEs ? 'Por Recibir' : isEn ? 'To Receive' : 'À Receber'}</option>
                        <option value="recebido">{isEs ? 'Recibido' : isEn ? 'Received' : 'Recebido'}</option>
                        <option value="a_pagar">{isEs ? 'Por Pagar' : isEn ? 'To Pay' : 'A Pagar'}</option>
                        <option value="pago">{isEs ? 'Pagado' : isEn ? 'Paid' : 'Pago'}</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white uppercase font-bold">{isEs ? 'Clasificación por Color' : isEn ? 'Color Classification' : 'Classificação por Cor'}</label>
                  <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full inline-block border border-white/40" style={{ backgroundColor: formData.color || '#10b981' }} />
                    {CLASSIFICATION_COLORS.find(c => c.hex === formData.color)?.name || (formData.color ? (isEs ? 'Personalizado' : isEn ? 'Custom' : 'Personalizado') : 'Verde')}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap bg-surface-container border border-white/20 rounded-xl p-3">
                  {CLASSIFICATION_COLORS.map((c) => {
                    const isSelected = (formData.color || '#10b981') === c.hex;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c.hex })}
                        title={c.name}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#06402B] shadow-md'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-[18px] text-white font-bold drop-shadow-md" translate="no">
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <div className="relative flex items-center gap-1.5 ml-auto">
                    <label htmlFor="customColorPicker" className="text-xs text-white/70 cursor-pointer hover:text-white font-medium">
                      {isEs ? 'Outro' : isEn ? 'Custom' : 'Outro'}
                    </label>
                    <input
                      id="customColorPicker"
                      type="color"
                      value={formData.color || '#10b981'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent p-0 overflow-hidden shrink-0 hover:scale-105 transition-transform"
                      title={isEs ? 'Elegir color personalizado' : isEn ? 'Choose custom color' : 'Escolher cor personalizada'}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white uppercase font-bold">{isEs ? 'Configuración de Alerta Inteligente' : isEn ? 'Smart Alert Settings' : 'Configurações de Alerta Inteligente'}</label>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {formData.reminders.length} {isEs ? (formData.reminders.length > 1 ? 'seleccionados' : 'seleccionado') : isEn ? 'selected' : (formData.reminders.length > 1 ? 'selecionados' : 'selecionado')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {LEAD_TIME_OPTIONS.map((opt) => {
                    const isSelected = formData.reminders.includes(opt.value) ||
                      (opt.value === '15' && formData.reminders.includes('15m')) ||
                      (opt.value === '30' && formData.reminders.includes('30m')) ||
                      (opt.value === '60' && formData.reminders.includes('1h')) ||
                      (opt.value === '1440' && formData.reminders.includes('24h'));

                    const toggleReminder = (val: string) => {
                      let newReminders: string[];
                      if (isSelected) {
                        newReminders = formData.reminders.filter(r =>
                          r !== val &&
                          !(val === '15' && r === '15m') &&
                          !(val === '30' && r === '30m') &&
                          !(val === '60' && r === '1h') &&
                          !(val === '1440' && r === '24h')
                        );
                      } else {
                        newReminders = [...formData.reminders, val];
                      }
                      setFormData({ ...formData, reminders: newReminders });
                    };

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleReminder(opt.value)}
                        className={`flex-1 min-w-[110px] sm:min-w-[95px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-400 text-gray-950 border-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.7)] scale-[1.02] ring-2 ring-emerald-300/50'
                            : 'bg-[#091e15]/80 border-white/15 text-white/70 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[16px] shrink-0 ${isSelected ? 'text-gray-950 font-bold' : 'text-white/40'}`}>
                          {isSelected ? 'check_circle' : 'notifications'}
                        </span>
                        <span className="whitespace-nowrap">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex gap-2 sm:gap-4 mt-6 pt-6 border-t border-white/20">
                {editingAppointmentId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      const confirmText = view === 'accounts'
                        ? (isEs ? '¿Está seguro de que desea eliminar esta cuenta?' : isEn ? 'Are you sure you want to delete this account?' : 'Tem certeza que deseja excluir esta conta?')
                        : (isEs ? '¿Está seguro de que desea eliminar esta cita?' : isEn ? 'Are you sure you want to delete this appointment?' : 'Tem certeza que deseja excluir este compromisso?');
                      if (confirm(confirmText)) {
                        setAppointments(appointments.filter(app => app.id !== editingAppointmentId));
                        setIsModalOpen(false);
                        setEditingAppointmentId(null);
                        setFormData({ title: '', date: '', time: '', category: 'Trabalho' as CategoryType, address: '', contact: '', reminders: [] as string[], value: 0, valueStatus: 'a_receber', color: '#10b981' });
                      }
                    }}
                    className="px-3 py-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors font-bold flex items-center justify-center gap-1.5 text-sm"
                    title={isEs ? 'Eliminar' : isEn ? 'Delete' : 'Excluir'}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    <span>{isEs ? 'Eliminar' : isEn ? 'Delete' : 'Excluir'}</span>
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAppointmentId(null);
                    setFormData({ title: '', date: '', time: '', category: 'Trabalho' as CategoryType, address: '', contact: '', reminders: [] as string[], value: 0, valueStatus: 'a_receber', color: '#10b981' });
                  }}
                  className="flex-1 py-3 rounded-lg border border-white/20 text-white hover:bg-surface-container-high transition-colors font-medium text-sm"
                >
                  {isEs ? 'Cancelar' : isEn ? 'Cancel' : 'Cancelar'}
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-lg bg-primary border border-white/20 text-white hover:-translate-y-0.5 hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2 text-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {isEs ? 'Guardar' : isEn ? 'Save' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Optimization/Conflict Modal */}
      {optimizationAlert && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center justify-center text-center">
               <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${optimizationAlert.type === 'conflict' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>
                  <span className="material-symbols-outlined text-[32px]">{optimizationAlert.type === 'conflict' ? 'event_busy' : 'route'}</span>
               </div>
               <h3 className="text-xl font-bold text-on-surface mb-2">{optimizationAlert.type === 'conflict' ? 'Conflito de Horário' : 'Otimização Logística'}</h3>
               <p className="text-sm text-on-surface-variant mb-6">
                 {optimizationAlert.message}
               </p>
               <div className="flex gap-4 w-full">
                 <button 
                   onClick={() => setOptimizationAlert(null)}
                   className="flex-1 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors font-medium"
                 >
                   {optimizationAlert.type === 'conflict' || optimizationAlert.dataParams?.isScan ? 'Fechar' : 'Ignorar'}
                 </button>
                 {!optimizationAlert.dataParams?.isScan && (
                 <button 
                   onClick={() => saveAppointmentDirectly(optimizationAlert.dataParams.formData, optimizationAlert.dataParams.editId)}
                   className={`flex-1 py-3 rounded-lg text-on-secondary hover:-translate-y-0.5 hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2 ${optimizationAlert.type === 'conflict' ? 'bg-error' : 'bg-secondary'}`}
                 >
                   Salvar Assim Mesmo
                 </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {selectedAppointmentForNotes && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] border border-white/40 rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/30 bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/50 flex items-center justify-center text-blue-200 shadow-sm">
                  <span className="material-symbols-outlined text-2xl">description</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Bloco de Anotações
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/40 font-medium">
                      Google Docs Sync
                    </span>
                  </h3>
                  <p className="text-xs text-white/70">Integração em tempo real com o Google Workspace & Servidor</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAppointmentForNotes(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
                title="Fechar"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              {/* Appointment info banner */}
              <div className="bg-surface-container-high/50 p-3 rounded-lg border border-white/30 flex items-center justify-between gap-3">
                 <div className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-amber-300 text-xl">event</span>
                   <div>
                      <p className="font-semibold text-sm text-white line-clamp-1">
                        {appointments.find(a => a.id === selectedAppointmentForNotes)?.title}
                      </p>
                      <p className="text-xs text-white/80">
                        {appointments.find(a => a.id === selectedAppointmentForNotes)?.date.split('-').reverse().join('/')} às {appointments.find(a => a.id === selectedAppointmentForNotes)?.time}
                      </p>
                   </div>
                 </div>

                 {docsSyncStatus && (
                   <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 animate-in fade-in flex items-center gap-1.5 shadow-sm">
                     <span className={`material-symbols-outlined text-sm ${docsSyncStatus.includes('Salvando') ? 'animate-spin' : ''}`}>
                       {docsSyncStatus.includes('Salvando') ? 'sync' : 'cloud_done'}
                     </span>
                     {docsSyncStatus}
                   </span>
                 )}
              </div>

              {/* Display Format Choice (Formato de Exibição) */}
              <div className="flex flex-col sm:flex-row gap-2 bg-black/20 p-1.5 rounded-xl border border-white/20">
                <button
                  onClick={() => setNotesDisplayMode('iframe')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    notesDisplayMode === 'iframe' 
                      ? 'bg-amber-400 text-amber-950 shadow-md border border-amber-300' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">edit_note</span>
                  Bloco de Anotações Pautado (Auto-Save Ativo)
                </button>
                <button
                  onClick={() => {
                    setNotesDisplayMode('direct');
                    if (currentDocUrl) {
                      window.open(currentDocUrl, '_blank');
                    } else {
                      handleSyncGoogleDocs(true);
                    }
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    notesDisplayMode === 'direct' 
                      ? 'bg-blue-500 text-white shadow-md border border-blue-400' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Abertura Direta no Google Docs
                </button>
              </div>

              {/* View Mode 1: Embedded Lined Paper View */}
              {notesDisplayMode === 'iframe' && (
                <div className="relative rounded-xl overflow-hidden shadow-xl border border-amber-300/40 bg-[#fffdf5]">
                  {/* Top notebook bar */}
                  <div className="flex flex-wrap justify-between items-center px-4 py-2.5 bg-amber-100/90 border-b border-amber-200 text-amber-900 text-xs font-semibold gap-2">
                     <div className="flex items-center gap-2">
                       <span className="material-symbols-outlined text-amber-800 text-lg">edit_note</span>
                       <span>Folha de Anotações Pautada (Salvamento em Tempo Real)</span>
                     </div>
                     <div className="flex items-center gap-2">
                       {currentDocUrl ? (
                         <a
                           href={currentDocUrl}
                           target="_blank"
                           rel="noreferrer"
                           className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1 font-bold text-xs shadow-sm"
                           title="Abrir no Google Docs em uma nova aba"
                         >
                           <span className="material-symbols-outlined text-sm">open_in_new</span>
                           Abrir no Google Docs
                         </a>
                       ) : (
                         <button
                           onClick={() => handleSyncGoogleDocs(true)}
                           className="px-2.5 py-1 rounded bg-blue-600/20 text-blue-900 hover:bg-blue-600/30 transition-colors flex items-center gap-1 font-bold text-xs"
                         >
                           <span className="material-symbols-outlined text-sm">cloud_upload</span>
                           Gerar no Google Docs
                         </button>
                       )}
                       <div className="flex gap-1.5 items-center ml-1">
                         <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>
                         <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                         <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block"></span>
                       </div>
                     </div>
                  </div>

                  <textarea 
                    className="w-full h-96 text-black outline-none transition-all placeholder:text-slate-400/70 resize-none font-sans text-base leading-[32px] pl-[56px] pr-4 pt-[1px] pb-4 select-text font-medium"
                    style={{
                      backgroundImage: `
                        repeating-linear-gradient(transparent, transparent 31px, #94a3b8 31px, #94a3b8 32px),
                        linear-gradient(to right, transparent 44px, #ef4444 44px, #ef4444 46px, transparent 46px)
                      `,
                      backgroundColor: '#fffdf5',
                      backgroundAttachment: 'local',
                      color: '#000000'
                    }}
                    placeholder="Digite suas anotações aqui... O salvamento é automático no servidor e no Google Docs conforme você digita."
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                  />
                </div>
              )}

              {/* View Mode 2: Direct Google Docs Opening Preview */}
              {notesDisplayMode === 'direct' && (
                <div className="rounded-xl border border-blue-400/40 bg-gradient-to-br from-blue-950/80 to-blue-900/60 p-6 flex flex-col items-center justify-center text-center gap-4 text-white shadow-lg">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-400/50 flex items-center justify-center text-blue-200 shadow-md">
                    <span className="material-symbols-outlined text-4xl">description</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Sincronização com Google Docs Ativa</h4>
                    <p className="text-xs text-white/80 max-w-md">
                      Todas as suas anotações são salvas continuamente em tempo real. Clique no botão abaixo para abrir a versão no Google Docs em uma nova aba.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-2">
                    <button
                      onClick={() => handleSyncGoogleDocs(true)}
                      disabled={isDocsSyncing}
                      className="flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 border border-blue-300/40 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">open_in_new</span>
                      Abrir no Google Docs (Nova Aba)
                    </button>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex flex-wrap justify-between items-center pt-2 gap-3">
                 <button 
                   onClick={handleShareNotes}
                   disabled={!notesDraft.trim()}
                   className="p-2.5 px-4 rounded-lg text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:hover:bg-transparent flex items-center gap-2 font-medium border border-white/20 text-sm"
                   title="Compartilhar Anotações"
                 >
                   <span className="material-symbols-outlined text-white text-lg">share</span>
                   <span className="text-white">Compartilhar</span>
                 </button>

                 <button 
                   onClick={() => setSelectedAppointmentForNotes(null)}
                   className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md flex items-center gap-2 text-sm cursor-pointer border border-emerald-400/40"
                 >
                   <span className="material-symbols-outlined text-lg">check</span>
                   Concluído
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      {currentUser && !['landing', 'main_menu', 'calendar', 'daily_agenda', 'dashboard', 'instructions', 'accounts', 'affiliate', 'profile', 'subscription', 'modules'].includes(view) && (
      <div className={`fixed top-6 z-[9999] flex flex-col items-end transition-all duration-300 right-6 pointer-events-none`}>
        <button
          onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
          className="w-12 h-12 rounded-full border-2 border-primary/50 shadow-2xl flex items-center justify-center text-on-surface hover:scale-105 transition-transform overflow-hidden cursor-pointer pointer-events-auto"
        >
          {isHamburgerOpen ? (
            <div className="w-full h-full bg-gradient-to-br from-[#5B0D8C] to-[#31034D] shadow-[inset_0px_0px_10px_rgba(0,0,0,0.5)] flex items-center justify-center">
              <span className="material-symbols-outlined text-white">close</span>
            </div>
          ) : (
            <img src={currentUser?.photoURL || "https://ui-avatars.com/api/?name=" + userName + "&background=random"} alt="Menu Avatar" className="w-full h-full object-cover" />
          )}
        </button>

        <div className={`mt-2 w-auto min-w-[220px] max-w-[290px] bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl overflow-hidden flex flex-col p-2 gap-1 transition-all duration-200 ${isHamburgerOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
          <button
            onClick={() => { setView('calendar'); setIsHamburgerOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent ${view === 'calendar' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface hover:border-primary hover:bg-surface-container-highest'}`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">calendar_month</span>
            <span className="min-w-0 flex-1 leading-tight">Calendário</span>
          </button>
          <button
            onClick={() => { setView('daily_agenda'); setIsHamburgerOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent ${view === 'daily_agenda' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface hover:border-primary hover:bg-surface-container-highest'}`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">view_day</span>
            <span className="min-w-0 flex-1 leading-tight">Agenda Diária</span>
          </button>
          <button
            onClick={() => { setView('dashboard'); setIsHamburgerOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent ${view === 'dashboard' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface hover:border-primary hover:bg-surface-container-highest'}`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">dashboard</span>
            <span className="min-w-0 flex-1 leading-tight">Dashboard</span>
          </button>
          <button
            onClick={() => { setView('accounts'); setIsHamburgerOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent ${view === 'accounts' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface hover:border-primary hover:bg-surface-container-highest'}`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_balance_wallet</span>
            <span className="min-w-0 flex-1 leading-tight">Gestão de Contas</span>
          </button>
          <button
            onClick={() => { setView('affiliate'); setIsHamburgerOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">groups</span>
            <span className="min-w-0 flex-1 leading-tight">Minha Rede</span>
          </button>
          <button
            onClick={() => { setView('profile'); setIsHamburgerOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_circle</span>
            <span className="min-w-0 flex-1 leading-tight">Perfil</span>
          </button>
          <button
            onClick={() => { setIsSupportModalOpen(true); setIsHamburgerOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">support_agent</span>
            <span className="min-w-0 flex-1 leading-tight">Ajuda & Suporte</span>
          </button>
          {isCurrentlyAdmin && (
            <button
              onClick={() => { setView('admin'); setIsHamburgerOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent ${view === 'admin' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface hover:border-primary hover:bg-surface-container-highest'}`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">admin_panel_settings</span>
              <span className="min-w-0 flex-1 leading-tight">Admin</span>
            </button>
          )}
          <button
            onClick={() => { setView('instructions'); setIsHamburgerOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent ${view === 'instructions' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface hover:border-primary hover:bg-surface-container-highest'}`}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">menu_book</span>
            <span className="min-w-0 flex-1 leading-tight">Instruções de uso</span>
          </button>
          {(!currentUser || isUserAdmin) && (
            <button
              onClick={() => { setView('landing'); setIsHamburgerOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent ${view === 'landing' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface hover:border-primary hover:bg-surface-container-highest'}`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">person_add</span>
              <span className="min-w-0 flex-1 leading-tight">Cadastro</span>
            </button>
          )}
        </div>
      </div>
      )}
      {/* 2FA Setup Modal */}
      {is2FASetupModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
              <h3 className="text-base font-bold text-on-surface">Configurar Google Authenticator</h3>
              <button 
                onClick={() => { setIs2FASetupModalOpen(false); setView('profile'); }} 
                className="text-on-surface-variant hover:text-error transition-colors"
               >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 flex flex-col items-center flex-1">
              <div className="text-sm text-on-surface-variant text-center mb-4 leading-relaxed">
                1. Instale o app Google Authenticator no seu celular.<br/>
                2. Escaneie o QR Code abaixo com o aplicativo.
              </div>
              
              {setup2FAQrCode ? (
                <div className="bg-white p-2 rounded-xl shadow-sm mb-4">
                  <img src={setup2FAQrCode} alt="QR Code 2FA" className="w-48 h-48 object-contain" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-surface-variant animate-pulse rounded-xl mb-4 flex items-center justify-center">
                   <span className="material-symbols-outlined text-on-surface-variant text-3xl">qr_code_scanner</span>
                </div>
              )}
              
              <div className="text-xs text-on-surface-variant text-center mb-4">
                Se não conseguir escanear, use o código manual:<br/>
                <code className="bg-surface-container-high px-2 py-1 rounded text-primary font-mono mt-1 block select-all">{setup2FASecret}</code>
              </div>

              <div className="w-full">
                <label className="text-sm font-medium text-on-surface flex flex-col gap-1 mb-4">
                  Código de 6 dígitos gerado pelo App:
                  <input 
                    type="text" 
                    maxLength={6}
                    value={setup2FAToken}
                    onChange={(e) => setSetup2FAToken(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-surface-container border border-outline text-on-surface text-center font-mono text-2xl tracking-[0.5em] rounded-lg block p-2"
                    placeholder="000000"
                  />
                </label>
                
                <button 
                  onClick={handleVerify2FASetup}
                  disabled={setup2FAToken.length < 6 || isVerifying2FA}
                  className="w-full bg-primary text-on-primary font-bold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:shadow-none"
                >
                  {isVerifying2FA ? 'Verificando...' : 'Confirmar e Ativar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Modal */}
      {isTwoFactorModalOpen && pendingLoginUser && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
              <h3 className="text-lg font-bold text-on-surface">Verificação em Duas Etapas</h3>
              <button onClick={() => { setIsTwoFactorModalOpen(false); setPendingLoginUser(null); }} className="text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col items-center text-center gap-2 mb-2">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-2">
                  <span className="material-symbols-outlined text-[32px]">phonelink_lock</span>
                </div>
                <p className="text-sm font-bold text-on-surface">Código de Segurança</p>
                <p className="text-xs text-on-surface-variant px-2">
                  {twoFactorCode === 'GOOGLE_AUTH' ? 
                    'Insira o código de 6 dígitos gerado pelo seu aplicativo Google Authenticator para confirmar o seu acesso.' : 
                    `Um código de 6 dígitos foi enviado para o seu e-mail (${pendingLoginUser?.email}) cadastrado para confirmar o seu acesso.`
                  }
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                <input 
                  type="text" 
                  value={twoFactorInput}
                  onChange={(e) => setTwoFactorInput(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="000000"
                  className="w-full bg-surface-container border border-outline-variant rounded-xl p-4 text-center text-2xl tracking-[0.5em] font-bold text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
              
              <button 
                onClick={handleConfirmTwoFactor}
                disabled={twoFactorInput.length !== 6 || isVerifying2FA}
                className="w-full bg-primary text-on-primary-fixed py-3 rounded-lg font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-2 flex items-center justify-center gap-2"
              >
                <span className={`material-symbols-outlined text-[20px] ${isVerifying2FA ? 'animate-spin' : ''}`}>{isVerifying2FA ? 'refresh' : 'verified'}</span>
                {isVerifying2FA ? 'Verificando...' : 'Confirmar e Entrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Google User Completion Modal */}
      {pendingGoogleUser && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
              <h3 className="text-lg font-bold text-on-surface">Finalize seu Cadastro</h3>
              <button onClick={() => setPendingGoogleUser(null)} className="text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-on-surface-variant">Para continuar com a conta Google, por favor preencha os dados abaixo.</p>
              
              {/* Banner de Oferta Promocional */}
              <div className="bg-gradient-to-r from-[#063322] via-[#094730] to-[#063322] border-2 border-emerald-400/80 rounded-xl p-3 shadow-[0_0_15px_rgba(52,211,153,0.3)] flex flex-col items-center sm:items-start gap-1 relative overflow-hidden">
                <div className="inline-flex items-center gap-1 bg-amber-400 text-gray-950 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                  <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
                  <span>Oferta por tempo limitado</span>
                </div>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="text-xs text-gray-300/80 font-semibold line-through decoration-gray-400">
                    De R$ 12,90
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-emerald-300 text-lg font-black tracking-tight drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                      Por R$ 9,90
                    </span>
                    <span className="text-[10px] text-emerald-200/90 font-bold uppercase">/mês</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-on-surface-variant">CPF</label>
                <input 
                  type="text" 
                  id="pending-cpf"
                  placeholder="000.000.000-00"
                  className="w-full bg-surface-container border border-outline-variant rounded p-3 text-sm text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-on-surface-variant">WhatsApp (com DDD)</label>
                <input 
                  type="text" 
                  id="pending-whatsapp"
                  placeholder="(11) 99999-9999"
                  className="w-full bg-surface-container border border-outline-variant rounded p-3 text-sm text-on-surface outline-none focus:border-primary"
                />
              </div>

              <button 
                onClick={() => {
                  const cpf = (document.getElementById('pending-cpf') as HTMLInputElement)?.value || '';
                  const whatsapp = (document.getElementById('pending-whatsapp') as HTMLInputElement)?.value || '';
                  if (cpf && !isValidCPF(cpf)) {
                    alert('O CPF informado é inválido. Por favor, verifique.');
                    return;
                  }
                  handleUserLogin(pendingGoogleUser.name, whatsapp, pendingGoogleUser.isAffiliateOptIn, pendingGoogleUser.email, cpf);
                  setPendingGoogleUser(null);
                }}
                className="w-full bg-primary text-on-primary-fixed py-3 rounded-lg font-bold hover:opacity-90 transition-opacity mt-2"
              >
                Concluir e Acessar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Error Modal */}
      {authError && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#06402B] border border-outline-variant rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">warning</span>
                <h3 className="text-lg font-bold text-white">Login com Conta Google</h3>
              </div>
              <button onClick={() => setAuthError(null)} className="text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined text-white">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 text-white overflow-y-auto max-h-[75vh]">
              {authError.code === 'iframe' ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-gray-200 leading-relaxed">
                    Por motivos de segurança e privacidade, os navegadores modernos (como Chrome, Safari e Edge) <strong>bloqueiam o login do Google dentro de telas incorporadas (iframes)</strong>.
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-amber-400">
                    Para fazer login com segurança, use o botão abaixo para abrir o aplicativo diretamente em uma nova aba do navegador.
                  </div>
                  <button 
                    onClick={() => {
                      window.open(window.location.href, '_blank');
                      setAuthError(null);
                    }}
                    className="w-full bg-primary text-on-primary-fixed py-3 rounded-lg font-bold hover:opacity-90 transition-opacity mt-2 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">open_in_new</span>
                    Abrir em Nova Aba
                  </button>
                </div>
              ) : authError.code === 'auth/unauthorized-domain' ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-gray-200">
                    O domínio <strong>{authError.hostname}</strong> ainda não está autorizado para fazer login com o Google no seu projeto do Firebase.
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">build</span> Como Configurar no Firebase:
                    </span>
                    <ol className="list-decimal list-inside text-[11px] text-gray-300 flex flex-col gap-1.5">
                      <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80">Console do Firebase</a>.</li>
                      <li>Abra o projeto <strong>agio-agenda</strong>.</li>
                      <li>No menu lateral, vá em <strong>Authentication</strong> e clique na aba <strong>Configurações</strong> (Settings).</li>
                      <li>Selecione <strong>Domínios autorizados</strong> (Authorized domains).</li>
                      <li>Clique em <strong>Adicionar domínio</strong> e cole: <code className="bg-black/30 px-1 rounded font-mono text-[10px] select-all">{authError.hostname}</code></li>
                      <li>Clique em <strong>Salvar</strong> e recarregue esta página!</li>
                    </ol>
                  </div>
                  <button 
                    onClick={() => setAuthError(null)}
                    className="w-full bg-primary text-on-primary-fixed py-2.5 rounded-lg font-bold hover:opacity-90 transition-opacity mt-2 text-sm"
                  >
                    Entendi, vou configurar
                  </button>
                </div>
              ) : (authError.code === 'auth/operation-not-allowed' || authError.code === 'auth/configuration-not-found') ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-gray-200">
                    O Provedor de Login do Google ainda não está ativado ou configurado no seu projeto Firebase Console.
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">build</span> Como Ativar no Firebase:
                    </span>
                    <ol className="list-decimal list-inside text-[11px] text-gray-300 flex flex-col gap-1.5 leading-relaxed">
                      <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold underline hover:opacity-80">Console do Firebase</a>.</li>
                      <li>Selecione o seu projeto Firebase (ex: <strong>agio-agenda</strong>).</li>
                      <li>No menu lateral esquerdo, vá em <strong>Build / Construção</strong> &gt; <strong>Authentication</strong>.</li>
                      <li>Acesse a aba <strong>Método de login</strong> (Sign-in method).</li>
                      <li>Clique em <strong>Adicionar novo provedor</strong> e escolha <strong>Google</strong>.</li>
                      <li>Ative a opção <strong>Habilitar</strong> (Enable), informe o e-mail de suporte do projeto e clique em <strong>Salvar</strong>.</li>
                      <li>Pronto! Recarregue esta página e tente entrar com o Google novamente.</li>
                    </ol>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-2">
                    <button 
                      onClick={() => {
                        setAuthError(null);
                        const emailInput = document.getElementById('loginEmail') || document.getElementById('name');
                        if (emailInput) {
                          emailInput.focus();
                          emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="w-full bg-primary text-on-primary-fixed py-2.5 rounded-lg font-bold hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">mail</span>
                      Entrar com E-mail ou WhatsApp
                    </button>
                    <button 
                      onClick={() => setAuthError(null)}
                      className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-semibold transition-colors text-xs"
                    >
                      Entendi, vou configurar no Firebase
                    </button>
                  </div>
                </div>
              ) : authError.code === 'auth/popup-blocked' ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-gray-200">
                    O pop-up de login do Google foi bloqueado pelo seu navegador.
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-amber-400">
                    Por favor, permita pop-ups para este site nas configurações do seu navegador ou clique no botão de login novamente.
                  </div>
                  <button 
                    onClick={() => setAuthError(null)}
                    className="w-full bg-primary text-on-primary-fixed py-2.5 rounded-lg font-bold hover:opacity-90 transition-opacity mt-2 text-sm"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-gray-200">
                    Não foi possível concluir o login com a conta Google.
                  </p>
                  <div className="bg-black/30 border border-white/10 rounded-lg p-3 font-mono text-xs text-rose-300 break-all">
                    Código: {authError.code}<br />
                    Mensagem: {authError.message}
                  </div>
                  <p className="text-xs text-gray-400">
                    Certifique-se de que o aplicativo esteja aberto fora do iframe de visualização (em uma nova aba) e que os provedores de login do Firebase estejam configurados corretamente.
                  </p>
                  <button 
                    onClick={() => setAuthError(null)}
                    className="w-full bg-primary text-on-primary-fixed py-2.5 rounded-lg font-bold hover:opacity-90 transition-opacity mt-2 text-sm"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expiration Modal */}
      {isExpirationModalOpen && currentUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col gap-4 text-center">
              <span className="material-symbols-outlined text-[48px] text-error mx-auto mb-2">hourglass_disabled</span>
              <h3 className="text-xl font-bold text-on-surface">Período de Teste Expirado</h3>
              <p className="text-sm text-on-surface-variant">
                Seu período de gratuidade chegou ao fim. Para continuar usando todos os recursos, você precisa contratar um plano VIP.
              </p>
              
              {(() => {
                const status = getExpirationStatus(currentUser);
                if (currentUser.plan === 'free' && status.daysSinceTrialExpiration > 0) {
                  let discount = 0;
                  if (status.daysSinceTrialExpiration <= 7) discount = 30;
                  else if (status.daysSinceTrialExpiration <= 14) discount = 20;
                  else if (status.daysSinceTrialExpiration <= 21) discount = 10;
                  
                  if (discount > 0) {
                    return (
                      <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl mt-2 flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-emerald-400"></div>
                        <span className="material-symbols-outlined text-primary text-3xl mx-auto mt-1">local_offer</span>
                        <h4 className="font-black text-primary uppercase tracking-tight text-lg leading-tight">Oferta Especial de Retorno</h4>
                        <p className="text-sm text-on-surface font-medium">Volte hoje e garanta <span className="font-black text-xl text-primary">{discount}% OFF</span> na sua assinatura!</p>
                        <p className="text-xs text-on-surface-variant mt-1">Desconto será aplicado automaticamente ao escolher seu plano.</p>
                        <button 
                          onClick={() => {
                            setIsExpirationModalOpen(false);
                            setAppliedDiscount({ code: `OFERTA${discount}`, pct: discount });
                            setView('subscription');
                          }}
                          className="mt-3 w-full bg-primary text-on-primary-fixed hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,189,174,0.3)] py-3 rounded-lg font-bold text-sm transition-all"
                        >
                          Aproveitar Desconto
                        </button>
                      </div>
                    );
                  }
                }
                return (
                  <button 
                    onClick={() => {
                      setIsExpirationModalOpen(false);
                      setView('subscription');
                    }}
                    className="mt-4 w-full bg-primary text-on-primary-fixed hover:-translate-y-0.5 hover:shadow-lg py-3 rounded-lg font-bold text-sm transition-all"
                  >
                    Ver Módulos
                  </button>
                );
              })()}
              
              <button 
                onClick={() => {
                  setIsExpirationModalOpen(false);
                  setView('landing');
                  setCurrentUser(null);
                }}
                className="text-sm font-medium text-error hover:text-error/80 transition-colors mt-2"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Affiliate Expiration Modal */}
      {isAffiliateExpirationModalOpen && currentUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#06402B] border border-amber-400/40 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto text-amber-300 shadow-lg">
                <span className="material-symbols-outlined text-[36px]">workspace_premium</span>
              </div>
              
              <h3 className="text-xl font-bold text-white">Acesso de Afiliado Ativo</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 w-fit mx-auto">
                Gratuidade da Agenda Expirada (40 Dias)
              </span>
              
              <p className="text-sm text-white/80 leading-relaxed">
                Seu período de gratuidade de 40 dias da agenda expirou. Como afiliado, você tem acesso <strong className="text-white">exclusivo ao Painel de Afiliados</strong>, links de indicação e saldo de comissões.
              </p>
              
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl text-left text-xs text-white/90 space-y-1.5">
                <p className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                  <span><strong>Painel de Afiliados:</strong> Acesso Liberado</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400 text-sm">lock</span>
                  <span><strong>Agenda & Ferramentas:</strong> Bloqueado (Requer Plano VIP)</span>
                </p>
              </div>

              <p className="text-xs text-white/70">
                Para desbloquear o acesso ao Calendário, Agenda Diária, Tarefas, Lembretes e Relatórios, contrate um plano de assinatura.
              </p>

              <div className="flex flex-col gap-2 mt-2">
                <button 
                  onClick={() => {
                    setIsAffiliateExpirationModalOpen(false);
                    setView('subscription');
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3.5 rounded-xl font-extrabold text-sm transition-all shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">lock_open</span>
                  Desbloquear Assinando um Plano
                </button>

                <button 
                  onClick={() => {
                    setIsAffiliateExpirationModalOpen(false);
                    setView('affiliate');
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                  Ir para o Painel de Afiliados
                </button>
              </div>

              <button 
                onClick={() => {
                  setIsAffiliateExpirationModalOpen(false);
                }}
                className="text-xs font-medium text-white/60 hover:text-white transition-colors mt-1"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      

      {/* Payment Modal */}
      {paymentPlan && view !== 'subscription' && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] border border-white/20 rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/20 flex justify-between items-center sticky top-0 bg-surface-container-low z-10">
              <h3 className="text-lg font-bold text-white">Finalizar Pagamento</h3>
              <button 
                onClick={() => { setPaymentPlan(null); setAppliedDiscount(null); setCouponCode(''); setSelectedPaymentMethod(null); setPixData(null); }} 
                className="text-white hover:text-white/70 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-4 bg-white/10 flex flex-col items-start gap-0.5">
              <p className="text-sm text-white mb-1">Você está assinando:</p>
              <div className="w-full flex justify-between items-start">
                <div>
                  <p className="text-lg font-bold text-white leading-tight">{paymentPlan.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black text-white leading-tight">R$ {paymentPlan.price.toFixed(2).replace('.', ',')}</p>
                    {appliedDiscount && paymentPlan.originalPrice && paymentPlan.originalPrice > paymentPlan.price && (
                      <span className="text-sm text-white/50 line-through">R$ {paymentPlan.originalPrice.toFixed(2).replace('.', ',')}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="w-full flex flex-col gap-2 mt-3 pt-3 border-t border-white/20">
                <p className="text-xs font-semibold text-white/80">Possui cupom de desconto?</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={couponCode} 
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    disabled={appliedDiscount !== null}
                    placeholder="Ex: PROMO20" 
                    className="flex-1 bg-surface-container-high border border-white/30 rounded p-2 text-sm text-white outline-none focus:border-white uppercase disabled:opacity-50"
                  />
                  {!appliedDiscount ? (
                    <button 
                      onClick={() => {
                        const settingsStr = localStorage.getItem('agenda_settings');
                        const settings = settingsStr ? JSON.parse(settingsStr) : {};
                        const coupons = settings.coupons || [];
                        const validCoupon = coupons.find((c: any) => c.code === couponCode.toUpperCase() && c.active);
                        
                        if (validCoupon) {
                          setAppliedDiscount({code: validCoupon.code, pct: validCoupon.pct});
                          
                          // Recalculate price
                          const base = paymentPlan.originalPrice || paymentPlan.price;
                          const newPrice = Number((base * (1 - validCoupon.pct / 100)).toFixed(2));
                          
                          setPaymentPlan({ ...paymentPlan, price: newPrice, originalPrice: base });
                          setSelectedPaymentMethod(null);
                          setPixData(null);
                        } else {
                          alert('Cupom inválido ou expirado.');
                        }
                      }}
                      className="bg-white text-black px-3 py-2 rounded text-sm font-bold shadow-sm active:scale-95 transition-transform"
                    >
                      Aplicar
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setAppliedDiscount(null);
                        setCouponCode('');
                        const base = paymentPlan.originalPrice || paymentPlan.price;
                        setPaymentPlan({ ...paymentPlan, price: base, originalPrice: base });
                        setSelectedPaymentMethod(null);
                        setPixData(null);
                      }}
                      className="bg-error text-white px-3 py-2 rounded text-sm font-bold shadow-sm active:scale-95 transition-transform"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {appliedDiscount && (
                   <p className="text-xs text-primary font-bold bg-primary/10 w-fit px-2 py-0.5 rounded mt-0.5 border border-primary/20">
                     Cupom {appliedDiscount.code} ({appliedDiscount.pct}% OFF) aplicado!
                   </p>
                )}
              </div>

              {paymentPlan.type === 'semiannual' && !appliedDiscount && (
                <div className="inline-block bg-[#ffea00] text-black px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider mt-2 shadow-md border border-yellow-300">
                  DESCONTO 15%
                </div>
              )}
            </div>

            <div className="p-4 flex-1">
              {!selectedPaymentMethod ? (
                <div className="flex flex-col gap-3 mt-2">
                  <p className="text-sm font-bold text-white mb-1">Escolha a forma de pagamento:</p>
                  <button onClick={() => setSelectedPaymentMethod('pix')} className="w-full flex items-center gap-3 p-4 border border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 transition-colors text-left group">
                    <span className="material-symbols-outlined text-[32px] text-[#00bdae] group-hover:scale-110 transition-transform">pix</span>
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">PIX</p>
                      <p className="text-xs text-white">Aprovação imediata (10% OFF)</p>
                    </div>
                    <span className="material-symbols-outlined text-white group-hover:text-white/70">chevron_right</span>
                  </button>
                  <button onClick={() => setSelectedPaymentMethod('credit_card')} className="w-full flex items-center gap-3 p-4 border border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 transition-colors text-left group">
                    <span className="material-symbols-outlined text-[32px] text-white group-hover:scale-110 transition-transform">credit_card</span>
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">Cartão de Crédito</p>
                      <p className="text-xs text-white">Crédito ou Débito</p>
                    </div>
                  </button>
                </div>
              ) : selectedPaymentMethod === 'pix' && mpConfig.accessToken ? (
              <div className="flex flex-col items-center justify-center mb-6 pt-2 pb-4 border-b border-white/20">
                 <div className="w-full flex items-center justify-between mb-4 mt-2">
                   <button onClick={() => { setSelectedPaymentMethod(null); setPixData(null); }} className="text-xs text-white hover:text-white/70 underline">Voltar</button>
                 </div>
                 <h4 className="font-bold text-white mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-[#00bdae]">pix</span> PIX (Aprovação Imediata)</h4>
                 {isPixLoading ? (
                   <div className="w-48 h-48 bg-surface-container flex items-center justify-center rounded-xl animate-pulse">
                      <span className="material-symbols-outlined animate-spin text-white text-[32px]">refresh</span>
                   </div>
                 ) : pixData ? (
                   <>
                     <div className="w-48 h-48 bg-white p-2 rounded-xl shadow-md border border-white/20 flex items-center justify-center">
                        <img src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="max-w-full max-h-full" />
                     </div>
                     <p className="text-xs text-white text-center mt-3 mb-2 px-4">Escaneie o QR Code acima no app do seu banco ou copie o código abaixo:</p>
                     <div className="w-full flex items-center gap-2 mt-1">
                        <input type="text" readOnly value={pixData.qr_code} className="flex-1 bg-surface-container-high border border-white/20 text-white text-[10px] p-2.5 rounded-lg outline-none font-mono" />
                        <button onClick={() => { navigator.clipboard.writeText(pixData.qr_code); setPixCopied(true); setTimeout(() => setPixCopied(false), 2000); }} className="bg-white border border-white/20 text-black px-3 py-2.5 rounded-lg text-xs font-bold hover:bg-white/90 flex items-center gap-1 shrink-0 transition-all">
                           <span className="material-symbols-outlined text-[16px]">{pixCopied ? 'check' : 'content_copy'}</span>
                           {pixCopied ? 'Copiado' : 'Copiar'}
                        </button>
                     </div>
                     
                   </>
                 ) : (
                   <p className="text-sm text-error">Não foi possível gerar código PIX. Tente outra forma de pagamento.</p>
                 )}
              </div>
              ) : selectedPaymentMethod === 'pix' && !mpConfig.accessToken ? (
                <div className="p-4 text-center bg-error/10 border border-error/20 rounded-lg">
                  <div className="w-full flex items-center justify-between mb-4">
                    <button onClick={() => setSelectedPaymentMethod(null)} className="text-xs text-white hover:text-white/70 underline">Voltar</button>
                  </div>
                  <span className="material-symbols-outlined text-error mb-2 text-3xl">warning</span>
                  <p className="text-sm font-bold text-error">Gateway não configurado</p>
                  <p className="text-xs text-white mt-1">Configure as credenciais do Mercado Pago no painel Admin.</p>
                </div>
              ) : selectedPaymentMethod === 'credit_card' && mpConfig.publicKey ? (
                <div className="flex flex-col">
                 <div className="w-full flex items-center justify-between mb-4 mt-2">
                   <button onClick={() => setSelectedPaymentMethod(null)} className="text-xs text-white hover:text-white/70 underline">Voltar</button>
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
                            // On successful payment, update user plan
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
                            }
                            alert("Pagamento confirmado com sucesso! Seu acesso foi liberado.");
                            setPaymentPlan(null);
                            resolve();
                            window.location.reload();
                          } else if (response.status === 'in_process') {
                             alert("Seu pagamento está em processamento e será aprovado em breve. Acompanhe pelo seu e-mail.");
                             resolve();
                          } else {
                             alert(`O pagamento não foi aprovado (Status: ${response.status_detail || response.status}). Tente outro cartão ou forma de pagamento.`);
                             reject(new Error("Pagamento não aprovado"));
                          }
                        })
                        .catch((error) => {
                          console.error(error);
                          alert("Erro ao processar pagamento");
                          reject(error);
                        });
                    });
                  }}
                  onError={(error) => {
                    console.error(error);
                    alert("Ocorreu um erro ao carregar o módulo de pagamento. Verifique o console.");
                  }}
                  onReady={() => {
                    console.log('Payment Brick ready');
                  }}
                />
               </div>
              ) : selectedPaymentMethod === 'credit_card' && !mpConfig.publicKey ? (
                <div className="p-4 text-center bg-error/10 border border-error/20 rounded-lg">
                  <div className="w-full flex items-center justify-between mb-4">
                    <button onClick={() => setSelectedPaymentMethod(null)} className="text-xs text-on-surface-variant hover:text-primary underline">Voltar</button>
                  </div>
                  <span className="material-symbols-outlined text-error mb-2 text-3xl">warning</span>
                  <p className="text-sm font-bold text-error">Gateway não configurado</p>
                  <p className="text-xs text-on-surface-variant mt-1">Configure as credenciais do Mercado Pago no painel Admin.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      
      {/* Visual Editor Global Toggle (Admin Only) */}
      {isCurrentlyAdmin && view !== 'admin' && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2">
          <button 
            onClick={() => setIsVisualEditorActive(!isVisualEditorActive)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${isVisualEditorActive ? 'bg-[#ec4899] text-white animate-pulse shadow-[#ec4899]/50' : 'bg-surface-container-high text-on-surface hover:bg-surface-variant shadow-black/20'}`}
            title="Modo de Edição Visual"
          >
            <span className="material-symbols-outlined">{isVisualEditorActive ? 'edit_off' : 'format_paint'}</span>
          </button>
          
          {visualUndoStack.length > 0 && (
             <button 
                onClick={() => {
                   const last = visualUndoStack[visualUndoStack.length - 1];
                   setVisualEdits(last);
                   setVisualUndoStack(visualUndoStack.slice(0, -1));
                }}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl bg-surface-container text-on-surface hover:bg-surface-variant transition-all hover:-translate-y-1"
                title="Desfazer Edição Visual"
             >
                <span className="material-symbols-outlined text-[20px]">undo</span>
             </button>
          )}
        </div>
      )}

      {/* Visual Editor Toolbar Popup */}
      {isVisualEditorActive && visualEditorTarget && (
        <div id="visual-editor-toolbar" className="fixed top-[20%] left-1/2 transform -translate-x-1/2 bg-[#1e1e2e] border border-white/20 shadow-2xl rounded-2xl p-6 z-[9999] w-[90%] max-w-[400px] animate-in slide-in-from-bottom-10 fade-in duration-200">
          <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ec4899]">brush</span>
                Editar Elemento
             </h3>
             <button onClick={() => setVisualEditorTarget(null)} className="text-white/60 hover:text-white transition-colors bg-white/5 rounded-full p-1 border border-white/10 hover:bg-white/20">
                <span className="material-symbols-outlined text-[18px] block">close</span>
             </button>
          </div>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
             <div className="text-xs text-[#ec4899] bg-[#ec4899]/10 border border-[#ec4899]/20 p-2.5 rounded-lg break-all font-mono">
               {visualEditorTarget.selector}
             </div>

             {visualEditorTarget.text !== undefined && (
               <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5 flex justify-between items-end">
                    Texto
                  </label>
                  <textarea 
                     rows={3}
                     className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] outline-none transition-all resize-none"
                     value={visualEditorTarget.editedText !== undefined ? visualEditorTarget.editedText : (visualEditorTarget.text || '')}
                     onChange={e => setVisualEditorTarget({...visualEditorTarget, editedText: e.target.value})}
                  />
               </div>
             )}

             <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-white/80">Cor da Fonte</label>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setVisualEditorTarget({...visualEditorTarget, isGradient: false})}
                         className={`text-xs px-2 py-1 rounded ${!visualEditorTarget.isGradient ? 'bg-[#ec4899] text-white' : 'bg-white/10 text-white/60'}`}
                       >Sólida</button>
                       <button 
                         onClick={() => setVisualEditorTarget({...visualEditorTarget, isGradient: true})}
                         className={`text-xs px-2 py-1 rounded ${visualEditorTarget.isGradient ? 'bg-[#ec4899] text-white' : 'bg-white/10 text-white/60'}`}
                       >Degradê</button>
                    </div>
                  </div>
                  
                  {!visualEditorTarget.isGradient ? (
                    <div className="flex bg-black/40 border border-white/10 rounded-lg focus-within:border-[#ec4899] focus-within:ring-1 focus-within:ring-[#ec4899] transition-all overflow-hidden p-1">
                       <input 
                         type="color" 
                         className="w-10 h-8 p-0 border-0 bg-transparent cursor-pointer rounded"
                         value={visualEditorTarget.editedColor?.startsWith('#') ? visualEditorTarget.editedColor : '#ffffff'}
                         onChange={e => setVisualEditorTarget({...visualEditorTarget, editedColor: e.target.value, editedBackground: '', editedBackgroundClip: ''})}
                       />
                       <input type="text" 
                         className="w-full bg-transparent px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none"
                         value={visualEditorTarget.editedColor !== undefined ? visualEditorTarget.editedColor : (visualEditorTarget.current.color || '')}
                         onChange={e => setVisualEditorTarget({...visualEditorTarget, editedColor: e.target.value, editedBackground: '', editedBackgroundClip: ''})}
                       />
                    </div>
                  ) : (
                    <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5 relative">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-[10px] text-white/60 mb-1 uppercase tracking-wider">Cor Inicial</label>
                          <div className="flex bg-black/40 border border-white/10 rounded-lg overflow-hidden p-1">
                             <input type="color" className="w-8 h-6 p-0 border-0 bg-transparent cursor-pointer rounded"
                               value={visualEditorTarget.gradStart || '#ec4899'}
                               onChange={e => {
                                 const gradStart = e.target.value;
                                 const gradEnd = visualEditorTarget.gradEnd || '#8b5cf6';
                                 const dir = visualEditorTarget.gradDir || 'to right';
                                 setVisualEditorTarget({...visualEditorTarget, gradStart, editedBackground: `linear-gradient(${dir}, ${gradStart}, ${gradEnd})`, editedBackgroundClip: 'text', editedColor: 'transparent'})
                               }}
                             />
                             <input type="text" className="w-full bg-transparent px-2 text-xs text-white outline-none" value={visualEditorTarget.gradStart || '#ec4899'} 
                               onChange={e => {
                                 const gradStart = e.target.value;
                                 const gradEnd = visualEditorTarget.gradEnd || '#8b5cf6';
                                 const dir = visualEditorTarget.gradDir || 'to right';
                                 setVisualEditorTarget({...visualEditorTarget, gradStart, editedBackground: `linear-gradient(${dir}, ${gradStart}, ${gradEnd})`, editedBackgroundClip: 'text', editedColor: 'transparent'})
                               }}
                             />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-white/60 mb-1 uppercase tracking-wider">Cor Final</label>
                          <div className="flex bg-black/40 border border-white/10 rounded-lg overflow-hidden p-1">
                             <input type="color" className="w-8 h-6 p-0 border-0 bg-transparent cursor-pointer rounded"
                               value={visualEditorTarget.gradEnd || '#8b5cf6'}
                               onChange={e => {
                                 const gradEnd = e.target.value;
                                 const gradStart = visualEditorTarget.gradStart || '#ec4899';
                                 const dir = visualEditorTarget.gradDir || 'to right';
                                 setVisualEditorTarget({...visualEditorTarget, gradEnd, editedBackground: `linear-gradient(${dir}, ${gradStart}, ${gradEnd})`, editedBackgroundClip: 'text', editedColor: 'transparent'})
                               }}
                             />
                             <input type="text" className="w-full bg-transparent px-2 text-xs text-white outline-none" value={visualEditorTarget.gradEnd || '#8b5cf6'} 
                               onChange={e => {
                                 const gradEnd = e.target.value;
                                 const gradStart = visualEditorTarget.gradStart || '#ec4899';
                                 const dir = visualEditorTarget.gradDir || 'to right';
                                 setVisualEditorTarget({...visualEditorTarget, gradEnd, editedBackground: `linear-gradient(${dir}, ${gradStart}, ${gradEnd})`, editedBackgroundClip: 'text', editedColor: 'transparent'})
                               }}
                             />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-white/60 mb-1 uppercase tracking-wider">Direção</label>
                        <select className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                          value={visualEditorTarget.gradDir || 'to right'}
                          onChange={e => {
                            const dir = e.target.value;
                            const gradStart = visualEditorTarget.gradStart || '#ec4899';
                            const gradEnd = visualEditorTarget.gradEnd || '#8b5cf6';
                            setVisualEditorTarget({...visualEditorTarget, gradDir: dir, editedBackground: `linear-gradient(${dir}, ${gradStart}, ${gradEnd})`, editedBackgroundClip: 'text', editedColor: 'transparent'})
                          }}
                        >
                          <option value="to right">Esquerda para Direita</option>
                          <option value="to left">Direita para Esquerda</option>
                          <option value="to bottom">Cima para Baixo</option>
                          <option value="to top">Baixo para Cima</option>
                          <option value="to bottom right">Diagonal</option>
                        </select>
                      </div>
                    </div>
                  )}
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Tamanho (ex: 24px)</label>
                  <input type="text" 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] outline-none transition-all"
                    value={visualEditorTarget.editedFontSize !== undefined ? visualEditorTarget.editedFontSize : (visualEditorTarget.current.fontSize || '')}
                    onChange={e => setVisualEditorTarget({...visualEditorTarget, editedFontSize: e.target.value})}
                  />
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Peso (bold, 600)</label>
                  <input type="text" 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] outline-none transition-all"
                    value={visualEditorTarget.editedFontWeight !== undefined ? visualEditorTarget.editedFontWeight : (visualEditorTarget.current.fontWeight || '')}
                    onChange={e => setVisualEditorTarget({...visualEditorTarget, editedFontWeight: e.target.value})}
                  />
               </div>

               <div className="col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Família da Fonte</label>
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] outline-none transition-all appearance-none"
                    value={visualEditorTarget.editedFontFamily !== undefined ? visualEditorTarget.editedFontFamily : (visualEditorTarget.current.fontFamily || '')}
                    onChange={e => setVisualEditorTarget({...visualEditorTarget, editedFontFamily: e.target.value})}
                  >
                    <option value="">Padrão (Herdar)</option>
                    <option value="'Public Sans', sans-serif">Public Sans</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                    <option value="'Open Sans', sans-serif">Open Sans</option>
                    <option value="'Montserrat', sans-serif">Montserrat</option>
                    <option value="'Poppins', sans-serif">Poppins</option>
                    <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                    <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                    <option value="sans-serif">Sans-serif Padrão</option>
                    <option value="serif">Serif Padrão</option>
                  </select>
               </div>
             </div>

             <div className="pt-5 flex gap-3 justify-end border-t border-white/10 mt-2">
                {visualEdits[visualEditorTarget.selector] && (
                  <button 
                    onClick={() => {
                       const selector = visualEditorTarget.selector;
                       const newEdits = { ...visualEdits };
                       delete newEdits[selector];
                       setVisualUndoStack([...visualUndoStack, visualEdits]);
                       setVisualEdits(newEdits);
                       setVisualEditorTarget(null);
                    }}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg font-medium transition-colors text-sm flex items-center gap-1.5 group"
                  >
                     <span className="material-symbols-outlined text-[16px] group-hover:-translate-y-0.5 transition-transform">delete</span>
                     Apagar
                  </button>
                )}
                <button 
                  onClick={() => {
                     setVisualUndoStack([...visualUndoStack, visualEdits]);
                     setVisualEdits({
                        ...visualEdits,
                        [visualEditorTarget.selector]: {
                           text: visualEditorTarget.editedText !== undefined ? visualEditorTarget.editedText : visualEditorTarget.text,
                           color: visualEditorTarget.editedColor !== undefined ? visualEditorTarget.editedColor : visualEditorTarget.current.color,
                           fontSize: visualEditorTarget.editedFontSize !== undefined ? visualEditorTarget.editedFontSize : visualEditorTarget.current.fontSize,
                           fontWeight: visualEditorTarget.editedFontWeight !== undefined ? visualEditorTarget.editedFontWeight : visualEditorTarget.current.fontWeight,
                           fontFamily: visualEditorTarget.editedFontFamily !== undefined ? visualEditorTarget.editedFontFamily : visualEditorTarget.current.fontFamily,
                           background: visualEditorTarget.editedBackground !== undefined ? visualEditorTarget.editedBackground : visualEditorTarget.current.background,
                           backgroundClip: visualEditorTarget.editedBackgroundClip !== undefined ? visualEditorTarget.editedBackgroundClip : undefined
                        }
                     });
                     setVisualEditorTarget(null);
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white rounded-lg font-medium shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all text-sm flex items-center gap-1.5"
                >
                   <span className="material-symbols-outlined text-[16px]">check</span>
                   Salvar
                </button>
             </div>
          </div>
        </div>


      )}

      {/* Administrador Environment Switcher Floating Control */}
      {isUserAdmin && view !== 'landing' && (
        <div className="fixed bottom-24 left-6 z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-left-5 duration-300" id="admin-env-switcher">
          <div className="flex items-center bg-neutral-950/90 hover:bg-neutral-950 backdrop-blur-md border border-white/20 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-1.5 pl-3.5 pr-1.5 gap-3 transition-all duration-300">
            <div className="flex flex-col">
              <span className="text-[8px] font-extrabold text-white/40 uppercase tracking-widest leading-none">Ambiente</span>
              <span className="text-[11px] font-bold text-white leading-tight mt-0.5 whitespace-nowrap flex items-center gap-1">
                {adminEnvMode === 'admin' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    👑 Administrador
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    👥 Usuário Comum
                  </>
                )}
              </span>
            </div>
            <button 
              onClick={() => {
                const nextMode = adminEnvMode === 'admin' ? 'user' : 'admin';
                setAdminEnvMode(nextMode);
                localStorage.setItem('admin_env_mode', nextMode);
                if (nextMode === 'admin') {
                  setView('admin');
                } else {
                  setView('main_menu');
                }
              }}
              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase transition-all duration-300 active:scale-95 shadow-md flex items-center gap-1 cursor-pointer ${
                adminEnvMode === 'admin' 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/20' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20'
              }`}
              title={adminEnvMode === 'admin' ? 'Alternar para Ambiente de Usuário Comum' : 'Alternar para Ambiente de Administrador'}
            >
              <span className="material-symbols-outlined text-[12px]" translate="no">sync_alt</span>
              Trocar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

