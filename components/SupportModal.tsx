import React, { useState, useRef, useEffect } from 'react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

const greetings: Record<string, string> = {
  pt: `Olá, {userName}! Sou a Assistente Virtual da Ágio Agenda. Como posso ajudar você hoje?`,
  en: `Hello, {userName}! I am the Ágio Agenda Virtual Assistant. How can I help you today?`,
  es: `¡Hola, {userName}! Soy la Asistente Virtual de Ágio Agenda. ¿Cómo puedo ayudarte hoy?`
};

const t: Record<string, Record<string, string>> = {
  pt: {
    title: "Central de Ajuda & Suporte",
    subtitle: "Assistente Virtual (24h)",
    placeholder: "Digite sua dúvida aqui...",
    level2Header: "Precisa de atendimento humano (Nível 2)?",
    whatsapp: "WhatsApp",
    email: "E-mail Suporte",
    level2Trigger: "Falar com um Atendente (Nível 2)",
    errorConnection: "Desculpe, ocorreu um erro ao se conectar com a nossa inteligência. Por favor, tente falar com um de nossos atendentes.",
    errorGeneral: "Desculpe, ocorreu um erro."
  },
  en: {
    title: "Help & Support Center",
    subtitle: "Virtual Assistant (24h)",
    placeholder: "Type your question here...",
    level2Header: "Need human support (Level 2)?",
    whatsapp: "WhatsApp",
    email: "Support E-mail",
    level2Trigger: "Talk to an Agent (Level 2)",
    errorConnection: "Sorry, an error occurred while connecting to our AI. Please try talking to one of our agents.",
    errorGeneral: "Sorry, an error occurred."
  },
  es: {
    title: "Centro de Ayuda y Soporte",
    subtitle: "Asistente Virtual (24h)",
    placeholder: "Escribe tu duda aquí...",
    level2Header: "¿Necesitas atención humana (Nivel 2)?",
    whatsapp: "WhatsApp",
    email: "E-mail de Soporte",
    level2Trigger: "Hablar con un Agente (Nivel 2)",
    errorConnection: "Lo sentimos, ocurrió un error al conectarse con nuestra inteligencia. Por favor, intente hablar con uno de nuestros agentes.",
    errorGeneral: "Lo sentimos, ocurrió un error."
  }
};

const whatsappTexts: Record<string, string> = {
  pt: `Olá, Suporte Ágio Agenda!\nMeu nome é {userName} e gostaria de tratar sobre o seguinte tema:\n`,
  en: `Hello, Ágio Agenda Support!\nMy name is {userName} and I would like to talk about the following topic:\n`,
  es: `¡Hola, Soporte de Ágio Agenda!\nMi nombre es {userName} y me gustaría tratar sobre el siguiente tema:\n`
};

const emailSubjects: Record<string, string> = {
  pt: `Suporte Ágio Agenda: [INFORME O TEMA DA SUA SOLICITAÇÃO]`,
  en: `Ágio Agenda Support: [ENTER THE TOPIC OF YOUR REQUEST]`,
  es: `Soporte de Ágio Agenda: [INDIQUE EL TEMA DE SU SOLICITUD]`
};

