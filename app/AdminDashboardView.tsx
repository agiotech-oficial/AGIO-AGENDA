import React, { useState, useEffect } from 'react';
import { NavigationBar } from '../components/NavigationBar';
import { ResourceUsageDashboard } from '../components/ResourceUsageDashboard';
import { TouchButton } from './MainMenuView';

const generateBackupData = (type: 'complete' | 'system') => {
  const allSettings = typeof window !== 'undefined' ? (localStorage.getItem('agenda_settings') || '{}') : '{}';
  const allThemeSettings = typeof window !== 'undefined' ? (localStorage.getItem('agenda_theme_settings') || '{}') : '{}';
  
  if (type === 'system') {
    return {
      settings: JSON.parse(allSettings),
      themeSettings: JSON.parse(allThemeSettings),
    };
  }
  
  const allUsers = typeof window !== 'undefined' ? (localStorage.getItem('agenda_users') || '[]') : '[]';
  const allTrackingLogs = typeof window !== 'undefined' ? (localStorage.getItem('agenda_tracking_logs') || '[]') : '[]';
  const allMarketingMaterials = typeof window !== 'undefined' ? (localStorage.getItem('agenda_marketing_materials') || '[]') : '[]';
  const allSupportReports = typeof window !== 'undefined' ? (localStorage.getItem('agenda_support_reports') || '[]') : '[]';
  const allWithdrawals = typeof window !== 'undefined' ? (localStorage.getItem('agenda_withdrawals') || '[]') : '[]';
  
  return {
    settings: JSON.parse(allSettings),
    users: JSON.parse(allUsers),
    trackingLogs: JSON.parse(allTrackingLogs),
    marketingMaterials: JSON.parse(allMarketingMaterials),
    supportReports: JSON.parse(allSupportReports),
    themeSettings: JSON.parse(allThemeSettings),
    withdrawals: JSON.parse(allWithdrawals),
  };
};

export function AdminDashboardView({ onNavigate, appColor, setAppColor, appBgImage, setAppBgImage, onOpenSupport, onSettingsUpdated, onLogout }: { onNavigate: (view: string) => void, appColor?: string, setAppColor?: (c: string) => void, appBgImage?: string, setAppBgImage?: (img: string) => void, onOpenSupport?: () => void, onSettingsUpdated?: () => void, onLogout?: () => void }) {
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const getExpirationStatus = (user: any) => {
    const now = new Date();
    const isDalecio = (user.name && (user.name.toUpperCase().includes('DALÉCIO') || user.name.toUpperCase().includes('DALECIO'))) || 
                      (user.cpf && user.cpf.replace(/\D/g, '') === '10896050726') ||
                      (user.email && user.email.toLowerCase().trim() === 'agiotech.oficial@gmail.com');
    if (isDalecio) {
      return { trialDaysRemaining: 99999, trialEnd: new Date(now.getTime() + 99999 * 24 * 60 * 60 * 1000), planDaysRemaining: 99999, planEnd: new Date(now.getTime() + 99999 * 24 * 60 * 60 * 1000), planExpired: false, isLifetime: true };
    }

    const createdDate = new Date(user.createdAt || new Date());
    const trialDays = user.freeTrialDays ?? 40;
    const trialEnd = new Date(createdDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const trialDiff = trialEnd.getTime() - now.getTime();
    const trialDaysRemaining = Math.max(0, Math.ceil(trialDiff / (1000 * 60 * 60 * 24)));

    let planExpired = false;
    let planDaysRemaining = -1;
    let planEnd: Date | null = null;

    if (user.plan === 'premium' && user.planExpiresAt) {
      planEnd = new Date(user.planExpiresAt);
      const planDiff = planEnd.getTime() - now.getTime();
      planDaysRemaining = Math.max(0, Math.ceil(planDiff / (1000 * 60 * 60 * 24)));
      planExpired = planDiff <= 0;
    }
    
    return { trialDaysRemaining, trialEnd, planDaysRemaining, planEnd, planExpired };
  };

  const handleGrantDiscount = (userToOffer: any, pct: number) => {
    const confirmMsg = `Deseja conceder um cupom promocional de ${pct}% de desconto durante os 3 primeiros meses de assinatura para o usuário ${userToOffer.name}?\n\nEste desconto será aplicado automaticamente quando o usuário realizar o pagamento.`;
    if (window.confirm(confirmMsg)) {
      const storedUsers = JSON.parse(localStorage.getItem('agenda_users') || '[]');
      const updatedUsers = storedUsers.map((u: any) => {
        if (u.id === userToOffer.id) {
          return {
            ...u,
            grantedDiscount: {
              pct: pct,
              months: 3,
              grantedAt: new Date().toISOString()
            }
          };
        }
        return u;
      });
      localStorage.setItem('agenda_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      alert(`Desconto de ${pct}% concedido com sucesso para ${userToOffer.name}!`);
    }
  };

  const [logoError, setLogoError] = useState(false);
  const [isAdminBackupModalOpen, setIsAdminBackupModalOpen] = useState(false);
  const [isAdminAffiliateModalOpen, setIsAdminAffiliateModalOpen] = useState(false);
  const [isAdminAffiliateRankingModalOpen, setIsAdminAffiliateRankingModalOpen] = useState(false);
  const [isAdminUsersModalOpen, setIsAdminUsersModalOpen] = useState(false);
  const [isAdminLogsModalOpen, setIsAdminLogsModalOpen] = useState(false);
  const [isAdminSettingsModalOpen, setIsAdminSettingsModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isAdminCustomizationModalOpen, setIsAdminCustomizationModalOpen] = useState(false);
  const [isAdminMarketingModalOpen, setIsAdminMarketingModalOpen] = useState(false);
  const [isAdminSupportModalOpen, setIsAdminSupportModalOpen] = useState(false);

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
  const [isAdminTrackingModalOpen, setIsAdminTrackingModalOpen] = useState(false);
  const [trackingTab, setTrackingTab] = useState<'logs' | 'offers' | 'analytics'>('logs');
  const [trackingLogs, setTrackingLogs] = useState<any[]>([]);
  const [marketingMaterials, setMarketingMaterials] = useState<{id: string, type: string, title: string, content: string}[]>([]);
  const [supportReports, setSupportReports] = useState<any[]>([]);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [selectedUserForCommission, setSelectedUserForCommission] = useState<any>(null);
  const [isUserConfigModalOpen, setIsUserConfigModalOpen] = useState(false);
  const [selectedUserForConfig, setSelectedUserForConfig] = useState<any>(null);

  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [autoUpdateInterval, setAutoUpdateInterval] = useState('5');
  
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowNewRegisters, setAllowNewRegisters] = useState(true);
  const [trialDays, setTrialDays] = useState('40');

  const [monthlyPrice, setMonthlyPrice] = useState('9.90');
  const [semiannualPrice, setSemiannualPrice] = useState('101.95');
  const [annualPrice, setAnnualPrice] = useState('97.00');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [coupons, setCoupons] = useState<{code: string, pct: number, active: boolean}[]>([]);
  const [directCommissionPct, setDirectCommissionPct] = useState('20%');
  const [indirectCommissionPct, setIndirectCommissionPct] = useState('10%');
  const [directCommissionMonths, setDirectCommissionMonths] = useState('12');
  const [indirectCommissionMonths, setIndirectCommissionMonths] = useState('12');

  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const [adminAppColor, setAdminAppColor] = useState(appColor || '#263E2A');
  const [adminAppBgImage, setAdminAppBgImage] = useState(appBgImage || '');

  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('');
  const [enable2FA, setEnable2FA] = useState(false);
  const [automaticCommissionPayment, setAutomaticCommissionPayment] = useState(false);

  // States for automatic backup scheduler
  const [backupScheduleEnabled, setBackupScheduleEnabled] = useState(false);
  const [backupScheduleFrequency, setBackupScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [backupScheduleType, setBackupScheduleType] = useState<'complete' | 'system'>('complete');
  const [backupScheduleLimit, setBackupScheduleLimit] = useState(5);
  const [backupLastDate, setBackupLastDate] = useState('');
  const [automaticBackupsList, setAutomaticBackupsList] = useState<any[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedWithdrawalForPayment, setSelectedWithdrawalForPayment] = useState<any>(null);
  const [paymentReceiptStr, setPaymentReceiptStr] = useState('');
  const [expandedWithdrawalId, setExpandedWithdrawalId] = useState<string | null>(null);
  const paymentReceiptInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const runBackupCheckAndExecution = async (
      enabled: boolean,
      freq: 'daily' | 'weekly' | 'monthly',
      type: 'complete' | 'system',
      limit: number,
      lastDate: string
    ) => {
      if (!enabled) return;

      const now = new Date();
      let runBackup = false;

      if (!lastDate) {
        runBackup = true;
      } else {
        const last = new Date(lastDate);
        const diffMs = now.getTime() - last.getTime();
        
        let intervalMs = 7 * 24 * 60 * 60 * 1000; // default weekly
        if (freq === 'daily') {
          intervalMs = 24 * 60 * 60 * 1000;
        } else if (freq === 'monthly') {
          intervalMs = 30 * 24 * 60 * 60 * 1000;
        }

        if (diffMs >= intervalMs) {
          runBackup = true;
        }
      }

      if (runBackup) {
        try {
          const backupData = generateBackupData(type);
          const jsonStr = JSON.stringify(backupData);
          const sizeInKB = (jsonStr.length / 1024).toFixed(2) + " KB";
          
          const newBackup: any = {
            id: 'auto_' + Date.now(),
            timestamp: now.toISOString(),
            type,
            size: sizeInKB,
            data: backupData
          };

          const existingBackups = JSON.parse(localStorage.getItem('agenda_automatic_backups') || '[]');
          const updatedBackups = [newBackup, ...existingBackups].slice(0, limit);
          
          localStorage.setItem('agenda_automatic_backups', JSON.stringify(updatedBackups));
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAutomaticBackupsList(updatedBackups);

          // Update last backup date
          const newLastDate = now.toISOString();
          setBackupLastDate(newLastDate);

          // Save new settings
          const settingsStr = localStorage.getItem('agenda_settings') || '{}';
          const currentSettings = JSON.parse(settingsStr);
          currentSettings.backupLastDate = newLastDate;
          localStorage.setItem('agenda_settings', JSON.stringify(currentSettings));

          try {
            const { doc, setDoc } = await import('firebase/firestore');
            const { db } = await import('../lib/firebase');
            await setDoc(doc(db, 'app_settings', 'config'), { backupLastDate: newLastDate }, { merge: true });
          } catch (dbErr) {
            console.error("Failed to sync backup date with Firestore", dbErr);
          }

          console.log("Automatic backup executed successfully!");
        } catch (err) {
          console.error("Automatic backup failed during execution", err);
        }
      }
    };

    const loadSettings = async () => {
      // First, load from localStorage for immediate render
      const settingsStr = localStorage.getItem('agenda_settings');
      if (settingsStr) {
        try {
          const settings = JSON.parse(settingsStr);
          if (settings.monthlyPrice) setMonthlyPrice(settings.monthlyPrice.toString());
          if (settings.semiannualPrice) setSemiannualPrice(settings.semiannualPrice === 152.49 ? '101.95' : settings.semiannualPrice.toString());
          if (settings.annualPrice) setAnnualPrice(settings.annualPrice.toString());
          if (settings.mpPublicKey) setMpPublicKey(settings.mpPublicKey);
          if (settings.mpAccessToken) setMpAccessToken(settings.mpAccessToken);
          if (settings.appColor) setAdminAppColor(settings.appColor);
          if (settings.appBgImage) setAdminAppBgImage(settings.appBgImage);
          if (settings.coupons) setCoupons(settings.coupons);
          if (settings.autoUpdateEnabled !== undefined) setAutoUpdateEnabled(settings.autoUpdateEnabled);
          if (settings.autoUpdateInterval) setAutoUpdateInterval(settings.autoUpdateInterval.toString());
          if (settings.maintenanceMode !== undefined) setMaintenanceMode(settings.maintenanceMode);
          if (settings.allowNewRegisters !== undefined) setAllowNewRegisters(settings.allowNewRegisters);
          if (settings.trialDays) setTrialDays(settings.trialDays.toString());
          if (settings.directCommissionPct) setDirectCommissionPct(settings.directCommissionPct);
          if (settings.indirectCommissionPct) setIndirectCommissionPct(settings.indirectCommissionPct);
          if (settings.directCommissionMonths) setDirectCommissionMonths(settings.directCommissionMonths);
          if (settings.indirectCommissionMonths) setIndirectCommissionMonths(settings.indirectCommissionMonths);
          if (settings.resendApiKey) setResendApiKey(settings.resendApiKey);
          if (settings.resendFromEmail) setResendFromEmail(settings.resendFromEmail);
          if (settings.enable2FA !== undefined) setEnable2FA(settings.enable2FA);
          if (settings.automaticCommissionPayment !== undefined) setAutomaticCommissionPayment(settings.automaticCommissionPayment);
          if (settings.backupScheduleEnabled !== undefined) setBackupScheduleEnabled(settings.backupScheduleEnabled);
          if (settings.backupScheduleFrequency) setBackupScheduleFrequency(settings.backupScheduleFrequency);
          if (settings.backupScheduleType) setBackupScheduleType(settings.backupScheduleType);
          if (settings.backupScheduleLimit) setBackupScheduleLimit(settings.backupScheduleLimit);
          if (settings.backupLastDate !== undefined) setBackupLastDate(settings.backupLastDate);
        } catch (e) {}
      }

      // Then attempt to load from Firestore
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const docSnap = await getDoc(doc(db, 'app_settings', 'config'));
        if (docSnap.exists()) {
          const settings = docSnap.data();
          if (settings.monthlyPrice) setMonthlyPrice(settings.monthlyPrice.toString());
          if (settings.semiannualPrice) setSemiannualPrice(settings.semiannualPrice === 152.49 ? '101.95' : settings.semiannualPrice.toString());
          if (settings.annualPrice) setAnnualPrice(settings.annualPrice.toString());
          if (settings.mpPublicKey) setMpPublicKey(settings.mpPublicKey);
          if (settings.mpAccessToken) setMpAccessToken(settings.mpAccessToken);
          if (settings.appColor) setAdminAppColor(settings.appColor);
          if (settings.appBgImage) setAdminAppBgImage(settings.appBgImage);
          if (settings.coupons) setCoupons(settings.coupons);
          if (settings.autoUpdateEnabled !== undefined) setAutoUpdateEnabled(settings.autoUpdateEnabled);
          if (settings.autoUpdateInterval) setAutoUpdateInterval(settings.autoUpdateInterval.toString());
          if (settings.maintenanceMode !== undefined) setMaintenanceMode(settings.maintenanceMode);
          if (settings.allowNewRegisters !== undefined) setAllowNewRegisters(settings.allowNewRegisters);
          if (settings.trialDays) setTrialDays(settings.trialDays.toString());
          if (settings.directCommissionPct) setDirectCommissionPct(settings.directCommissionPct);
          if (settings.indirectCommissionPct) setIndirectCommissionPct(settings.indirectCommissionPct);
          if (settings.directCommissionMonths) setDirectCommissionMonths(settings.directCommissionMonths);
          if (settings.indirectCommissionMonths) setIndirectCommissionMonths(settings.indirectCommissionMonths);
          if (settings.resendApiKey) setResendApiKey(settings.resendApiKey);
          if (settings.resendFromEmail) setResendFromEmail(settings.resendFromEmail);
          if (settings.enable2FA !== undefined) setEnable2FA(settings.enable2FA);
          if (settings.automaticCommissionPayment !== undefined) setAutomaticCommissionPayment(settings.automaticCommissionPayment);
          if (settings.backupScheduleEnabled !== undefined) setBackupScheduleEnabled(settings.backupScheduleEnabled);
          if (settings.backupScheduleFrequency) setBackupScheduleFrequency(settings.backupScheduleFrequency);
          if (settings.backupScheduleType) setBackupScheduleType(settings.backupScheduleType);
          if (settings.backupScheduleLimit) setBackupScheduleLimit(settings.backupScheduleLimit);
          if (settings.backupLastDate !== undefined) setBackupLastDate(settings.backupLastDate);
          
          // Sync back to local storage
          localStorage.setItem('agenda_settings', JSON.stringify(settings));
        }
      } catch (e: any) {
        console.warn("Could not load settings from Firestore (using local fallbacks):", e?.message || e);
      }
    };
    
    loadSettings().then(() => {
      // Run automatic backup check
      const settingsStr = localStorage.getItem('agenda_settings');
      if (settingsStr) {
        try {
          const s = JSON.parse(settingsStr);
          if (s.backupScheduleEnabled) {
            runBackupCheckAndExecution(
              s.backupScheduleEnabled,
              s.backupScheduleFrequency || 'weekly',
              s.backupScheduleType || 'complete',
              s.backupScheduleLimit || 5,
              s.backupLastDate || ''
            );
          }
        } catch (e) {}
      }
    });

    const savedAutoBackups = JSON.parse(localStorage.getItem('agenda_automatic_backups') || '[]');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutomaticBackupsList(savedAutoBackups);

    const themeStr = localStorage.getItem('agenda_theme_settings');
    if (themeStr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeConfig(prev => ({ ...prev, ...JSON.parse(themeStr) }));
    }

    const storedUsers = JSON.parse(localStorage.getItem('agenda_users') || '[]');
     
    setUsers(storedUsers.map((u: any) => ({
      ...u,
      status: u.status || 'active',
      directCommissionDuration: u.directCommissionDuration || 6,
      indirectCommissionDuration: u.indirectCommissionDuration || 3
    })));

    fetchAndSyncUsers();

    const storedWithdrawals = JSON.parse(localStorage.getItem('agenda_withdrawals') || '[]');
     
    setWithdrawals(storedWithdrawals);

    const storedMaterials = JSON.parse(localStorage.getItem('agenda_marketing_materials') || '[]');
     
    setMarketingMaterials(storedMaterials);

    const storedReports = JSON.parse(localStorage.getItem('agenda_support_reports') || '[]');
     
    setSupportReports(storedReports);

    const storedTracking = JSON.parse(localStorage.getItem('agenda_tracking_logs') || '[]');
     
    setTrackingLogs(storedTracking.reverse());
  }, []);

  const fetchAndSyncUsers = async () => {
    setIsLoadingUsers(true);
    let localList: any[] = [];
    try {
      localList = JSON.parse(localStorage.getItem('agenda_users') || '[]');
    } catch (e) {
      localList = [];
    }

    let dbList: any[] = [];
    try {
      const res = await fetch('/api/users?all=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          dbList = data;
        }
      }
    } catch (e) {
      console.warn("Could not fetch users from /api/users", e);
    }

    let firestoreList: any[] = [];
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const querySnap = await getDocs(collection(db, 'users'));
      querySnap.forEach((docSnap) => {
        firestoreList.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.warn("Could not fetch users from Firestore", e);
    }

    const userMap = new Map<string, any>();

    const processUser = (u: any) => {
      if (!u) return;
      const uidKey = (u.firebaseUid || u.firebase_uid || u.email || u.id || '').toString().trim().toLowerCase();
      if (!uidKey) return;

      const existing = userMap.get(uidKey) || {};
      const merged = {
        ...existing,
        ...u,
        id: (u.id || existing.id || u.firebaseUid || u.firebase_uid || Math.random().toString()).toString(),
        firebaseUid: u.firebaseUid || u.firebase_uid || existing.firebaseUid || '',
        name: u.name || existing.name || u.email?.split('@')[0] || 'Usuário',
        email: u.email || existing.email || '',
        whatsapp: u.whatsapp || existing.whatsapp || '',
        cpf: u.cpf || existing.cpf || '',
        city: u.city || existing.city || '',
        state: u.state || existing.state || '',
        country: u.country || existing.country || '',
        plan: u.plan || existing.plan || 'free',
        status: u.status || existing.status || 'active',
        createdAt: u.createdAt || u.created_at || existing.createdAt || new Date().toISOString(),
        directCommissionDuration: u.directCommissionDuration || existing.directCommissionDuration || 6,
        indirectCommissionDuration: u.indirectCommissionDuration || existing.indirectCommissionDuration || 3,
      };
      userMap.set(uidKey, merged);
    };

    localList.forEach(processUser);
    dbList.forEach(processUser);
    firestoreList.forEach(processUser);

    const mergedList = Array.from(userMap.values());
    if (mergedList.length > 0) {
      setUsers(mergedList);
      try {
        localStorage.setItem('agenda_users', JSON.stringify(mergedList));
      } catch (e) {}
    } else if (localList.length > 0) {
      setUsers(localList.map(u => ({
        ...u,
        status: u.status || 'active',
        directCommissionDuration: u.directCommissionDuration || 6,
        indirectCommissionDuration: u.indirectCommissionDuration || 3
      })));
    }
    setIsLoadingUsers(false);
  };

  useEffect(() => {
    if (isAdminUsersModalOpen) {
      fetchAndSyncUsers();
    }
  }, [isAdminUsersModalOpen]);

  useEffect(() => {
    if (isAdminTrackingModalOpen) {
      const storedTracking = JSON.parse(localStorage.getItem('agenda_tracking_logs') || '[]');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrackingLogs(storedTracking.reverse());
    }
  }, [isAdminTrackingModalOpen]);

  const handleSaveThemeConfig = () => {
    localStorage.setItem('agenda_theme_settings', JSON.stringify(themeConfig));
    setIsSettingsSavedModalOpen(true);
  };

  const handleSaveSettings = async () => {
    const settings = {
      monthlyPrice: parseFloat(monthlyPrice),
      semiannualPrice: parseFloat(semiannualPrice),
      annualPrice: parseFloat(annualPrice),
      mpPublicKey,
      mpAccessToken,
      appColor: adminAppColor,
      appBgImage: adminAppBgImage,
      coupons,
      autoUpdateEnabled,
      autoUpdateInterval: parseInt(autoUpdateInterval) || 5,
      maintenanceMode,
      allowNewRegisters,
      trialDays: parseInt(trialDays) || 40,
      directCommissionPct,
      indirectCommissionPct,
      directCommissionMonths,
      indirectCommissionMonths,
      resendApiKey,
      resendFromEmail,
      enable2FA,
      automaticCommissionPayment,
      backupScheduleEnabled,
      backupScheduleFrequency,
      backupScheduleType,
      backupScheduleLimit,
      backupLastDate
    };
    localStorage.setItem('agenda_settings', JSON.stringify(settings));
    if (setAppColor) setAppColor(adminAppColor);
    if (setAppBgImage) setAppBgImage(adminAppBgImage);
    
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await setDoc(doc(db, 'app_settings', 'config'), settings, { merge: true });
    } catch (e) {
      console.error('Error saving settings to Firestore', e);
    }

    if (onSettingsUpdated) {
      onSettingsUpdated();
    }

    setIsSettingsSavedModalOpen(true);
  };

  const handleCreateInstantAutoBackup = async () => {
    try {
      const now = new Date();
      const backupData = generateBackupData(backupScheduleType);
      const jsonStr = JSON.stringify(backupData);
      const sizeInKB = (jsonStr.length / 1024).toFixed(2) + " KB";
      
      const newBackup: any = {
        id: 'auto_' + Date.now(),
        timestamp: now.toISOString(),
        type: backupScheduleType,
        size: sizeInKB,
        data: backupData
      };

      const existingBackups = JSON.parse(localStorage.getItem('agenda_automatic_backups') || '[]');
      const updatedBackups = [newBackup, ...existingBackups].slice(0, backupScheduleLimit);
      
      localStorage.setItem('agenda_automatic_backups', JSON.stringify(updatedBackups));
      setAutomaticBackupsList(updatedBackups);
      
      // Update last backup date
      const newLastDate = now.toISOString();
      setBackupLastDate(newLastDate);

      // Save to settings
      const settingsStr = localStorage.getItem('agenda_settings') || '{}';
      const currentSettings = JSON.parse(settingsStr);
      currentSettings.backupLastDate = newLastDate;
      localStorage.setItem('agenda_settings', JSON.stringify(currentSettings));

      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        await setDoc(doc(db, 'app_settings', 'config'), { backupLastDate: newLastDate }, { merge: true });
      } catch (dbErr) {}

      alert("Backup automático gerado e salvo na lista com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Falha ao gerar backup automático instantâneo.");
    }
  };

  const handleSaveBackupSettings = async () => {
    const settingsStr = localStorage.getItem('agenda_settings') || '{}';
    const currentSettings = JSON.parse(settingsStr);
    
    currentSettings.backupScheduleEnabled = backupScheduleEnabled;
    currentSettings.backupScheduleFrequency = backupScheduleFrequency;
    currentSettings.backupScheduleType = backupScheduleType;
    currentSettings.backupScheduleLimit = backupScheduleLimit;
    
    localStorage.setItem('agenda_settings', JSON.stringify(currentSettings));

    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await setDoc(doc(db, 'app_settings', 'config'), {
        backupScheduleEnabled,
        backupScheduleFrequency,
        backupScheduleType,
        backupScheduleLimit
      }, { merge: true });
    } catch (e) {
      console.error('Error saving backup settings to Firestore', e);
    }

    alert("Configurações de backup automático salvas com sucesso!");
  };

  const triggerDownloadOfData = (data: any, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
  };

  const handleRestoreAutoBackup = (backup: any) => {
    const confirmRestore = window.confirm(
      `Deseja realmente restaurar o backup automático de ${new Date(backup.timestamp).toLocaleString('pt-BR')}?\n\n` +
      `ATENÇÃO: Todos os dados atuais do sistema serão sobrescritos com os dados desse backup, e a página será recarregada.`
    );
    
    if (!confirmRestore) return;

    try {
      const data = backup.data;
      if (!data) {
        alert("Erro: Dados do backup não encontrados ou vazios.");
        return;
      }

      if (data.settings) {
        localStorage.setItem('agenda_settings', JSON.stringify(data.settings));
      }
      if (data.users) {
        localStorage.setItem('agenda_users', JSON.stringify(data.users));
      }
      if (data.trackingLogs) {
        localStorage.setItem('agenda_tracking_logs', JSON.stringify(data.trackingLogs));
      }
      if (data.marketingMaterials) {
        localStorage.setItem('agenda_marketing_materials', JSON.stringify(data.marketingMaterials));
      }
      if (data.supportReports) {
        localStorage.setItem('agenda_support_reports', JSON.stringify(data.supportReports));
      }
      if (data.themeSettings) {
        localStorage.setItem('agenda_theme_settings', JSON.stringify(data.themeSettings));
      }
      if (data.withdrawals) {
        localStorage.setItem('agenda_withdrawals', JSON.stringify(data.withdrawals));
      }

      const syncWithFirestore = async () => {
        try {
          if (data.settings) {
            const { doc, setDoc } = await import('firebase/firestore');
            const { db } = await import('../lib/firebase');
            await setDoc(doc(db, 'app_settings', 'config'), data.settings, { merge: true });
          }
        } catch (e) {
          console.error("Failed to sync restored settings to Firestore", e);
        }
      };

      syncWithFirestore().then(() => {
        alert("Backup restaurado com sucesso! A página será reiniciada agora.");
        window.location.reload();
      });

    } catch (e) {
      console.error("Restoration failed", e);
      alert("Falha ao restaurar o backup. Verifique se o arquivo está corrompido.");
    }
  };

  const handleDeleteAutoBackup = (id: string) => {
    if (window.confirm("Deseja realmente remover este backup da lista?")) {
      const existingBackups = JSON.parse(localStorage.getItem('agenda_automatic_backups') || '[]');
      const updatedBackups = existingBackups.filter((b: any) => b.id !== id);
      localStorage.setItem('agenda_automatic_backups', JSON.stringify(updatedBackups));
      setAutomaticBackupsList(updatedBackups);
    }
  };

  const handleSaveCommission = (userId: string, direct: number, indirect: number) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, directCommissionDuration: direct, indirectCommissionDuration: indirect };
      }
      return u;
    });
    setUsers(updatedUsers);
    
    try {
      const allStr = localStorage.getItem('agenda_users');
      if (allStr) {
        let allUsers = JSON.parse(allStr);
        allUsers = allUsers.map((u: any) => {
          if (u.id === userId) {
            return { ...u, directCommissionDuration: direct, indirectCommissionDuration: indirect };
          }
          return u;
        });
        localStorage.setItem('agenda_users', JSON.stringify(allUsers));
      }
    } catch (e) {}
    
    setIsCommissionModalOpen(false);
  };

  const handleSaveUserConfig = (userId: string, freeTrial: number, planExpiration: string, installmentsPaid: number) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { 
          ...u, 
          freeTrialDays: freeTrial, 
          planExpiresAt: planExpiration ? new Date(planExpiration + 'T23:59:59').toISOString() : null,
          installmentsPaid: installmentsPaid
        };
      }
      return u;
    });
    setUsers(updatedUsers);
    
    try {
      const allStr = localStorage.getItem('agenda_users');
      if (allStr) {
        let allUsers = JSON.parse(allStr);
        allUsers = allUsers.map((u: any) => {
          if (u.id === userId) {
            return { 
              ...u, 
              freeTrialDays: freeTrial, 
              planExpiresAt: planExpiration ? new Date(planExpiration + 'T23:59:59').toISOString() : null,
              installmentsPaid: installmentsPaid
            };
          }
          return u;
        });
        localStorage.setItem('agenda_users', JSON.stringify(allUsers));
      }
    } catch (e) {}
    
    setIsUserConfigModalOpen(false);
  };

  const toggleUserStatus = (id: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'active' ? 'inactive' : 'active' };
      }
      return u;
    });
    setUsers(updatedUsers);
    
    // Attempt to save to localStorage as well
    const storedUsers = JSON.parse(localStorage.getItem('agenda_users') || '[]');
    const newStoredUsers = storedUsers.map((u: any) => {
      if (u.id === id) {
        return { ...u, status: updatedUsers.find(x => x.id === id)?.status };
      }
      return u;
    });
    localStorage.setItem('agenda_users', JSON.stringify(newStoredUsers));
  };

  const handleDownloadBackup = (backupType: string, specificUserId?: string) => {
    try {
      let backupData: any = {};
      
      const allSettings = localStorage.getItem('agenda_settings') || '{}';
      const allUsers = localStorage.getItem('agenda_users') || '[]';
      const allTrackingLogs = localStorage.getItem('agenda_tracking_logs') || '[]';
      const allMarketingMaterials = localStorage.getItem('agenda_marketing_materials') || '[]';
      const allSupportReports = localStorage.getItem('agenda_support_reports') || '[]';
      const allThemeSettings = localStorage.getItem('agenda_theme_settings') || '{}';
      const allWithdrawals = localStorage.getItem('agenda_withdrawals') || '[]';
      
      if (backupType === 'complete') {
        backupData = {
          settings: JSON.parse(allSettings),
          users: JSON.parse(allUsers),
          trackingLogs: JSON.parse(allTrackingLogs),
          marketingMaterials: JSON.parse(allMarketingMaterials),
          supportReports: JSON.parse(allSupportReports),
          themeSettings: JSON.parse(allThemeSettings),
          withdrawals: JSON.parse(allWithdrawals),
        };
      } else if (backupType === 'system') {
        backupData = {
          settings: JSON.parse(allSettings),
          themeSettings: JSON.parse(allThemeSettings),
        };
      } else if (backupType === 'admin') {
        const usersArray = JSON.parse(allUsers);
        const adminUser = usersArray.find((u: any) => 
          (u.name && (u.name.toUpperCase().includes('DALÉCIO') || u.name.toUpperCase().includes('DALECIO'))) || 
          (u.cpf && u.cpf.replace(/\D/g, '') === '10896050726') ||
          (u.email && u.email.toLowerCase().trim() === 'agiotech.oficial@gmail.com')
        );
        backupData = {
          adminUser,
          settings: JSON.parse(allSettings),
          themeSettings: JSON.parse(allThemeSettings),
        };
      } else if (backupType === 'user' && specificUserId) {
        const usersArray = JSON.parse(allUsers);
        const user = usersArray.find((u: any) => u.id === specificUserId);
        backupData = {
          user,
        };
      }
      
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      downloadAnchorNode.setAttribute("download", `agio_backup_${backupType}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Backup failed", e);
      alert("Falha ao gerar backup. Verifique o console.");
    }
  };

  const [autoManageBlock, setAutoManageBlock] = useState(true);
  const [autoManageApprove, setAutoManageApprove] = useState(true);
  const [autoManageReminders, setAutoManageReminders] = useState(false);

  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [isSettingsSavedModalOpen, setIsSettingsSavedModalOpen] = useState(false);

  const simulateAutomatedMessages = () => {
    setIsSimulationModalOpen(true);
  };

  // Subscription and Revenue Calculations
  const now = new Date();
  let activeMonthly = 0;
  let activeSemiannual = 0;
  let activeAnnual = 0;

  users.forEach(user => {
    if (user.plan === 'premium' && user.planExpiresAt) {
      const expiresAt = new Date(user.planExpiresAt);
      if (expiresAt > now) {
        if (user.planLevel === 'monthly') activeMonthly++;
        else if (user.planLevel === 'semiannual') activeSemiannual++;
        else if (user.planLevel === 'annual') activeAnnual++;
        else {
           // Estimate based on plan duration
           const createdAt = new Date(user.createdAt || now);
           const diffDays = Math.ceil((expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
           if (diffDays > 200) activeAnnual++;
           else if (diffDays > 45) activeSemiannual++;
           else activeMonthly++;
        }
      }
    }
  });

  const totalActiveSubscriptions = activeMonthly + activeSemiannual + activeAnnual;
  // Calculate average monthly revenue from all plans
  const monthlyRevenue = activeMonthly * parseFloat(monthlyPrice || '0');
  const semiannualRevenue = activeSemiannual * parseFloat(semiannualPrice || '0');
  const annualRevenue = activeAnnual * parseFloat(annualPrice || '0');
  const totalEstimatedRevenue = (monthlyRevenue) + (semiannualRevenue / 6) + (annualRevenue / 12);
  
  const monthlyPct = totalActiveSubscriptions > 0 ? (activeMonthly / totalActiveSubscriptions) * 100 : 0;
  const semiannualPct = totalActiveSubscriptions > 0 ? (activeSemiannual / totalActiveSubscriptions) * 100 : 0;
  const annualPct = totalActiveSubscriptions > 0 ? (activeAnnual / totalActiveSubscriptions) * 100 : 0;

  return (
    <div className="bg-brand text-white min-h-screen font-sans">
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
                <button onClick={() => { onNavigate('accounts'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">account_balance_wallet</span> Gestão de Contas
                </button>
                <button onClick={() => { onNavigate('modules'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">groups</span> Minha Rede
                </button>
                <button onClick={() => { onNavigate('admin'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent bg-surface-container-lowest text-primary font-bold shadow-sm cursor-pointer">
                  <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">admin_panel_settings</span> Admin
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
        <div className="w-[36px] z-10" />
      </header>

      <NavigationBar />

      <main className="max-w-7xl mx-auto px-5 py-6 pb-32">
        <section className="mb-6">
          <h2 className="text-3xl font-semibold text-white mb-1">Bem-vindo, Dalécio</h2>
          <p className="text-base text-white/70">Visão analítica do ecossistema Agenda Ágio em tempo real.</p>
        </section>

        {/* Analytics Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Users Card */}
          <div 
            onClick={() => setIsAdminUsersModalOpen(true)}
            className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10 md:col-span-1 cursor-pointer hover:bg-white/20 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 bg-white/20 rounded-lg">
                <span className="material-symbols-outlined text-white">group</span>
              </span>
              <span className="text-green-400 text-xs flex items-center bg-green-400/10 px-2 py-0.5 rounded-full">Ver todos</span>
            </div>
            <p className="text-white/60 text-xs uppercase tracking-wider">Total de Usuários</p>
            <h3 className="text-3xl font-semibold text-white mt-1">{users.length}</h3>
          </div>

          {/* Revenue Overview Card */}
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10 md:col-span-2 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wider">Receita Mensal Estimada</p>
                <h3 className="text-3xl font-semibold text-white mt-1">R$ {totalEstimatedRevenue.toFixed(2).replace('.', ',')}</h3>
              </div>
              <span className="p-3 bg-white/20 rounded-full">
                <span className="material-symbols-outlined text-white" style={{ fontSize: '32px' }}>payments</span>
              </span>
            </div>
            <div className="flex gap-4 items-end h-16">
              <div className="flex-1 bg-white/10 rounded-t-sm h-[40%]"></div>
              <div className="flex-1 bg-white/10 rounded-t-sm h-[60%]"></div>
              <div className="flex-1 bg-white/10 rounded-t-sm h-[55%]"></div>
              <div className="flex-1 bg-white/10 rounded-t-sm h-[80%]"></div>
              <div className="flex-1 bg-white/10 rounded-t-sm h-[70%]"></div>
              <div className="flex-1 bg-white rounded-t-sm h-[100%]"></div>
            </div>
          </div>

          {/* Subscriptions Ratio Card */}
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10 md:col-span-1">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-4">Assinaturas Ativas ({totalActiveSubscriptions})</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white">Mensal</span>
                  <span className="font-bold">{activeMonthly}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div className="bg-white h-1.5 rounded-full" style={{ width: `${monthlyPct}%` }}></div>
                </div>
              </div>
              {activeSemiannual > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white">Semestral</span>
                  <span className="font-bold">{activeSemiannual}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div className="bg-[#a682ff] h-1.5 rounded-full" style={{ width: `${semiannualPct}%` }}></div>
                </div>
              </div>
              )}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white">Anual</span>
                  <span className="font-bold">{activeAnnual}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div className="bg-[#4cd6ff] h-1.5 rounded-full" style={{ width: `${annualPct}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Registrations Table */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Registros Recentes</h3>
              <button className="text-white hover:text-[#cabeff] text-xs underline">Ver todos</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-white/5 text-white/60 text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">CPF</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Dispositivos (MAC)</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Plano</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-[12px] uppercase">
                            {(user.name || '?').split(' ').map((n: string) => n?.[0] || '').join('').substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-base font-medium text-white">{user.name}</p>
                            <p className="text-[12px] text-white/60">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-white/60 font-mono">{user.cpf}</td>
                      <td className="px-6 py-4 text-xs text-white/50 font-mono">{user.allowedDeviceIds ? user.allowedDeviceIds.join(', ') : user.deviceId || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs text-white/80">{user.plan}</td>
                      <td className="px-6 py-4">
                        {user.status === 'active' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-400/20 text-green-300">Ativo</span>
                        ) : user.status === 'pending' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-400/20 text-amber-300">Pendente</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-400/20 text-red-300">Inativo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Actions Column */}
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Ações Administrativas</h3>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => setIsAdminAffiliateModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-[#4cd6ff] bg-[#4cd6ff]/10 hover:bg-[#4cd6ff]/20 transition-all group">
                  <span className="material-symbols-outlined text-[#4cd6ff] group-hover:scale-110 transition-transform">account_balance_wallet</span>
                  <span className="text-base font-medium text-[#4cd6ff] flex-1 text-left">Comissões & Afiliados</span>
                </button>
                <button onClick={() => onNavigate('meeting_room')} className="flex items-center gap-3 w-full p-3 rounded-lg border border-[#10b981] bg-[#10b981]/15 hover:bg-[#10b981]/25 transition-all group cursor-pointer shadow-md">
                  <span className="material-symbols-outlined text-[#10b981] group-hover:scale-110 transition-transform">videocam</span>
                  <span className="text-base font-bold text-[#10b981] flex-1 text-left">Sala de Reuniões Virtual & Mentorias</span>
                </button>
                <button onClick={() => setIsAdminAffiliateRankingModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-[#fde047] bg-[#fde047]/10 hover:bg-[#fde047]/20 transition-all group">
                  <span className="material-symbols-outlined text-[#fde047] group-hover:scale-110 transition-transform">emoji_events</span>
                  <span className="text-base font-medium text-[#fde047] flex-1 text-left">Ranking de Afiliados</span>
                </button>
                <button onClick={() => setIsAdminMarketingModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-[#ff954c] bg-[#ff954c]/10 hover:bg-[#ff954c]/20 transition-all group">
                  <span className="material-symbols-outlined text-[#ff954c] group-hover:scale-110 transition-transform">campaign</span>
                  <span className="text-base font-medium text-[#ff954c] flex-1 text-left">Materiais de Divulgação</span>
                </button>
                <button onClick={() => setIsAdminSupportModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-[#a855f7] bg-[#a855f7]/10 hover:bg-[#a855f7]/20 transition-all group">
                  <span className="material-symbols-outlined text-[#a855f7] group-hover:scale-110 transition-transform">forum</span>
                  <span className="text-base font-medium text-[#a855f7] flex-1 text-left">Suporte & IA {supportReports.filter(r => r.status === 'pendente').length > 0 && <span className="bg-[#ef4444] text-white text-xs px-2 py-0.5 rounded-full ml-2">{supportReports.filter(r => r.status === 'pendente').length}</span>}</span>
                </button>
                <button onClick={() => setIsAdminTrackingModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-[#ec4899] bg-[#ec4899]/10 hover:bg-[#ec4899]/20 transition-all group">
                  <span className="material-symbols-outlined text-[#ec4899] group-hover:scale-110 transition-transform">radar</span>
                  <span className="text-base font-medium text-[#ec4899] flex-1 text-left">Rastreamento e Controle</span>
                </button>
                <button onClick={() => setIsAdminUsersModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/20 hover:bg-white/10 transition-all group">
                  <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">manage_accounts</span>
                  <span className="text-base font-medium text-white flex-1 text-left">Gerenciar Usuários</span>
                </button>
                <button onClick={() => setIsAdminLogsModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/20 hover:bg-white/10 transition-all group">
                  <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">terminal</span>
                  <span className="text-base font-medium text-white flex-1 text-left">Logs do Sistema</span>
                </button>
                <button onClick={() => setIsAdminCustomizationModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/20 hover:bg-white/10 transition-all group">
                  <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">format_paint</span>
                  <span className="text-base font-medium text-white flex-1 text-left">Personalização de Interface</span>
                </button>
                <button onClick={() => setIsAdminSettingsModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/20 hover:bg-white/10 transition-all group">
                  <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">settings_applications</span>
                  <span className="text-base font-medium text-white flex-1 text-left">Configurações Globais</span>
                </button>
                <button onClick={() => setIsUsageModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/20 hover:bg-white/10 transition-all group">
                  <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">monitoring</span>
                  <span className="text-base font-medium text-white flex-1 text-left">Uso de Recursos (Limites)</span>
                </button>
                <button onClick={() => setIsAdminBackupModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-[#3b82f6] bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 transition-all group">
                  <span className="material-symbols-outlined text-[#3b82f6] group-hover:scale-110 transition-transform">backup</span>
                  <span className="text-base font-medium text-[#3b82f6] flex-1 text-left">Backup e Restauração</span>
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm text-white p-6 rounded-xl border border-white/10 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  <p className="text-xs uppercase tracking-widest opacity-80">SAÚDE DO SISTEMA</p>
                </div>
                <h4 className="text-lg font-semibold mb-2">Infraestrutura OK</h4>
                <p className="text-sm opacity-70">Todos os serviços rodando em latência mínima (14ms).</p>
              </div>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl opacity-10 pointer-events-none">shield_with_heart</span>
            </div>
          </div>
        </div>
      </main>

      <button className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-white text-brand rounded-full shadow-[0px_8px_24px_rgba(255,255,255,0.2)] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40">
        <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>search_check</span>
      </button>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-brand/90 backdrop-blur-lg border-t border-white/10 flex justify-around items-center px-5 pb-8 pt-2">
        <button onClick={() => onNavigate('dashboard')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1 hover:text-white transition-transform duration-150 active:scale-95">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-xs mt-1">Início</span>
        </button>
        <button onClick={() => onNavigate('admin')} className="flex flex-col items-center justify-center bg-white/20 text-white rounded-xl px-4 py-1 transition-transform duration-150 active:scale-95">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          <span className="text-xs mt-1">Admin</span>
        </button>
        <button onClick={() => onNavigate('calendar')} className="flex flex-col items-center justify-center text-white/60 px-4 py-1 hover:text-white">
          <span className="material-symbols-outlined">calendar_month</span>
          <span className="text-xs mt-1">Calendário</span>
        </button>
      </nav>

      {/* Affiliate Ranking Modal */}
      {isAdminAffiliateRankingModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#fde047]">emoji_events</span>
                Ranking de Afiliados
              </h3>
              <button onClick={() => setIsAdminAffiliateRankingModalOpen(false)} className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <p className="text-sm text-white/80 leading-relaxed mb-4">
                  Acompanhe o desempenho dos afiliados e identifique os top performers.
                  Utilize este ranking para distribuir prêmios e/ou brindes com marca própria aos melhores afiliados de cada mês ou épocas específicas.
                </p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-white/5 text-white/60 text-xs">
                      <tr>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Posição</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Afiliado</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Rede Direta</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Rede Indireta</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Total na Rede</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Premiação (Sugestão)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {(() => {
                        const affiliateRankings = users.map(user => {
                          const level1 = users.filter((u:any) => u.referredBy === user.id);
                          const level2 = users.filter((u:any) => u.indirectReferredBy === user.id);
                          return {
                            ...user,
                            level1Count: level1.length,
                            level2Count: level2.length,
                            totalNetwork: level1.length + level2.length
                          };
                        }).filter(user => user.totalNetwork > 0).sort((a, b) => b.totalNetwork - a.totalNetwork);

                        if (affiliateRankings.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-white/50">Nenhum afiliado com rede ativa no momento.</td>
                            </tr>
                          );
                        }

                        return affiliateRankings.map((user, index) => {
                          let trophyColor = "text-white/20";
                          if (index === 0) trophyColor = "text-yellow-400";
                          else if (index === 1) trophyColor = "text-gray-300";
                          else if (index === 2) trophyColor = "text-amber-600";

                          return (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {index < 3 ? (
                                    <span className={`material-symbols-outlined ${trophyColor}`}>emoji_events</span>
                                  ) : (
                                    <span className="w-6 text-center text-white/60 font-bold">{index + 1}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-white">{user.name}</p>
                                  <p className="text-[10px] text-white/60">{user.email || user.cpf}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-green-300 font-bold">
                                {user.level1Count}
                              </td>
                              <td className="px-4 py-3 text-sm text-blue-300 font-bold">
                                {user.level2Count}
                              </td>
                              <td className="px-4 py-3 text-sm text-white font-black">
                                {user.totalNetwork}
                              </td>
                              <td className="px-4 py-3">
                                {index === 0 && <span className="bg-yellow-400/20 text-yellow-300 text-xs px-2 py-1 rounded-full border border-yellow-400/30">Prêmio 1º Lugar</span>}
                                {index === 1 && <span className="bg-gray-300/20 text-gray-200 text-xs px-2 py-1 rounded-full border border-gray-300/30">Brinde 2º Lugar</span>}
                                {index === 2 && <span className="bg-amber-600/20 text-amber-500 text-xs px-2 py-1 rounded-full border border-amber-600/30">Brinde 3º Lugar</span>}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {isAdminBackupModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#3b82f6]">backup</span>
                 Backup e Restauração
              </h3>
              <button onClick={() => setIsAdminBackupModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6 bg-[#06402B]">
              <div className="bg-white p-6 rounded-2xl border border-white/10 shadow-lg flex flex-col gap-5 text-[#1f2937]">
                <p className="text-[#374151] font-semibold text-sm">
                  Exporte os dados do sistema para segurança ou migração. Escolha o tipo de backup desejado abaixo:
                </p>

                <div className="flex flex-col gap-4">
                  
                  {/* Backup Completo */}
                  <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:bg-[#e0f2fe] transition-all">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#3b82f6]/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#2563eb]">database</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1e3a8a] text-sm truncate sm:whitespace-normal">Backup Completo do Aplicativo</p>
                        <p className="text-xs text-[#4b5563] mt-0.5">Banco de dados completo, configurações de sistema, dados de usuários, histórico, logs, etc.</p>
                      </div>
                    </div>
                    <button onClick={() => handleDownloadBackup('complete')} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 flex items-center gap-2 shadow">
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Baixar Completo
                    </button>
                  </div>

                  {/* Configurações do Sistema */}
                  <div className="bg-[#f5f3ff] border border-[#ddd6fe] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:bg-[#f3e8ff] transition-all">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#7c3aed]/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#6d28d9]">settings</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#5b21b6] text-sm">Configurações do Sistema</p>
                        <p className="text-xs text-[#4b5563] mt-0.5">Apenas configurações de tema, módulos ativos e regras globais.</p>
                      </div>
                    </div>
                    <button onClick={() => handleDownloadBackup('system')} className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 flex items-center gap-2 shadow">
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Baixar Sistema
                    </button>
                  </div>

                  {/* Dados do Administrador */}
                  <div className="bg-[#fff7ed] border border-[#ffedd5] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:bg-[#ffedd5] transition-all">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#ea580c]/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#ea580c]">shield_person</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#7c2d12] text-sm">Dados do Administrador</p>
                        <p className="text-xs text-[#4b5563] mt-0.5">Informações de conta do administrador e configurações específicas.</p>
                      </div>
                    </div>
                    <button onClick={() => handleDownloadBackup('admin')} className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 flex items-center gap-2 shadow">
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Baixar Admin
                    </button>
                  </div>

                  {/* Backup de Usuário Específico */}
                  <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:bg-[#dcfce7] transition-all">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#16a34a]/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#16a34a]">person</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#14532d] text-sm">Backup de Usuário Específico</p>
                        <p className="text-xs text-[#4b5563] mt-0.5">Dados, histórico e configurações de um único usuário.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select 
                        id="specificUserBackupSelect" 
                        className="bg-white border border-[#d1d5db] text-[#1f2937] text-xs rounded-lg focus:ring-[#16a34a] focus:border-[#16a34a] block p-2"
                      >
                        <option value="" className="text-[#6b7280]">Selecione o usuário</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id} className="text-[#1f2937]">{u.name} - {u.email || u.whatsapp}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => {
                          const selectEl = document.getElementById('specificUserBackupSelect') as HTMLSelectElement;
                          if (selectEl && selectEl.value) {
                            handleDownloadBackup('user', selectEl.value);
                          } else {
                            alert('Por favor, selecione um usuário primeiro.');
                          }
                        }} 
                        className="bg-[#16a34a] hover:bg-[#15803d] text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow"
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </button>
                    </div>
                  </div>

                  {/* Configuração de Backup Automático e Histórico */}
                  <div className="border-t border-[#d1d5db]/30 pt-6 mt-4 flex flex-col gap-4">
                    <h4 className="text-md font-bold text-[#1e3a8a] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#2563eb]">schedule</span>
                      Agendamento de Backups Automáticos
                    </h4>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col gap-4 text-gray-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Ativar Backup Automático</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={backupScheduleEnabled} 
                            onChange={(e) => setBackupScheduleEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {backupScheduleEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-150">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-600">Frequência</label>
                            <select 
                              value={backupScheduleFrequency}
                              onChange={(e) => setBackupScheduleFrequency(e.target.value as any)}
                              className="bg-white border border-[#d1d5db] text-xs rounded-lg p-2 text-gray-800"
                            >
                              <option value="daily">Diário (A cada 24 horas)</option>
                              <option value="weekly">Semanal (A cada 7 dias)</option>
                              <option value="monthly">Mensal (A cada 30 dias)</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-600">Tipo de Backup</label>
                            <select 
                              value={backupScheduleType}
                              onChange={(e) => setBackupScheduleType(e.target.value as any)}
                              className="bg-white border border-[#d1d5db] text-xs rounded-lg p-2 text-gray-800"
                            >
                              <option value="complete">Completo do Aplicativo</option>
                              <option value="system">Apenas Configurações</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-600">Limite de Arquivos</label>
                            <input 
                              type="number"
                              min="1"
                              max="20"
                              value={backupScheduleLimit}
                              onChange={(e) => setBackupScheduleLimit(Math.max(1, parseInt(e.target.value) || 5))}
                              className="bg-white border border-[#d1d5db] text-xs rounded-lg p-2 text-gray-800"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          Último backup: {backupLastDate ? new Date(backupLastDate).toLocaleString('pt-BR') : 'Nunca executado'}
                        </span>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button 
                            onClick={handleSaveBackupSettings}
                            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">save</span>
                            Salvar Configuração
                          </button>
                          
                          <button 
                            onClick={handleCreateInstantAutoBackup}
                            className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                            Backup Imediato
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Backups Automáticos Salvos */}
                    <div className="mt-4">
                      <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">list_alt</span>
                        Backups Automáticos Salvos ({automaticBackupsList.length})
                      </h5>
                      
                      {automaticBackupsList.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-xs text-gray-500">
                          Nenhum backup automático disponível na lista ainda.
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                          <table className="w-full text-left text-xs text-gray-800">
                            <thead className="bg-gray-100 text-gray-600 border-b border-gray-200 uppercase font-semibold">
                              <tr>
                                <th className="p-3">Data e Hora</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Tamanho</th>
                                <th className="p-3 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {automaticBackupsList.map((backup) => (
                                <tr key={backup.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-3 font-medium">
                                    {new Date(backup.timestamp).toLocaleString('pt-BR')}
                                  </td>
                                  <td className="p-3 uppercase">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      backup.type === 'complete' ? 'bg-[#eff6ff] text-[#1e3a8a]' : 'bg-[#f5f3ff] text-[#5b21b6]'
                                    }`}>
                                      {backup.type === 'complete' ? 'Completo' : 'Config'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-500">{backup.size}</td>
                                  <td className="p-3 text-right flex justify-end gap-1.5">
                                    <button 
                                      onClick={() => triggerDownloadOfData(backup.data, `agio_backup_${backup.type}_auto_${backup.timestamp.split('T')[0]}.json`)}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-all cursor-pointer"
                                      title="Baixar Backup"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">download</span>
                                    </button>
                                    <button 
                                      onClick={() => handleRestoreAutoBackup(backup)}
                                      className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 p-1 rounded transition-all cursor-pointer"
                                      title="Restaurar Backup"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">settings_backup_restore</span>
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteAutoBackup(backup.id)}
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-all cursor-pointer"
                                      title="Excluir Backup"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Affiliate Setup Modal */}
      {isAdminAffiliateModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#25d366]">account_balance_wallet</span>
                 Gestão de Afiliados e Comissões
              </h3>
              <button onClick={() => setIsAdminAffiliateModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#f0fdf4] rounded-xl p-4 border border-[#dcfce7]">
                   <p className="text-xs font-semibold text-[#16a34a] uppercase">Comissões a Pagar</p>
                   <p className="text-2xl font-bold text-[#15803d] mt-1">
                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                       users.reduce((acc, u) => acc + (u.commissions || 0), 0) + 
                       withdrawals.filter((w: any) => w.status === 'pendente').reduce((acc, w) => acc + (w.amount || 0), 0)
                     )}
                   </p>
                </div>
                <div className="bg-[#eff6ff] rounded-xl p-4 border border-[#dbeafe]">
                   <p className="text-xs font-semibold text-[#2563eb] uppercase">Total Afiliados</p>
                   <p className="text-2xl font-bold text-[#1d4ed8] mt-1">{users.filter(u => u.isAffiliate).length}</p>
                </div>
              </div>

              <div className="bg-[#f5f3ff] p-5 rounded-2xl border border-[#ddd6fe] shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-[#4c1d95] flex items-center gap-2 text-base">
                    <span className="material-symbols-outlined text-[#6d28d9]">payments</span>
                    Solicitações de Saque Pendentes
                  </h4>
                </div>
                <div className="border border-[#ddd6fe] rounded-xl overflow-hidden bg-white shadow-inner">
                  {withdrawals.filter((w: any) => w.status === 'pendente').length === 0 ? (
                    <div className="p-6 text-center text-sm text-[#4b5563] font-medium bg-white rounded-xl">Nenhuma solicitação pendente.</div>
                  ) : (
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-[#ede9fe] text-[#5b21b6] text-xs font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 font-medium">Afiliado</th>
                          <th className="px-4 py-3 font-medium">Chave PIX</th>
                          <th className="px-4 py-3 font-medium">Valor</th>
                          <th className="px-4 py-3 font-medium text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ede9fe]">
                        {withdrawals.filter((w: any) => w.status === 'pendente').map((req: any) => (
                          <React.Fragment key={req.id}>
                          <tr className="hover:bg-[#f5f3ff]/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-[#1f2937] hover:text-[#6d28d9] transition-colors">{req.userName}</span>
                                <button onClick={() => setExpandedWithdrawalId(expandedWithdrawalId === req.id ? null : req.id)} className="text-xs text-[#6d28d9] hover:text-[#5b21b6] font-semibold flex items-center gap-1 w-max mt-1">
                                  {expandedWithdrawalId === req.id ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                                  <span className="material-symbols-outlined text-[14px]">{expandedWithdrawalId === req.id ? 'expand_less' : 'expand_more'}</span>
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-[#374151]">{req.pixKey}</td>
                            <td className="px-4 py-3 font-bold text-[#16a34a]">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(req.amount)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={async () => {
                                  if (automaticCommissionPayment) {
                                    if (confirm(`Aprovar e enviar PIX de ${req.amount} para ${req.userName}?`)) {
                                      try {
                                        const res = await fetch('/api/process-withdrawal', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            userId: req.userId,
                                            pixKey: req.pixKey,
                                            amount: req.amount,
                                            mpAccessToken: mpAccessToken
                                          })
                                        });
                                        
                                        const data = await res.json();
                                        
                                        if (data.status === 'approved') {
                                          const wds = [...withdrawals];
                                          const idx = wds.findIndex(w => w.id === req.id);
                                          if (idx !== -1) {
                                            wds[idx].status = 'pago';
                                            setWithdrawals(wds);
                                            localStorage.setItem('agenda_withdrawals', JSON.stringify(wds));
                                          }
                                          alert('PIX processado e marcado como pago!');
                                        } else {
                                          alert('Erro da API: ' + (data.error || 'Falha ao processar'));
                                        }
                                      } catch (err) {
                                        alert('Erro ao chamar API de saque.');
                                      }
                                    }
                                  } else {
                                    setSelectedWithdrawalForPayment(req);
                                    setPaymentReceiptStr('');
                                    setIsPaymentModalOpen(true);
                                  }
                                }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${automaticCommissionPayment ? 'bg-[#6d28d9] hover:bg-[#5b21b6] text-white' : 'bg-[#16a34a] hover:bg-[#15803d] text-white'}`}
                              >
                                {automaticCommissionPayment ? 'Processar PIX' : 'Marcar como Pago'}
                              </button>
                            </td>
                          </tr>
                          {expandedWithdrawalId === req.id && (
                            <tr className="bg-[#f5f3ff]/60">
                              <td colSpan={4} className="px-6 py-5">
                                <div className="text-xs text-[#374151]">
                                  <h5 className="font-bold mb-3 flex items-center gap-1.5 text-[#4c1d95] text-sm">
                                    <span className="material-symbols-outlined text-[18px] text-[#6d28d9]">account_tree</span> 
                                    Origem das Comissões (Assinantes Ativos)
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="font-bold text-[#4c1d95] border-b border-[#ddd6fe] pb-1.5 mb-2 flex justify-between text-xs">
                                        <span>Comissões Diretas ({directCommissionPct})</span>
                                      </p>
                                      <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {users.filter(u => u.referredBy === req.userId).map(u => {
                                          const exp = getExpirationStatus(u);
                                          const paid = u.installmentsPaid || 0;
                                          const maxM = Number(directCommissionMonths) || 12;
                                          
                                          let statusText = "Em Teste";
                                          let statusStyle = "bg-blue-100 text-blue-700 border-blue-200";
                                          
                                          if (u.plan === 'premium') {
                                            if (paid >= maxM) {
                                              statusText = "Concluído";
                                              statusStyle = "bg-cyan-100 text-cyan-700 border-cyan-200";
                                            } else if (exp.planExpired) {
                                              statusText = "Inadimplente";
                                              statusStyle = "bg-red-100 text-red-700 border-red-200 font-bold";
                                            } else {
                                              statusText = "Ativo";
                                              statusStyle = "bg-green-100 text-green-700 border-green-200";
                                            }
                                          } else {
                                            if (exp.trialDaysRemaining <= 0) {
                                              statusText = "Inadimplente";
                                              statusStyle = "bg-red-100 text-red-700 border-red-200 font-bold";
                                            }
                                          }

                                          return (
                                            <li key={u.id} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg border border-[#ddd6fe] text-[11px] gap-2 shadow-sm">
                                              <span className="truncate w-24 font-semibold text-[#1f2937]" title={u.name}>{u.name}</span>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[#6d28d9] font-bold">{paid} / {maxM} parc.</span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${statusStyle}`}>{statusText}</span>
                                              </div>
                                            </li>
                                          );
                                        })}
                                        {users.filter(u => u.referredBy === req.userId).length === 0 && <li className="text-[#6b7280] italic text-xs">Nenhum usuário direto</li>}
                                      </ul>
                                    </div>
                                    <div>
                                      <p className="font-bold text-[#4c1d95] border-b border-[#ddd6fe] pb-1.5 mb-2 flex justify-between text-xs">
                                        <span>Comissões Indiretas ({indirectCommissionPct})</span>
                                      </p>
                                      <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {users.filter(u => u.indirectReferredBy === req.userId).map(u => {
                                          const exp = getExpirationStatus(u);
                                          const paid = u.installmentsPaid || 0;
                                          const maxM = Number(indirectCommissionMonths) || 12;
                                          
                                          let statusText = "Em Teste";
                                          let statusStyle = "bg-blue-100 text-blue-700 border-blue-200";
                                          
                                          if (u.plan === 'premium') {
                                            if (paid >= maxM) {
                                              statusText = "Concluído";
                                              statusStyle = "bg-cyan-100 text-cyan-700 border-cyan-200";
                                            } else if (exp.planExpired) {
                                              statusText = "Inadimplente";
                                              statusStyle = "bg-red-100 text-red-700 border-red-200 font-bold";
                                            } else {
                                              statusText = "Ativo";
                                              statusStyle = "bg-green-100 text-green-700 border-green-200";
                                            }
                                          } else {
                                            if (exp.trialDaysRemaining <= 0) {
                                              statusText = "Inadimplente";
                                              statusStyle = "bg-red-100 text-red-700 border-red-200 font-bold";
                                            }
                                          }

                                          return (
                                            <li key={u.id} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg border border-[#ddd6fe] text-[11px] gap-2 shadow-sm">
                                              <span className="truncate w-24 font-semibold text-[#1f2937]" title={u.name}>{u.name}</span>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[#6d28d9] font-bold">{paid} / {maxM} parc.</span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${statusStyle}`}>{statusText}</span>
                                              </div>
                                            </li>
                                          );
                                        })}
                                        {users.filter(u => u.indirectReferredBy === req.userId).length === 0 && <li className="text-[#6b7280] italic text-xs">Nenhum usuário indireto</li>}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="bg-[#f9fafb] rounded-xl p-5 border border-[#e5e7eb]">
                <h4 className="font-semibold text-[#1f2937] mb-4">Configuração de Regras</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[#1f2937]">
                    <div>
                      <p className="font-medium text-sm">Comissão Direta (Nível 1)</p>
                      <p className="text-xs text-[#6b7280]">Porcentagem sobre a primeira assinatura</p>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={directCommissionPct} onChange={e => setDirectCommissionPct(e.target.value)} className="w-16 text-center rounded border border-[#d1d5db] py-1 bg-white text-[#111827]" placeholder="%" />
                      <input type="number" value={directCommissionMonths} onChange={e => setDirectCommissionMonths(e.target.value)} className="w-20 text-center rounded border border-[#d1d5db] py-1 bg-white text-[#111827]" placeholder="Meses" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[#1f2937]">
                    <div>
                      <p className="font-medium text-sm">Comissão Indireta (Nível 2)</p>
                      <p className="text-xs text-[#6b7280]">Porcentagem sobre indicados de indicados</p>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={indirectCommissionPct} onChange={e => setIndirectCommissionPct(e.target.value)} className="w-16 text-center rounded border border-[#d1d5db] py-1 bg-white text-[#111827]" placeholder="%" />
                      <input type="number" value={indirectCommissionMonths} onChange={e => setIndirectCommissionMonths(e.target.value)} className="w-20 text-center rounded border border-[#d1d5db] py-1 bg-white text-[#111827]" placeholder="Meses" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <button onClick={handleSaveSettings} className="bg-[#1f2937] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#374151] transition-colors">
                      Salvar Regras
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#f3f4f6]">
                <button 
                  onClick={() => setIsAdminAffiliateModalOpen(false)} 
                  className="bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Fechar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Admin Marketing Setup Modal */}
      {isAdminMarketingModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#f3f4f6] bg-[#f9fafb]/50 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-[#ff954c] flex items-center gap-2">
                 <span className="material-symbols-outlined">campaign</span>
                 Materiais de Divulgação & QR Code
              </h3>
              <button onClick={() => setIsAdminMarketingModalOpen(false)} className="text-[#9ca3af] hover:text-[#ef4444] transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">

              {/* Gerador de QR Code Admin */}
              <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
                <h4 className="font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ff954c]">qr_code_2</span>
                  Seu QR Code de Captação
                </h4>
                <div className="flex flex-col items-center">
                  <div className="bg-white p-2 border-2 border-[#ff954c]/30 rounded-xl mb-4">
                     <img 
                       src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/?ref=MasterAdmin`)}`} 
                       alt="QR Code Admin" 
                       className="w-32 h-32 object-contain"
                     />
                  </div>
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/?ref=MasterAdmin`)}`;
                      link.download = `qrcode_admin.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="bg-[#ff954c] text-white hover:bg-[#e8813a] px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span> Salvar QR Code
                  </button>
                </div>
              </div>

              {/* Materiais Upload */}
              <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
                <h4 className="font-bold text-[#111827] mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ff954c]">perm_media</span>
                  Gerenciar Materiais para Afiliados
                </h4>
                <p className="text-sm text-[#4b5563] mb-4">Adicione links de banners, folders, vídeos ou áudios que os afiliados poderão usar.</p>
                
                <div className="space-y-4">
                  {marketingMaterials.map((mat, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-[#f9fafb] p-3 rounded-lg border border-[#e5e7eb]">
                      <div className="flex-1 w-full">
                        <select 
                          value={mat.type} 
                          onChange={(e) => {
                            const newMat = [...marketingMaterials];
                            newMat[idx].type = e.target.value;
                            setMarketingMaterials(newMat);
                          }}
                          className="w-full mb-2 bg-white border border-[#d1d5db] px-2 py-1 rounded text-sm text-[#111827]"
                        >
                          <option value="image">Imagem / Banner / Folder</option>
                          <option value="video">Vídeo</option>
                          <option value="audio">Áudio</option>
                          <option value="text">Texto Promocional</option>
                        </select>
                        <input 
                          type="text" 
                          placeholder="Título (ex: Banner 01)" 
                          value={mat.title} 
                          onChange={(e) => {
                            const newMat = [...marketingMaterials];
                            newMat[idx].title = e.target.value;
                            setMarketingMaterials(newMat);
                          }}
                          className="w-full mb-2 bg-white border border-[#d1d5db] px-2 py-1 rounded text-sm text-[#111827]" 
                        />
                        <input 
                          type="text" 
                          placeholder={mat.type === 'text' ? "Conteúdo do texto" : "URL do material"} 
                          value={mat.content} 
                          onChange={(e) => {
                            const newMat = [...marketingMaterials];
                            newMat[idx].content = e.target.value;
                            setMarketingMaterials(newMat);
                          }}
                          className="w-full bg-white border border-[#d1d5db] px-2 py-1 rounded text-sm text-[#111827]" 
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newMat = marketingMaterials.filter((_, i) => i !== idx);
                          setMarketingMaterials(newMat);
                          localStorage.setItem('agenda_marketing_materials', JSON.stringify(newMat));
                        }} 
                        className="text-[#ef4444] hover:bg-[#fee2e2] p-2 rounded transition-colors self-end sm:self-auto"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => {
                        setMarketingMaterials([...marketingMaterials, {id: Math.random().toString(), type: 'image', title: '', content: ''}]);
                      }}
                      className="bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex justify-center items-center gap-1 w-full"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span> Adicionar Novo Material
                    </button>
                    <button 
                      onClick={() => {
                         localStorage.setItem('agenda_marketing_materials', JSON.stringify(marketingMaterials));
                         alert("Materiais salvos com sucesso!");
                      }}
                      className="bg-[#1f2937] text-white hover:bg-[#374151] px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex justify-center items-center gap-1 w-full"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span> Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#f3f4f6]">
                <button 
                  onClick={() => setIsAdminMarketingModalOpen(false)} 
                  className="bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Fechar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Admin Support & AI Modal */}
      {isAdminSupportModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#f3f4f6] bg-[#f9fafb]/50 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-[#a855f7] flex items-center gap-2">
                 <span className="material-symbols-outlined">forum</span>
                 Relatórios de Suporte e IA
              </h3>
              <button onClick={() => setIsAdminSupportModalOpen(false)} className="text-[#9ca3af] hover:text-[#ef4444] transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-sm">
                <p className="text-sm text-[#4b5563] mb-4">Aqui estão as interações dos usuários com o Agente de IA. Você pode marcar como resolvido o que não precisar de atenção em Nível 2.</p>
                {supportReports.length === 0 ? (
                  <div className="text-center py-8 text-[#6b7280]">
                    <span className="material-symbols-outlined text-[48px] opacity-50 mb-2">check_circle</span>
                    <p>Nenhuma solicitação pendente.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supportReports.map((report, idx) => (
                      <div key={report.id || idx} className={`p-4 rounded-lg border ${report.status === 'pendente' ? 'border-[#ef4444]/30 bg-[#fef2f2]' : 'border-[#d1d5db] bg-[#f9fafb]'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#111827]">{report.userName}</span>
                            <span className="text-xs text-[#6b7280]">{new Date(report.date).toLocaleString()}</span>
                            {report.status === 'pendente' ? (
                              <span className="bg-[#ef4444] text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold">Pendente</span>
                            ) : (
                              <span className="bg-[#10b981] text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold">Resolvido</span>
                            )}
                          </div>
                          {report.status === 'pendente' && (
                            <button 
                              onClick={() => {
                                const newReports = [...supportReports];
                                newReports[idx].status = 'resolvido';
                                setSupportReports(newReports);
                                localStorage.setItem('agenda_support_reports', JSON.stringify(newReports));
                              }}
                              className="text-xs bg-[#10b981] text-white hover:bg-[#059669] px-2 py-1 rounded font-semibold transition-colors flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span> Marcar Resolvido
                            </button>
                          )}
                        </div>
                        <div className="mt-3 flex flex-col gap-2 text-sm">
                          <div className="bg-white p-3 rounded border border-[#d1d5db]">
                            <span className="font-semibold text-[#111827] block mb-1">Dúvida do Usuário:</span>
                            <span className="text-[#374151] whitespace-pre-wrap">{report.userMessage}</span>
                          </div>
                          <div className="bg-[#f0fdf4] p-3 rounded border border-[#bbf7d0]">
                            <span className="font-semibold text-[#166534] block mb-1">Resposta do IA:</span>
                            <span className="text-[#166534] whitespace-pre-wrap">{report.aiResponse}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end p-4 border-t border-[#f3f4f6]">
              <button 
                onClick={() => {
                  if (confirm('Tem certeza que deseja apagar todo o histórico de relatórios?')) {
                    setSupportReports([]);
                    localStorage.setItem('agenda_support_reports', '[]');
                  }
                }} 
                className="text-[#ef4444] hover:bg-[#fee2e2] px-4 py-2 rounded-lg text-sm font-semibold transition-colors mr-auto"
              >
                Limpar Histórico
              </button>
              <button 
                onClick={() => setIsAdminSupportModalOpen(false)} 
                className="bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Tracking & Logs Modal */}
      {isAdminTrackingModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#f3f4f6] bg-[#f9fafb]/50 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-[#ec4899] flex items-center gap-2">
                 <span className="material-symbols-outlined">radar</span>
                 Rastreamento e Ofertas de Gratuidade
              </h3>
              <button onClick={() => setIsAdminTrackingModalOpen(false)} className="text-[#9ca3af] hover:text-[#ef4444] transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-[#e5e7eb] bg-[#f9fafb]/90 px-6 z-10 shrink-0">
              <button 
                onClick={() => setTrackingTab('logs')} 
                className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${trackingTab === 'logs' ? 'border-[#ec4899] text-[#ec4899]' : 'border-transparent text-[#4b5563] hover:text-[#ec4899]'}`}
              >
                Logs de Navegação
              </button>
              <button 
                onClick={() => setTrackingTab('offers')} 
                className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${trackingTab === 'offers' ? 'border-[#ec4899] text-[#ec4899]' : 'border-transparent text-[#4b5563] hover:text-[#ec4899]'}`}
              >
                Acompanhamento de Gratuidade & Ofertas (40 Dias)
              </button>
              <button 
                onClick={() => setTrackingTab('analytics')} 
                className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${trackingTab === 'analytics' ? 'border-[#ec4899] text-[#ec4899]' : 'border-transparent text-[#4b5563] hover:text-[#ec4899]'}`}
              >
                Análises e Relatórios
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto bg-[#ffffff]">
              {trackingTab === 'analytics' ? (
                <div className="flex flex-col gap-6 text-[#1f2937]">
                  <h4 className="text-lg font-bold">Relatórios de Acessos e Demografia</h4>
                  
                  {(() => {
                    const accessLogs = trackingLogs.filter(l => l.type === 'access');
                    
                    const today = new Date().toDateString();
                    const daily = accessLogs.filter(l => new Date(l.timestamp).toDateString() === today).length;
                    
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    const weekly = accessLogs.filter(l => new Date(l.timestamp) >= oneWeekAgo).length;

                    const oneMonthAgo = new Date();
                    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
                    const monthly = accessLogs.filter(l => new Date(l.timestamp) >= oneMonthAgo).length;

                    const locationCounts = accessLogs.reduce((acc, log) => {
                      const loc = log.location || 'Desconhecido';
                      acc[loc] = (acc[loc] || 0) + 1;
                      return acc;
                    }, {});
                    const topLocations = Object.entries(locationCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);

                    const ageCounts = accessLogs.reduce((acc, log) => {
                      if (log.age) acc[log.age] = (acc[log.age] || 0) + 1;
                      return acc;
                    }, {});
                    const genderCounts = accessLogs.reduce((acc, log) => {
                      if (log.gender) acc[log.gender] = (acc[log.gender] || 0) + 1;
                      return acc;
                    }, {});
                    const professionCounts = accessLogs.reduce((acc, log) => {
                      if (log.profession) acc[log.profession] = (acc[log.profession] || 0) + 1;
                      return acc;
                    }, {});

                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-[#f3f4f6] p-4 rounded-xl border border-[#e5e7eb]">
                            <div className="text-sm font-semibold text-[#4b5563]">Acessos Hoje</div>
                            <div className="text-3xl font-bold text-[#ec4899]">{daily}</div>
                          </div>
                          <div className="bg-[#f3f4f6] p-4 rounded-xl border border-[#e5e7eb]">
                            <div className="text-sm font-semibold text-[#4b5563]">Acessos (7 Dias)</div>
                            <div className="text-3xl font-bold text-[#ec4899]">{weekly}</div>
                          </div>
                          <div className="bg-[#f3f4f6] p-4 rounded-xl border border-[#e5e7eb]">
                            <div className="text-sm font-semibold text-[#4b5563]">Acessos (30 Dias)</div>
                            <div className="text-3xl font-bold text-[#ec4899]">{monthly}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 shadow-sm">
                            <h5 className="font-bold text-[#374151] mb-3 border-b pb-2">Top Localizações (Bairro, Cidade, Estado, País)</h5>
                            <ul className="text-sm flex flex-col gap-2">
                              {topLocations.length === 0 && <li className="text-[#9ca3af]">Nenhum dado</li>}
                              {topLocations.map(([loc, count]: any) => (
                                <li key={loc} className="flex justify-between">
                                  <span>{loc}</span>
                                  <span className="font-bold bg-[#fce7f3] text-[#be185d] px-2 py-0.5 rounded-full">{count}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 shadow-sm">
                            <h5 className="font-bold text-[#374151] mb-3 border-b pb-2">Dados Demográficos</h5>
                            
                            <div className="mb-4">
                              <h6 className="font-semibold text-xs text-[#6b7280] uppercase mb-1">Idade</h6>
                              <div className="flex flex-wrap gap-2">
                                {Object.keys(ageCounts).length === 0 && <span className="text-xs text-[#9ca3af]">Sem dados</span>}
                                {Object.entries(ageCounts).map(([age, count]: any) => (
                                  <span key={age} className="text-xs bg-[#e0e7ff] text-[#4338ca] px-2 py-1 rounded-full">{age} anos: {count}</span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <h6 className="font-semibold text-xs text-[#6b7280] uppercase mb-1">Sexo</h6>
                              <div className="flex flex-wrap gap-2">
                                {Object.keys(genderCounts).length === 0 && <span className="text-xs text-[#9ca3af]">Sem dados</span>}
                                {Object.entries(genderCounts).map(([gender, count]: any) => (
                                  <span key={gender} className="text-xs bg-[#dcfce7] text-[#15803d] px-2 py-1 rounded-full">{gender}: {count}</span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h6 className="font-semibold text-xs text-[#6b7280] uppercase mb-1">Profissão</h6>
                              <div className="flex flex-wrap gap-2">
                                {Object.keys(professionCounts).length === 0 && <span className="text-xs text-[#9ca3af]">Sem dados</span>}
                                {Object.entries(professionCounts).map(([prof, count]: any) => (
                                  <span key={prof} className="text-xs bg-[#fef3c7] text-[#b45309] px-2 py-1 rounded-full">{prof}: {count}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : trackingTab === 'logs' ? (
                <>
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 bg-[#fdf2f8] border border-[#fbcfe8] rounded-xl p-4">
                       <div className="text-sm text-[#db2777] font-semibold mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">touch_app</span> Cliques Registrados</div>
                       <div className="text-3xl font-bold text-[#be185d]">{trackingLogs.filter(l => l.type === 'click').length}</div>
                    </div>
                    <div className="flex-1 bg-[#fdf2f8] border border-[#fbcfe8] rounded-xl p-4">
                       <div className="text-sm text-[#db2777] font-semibold mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">explore</span> Acessos de Telas</div>
                       <div className="text-3xl font-bold text-[#be185d]">{trackingLogs.filter(l => l.type === 'navigation').length}</div>
                    </div>
                  </div>

                  {trackingLogs.length === 0 ? (
                    <div className="text-center text-[#6b7280] py-8">Nenhum evento registrado ainda.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#e5e7eb]">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#f9fafb] text-[#4b5563] text-xs uppercase sticky top-0">
                          <tr>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Data/Hora</th>
                            <th className="px-4 py-3">Usuário</th>
                            <th className="px-4 py-3">Identificação/Email</th>
                            <th className="px-4 py-3">Detalhe do Evento</th>
                            <th className="px-4 py-3">Localização</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb]">
                          {trackingLogs.map(log => (
                            <tr key={log.id} className="hover:bg-[#f3f4f6]/50 transition-colors">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${log.type === 'click' ? 'bg-[#fbcfe8] text-[#be185d]' : 'bg-[#e0e7ff] text-[#4338ca]'}`}>
                                  <span className="material-symbols-outlined text-[12px]">{log.type === 'click' ? 'mouse' : 'visibility'}</span>
                                  {log.type === 'click' ? 'Clique' : 'Acesso'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#4b5563] whitespace-nowrap">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-3 font-medium text-[#111827]">{log.userName || 'Convidado'}</td>
                              <td className="px-4 py-3 text-[#6b7280]">
                                <div className="text-xs">{log.userEmail}</div>
                                <div className="text-[10px] text-[#9ca3af]">ID: {log.userId}</div>
                              </td>
                              <td className="px-4 py-3 text-[#4b5563] max-w-xs truncate" title={log.details}>{log.details}</td>
                              <td className="px-4 py-3 text-[#6b7280]">
                                <div className="text-xs flex items-center gap-1" title={log.ip}><span className="material-symbols-outlined text-[14px]">location_on</span> {log.location || 'Desconhecido'}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-5 text-[#14532d] flex items-start gap-3">
                    <span className="material-symbols-outlined text-green-600 mt-0.5 text-2xl">campaign</span>
                    <div>
                      <h4 className="font-bold text-[#14532d] text-base">Rastreamento de Período de Teste e Ofertas</h4>
                      <p className="text-sm text-[#15803d] mt-1 leading-relaxed">
                        Acompanhe o progresso dos usuários nos 40 dias de gratuidade do aplicativo. Conceda ofertas personalizadas de desconto de 10%, 20% ou 30% nos 3 primeiros meses, conforme o dia de teste do usuário, para incentivá-lo a assinar o plano do aplicativo.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 text-[#1e3a8a]">
                      <p className="text-xs font-semibold text-[#2563eb] uppercase tracking-wider">Usuários Testando</p>
                      <p className="text-3xl font-black text-[#1d4ed8] mt-1">{users.filter(u => u.plan === 'free').length}</p>
                    </div>
                    <div className="bg-[#fef3c7] border border-[#fde68a] rounded-xl p-4 text-[#78350f]">
                      <p className="text-xs font-semibold text-[#d97706] uppercase tracking-wider">Aptos para Oferta (Dia 10-39)</p>
                      <p className="text-3xl font-black text-[#b45309] mt-1">
                        {users.filter(u => {
                          if (u.plan !== 'free') return false;
                          const elapsed = Math.floor((new Date().getTime() - new Date(u.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24));
                          const trialDay = elapsed + 1;
                          return trialDay >= 10 && trialDay <= 39;
                        }).length}
                      </p>
                    </div>
                    <div className="bg-[#fdf2f8] border border-[#fbcfe8] rounded-xl p-4 text-[#831843]">
                      <p className="text-xs font-semibold text-[#db2777] uppercase tracking-wider">Descontos Ativos Concedidos</p>
                      <p className="text-3xl font-black text-[#be185d] mt-1">{users.filter(u => u.grantedDiscount).length}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#e5e7eb]">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-[#f9fafb] text-[#4b5563] text-xs uppercase font-bold">
                        <tr>
                          <th className="px-4 py-3">Usuário</th>
                          <th className="px-4 py-3">Dia de Teste</th>
                          <th className="px-4 py-3">Progresso (40 dias)</th>
                          <th className="px-4 py-3">Oferta Elegível</th>
                          <th className="px-4 py-3">Status da Oferta</th>
                          <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5e7eb]">
                        {users.map(u => {
                          const isVip = u.plan === 'premium';
                          const createdDate = new Date(u.createdAt || new Date());
                          const elapsedDays = Math.max(0, Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
                          const trialDay = elapsedDays + 1;

                          let pct = 0;
                          let offerDesc = "";
                          let eligible = false;

                          if (!isVip) {
                            if (trialDay >= 10 && trialDay <= 19) {
                              pct = 10;
                              offerDesc = "Desconto de 10% por 3 meses";
                              eligible = true;
                            } else if (trialDay >= 20 && trialDay <= 29) {
                              pct = 20;
                              offerDesc = "Desconto de 20% por 3 meses";
                              eligible = true;
                            } else if (trialDay >= 30 && trialDay <= 39) {
                              pct = 30;
                              offerDesc = "Desconto de 30% por 3 meses";
                              eligible = true;
                            } else if (trialDay >= 40) {
                              offerDesc = "Expirado (+40 dias) - Sem desconto";
                            } else {
                              offerDesc = `Dia ${trialDay} (Abaixo do 10º dia)`;
                            }
                          } else {
                            offerDesc = "Já é VIP Assinante";
                          }

                          return (
                            <tr key={u.id} className="hover:bg-[#f9fafb]/80 transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase text-white ${isVip ? 'bg-purple-600' : 'bg-blue-500'}`}>
                                    {(u.name || '?').charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-[#111827] text-sm">{u.name}</p>
                                    <p className="text-xs text-[#6b7280]">{u.whatsapp || u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-sm font-medium text-[#111827]">
                                {isVip ? (
                                  <span className="text-[#6b7280]">-</span>
                                ) : (
                                  <span>Dia <strong className="text-[#be185d]">{trialDay}</strong> de 40</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                {isVip ? (
                                  <div className="w-24 bg-purple-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-purple-600 h-1.5" style={{ width: '100%' }}></div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 min-w-[120px]">
                                    <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden shrink-0">
                                      <div className={`h-1.5 ${trialDay >= 40 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (trialDay / 40) * 100)}%` }}></div>
                                    </div>
                                    <span className="text-xs text-[#4b5563]">{Math.min(100, Math.round((trialDay / 40) * 100))}%</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                {isVip ? (
                                  <span className="text-[#6b7280] italic text-xs">Não aplicável</span>
                                ) : (
                                  <span className={`text-xs font-bold ${eligible ? 'text-[#b45309]' : 'text-[#6b7280]'}`}>{offerDesc}</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                {isVip ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">Assinante VIP</span>
                                ) : u.grantedDiscount ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 uppercase">
                                    Concedido: {u.grantedDiscount.pct}% OFF
                                  </span>
                                ) : eligible ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase">Apto para Oferta</span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">Sem Ofertas</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                {isVip ? (
                                  <button disabled className="text-xs bg-gray-100 text-gray-400 font-bold px-3 py-1.5 rounded-lg cursor-not-allowed">
                                    Assinante VIP
                                  </button>
                                ) : u.grantedDiscount ? (
                                  <div className="flex justify-end items-center gap-1">
                                    <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                                    <span className="text-xs text-green-700 font-bold">Oferecido</span>
                                  </div>
                                ) : eligible ? (
                                  <button 
                                    onClick={() => handleGrantDiscount(u, pct)}
                                    className="text-xs bg-[#be185d] hover:bg-[#a21caf] text-white font-bold px-3 py-1.5 rounded-lg shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-1 ml-auto"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">local_activity</span>
                                    Ofertar {pct}%
                                  </button>
                                ) : (
                                  <button disabled className="text-xs bg-gray-100 text-gray-400 font-bold px-3 py-1.5 rounded-lg cursor-not-allowed">
                                    Bloqueado
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#f3f4f6] bg-[#f9fafb]/50 flex justify-between items-center rounded-b-2xl">
               <button 
                 onClick={() => {
                  if (confirm('Tem certeza que deseja limpar os logs de rastreamento?')) {
                    setTrackingLogs([]);
                    localStorage.setItem('agenda_tracking_logs', '[]');
                  }
                 }}
                 className="text-[#ef4444] hover:bg-[#fee2e2] px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
               >
                 Limpar Registros
               </button>
               <button 
                 onClick={() => setIsAdminTrackingModalOpen(false)} 
                 className="bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
               >
                 <span className="material-symbols-outlined text-[18px]">close</span>
                 Fechar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Users Setup Modal */}
      {isAdminUsersModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#25d366]">manage_accounts</span>
                 Gerenciamento de Usuários e Acessos
              </h3>
              <button onClick={() => setIsAdminUsersModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              
              {/* Automated Policies Section */}
              <div className="bg-[#eff6ff] rounded-xl p-5 border border-[#dbeafe] relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-[#3b82f6]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <h4 className="font-bold text-[#1e3a8a] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2563eb]">smart_toy</span>
                  Políticas Automáticas de Acesso
                </h4>
                <p className="text-sm text-[#4b5563] mb-4">O sistema pode ativar e desativar usuários automaticamente com base no status do pagamento (gateway) e período de gratuidade.</p>
                
                <div className="flex flex-col gap-3">
                  <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#dbeafe] shadow-sm cursor-pointer hover:bg-[#f9fafb] transition-colors">
                    <div>
                      <p className="font-semibold text-[#1f2937] text-sm">Bloquear Inadimplentes</p>
                      <p className="text-xs text-[#6b7280]">Desativa acesso 3 dias após atraso de assinatura VIP ou fim da gratuidade sem assinatura.</p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only" checked={autoManageBlock} onChange={() => setAutoManageBlock(!autoManageBlock)} />
                      <div className={`w-11 h-6 rounded-full transition-colors ${autoManageBlock ? 'bg-[#2563eb]' : 'bg-[#e5e7eb]'} relative`}>
                        <div className={`absolute top-0.5 left-0.5 bg-white border border-[#d1d5db] rounded-full h-5 w-5 transition-transform ${autoManageBlock ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#dbeafe] shadow-sm cursor-pointer hover:bg-[#f9fafb] transition-colors">
                    <div>
                      <p className="font-semibold text-[#1f2937] text-sm">Aprovar Automaticamente Após Pagamento</p>
                      <p className="text-xs text-[#6b7280]">Ativa o acesso imediatamente após a confirmação de transação aprovada.</p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only" checked={autoManageApprove} onChange={() => setAutoManageApprove(!autoManageApprove)} />
                      <div className={`w-11 h-6 rounded-full transition-colors ${autoManageApprove ? 'bg-[#2563eb]' : 'bg-[#e5e7eb]'} relative`}>
                        <div className={`absolute top-0.5 left-0.5 bg-white border border-[#d1d5db] rounded-full h-5 w-5 transition-transform ${autoManageApprove ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#dbeafe] shadow-sm cursor-pointer hover:bg-[#f9fafb] transition-colors">
                    <div className="pr-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#25d366] text-[18px]">chat</span>
                        <p className="font-semibold text-[#1f2937] text-sm">Lembretes WhatsApp (Vencimentos)</p>
                      </div>
                      <p className="text-xs text-[#6b7280]">Envia alertas automáticos via WhatsApp 3 dias, 2 dias, 1 dia antes e no dia do vencimento da assinatura.</p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" className="sr-only" checked={autoManageReminders} onChange={() => setAutoManageReminders(!autoManageReminders)} />
                      <div className={`w-11 h-6 rounded-full transition-colors ${autoManageReminders ? 'bg-[#25d366]' : 'bg-[#e5e7eb]'} relative`}>
                        <div className={`absolute top-0.5 left-0.5 bg-white border border-[#d1d5db] rounded-full h-5 w-5 transition-transform ${autoManageReminders ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                  </label>
                  
                  {autoManageReminders && (
                    <button onClick={simulateAutomatedMessages} className="mt-1 w-full bg-[#25d366] text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors">
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Processar Envios Agora (Forçar Sistema)
                    </button>
                  )}
                </div>
              </div>

              {/* Manual Control Users Table */}
              <div className="bg-[#f5f3ff] p-5 rounded-2xl border border-[#ddd6fe] shadow-sm flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h4 className="font-bold text-[#4c1d95] flex items-center gap-2 text-base">
                    <span className="material-symbols-outlined text-[#6d28d9]">group</span>
                    Controle Manual de Usuários
                    <span className="text-xs bg-[#ede9fe] text-[#6d28d9] px-2 py-0.5 rounded-full font-semibold">
                      {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
                    </span>
                  </h4>
                  <button 
                    onClick={() => fetchAndSyncUsers()}
                    disabled={isLoadingUsers}
                    className="bg-[#6d28d9] hover:bg-[#5b21b6] text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isLoadingUsers ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                    {isLoadingUsers ? 'Sincronizando...' : 'Atualizar / Sincronizar'}
                  </button>
                </div>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Buscar usuário por nome, e-mail, whatsapp ou cidade..."
                    className="w-full pl-9 pr-4 py-2 bg-white text-gray-800 text-xs rounded-xl border border-[#ddd6fe] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
                  />
                  {userSearchQuery && (
                    <button 
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
                
                <div className="border border-[#ddd6fe] rounded-xl overflow-hidden bg-white shadow-inner">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-[#ede9fe] text-[#5b21b6] text-xs font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-medium">Usuário</th>
                        <th className="px-4 py-3 font-medium">Localização</th>
                        <th className="px-4 py-3 font-medium">Dispositivos (MAC)</th>
                        <th className="px-4 py-3 font-medium">Plano / Status</th>
                        <th className="px-4 py-3 font-medium text-right">Ação de Acesso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ede9fe]">
                      {(() => {
                        const filteredUsers = users.filter(user => {
                          if (!userSearchQuery) return true;
                          const q = userSearchQuery.toLowerCase();
                          return (
                            (user.name && user.name.toLowerCase().includes(q)) ||
                            (user.email && user.email.toLowerCase().includes(q)) ||
                            (user.whatsapp && user.whatsapp.toLowerCase().includes(q)) ||
                            (user.city && user.city.toLowerCase().includes(q)) ||
                            (user.cpf && user.cpf.toLowerCase().includes(q))
                          );
                        });

                        if (isLoadingUsers) {
                          return (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#6d28d9]">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="material-symbols-outlined animate-spin">sync</span>
                                  Buscando e sincronizando dados dos usuários...
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        if (filteredUsers.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#6b7280]">
                                {userSearchQuery 
                                  ? `Nenhum usuário encontrado para "${userSearchQuery}".`
                                  : 'Nenhum usuário cadastrado encontrado no momento.'
                                }
                                <div className="mt-2">
                                  <button
                                    onClick={() => fetchAndSyncUsers()}
                                    className="text-xs bg-[#ede9fe] text-[#6d28d9] px-3 py-1.5 rounded-lg font-semibold hover:bg-[#ddd6fe] transition-colors"
                                  >
                                    Carregar / Sincronizar Banco de Dados
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-[#f5f3ff]/50 transition-colors">
                            <td className="px-4 py-3" onClick={() => { setSelectedUserForConfig(user); setIsUserConfigModalOpen(true); }} style={{cursor: 'pointer'}}>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] uppercase text-white ${user.status === 'active' ? 'bg-[#6d28d9]' : 'bg-[#9ca3af]'}`}>
                                  {(user.name || '?').split(' ').map((n: string) => n?.[0] || '').join('').substring(0, 2)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-[#1f2937] hover:text-[#6d28d9] transition-colors">{user.name}</p>
                                  <p className="text-[11px] text-[#4b5563]">{user.email || user.whatsapp || 'Contato não informado'}</p>
                                  {user.isAffiliate && (
                                    <p className="text-[10px] text-[#6d28d9] border border-[#ddd6fe] bg-[#f5f3ff] px-1.5 py-0.5 rounded inline-block mt-0.5">Dir: {user.directCommissionDuration || 6}m | Ind: {user.indirectCommissionDuration || 3}m</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#374151]">
                              {user.city ? `${user.city}/${user.state}` : 'N/A'} - {user.country || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-[#374151]">
                              {user.allowedDeviceIds ? user.allowedDeviceIds.join(', ') : user.deviceId || 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-start gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[#374151] font-semibold uppercase">{user.plan || 'free'}</span>
                                  {user.plan === 'free' && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getExpirationStatus(user).trialDaysRemaining <= 0 ? 'bg-[#fee2e2] text-[#b91c1c] font-medium' : 'bg-[#f3f4f6] text-[#374151] font-medium'}`}>
                                      {getExpirationStatus(user).trialDaysRemaining > 0 ? `${getExpirationStatus(user).trialDaysRemaining} dias de teste` : 'Teste esgotado'}
                                    </span>
                                  )}
                                  {user.plan === 'premium' && user.planExpiresAt && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getExpirationStatus(user).planDaysRemaining <= 0 ? 'bg-[#fee2e2] text-[#b91c1c] font-medium' : 'bg-[#dcfce7] text-[#15803d] font-medium'}`}>
                                      {getExpirationStatus(user).planDaysRemaining > 0 ? `Expira em ${getExpirationStatus(user).planDaysRemaining} dias` : 'Plano Vencido'}
                                    </span>
                                  )}
                                </div>
                                {user.status === 'active' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#dcfce7] text-[#15803d]">ATIVO</span>
                                ) : user.status === 'pending' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#fef3c7] text-[#b45309]">PENDENTE</span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#fee2e2] text-[#b91c1c]">INATIVO / BLOQUEADO</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    alert(`Rede de Afiliados de ${user.name}:\n\nAfiliados Diretos: ${users.filter(u => u.referredBy === user.id).map(u => `${u.name} (${u.city}/${u.state})`).join(', ') || 'Nenhum'}\n\nAfiliados Indiretos: ${users.filter(u => u.indirectReferredBy === user.id).map(u => `${u.name} (${u.city}/${u.state})`).join(', ') || 'Nenhum'}`);
                                  }}
                                  className="text-[#4b5563] hover:text-[#5b21b6] hover:bg-[#ede9fe] transition-colors p-1.5 rounded-md"
                                  title="Ver Rede de Afiliados"
                                >
                                  <span className="material-symbols-outlined text-[18px]">account_tree</span>
                                </button>
                                <button
                                  onClick={() => { setSelectedUserForConfig(user); setIsUserConfigModalOpen(true); }}
                                  className="text-[#4b5563] hover:text-[#5b21b6] hover:bg-[#ede9fe] transition-colors p-1.5 rounded-md"
                                  title="Configurar Usuário (Dias de Teste, etc)"
                                >
                                  <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                                </button>
                                {user.isAffiliate && (
                                  <button
                                    onClick={() => { setSelectedUserForCommission(user); setIsCommissionModalOpen(true); }}
                                    className="text-[#4b5563] hover:text-[#5b21b6] hover:bg-[#ede9fe] transition-colors p-1.5 rounded-md"
                                    title="Configurar Comissões"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">payments</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => toggleUserStatus(user.id)}
                                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                    user.status === 'active' 
                                    ? 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] hover:bg-[#fee2e2]' 
                                    : 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] hover:bg-[#dcfce7]'
                                  }`}
                                >
                                  {user.status === 'active' ? 'Bloquear Acesso' : 'Ativar Acesso'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#f3f4f6]">
                <button 
                  onClick={() => setIsAdminUsersModalOpen(false)} 
                  className="bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Fechar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Settings Saved Modal */}
      {isSettingsSavedModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 bg-white/5 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#25d366]">check_circle</span>
                 Sucesso
              </h3>
            </div>
            
            <div className="p-6 flex flex-col gap-4 text-center">
              <p className="text-sm text-white">Configurações salvas com sucesso!</p>
              <div className="flex justify-end gap-2 pt-4 border-t border-[#f3f4f6]">
                <button type="button" onClick={() => setIsSettingsSavedModalOpen(false)} className="bg-brand text-white hover:opacity-90 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity">
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedWithdrawalForPayment && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#f3f4f6] bg-[#f9fafb]/50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-brand flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#059669]">payments</span>
                 Confirmar Pagamento
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-[#9ca3af] hover:text-[#ef4444] transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-[#1f2937]">Você está prestes a marcar o pagamento de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedWithdrawalForPayment.amount)}</strong> para <strong>{selectedWithdrawalForPayment.userName}</strong> como pago.</p>
              
              <div className="bg-[#f0fdf4] border border-[#dcfce7] p-3 rounded-lg flex flex-col gap-1">
                 <span className="text-xs text-[#16a34a] font-semibold uppercase">Chave PIX do Afiliado</span>
                 <span className="font-mono text-sm">{selectedWithdrawalForPayment.pixKey}</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1f2937] mb-1">Anexar Comprovante (opcional)</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  className="hidden"
                  ref={paymentReceiptInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setPaymentReceiptStr(ev.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <button 
                  type="button"
                  onClick={() => paymentReceiptInputRef.current?.click()}
                  className="w-full bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] border border-[#d1d5db] border-dashed py-3 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[#6b7280]">cloud_upload</span>
                  <span className="text-sm font-medium">{paymentReceiptStr ? 'Comprovante Anexado (Clique para alterar)' : 'Clique para selecionar o arquivo do comprovante'}</span>
                </button>
                {paymentReceiptStr && (
                  <div className="mt-2 flex justify-center">
                    {paymentReceiptStr.startsWith('data:image/') ? (
                       <img src={paymentReceiptStr} alt="Comprovante" className="h-20 object-contain rounded border border-[#e5e7eb]" />
                    ) : (
                       <span className="text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-2 py-1 rounded">Arquivo Anexado (PDF/Outro)</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#f3f4f6]">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="text-[#6b7280] hover:bg-[#f3f4f6] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const wds = [...withdrawals];
                    const idx = wds.findIndex(w => w.id === selectedWithdrawalForPayment.id);
                    if (idx !== -1) {
                      wds[idx].status = 'pago';
                      wds[idx].receipt = paymentReceiptStr;
                      setWithdrawals(wds);
                      localStorage.setItem('agenda_withdrawals', JSON.stringify(wds));
                    }
                    alert('Pagamento marcado como efetuado com sucesso!');
                    setIsPaymentModalOpen(false);
                    setSelectedWithdrawalForPayment(null);
                  }} 
                  className="bg-[#059669] hover:bg-[#047857] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Modal */}
      {isSimulationModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#f3f4f6] bg-[#f9fafb]/50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-brand flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#25d366]">send</span>
                 Sistema de Automação
              </h3>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-[#1f2937] whitespace-pre-line">
                Procurando usuários com vencimento próximo...{"\n"}
                - 3 usuários vencem em 3 dias (Mensagem de 3 dias enviada){"\n"}
                - 1 usuário vence em 2 dias (Mensagem de 2 dias enviada){"\n"}
                - 5 usuários vencem amanhã (Mensagem de 1 dia enviada){"\n"}
                - 2 usuários vencem hoje (Mensagem final enviada){"\n"}{"\n"}
                <strong className="text-[#25d366]">Lembretes via WhatsApp enviados com sucesso via API!</strong>
              </p>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#f3f4f6]">
                <button type="button" onClick={() => setIsSimulationModalOpen(false)} className="bg-brand text-white hover:opacity-90 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Configuration Modal */}
      {isUserConfigModalOpen && selectedUserForConfig && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-[#ddd6fe] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#ddd6fe] bg-[#f5f3ff] rounded-t-2xl shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-[#4c1d95] flex items-center gap-2">
                   <span className="material-symbols-outlined text-[#6d28d9]">manage_accounts</span>
                   Detalhes e Configurações do Usuário
                </h3>
                <p className="text-sm text-[#4b5563] mt-0.5">Informações completas de <strong className="text-[#1f2937]">{selectedUserForConfig.name}</strong></p>
              </div>
              <button onClick={() => setIsUserConfigModalOpen(false)} className="text-[#6b7280] hover:text-[#4c1d95] p-1.5 rounded-lg hover:bg-[#ede9fe] transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6 overflow-y-auto w-full">
              {/* Resumo / Dados Cadastrais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#f5f3ff] p-5 rounded-xl border border-[#ddd6fe] flex flex-col gap-2 shadow-sm">
                   <p className="text-xs text-[#6d28d9] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                     <span className="material-symbols-outlined text-[16px]">person</span>
                     Dados Cadastrais
                   </p>
                   <p className="text-sm text-[#374151]"><strong>Nome:</strong> {selectedUserForConfig.name}</p>
                   <p className="text-sm text-[#374151]"><strong>CPF:</strong> {selectedUserForConfig.cpf || 'Não informado'}</p>
                   <p className="text-sm text-[#374151]"><strong>E-mail:</strong> {selectedUserForConfig.email || 'Não informado'}</p>
                   <p className="text-sm text-[#374151]"><strong>Telefone/WhatsApp:</strong> {selectedUserForConfig.whatsapp || 'Não informado'}</p>
                   <p className="text-sm text-[#374151]"><strong>Criado em:</strong> {new Date(selectedUserForConfig.createdAt).toLocaleDateString()}</p>
                   <p className="text-sm text-[#374151] mt-1"><strong>Licenças (Qtd):</strong> {selectedUserForConfig.maxDevices || 1} aparelho(s)</p>
                   <p className="text-sm text-[#374151]"><strong>MAC(s) Registrado(s):</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-[#ddd6fe] text-xs font-mono text-[#6d28d9]">{selectedUserForConfig.allowedDeviceIds?.join(', ') || selectedUserForConfig.deviceId || 'Nenhum'}</code></p>
                </div>

                <div className="bg-[#f5f3ff] p-5 rounded-xl border border-[#ddd6fe] flex flex-col gap-2 shadow-sm">
                   <p className="text-xs text-[#6d28d9] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                     <span className="material-symbols-outlined text-[16px]">verified_user</span>
                     Assinatura e Acesso
                   </p>
                   <p className="text-sm flex items-center gap-1 text-[#374151]"><strong>Status da Conta:</strong> {selectedUserForConfig.status === 'active' ? <span className="text-[#15803d] font-bold bg-[#dcfce7] border border-[#bbf7d0] px-2 py-0.5 rounded text-xs ml-1">ATIVO</span> : <span className="text-[#b91c1c] font-bold bg-[#fee2e2] border border-[#fecaca] px-2 py-0.5 rounded text-xs ml-1">BLOQUEADO</span>}</p>
                   <p className="text-sm text-[#374151]"><strong>Plano:</strong> {selectedUserForConfig.plan === 'premium' ? <span className="text-[#6d28d9] font-semibold">Premium (Pago)</span> : <span className="text-[#4b5563]">Grátis (Em teste)</span>}</p>
                   
                   {(() => {
                     const expStatus = getExpirationStatus(selectedUserForConfig);
                     // If premium, strictly check if planDaysRemaining is less than 0 to determine default. 
                     // If free, then it's inadimplente if trial is expired
                     let isInadimplente = false;
                     if (selectedUserForConfig.plan === 'premium') {
                        isInadimplente = expStatus.planDaysRemaining < 0;
                     } else {
                        isInadimplente = expStatus.trialDaysRemaining <= 0;
                     }

                     return (
                        <>
                          <p className="text-sm text-[#374151] mt-1"><strong>Vencimento:</strong> {selectedUserForConfig.planExpiresAt ? new Date(selectedUserForConfig.planExpiresAt).toLocaleDateString() : <span className="text-[#15803d] font-semibold">Não informada / Vitalício</span>}</p>
                          <p className="text-sm flex items-center gap-1 text-[#374151]"><strong>Situação / Pgto:</strong> {isInadimplente ? <span className="text-[#b91c1c] font-bold bg-[#fee2e2] border border-[#fecaca] px-2 py-0.5 rounded text-xs ml-1">INADIMPLENTE / EXPIRADO</span> : <span className="text-[#15803d] font-bold bg-[#dcfce7] border border-[#bbf7d0] px-2 py-0.5 rounded text-xs ml-1">ADIMPLENTE / EM DIA</span>}</p>
                        </>
                     );
                   })()}
                </div>
              </div>

              {/* Informações de Rede e Afiliados */}
              {selectedUserForConfig.isAffiliate && (() => {
                 const level1 = users.filter((u:any) => u.referredBy === selectedUserForConfig.id);
                 const level2 = users.filter((u:any) => u.indirectReferredBy === selectedUserForConfig.id);
                 return (
                  <div className="bg-[#f5f3ff] border border-[#ddd6fe] p-5 rounded-xl flex flex-col gap-3 shadow-sm">
                    <p className="text-xs text-[#4c1d95] font-bold uppercase flex items-center gap-1.5 mb-1">
                      <span className="material-symbols-outlined text-[18px] text-[#6d28d9]">monetization_on</span> 
                      Info do Programa de Afiliados
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-[#ddd6fe] shadow-sm">
                        <p className="text-[10px] uppercase text-[#6d28d9] font-bold">Afiliados Diretos</p>
                        <p className="text-xl font-black text-[#4c1d95]">{level1.length}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-[#ddd6fe] shadow-sm">
                        <p className="text-[10px] uppercase text-[#6d28d9] font-bold">Afiliados Indiretos</p>
                        <p className="text-xl font-black text-[#4c1d95]">{level2.length}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-[#ddd6fe] shadow-sm">
                        <p className="text-[10px] uppercase text-[#6d28d9] font-bold">Cliques no Link</p>
                        <p className="text-xl font-black text-[#4c1d95]">{selectedUserForConfig.clicks || 0}</p>
                      </div>
                      <div className="bg-[#f0fdf4] p-3 rounded-lg border border-[#bbf7d0] shadow-sm">
                        <p className="text-[10px] uppercase text-[#16a34a] font-bold">Comissões (Total)</p>
                        <p className="text-lg font-black text-[#15803d]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedUserForConfig.commissions || 0)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 bg-white border border-[#ddd6fe] p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                      <div className="bg-white p-1.5 border border-[#ddd6fe] rounded-lg shadow-sm">
                         <img 
                           src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}/?ref=${selectedUserForConfig.id}`)}`} 
                           alt="QR Code Afiliado Selecionado" 
                           className="w-20 h-20 object-contain"
                         />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-sm font-bold text-[#4c1d95] mb-1">QR Code de Captação (Afiliado)</p>
                        <p className="text-xs text-[#4b5563]">Esse é o QR code para o link de afiliado deste usuário. Você pode baixar e enviar para ele caso precise de ajuda.</p>
                      </div>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/?ref=${selectedUserForConfig.id}`)}`;
                          link.download = `qrcode_afiliado_${selectedUserForConfig.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="bg-[#6d28d9] text-white hover:bg-[#5b21b6] px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 min-w-[120px] shadow-sm hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span> Baixar
                      </button>
                    </div>
                  </div>
                 );
              })()}

              <div className="border-t border-[#ddd6fe]" />

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const trial = parseInt(formData.get('trial') as string) || 40;
                const planExp = formData.get('planExp') as string;
                const installmentsPaid = parseInt(formData.get('installmentsPaid') as string) || 0;
                handleSaveUserConfig(selectedUserForConfig.id, trial, planExp, installmentsPaid);
              }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-[#4c1d95] mb-1">Período de Gratuidade (dias)</label>
                    <input type="number" name="trial" min="0" max="365" defaultValue={selectedUserForConfig.freeTrialDays || 40} className="w-full bg-white border border-[#ddd6fe] text-[#1f2937] text-sm rounded-lg block p-2.5 outline-none focus:ring-2 focus:ring-[#6d28d9] shadow-sm" required />
                    <p className="text-xs text-[#4b5563] mt-1">Dias grátis que o usuário tem após o cadastro.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#4c1d95] mb-1">Vencimento da Assinatura VIP</label>
                    <input type="date" name="planExp" defaultValue={selectedUserForConfig.planExpiresAt ? selectedUserForConfig.planExpiresAt.split('T')[0] : ''} className="w-full bg-white border border-[#ddd6fe] text-[#1f2937] text-sm rounded-lg block p-2.5 outline-none focus:ring-2 focus:ring-[#6d28d9] shadow-sm" />
                    <p className="text-xs text-[#4b5563] mt-1">Data de expiração do plano. Branco = Vitalício.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#4c1d95] mb-1">Parcelas Pagas (Comissão)</label>
                    <input type="number" name="installmentsPaid" min="0" max="120" defaultValue={selectedUserForConfig.installmentsPaid || 0} className="w-full bg-white border border-[#ddd6fe] text-[#1f2937] text-sm rounded-lg block p-2.5 outline-none focus:ring-2 focus:ring-[#6d28d9] shadow-sm" required />
                    <p className="text-xs text-[#4b5563] mt-1">Parcelas pagas acumuladas de comissão.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 shrink-0">
                  <button type="button" onClick={() => setIsUserConfigModalOpen(false)} className="bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] px-5 py-2.5 rounded-lg text-sm font-bold transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="bg-[#6d28d9] text-white hover:bg-[#5b21b6] px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Commission Configuration Modal */}
      {isCommissionModalOpen && selectedUserForCommission && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#f5f3ff] p-5 rounded-2xl border border-[#ddd6fe] shadow-sm w-full max-w-md flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-[#4c1d95] flex items-center gap-2 text-base">
                   <span className="material-symbols-outlined text-[#6d28d9]">payments</span>
                   Configurar Comissões
                </h4>
                <p className="text-sm text-[#4b5563] mt-1">Configurações para o afiliado <strong className="text-[#1f2937]">{selectedUserForCommission.name}</strong></p>
              </div>
              <button onClick={() => setIsCommissionModalOpen(false)} className="text-[#6b7280] hover:text-[#4c1d95] p-1.5 rounded-lg hover:bg-[#ede9fe] transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const dir = parseInt(formData.get('dir') as string) || 6;
                const ind = parseInt(formData.get('ind') as string) || 3;
                handleSaveCommission(selectedUserForCommission.id, dir, ind);
              }}>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-[#ddd6fe] shadow-inner">
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1">Duração da Comissão Direta (meses)</label>
                    <input type="number" name="dir" min="1" max="120" defaultValue={selectedUserForCommission.directCommissionDuration || 6} className="w-full bg-[#f9fafb] border border-[#d1d5db] text-[#111827] text-sm rounded-lg block p-2.5 outline-none focus:ring-2 focus:ring-[#6d28d9]" required />
                    <p className="text-xs text-[#6b7280] mt-1.5">Tempo que o afiliado recebe repasse direto das mensalidades.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-[#ddd6fe] shadow-inner">
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1">Duração da Comissão Indireta (meses)</label>
                    <input type="number" name="ind" min="1" max="120" defaultValue={selectedUserForCommission.indirectCommissionDuration || 3} className="w-full bg-[#f9fafb] border border-[#d1d5db] text-[#111827] text-sm rounded-lg block p-2.5 outline-none focus:ring-2 focus:ring-[#6d28d9]" required />
                    <p className="text-xs text-[#6b7280] mt-1.5">Tempo que o afiliado recebe repasse pela rede.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[#ddd6fe]">
                  <button type="button" onClick={() => setIsCommissionModalOpen(false)} className="bg-white text-[#374151] border border-[#d1d5db] hover:bg-[#f3f4f6] px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="bg-[#6d28d9] text-white hover:bg-[#5b21b6] px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                    Salvar Regra
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Admin Logs Modal */}
      {isAdminLogsModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-[#ddd6fe] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#ddd6fe] bg-[#f5f3ff] rounded-t-2xl shrink-0 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-[#4c1d95] flex items-center gap-2">
                   <span className="material-symbols-outlined text-[#6d28d9]">terminal</span>
                   Logs do Sistema
                </h3>
              </div>
              <button onClick={() => setIsAdminLogsModalOpen(false)} className="text-[#6b7280] hover:text-[#4c1d95] p-1.5 rounded-lg hover:bg-[#ede9fe] transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6 overflow-y-auto w-full">
              <div className="border border-[#ddd6fe] rounded-xl overflow-hidden bg-white shadow-inner">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-[#ede9fe] text-[#5b21b6] text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-medium">Data/Hora</th>
                      <th className="px-4 py-3 font-medium">Nível</th>
                      <th className="px-4 py-3 font-medium">Evento</th>
                      <th className="px-4 py-3 font-medium">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede9fe] text-sm font-mono text-[#4b5563]">
                    {trackingLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-[#6b7280]">Nenhum log registrado no sistema.</td>
                      </tr>
                    ) : (
                      trackingLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-[#f5f3ff]/50 transition-colors">
                          <td className="px-4 py-3 text-[#6b7280]">
                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              log.type === 'error' ? 'text-[#dc2626] bg-[#fee2e2]' : 
                              log.type === 'login' ? 'text-[#059669] bg-[#dcfce7]' : 
                              log.type === 'action' ? 'text-[#2563eb] bg-[#dbeafe]' : 
                              'text-[#6b7280] bg-[#f3f4f6]'
                            }`}>
                              {log.type === 'login' ? 'INFO' : log.type === 'error' ? 'ERROR' : log.type === 'action' ? 'ACTN' : 'LOG'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{log.type}</td>
                          <td className="px-4 py-3 text-[#4b5563] truncate max-w-xs" title={`${log.details} - Usuário: ${log.userName} (${log.userEmail}) IP: ${log.ip}`}>
                            {log.details.length > 50 ? log.details.substring(0, 50) + '...' : log.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#ddd6fe]">
                <button 
                  onClick={() => setIsAdminLogsModalOpen(false)} 
                  className="bg-white text-[#374151] border border-[#d1d5db] hover:bg-[#f3f4f6] px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Customization Modal */}
      {isAdminCustomizationModalOpen && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#25d366]">format_paint</span>
                 Personalização de Interface
              </h3>
              <button onClick={() => setIsAdminCustomizationModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="bg-[#f9fafb] rounded-xl p-5 border border-[#e5e7eb]">
                <h4 className="font-semibold text-[#1f2937] mb-4">Configuração da Chamada Principal (Landing Page)</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1">Título (Parte 1)</label>
                    <input type="text" value={themeConfig.headlinePart1} onChange={e => setThemeConfig({...themeConfig, headlinePart1: e.target.value})} className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 bg-white text-[#111827] focus:ring-2 focus:ring-brand focus:border-brand" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1">Título (Parte 2 - Destaque)</label>
                    <input type="text" value={themeConfig.headlinePart2} onChange={e => setThemeConfig({...themeConfig, headlinePart2: e.target.value})} className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 bg-white text-[#111827] focus:ring-2 focus:ring-brand focus:border-brand" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1">Tamanho da Fonte (Tailwind Classes)</label>
                    <input type="text" value={themeConfig.headlineSize} onChange={e => setThemeConfig({...themeConfig, headlineSize: e.target.value})} className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 bg-white text-[#111827]" placeholder="Ex: text-4xl md:text-5xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1">Cor do Texto (Tailwind Classes)</label>
                    <input type="text" value={themeConfig.headlineColor} onChange={e => setThemeConfig({...themeConfig, headlineColor: e.target.value})} className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 bg-white text-[#111827]" placeholder="Ex: text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1">Família da Fonte</label>
                    <input type="text" value={themeConfig.fontFamily} onChange={e => setThemeConfig({...themeConfig, fontFamily: e.target.value})} className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 bg-white text-[#111827]" placeholder="Ex: 'Public Sans', sans-serif" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1">Peso da Fonte (Tailwind Classes)</label>
                    <input type="text" value={themeConfig.fontWeight} onChange={e => setThemeConfig({...themeConfig, fontWeight: e.target.value})} className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 bg-white text-[#111827]" placeholder="Ex: font-bold" />
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-[#e5e7eb]">
                    <div className="flex bg-[#e5e7eb] rounded-full p-1 relative cursor-pointer w-12 h-6" onClick={() => setThemeConfig({...themeConfig, useGradient: !themeConfig.useGradient})}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${themeConfig.useGradient ? 'translate-x-6 bg-brand' : ''}`}></div>
                      <div className={`absolute inset-0 rounded-full mix-blend-multiply opacity-20 ${themeConfig.useGradient ? 'bg-brand' : 'bg-transparent'}`}></div>
                    </div>
                    <span className="text-sm font-medium text-[#374151]">Usar Degradê? (Gradient)</span>
                  </div>

                  {themeConfig.useGradient && (
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-1">Classes de Degradê (Tailwind)</label>
                      <input type="text" value={themeConfig.headlineGradient} onChange={e => setThemeConfig({...themeConfig, headlineGradient: e.target.value})} className="w-full rounded-lg border border-[#d1d5db] px-3 py-2 bg-white text-[#111827]" placeholder="Ex: bg-gradient-to-b from-gray-300 to-white bg-clip-text text-transparent" />
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <button onClick={handleSaveThemeConfig} className="bg-[#1f2937] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#374151] transition-colors flex items-center gap-2">
                       <span className="material-symbols-outlined text-[18px]">save</span>
                       Salvar Estilos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Settings Modal */}
      
      {isUsageModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#1a1c29] to-[#2a2d3e] w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
             <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <span className="material-symbols-outlined text-white">monitoring</span>
                   Uso de Recursos
                </h2>
                <button onClick={() => setIsUsageModalOpen(false)} className="text-white/60 hover:text-white transition-colors z-50">
                  <span className="material-symbols-outlined">close</span>
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                 <ResourceUsageDashboard />
             </div>
          </div>
        </div>
      )}

      {isAdminSettingsModalOpen && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#06402B] text-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#25d366]">settings_applications</span>
                 Configurações Globais
              </h3>
              <button onClick={() => setIsAdminSettingsModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              
              <div className="bg-[#f9fafb] rounded-xl p-5 border border-[#e5e7eb]">
                <h4 className="font-semibold text-[#1f2937] mb-4">Parâmetros do Sistema</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1">Cor Principal do App (Tema)</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={adminAppColor}
                        onChange={(e) => setAdminAppColor(e.target.value)}
                        className="w-10 h-10 rounded border-none cursor-pointer"
                        title="Selecione a cor principal do aplicativo"
                      />
                      <input 
                        type="text" 
                        value={adminAppColor}
                        onChange={(e) => setAdminAppColor(e.target.value)}
                        className="w-32 bg-white border border-[#d1d5db] text-[#111827] text-sm rounded-lg block p-2"
                        placeholder="#263E2A"
                      />
                    </div>
                    <p className="text-xs text-[#6b7280] mt-1">Essa cor será aplicada em botões, cabeçalhos e elementos de destaque para todos os usuários.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1f2937] mb-1">Imagem ou Cor de Fundo Global</label>
                    <input 
                      type="text" 
                      value={adminAppBgImage}
                      onChange={(e) => setAdminAppBgImage(e.target.value)}
                      className="w-full bg-white border border-[#d1d5db] text-[#111827] text-sm rounded-lg block p-2.5 outline-none focus:ring-2 focus:ring-brand"
                      placeholder="URL da imagem (ex: https://...) ou código de cor (ex: #f3f4f6)"
                    />
                    <p className="text-xs text-[#6b7280] mt-1">A imagem ou cor preencherá o fundo de todo o sistema. Deixe vazio para usar a cor padrão transparente/branca.</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1f2937] text-sm">Modo de Manutenção</p>
                      <p className="text-xs text-[#6b7280]">Bloquear acesso para todos os usuários (exceto admins)</p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${maintenanceMode ? 'bg-[#dc2626]' : 'bg-[#e5e7eb]'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform border border-[#d1d5db] ${maintenanceMode ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#1f2937] text-sm">Novos Cadastros</p>
                      <p className="text-xs text-[#6b7280]">Permitir novos registros no sistema</p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={allowNewRegisters} onChange={(e) => setAllowNewRegisters(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${allowNewRegisters ? 'bg-[#2563eb]' : 'bg-[#e5e7eb]'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform border border-[#d1d5db] ${allowNewRegisters ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center text-[#1f2937] pt-2">
                    <div>
                      <p className="font-medium text-sm">Dias de Trial Padrão</p>
                      <p className="text-xs text-[#6b7280]">Duração do período gratuito inicial</p>
                    </div>
                    <input 
                      type="number" 
                      value={trialDays}
                      onChange={(e) => setTrialDays(e.target.value)}
                      className="w-20 text-center rounded border border-[#d1d5db] py-1 bg-white text-[#111827]" 
                    />
                  </div>
                  <div className="flex justify-between items-center text-[#1f2937] pt-2">
                    <div>
                      <p className="font-medium text-sm">Preço Plano Mensal (R$)</p>
                      <p className="text-xs text-[#6b7280]">Valor cobrado por mês (Plano Padrão)</p>
                    </div>
                    <input type="number" step="0.01" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} className="w-24 text-center rounded border border-[#d1d5db] py-1 bg-white text-[#111827]" />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#e5e7eb]">
                  <h4 className="font-semibold text-[#1f2937] mb-4">Integração de Pagamentos</h4>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1 text-[#1f2937]">
                      <p className="font-medium text-sm">Mercado Pago Public Key</p>
                      <input type="text" value={mpPublicKey} onChange={(e) => setMpPublicKey(e.target.value)} placeholder="APP_USR-..." className="w-full rounded border border-[#d1d5db] px-3 py-2 bg-white text-[#111827] text-sm" />
                    </div>
                    <div className="flex flex-col gap-1 text-[#1f2937]">
                      <p className="font-medium text-sm">Mercado Pago Access Token</p>
                      <input type="password" value={mpAccessToken} onChange={(e) => setMpAccessToken(e.target.value)} placeholder="APP_USR-..." className="w-full rounded border border-[#d1d5db] px-3 py-2 bg-white text-[#111827] text-sm" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#e5e7eb]">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#1f2937]">mail</span>
                      <h4 className="font-semibold text-[#1f2937]">Notificações por Email (Resend)</h4>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={enable2FA} onChange={(e) => setEnable2FA(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${enable2FA ? 'bg-primary' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${enable2FA ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-[#1f2937]">Ativar 2FA</span>
                    </label>
                  </div>
                  <p className="text-xs text-[#6b7280] mb-4">Essas configurações são necessárias para o envio de e-mails, como o código de verificação 2FA (Duas Etapas).</p>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1 text-[#1f2937]">
                      <p className="font-medium text-sm">Resend API Key</p>
                      <input type="password" value={resendApiKey} onChange={(e) => setResendApiKey(e.target.value)} placeholder="re_..." className="w-full rounded border border-[#d1d5db] px-3 py-2 bg-white text-[#111827] text-sm" />
                    </div>
                    <div className="flex flex-col gap-1 text-[#1f2937]">
                      <p className="font-medium text-sm">Email do Remetente (De:)</p>
                      <input type="email" value={resendFromEmail} onChange={(e) => setResendFromEmail(e.target.value)} placeholder="onboarding@resend.dev ou contato@seudominio.com" className="w-full rounded border border-[#d1d5db] px-3 py-2 bg-white text-[#111827] text-sm" />
                      <p className="text-xs text-[#6b7280]">Use <strong>onboarding@resend.dev</strong> para testes, ou um domínio verificado no Resend.</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-[#e5e7eb]">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#1f2937]">account_balance</span>
                      <h4 className="font-semibold text-[#1f2937]">Pagamento Automático de Comissões</h4>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={automaticCommissionPayment} onChange={(e) => setAutomaticCommissionPayment(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${automaticCommissionPayment ? 'bg-[#2563eb]' : 'bg-[#e5e7eb]'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform border border-[#d1d5db] ${automaticCommissionPayment ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                    </label>
                  </div>
                  <p className="text-xs text-[#6b7280]">Quando ativado, os pagamentos de comissões aos afiliados podem ser liberados automaticamente (caso haja integração suportada). Quando desativado (Padrão), o administrador deverá confirmar e realizar o pagamento manual por PIX.</p>
                </div>
                
                <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] mt-8">
                  <h4 className="font-bold text-[#111827] mb-4">Cupons de Desconto</h4>
                  <div className="space-y-4">
                    {coupons.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 rounded border border-[#d1d5db]">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#111827]">{c.code}</span>
                          <span className="text-xs text-[#4b5563]">{c.pct}% de desconto</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={c.active} onChange={(e) => {
                              const newCoupons = [...coupons];
                              newCoupons[idx].active = e.target.checked;
                              setCoupons(newCoupons);
                            }} />
                            <span className="text-xs text-[#111827]">Ativo</span>
                          </label>
                          <button onClick={() => {
                            const newCoupons = [...coupons];
                            newCoupons.splice(idx, 1);
                            setCoupons(newCoupons);
                          }} className="text-red-500 hover:text-red-700">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                       <input type="text" id="newCouponCode" placeholder="CÓDIGO" className="w-1/2 rounded border border-[#d1d5db] px-3 py-2 bg-white text-[#111827] text-sm uppercase" />
                       <input type="number" id="newCouponPct" placeholder="%" className="w-1/4 rounded border border-[#d1d5db] px-3 py-2 bg-white text-[#111827] text-sm" max="100" min="1" />
                       <button onClick={() => {
                         const codeIp = document.getElementById('newCouponCode') as HTMLInputElement;
                         const pctIp = document.getElementById('newCouponPct') as HTMLInputElement;
                         if (codeIp.value && pctIp.value) {
                           setCoupons([...coupons, { code: codeIp.value.toUpperCase(), pct: parseInt(pctIp.value), active: true }]);
                           codeIp.value = '';
                           pctIp.value = '';
                         }
                       }} className="flex-1 bg-[#1f2937] text-white px-2 py-2 rounded text-sm font-medium hover:bg-[#374151]">
                         Adicionar
                       </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] mt-6">
                  <h4 className="font-bold text-[#111827] mb-2 flex items-center gap-2">
                     <span className="material-symbols-outlined text-[#2563eb]">system_update_alt</span>
                     Atualização Automática (Hostgator)
                  </h4>
                  <p className="text-xs text-[#6b7280] mb-4">
                    Ative isso para que o aplicativo web atualize a versão automaticamente na máquina do cliente assim que você jogar novos arquivos no Hostgator.
                    É necessário colocar um arquivo <code>version.json</code> na sua pasta public.
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="font-medium text-[#1f2937] text-sm">Verificar Atualizações</p>
                      <p className="text-xs text-[#6b7280]">Recarrega a tela caso detecte nova versão</p>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={autoUpdateEnabled} onChange={(e) => setAutoUpdateEnabled(e.target.checked)} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${autoUpdateEnabled ? 'bg-[#2563eb]' : 'bg-[#e5e7eb]'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform border border-[#d1d5db] ${autoUpdateEnabled ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                    </label>
                  </div>
                  
                  {autoUpdateEnabled && (
                    <div className="flex justify-between items-center text-[#1f2937] pt-4">
                      <div>
                        <p className="font-medium text-sm">Intervalo (Minutos)</p>
                        <p className="text-xs text-[#6b7280]">Tempo entre cada verificação (min: 1)</p>
                      </div>
                      <input type="number" min="1" value={autoUpdateInterval} onChange={(e) => setAutoUpdateInterval(e.target.value)} className="w-24 text-center rounded border border-[#d1d5db] py-1 bg-white text-[#111827]" />
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                   <button onClick={handleSaveSettings} className="bg-[#1f2937] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#374151] transition-colors">
                      Salvar Configurações
                    </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#f3f4f6]">
                <button 
                  onClick={() => setIsAdminSettingsModalOpen(false)} 
                  className="bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