const emailBodies: Record<string, string> = {
  pt: `Olá, Equipe Ágio Agenda!\n\nMeu nome é {userName}.\n\nPor favor, descreva detalhadamente abaixo o erro encontrado ou sua sugestão de melhoria:\n- [DESCREVA SEU PROBLEMA OU SUGESTÃO AQUI]\n\nObrigado!`,
  en: `Hello, Ágio Agenda Team!\n\nMy name is {userName}.\n\nPlease describe in detail below the error found or your suggestion for improvement:\n- [DESCRIBE YOUR PROBLEM OR SUGGESTION HERE]\n\nThank you!`,
  es: `¡Hola, Equipo de Ágio Agenda!\n\nMi nombre es {userName}.\n\nPor favor, describa detalhadamente a continuación el error encontrado o su sugerencia de mejora:\n- [DESCRIBA SU PROBLEMA OU SUGERENCIA AQUÍ]\n\n¡Gracias!`
};

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, userName = 'Visitante', userEmail = '' }) => {
  const [lang, setLang] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('user_language');
        if (saved) return saved;
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookie = decodedCookie.match(/googtrans=\/pt\/([a-z]{2})/);
        if (cookie && cookie[1]) return cookie[1];
      }
    } catch (e) {
      // ignore
    }
    return 'pt';
  });

  const [userMessages, setUserMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLevel2, setShowLevel2] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
        setLang(customEvent.detail);
      } else {
        setLang(getSavedLang());
      }
    };

    window.addEventListener('appLanguageChanged', handleLangChange);
    return () => {
      window.removeEventListener('appLanguageChanged', handleLangChange);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('user_language');
        if (saved && saved !== lang) {
          setTimeout(() => setLang(saved), 0);
        } else {
          const decodedCookie = decodeURIComponent(document.cookie);
          const cookie = decodedCookie.match(/googtrans=\/pt\/([a-z]{2})/);
          if (cookie && cookie[1] && cookie[1] !== lang) {
            setTimeout(() => setLang(cookie[1]), 0);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }, [isOpen, lang]);

  // Compute full messages dynamically to avoid internal state sync logic & avoid react-hooks/set-state-in-effect issues
  const initialGreeting = (greetings[lang] || greetings.pt).replace('{userName}', userName);
  const messages = [{ role: 'ai' as const, text: initialGreeting }, ...userMessages];

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [userMessages, lang]);

  if (!isOpen) return null;

  const texts = t[lang] || t.pt;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setUserMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage, userName, lang })
      });
      const data = await res.json();
      
      const aiReply = data.text || texts.errorConnection;
      setUserMessages(prev => [...prev, { role: 'ai', text: aiReply }]);
      
      // Save report to localStorage for Admin
      const reports = JSON.parse(localStorage.getItem('agenda_support_reports') || '[]');
      reports.unshift({
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        userName: userName,
        userEmail: userEmail,
        userMessage: userMessage,
        aiResponse: aiReply,
        status: 'pendente'
      });
      localStorage.setItem('agenda_support_reports', JSON.stringify(reports));

      // Se a mensagem do AI sugerir WhatsApp/Email, mostra Nível 2.
      const replyLower = aiReply.toLowerCase();
      if (
        replyLower.includes('atendente') || 
        replyLower.includes('whatsapp') || 
        replyLower.includes('e-mail') || 
        replyLower.includes('email') ||
        replyLower.includes('support') ||
        replyLower.includes('soporte')
      ) {
        setShowLevel2(true);
      }

    } catch (e) {
       setUserMessages(prev => [...prev, { role: 'ai', text: texts.errorGeneral }]);
       setShowLevel2(true);
    } finally {
      setIsLoading(false);
    }
  };

  const whatsappText = encodeURIComponent((whatsappTexts[lang] || whatsappTexts.pt).replace('{userName}', userName));
  const emailSubject = encodeURIComponent(emailSubjects[lang] || emailSubjects.pt);
  const emailBody = encodeURIComponent((emailBodies[lang] || emailBodies.pt).replace('{userName}', userName));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
      <div className="bg-[#06402B] text-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col h-[85vh] max-h-[700px] animate-in fade-in zoom-in-95 duration-200 border border-white/20 relative overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#042118] rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-[20px] shrink-0 notranslate" translate="no">support_agent</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{texts.title}</h3>
              <p className="text-[10px] text-white/70">{texts.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined shrink-0 notranslate" translate="no">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#092b1d]">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm font-medium shadow-sm' : 'bg-[#0d3d2c] text-white/95 rounded-tl-sm border border-emerald-500/20 shadow-sm'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-[#0d3d2c] text-white rounded-2xl rounded-tl-sm border border-emerald-500/20 p-3 text-sm flex gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-100"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-200"></span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef}></div>
        </div>

        {showLevel2 && (
          <div className="px-4 py-3 bg-[#042118] border-t border-white/10 shrink-0">
            <p className="text-xs font-bold text-center text-white/80 mb-3 border-b border-white/10 pb-2">{texts.level2Header}</p>
            <div className="flex gap-2 flex-col sm:flex-row">
              <a 
                href={`https://wa.me/5522999875500?text=${whatsappText}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#25d366]/20 hover:bg-[#25d366]/30 border border-[#25d366]/40 text-[#25d366] p-2.5 rounded-xl transition-colors text-xs font-medium cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] shrink-0 notranslate" translate="no">chat</span>
                {texts.whatsapp}
              </a>
              <a 
                href={`mailto:agioagenda@gmail.com?subject=${emailSubject}&body=${emailBody}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-xl transition-colors text-xs font-medium cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] shrink-0 notranslate" translate="no">mail</span>
                {texts.email}
              </a>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-white/10 bg-[#042118] rounded-b-2xl shrink-0">
          <div className="flex gap-2 relative">
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={texts.placeholder}
              className="flex-1 bg-[#0d3d2c] text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] shrink-0 notranslate" translate="no">send</span>
            </button>
          </div>
          <div className="w-full text-center mt-2">
            {!showLevel2 && (
              <button onClick={() => setShowLevel2(true)} className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline font-medium cursor-pointer">
                {texts.level2Trigger}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
