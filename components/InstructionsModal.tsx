import React, { useState, useEffect } from 'react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: string;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose, currentLang: propLang }) => {
  const [lang, setLang] = useState<string>('pt');

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

    setLang(propLang || getSavedLang());
    window.addEventListener('appLanguageChanged', handleLangChange);
    return () => {
      window.removeEventListener('appLanguageChanged', handleLangChange);
    };
  }, [propLang]);

  if (!isOpen) return null;

  const isEs = lang === 'es';
  const isEn = lang === 'en';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
      <div className="bg-[#06402B] text-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col h-[85vh] max-h-[750px] animate-in fade-in zoom-in-95 duration-200 border border-white/20 relative overflow-hidden cursor-default" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-white/20 flex justify-between items-center bg-[#091e15] rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-green-400">
              <span className="material-symbols-outlined text-[22px] shrink-0 notranslate" translate="no">menu_book</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg leading-tight">
                {isEs ? 'Instrucciones de Uso' : isEn ? 'Instructions for Use' : 'Instruções de Uso'}
              </h3>
              <p className="text-xs text-white/70">
                {isEs ? 'Guía completa de Ágio Agenda' : isEn ? 'Complete guide to Ágio Agenda' : 'Guia completo do Ágio Agenda'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined shrink-0 notranslate" translate="no">close</span>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="bg-[#0a2d1f] border border-white/20 rounded-xl p-6 shadow-md backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-green-400 shrink-0 notranslate" translate="no">app_registration</span>
              {isEs ? 'Registro e Inicio de Sesión' : isEn ? 'Registration & Login' : 'Cadastro & Login'}
            </h2>
            <p className="text-white/85 text-base md:text-lg mb-3">
              {isEs 
                ? 'Para comenzar a usar Ágio Agenda, debe completar el formulario en la página inicial (Landing Page) con sus datos. Después de esto, su progreso e información quedan guardados. Si vuelve a ingresar y su sesión se ha cerrado, simplemente vuelva a registrarse con los mismos datos o use el botón de inicio de sesión (si está configurado). El botón de Registro solo aparece en la página inicial si no ha iniciado sesión.'
                : isEn
                ? 'To start using Ágio Agenda, you need to fill out the form on the home screen (Landing Page) with your details. After that, your progress and information are saved. If you log back in after your session has ended, simply re-register with the same details or use the login button (if configured). The Registration button only appears on the home screen if you are logged out.'
                : 'Para começar a usar o Ágio Agenda, você precisa preencher o formulário na tela inicial (Landing Page) com seus dados. Após isso, seu progresso e informações são salvos. Caso volte a acessar e sua sessão tenha sido encerrada, basta refazer o cadastro com os mesmos dados, ou utilizar o botão de login (se configurado). O botão de Cadastro só aparece na tela inicial se você estiver deslogado.'}
            </p>
          </div>

          <div className="bg-[#0a2d1f] border border-white/20 rounded-xl p-6 shadow-md backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-green-400 shrink-0 notranslate" translate="no">menu</span>
              {isEs ? 'Menú Principal' : isEn ? 'Main Menu' : 'Menu Principal'}
            </h2>
            <p className="text-white/85 text-base md:text-lg mb-3">
              {isEs
                ? 'En el menú principal o en el menú lateral (abierto haciendo clic en su foto), tiene acceso rápido a todas las áreas de la aplicación:'
                : isEn
                ? 'In the main menu or side menu (opened by clicking your photo), you have quick access to all areas of the application:'
                : 'No menu principal ou no menu lateral (aberto clicando na sua foto), você tem acesso rápido a todas as áreas do aplicativo:'}
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-2 text-base">
              <li>
                <strong>{isEs ? 'Calendario' : isEn ? 'Calendar' : 'Calendário'}:</strong>{' '}
                {isEs ? 'Visualice sus citas y tareas dentro de la escala mensual.' : isEn ? 'View your appointments and tasks within the monthly view.' : 'Visualize seus compromissos e tarefas dentro da escala mensal.'}
              </li>
              <li>
                <strong>{isEs ? 'Agenda Diaria' : isEn ? 'Daily Agenda' : 'Agenda Diária'}:</strong>{' '}
                {isEs ? 'Vea y gestione en detalle el flujo de su día.' : isEn ? 'View and manage your daily flow in detail.' : 'Veja e gerencie de forma detalhada o fluxo do seu dia.'}
              </li>
              <li>
                <strong>{isEs ? 'Panel (Otimização Logística & Tareas)' : isEn ? 'Dashboard (Logistics Optimization & Tasks)' : 'Dashboard (Otimização Logística & Tarefas)'}:</strong>{' '}
                {isEs ? 'Una vista consolidada con la Otimización Logística de citas, creación y procesamiento de tareas con IA.' : isEn ? 'A consolidated view with Logistics Optimization for appointments, task creation, and AI processing.' : 'Uma visão consolidada com a Otimização Logística de compromissos, criação e processamento de tarefas com IA.'}
              </li>
              <li>
                <strong>{isEs ? 'Gestión de Cuentas' : isEn ? 'Account Management' : 'Gestão de Contas'}:</strong>{' '}
                {isEs ? 'Control financiero para gestionar cuentas por pagar, por cobrar, flujo de caja y metas.' : isEn ? 'Financial control to manage payables, receivables, cash flow, and goals.' : 'Controle financeiro para gerenciar contas a pagar, a receber, fluxo de caixa e metas.'}
              </li>
              <li>
                <strong>{isEs ? 'Mi Red' : isEn ? 'My Network' : 'Minha Rede'}:</strong>{' '}
                {isEs ? 'Panel de Afiliados para obtener su enlace, crear nuevas URL de captación y seguir a sus referidos.' : isEn ? 'Affiliate dashboard to get your link, create new capture URLs, and track referrals.' : 'Painel de Afiliado para pegar seu link, criar novas URLs de captação e acompanhar indicados.'}
              </li>
              <li>
                <strong>{isEs ? 'Perfil' : isEn ? 'Profile' : 'Perfil'}:</strong>{' '}
                {isEs ? 'Cambie sus datos, avatar y preferencias.' : isEn ? 'Change your details, avatar, and preferences.' : 'Altere seus dados, avatar e preferências.'}
              </li>
              <li>
                <strong>{isEs ? 'Suscripción y Módulos' : isEn ? 'Subscription & Modules' : 'Assinatura & Módulos'}:</strong>{' '}
                {isEs ? 'Adquiera planes Premium o compre módulos separados para expandir las funcionalidades.' : isEn ? 'Purchase Premium plans or individual modules to expand features.' : 'Adquira planos Premium ou compre módulos separados para expandir as funcionalidades.'}
              </li>
              <li>
                <strong>{isEs ? 'Soporte' : isEn ? 'Support' : 'Suporte'}:</strong>{' '}
                {isEs ? 'Hable con nuestro equipo técnico, haga sugerencias o reporte problemas.' : isEn ? 'Contact our technical team, give suggestions, or report any issues.' : 'Fale com nossa equipe técnica, dê sugestões ou reporte algo que não esteja funcionando.'}
              </li>
            </ul>
          </div>

          <div className="bg-[#0a2d1f] border border-white/20 rounded-xl p-6 shadow-md backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-green-400 shrink-0 notranslate" translate="no">edit_note</span>
              {isEs ? 'Bloc de Notas (Anotaciones de la Cita)' : isEn ? 'Notes / Scratchpad (Appointment Notes)' : 'Bloco de Anotações (Notas do Compromisso)'}
            </h2>
            <p className="text-white/85 text-base md:text-lg mb-3">
              {isEs 
                ? 'Cada cita y tarea en su agenda cuenta con un Bloco de Anotações dedicado para registrar actas, pautas e información importante:'
                : isEn
                ? 'Every appointment and task in your agenda features a dedicated Notes Scratchpad to record meeting minutes, guidelines, and key details:'
                : 'Cada compromisso e tarefa na sua agenda conta com um Bloco de Anotações dedicado para registrar pautas, atas e informações importantes:'}
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-2 text-base">
              <li>
                <strong>{isEs ? 'Acceso Rápido en Citas:' : isEn ? 'Quick Access in Events:' : 'Acesso Rápido nos Eventos:'}</strong>{' '}
                {isEs ? 'En el Calendario, Agenda Diaria y Panel, haga clic en el icono de lápiz/notas (edit_note) para abrir la hoja de notas.' : isEn ? 'In the Calendar, Daily Agenda, and Dashboard, click the note icon (edit_note) on any event card to open its note sheet.' : 'No Calendário, Agenda Diária e Dashboard, clique no ícone de bloco de notas (edit_note) no card do evento para abrir a folha de anotações.'}
              </li>
              <li>
                <strong>{isEs ? 'Guardado Automático (Auto-Save):' : isEn ? 'Real-Time Auto-Save:' : 'Salvamento Automático em Tempo Real:'}</strong>{' '}
                {isEs ? 'Escriba libremente. Todas sus notas se guardan de forma continua e instantánea en el sistema.' : isEn ? 'Type freely. All your notes are saved continuously and instantly in real time.' : 'Digite livremente. Todas as suas anotações são salvas de forma contínua e instantânea no sistema.'}
              </li>
              <li>
                <strong>{isEs ? 'Integración con Google Docs:' : isEn ? 'Google Docs Integration:' : 'Integração com Google Docs:'}</strong>{' '}
                {isEs ? 'Sus notas se sincronizan directamente con Google Docs, lo que le permite abrir el documento completo en una nueva pestaña.' : isEn ? 'Your notes sync directly with Google Docs, allowing you to open the full document in a new tab anytime.' : 'Suas anotações são sincronizadas diretamente com o Google Docs, permitindo abrir o documento completo em uma nova aba.'}
              </li>
              <li>
                <strong>{isEs ? 'Compartir Pautas y Actas:' : isEn ? 'Share Meeting Notes:' : 'Compartilhamento de Pautas e Atas:'}</strong>{' '}
                {isEs ? 'Utilice el botón de compartir para copiar el texto formateado de sus notas con título, fecha y hora para enviarlo por WhatsApp o correo.' : isEn ? 'Use the share button to copy formatted notes including title, date, and time to quickly send via WhatsApp or email.' : 'Utilize o botão de compartilhamento para copiar o texto formatado das suas anotações com título, data e horário para enviar rapidamente via WhatsApp ou e-mail.'}
              </li>
            </ul>
          </div>

          <div className="bg-[#0a2d1f] border border-white/20 rounded-xl p-6 shadow-md backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-green-400 shrink-0 notranslate" translate="no">notifications_active</span>
              {isEs ? 'Alerta Inteligente y Recordatorios Múltiples' : isEn ? 'Smart Alert & Multiple Reminders' : 'Alerta Inteligente & Lembretes Múltiplos'}
            </h2>
            <p className="text-white/85 text-base md:text-lg mb-3">
              {isEs 
                ? 'En la pantalla de Agenda Diaria y en el formulario de Nueva Cita, cuenta con el sistema de Alerta Inteligente flexible:'
                : isEn
                ? 'In the Daily Agenda screen and the New Appointment form, you have a flexible Smart Alert system:'
                : 'Na tela de Agenda Diária e no formulário de Novo Compromisso, você conta com o sistema de Alerta Inteligente flexível:'}
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-2 text-base">
              <li>
                <strong>{isEs ? 'Múltiples Tiempos de Anticipación:' : isEn ? 'Multiple Advance Times:' : 'Múltiplos Tempos de Antecedência:'}</strong>{' '}
                {isEs ? 'Elija más de un tiempo de recordatorio simultáneamente (En el evento, 15 min antes, 30 min antes, 1 hora antes, 24 horas antes).' : isEn ? 'Choose more than one reminder time simultaneously (At event time, 15 min before, 30 min before, 1 hour before, 24 hours before).' : 'Escolha mais de um tempo de lembrete simultaneamente (No evento, 15 min antes, 30 min antes, 1 hora antes, 24 horas antes).'}
              </li>
              <li>
                <strong>{isEs ? 'Estado Visual Activo:' : isEn ? 'Active Visual Status:' : 'Status Visual Ativo:'}</strong>{' '}
                {isEs ? 'Al hacer clic en los botones de anticipación, los botones seleccionados permanecen iluminados en verde radiante, confirmando qué horarios están activados.' : isEn ? 'When clicking advance time buttons, selected buttons highlight in radiant green, visually confirming active times.' : 'Ao clicar nos botões de antecedência, os botões selecionados ficam acesos e destacados em verde radiante, confirmando visualmente quais horários estão ativados.'}
              </li>
              <li>
                <strong>{isEs ? 'Pausar o Cerrar Alarma Sonora:' : isEn ? 'Pause or Close Sound Alarm:' : 'Pausar ou Fechar Alarme Sonoro:'}</strong>{' '}
                {isEs ? 'Durante la reproducción de una alerta sonora (ya sea en prueba o cita real), use los botones "Pausar Sonido" o "Pausar Alarma Sonora" para silenciar el audio.' : isEn ? 'During audio alert playback (preview test or real appointment), use "Pause Sound" or "Pause Alarm Sound" buttons to mute the audio.' : 'Durante a reprodução de um alerta sonoro (seja no teste preview ou ao disparar um compromisso real), utilize os botões "Pausar Som" ou "Pausar Alarme Sonoro" para silenciar o áudio.'}
              </li>
              <li>
                <strong>{isEs ? 'Recordatorio Activo en Pantalla:' : isEn ? 'Active Screen Reminder:' : 'Lembrete Ativo na Tela:'}</strong>{' '}
                {isEs ? 'En la ventana emergente de Recordatorio Activo, puede pausar el sonido o hacer clic en "Enterado (Cerrar Alerta)" para cerrar la notificación.' : isEn ? 'In the Active Reminder popup window, you can pause the alarm sound or click "Acknowledged (Close Alert)" to dismiss the notification.' : 'Na janela popup de Lembrete Ativo, você pode pausar o som do alarme ou clicar em "Ciente (Fechar Alerta)" para encerrar a notificação.'}
              </li>
            </ul>
          </div>

          <div className="bg-[#0a2d1f] border border-white/20 rounded-xl p-6 shadow-md backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-green-400 shrink-0 notranslate" translate="no">route</span>
              {isEs ? 'Optimización Logística de Citas' : isEn ? 'Logistics Optimization for Appointments' : 'Otimização Logística de Compromissos'}
            </h2>
            <p className="text-white/85 text-base md:text-lg mb-3">
              {isEs 
                ? 'El sistema de Optimización Logística analiza las direcciones y horarios de sus citas para reducir desplazamientos y ahorrar tiempo:'
                : isEn
                ? 'The Logistics Optimization system analyzes the addresses and schedules of your appointments to reduce travel and save time:'
                : 'O sistema de Otimização Logística analisa os endereços e horários dos seus compromissos para reduzir deslocamentos e economizar tempo:'}
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-2 text-base">
              <li>
                <strong>{isEs ? 'Detección Automática de Proximidad:' : isEn ? 'Automatic Proximity Detection:' : 'Detecção Automática de Proximidade:'}</strong>{' '}
                {isEs ? 'Al crear o editar una cita indicando la dirección, si ya existe otro evento en la misma ubicación o cercana en otra fecha, el sistema le avisará para agruparlos en la misma jornada.' : isEn ? 'When creating or editing an appointment with an address, if another event exists at the same or nearby location on a different date, the system prompts you to group them on the same day.' : 'Ao criar ou editar um compromisso informando o endereço, se já existir outro evento no mesmo local ou próximo em outra data, o sistema avisa para agrupá-los no mesmo dia.'}
              </li>
              <li>
                <strong>{isEs ? 'Escaneo de Rutas en el Panel:' : isEn ? 'Route Scan in Dashboard:' : 'Varredura de Rotas no Dashboard:'}</strong>{' '}
                {isEs ? 'En la pantalla de Panel, en la sección "Optimización Logística", haga clic en el botón con la varita mágica para analizar automáticamente toda su agenda y recibir recomendaciones de reordenamiento de citas.' : isEn ? 'In the Dashboard screen, under the "Logistics Optimization" section, click the magic wand button to automatically scan your agenda and get recommendations for rescheduling matching locations.' : 'Na tela de Dashboard, na seção "Otimização Logística", clique no botão com ícone de varinha mágica para analisar automaticamente toda a sua agenda e receber recomendações de agrupamento de locais.'}
              </li>
            </ul>
          </div>

          <div className="bg-[#0a2d1f] border border-white/20 rounded-xl p-6 shadow-md backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-green-400 shrink-0 notranslate" translate="no">add_circle</span>
              {isEs ? 'Creando Citas y Tareas' : isEn ? 'Creating Appointments & Tasks' : 'Criando Compromissos e Tarefas'}
            </h2>
            <p className="text-white/85 text-base md:text-lg mb-2">
              {isEs ? 'En la pantalla del Calendario, Agenda Diaria o Panel de Tareas, siempre encontrará un botón de suma (+).' : isEn ? 'On the Calendar, Daily Agenda, or Task Dashboard screens, you will always find an add button (+).' : 'Na tela do Calendário, Agenda Diária, ou no Dashboard de Tarefas, você sempre encontrará um botão de adição (+).'}
            </p>
            <ul className="list-decimal list-inside text-white/80 space-y-1 ml-2 text-base">
              <li>{isEs ? 'Haga clic en el botón (+).' : isEn ? 'Click the (+) button.' : 'Clique no botão (+).'}</li>
              <li>{isEs ? 'Complete el título, la fecha, la hora (opcional) y elija una categoría (Trabajo, Personal, Urgente).' : isEn ? 'Fill in the title, date, time (optional), and choose a category (Work, Personal, Urgent).' : 'Preencha o título, a data, a hora (opcional) e escolha uma categoria (Trabalho, Pessoal, Urgente).'}</li>
              <li>{isEs ? 'Defina la Configuración de Alerta Inteligente seleccionando uno o más tiempos de anticipación.' : isEn ? 'Configure Smart Alert settings by selecting one or more advance reminder times.' : 'Defina as Configurações de Alerta Inteligente selecionando um ou mais horários de antecedência.'}</li>
              <li>{isEs ? 'Guarde para visualizar el elemento en su lista de eventos programados.' : isEn ? 'Save to view the item in your scheduled events list.' : 'Salve para visualizar o item na sua lista de eventos programados.'}</li>
            </ul>
          </div>

          <div className="bg-[#0a2d1f] border border-white/20 rounded-xl p-6 shadow-md backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-green-400 shrink-0 notranslate" translate="no">account_balance_wallet</span>
              {isEs ? 'Gestión de Cuentas' : isEn ? 'Account Management' : 'Gestão de Contas'}
            </h2>
            <p className="text-white/85 text-base md:text-lg mb-2">
              {isEs ? 'Utilice este módulo para organizar sus finanzas:' : isEn ? 'Use this module to organize your finances:' : 'Utilize este módulo para organizar suas finanças:'}
            </p>
            <ul className="list-decimal list-inside text-white/80 space-y-1 ml-2 text-base">
              <li>{isEs ? 'Añada Cuentas por Pagar y Cuentas por Cobrar indicando monto, vencimiento y si están pagadas.' : isEn ? 'Add Bills to Pay and Accounts Receivable with amount, due date, and payment status.' : 'Adicione Contas a Pagar e Contas a Receber informando valor, vencimento e se estão pagas.'}</li>
              <li>{isEs ? 'Siga el Flujo de Caja para ver el saldo previsto.' : isEn ? 'Track Cash Flow to view your projected balance.' : 'Acompanhe o Fluxo de Caixa para ver o saldo previsto.'}</li>
              <li>{isEs ? 'Cree Metas Financieras (ej: "Viaje", "Fondo de Emergencia") y registre sus depósitos mensuales.' : isEn ? 'Create Financial Goals (e.g. "Travel", "Emergency Fund") and log monthly deposits.' : 'Crie Metas Financeiras (ex: "Viagem", "Reserva de Emergência") e registre seus depósitos mensais.'}</li>
            </ul>
          </div>

          <div className="bg-[#0a2d1f] border border-white/20 rounded-xl p-6 shadow-md backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-green-400 shrink-0 notranslate" translate="no">groups</span>
              {isEs ? 'Programa de Afiliados' : isEn ? 'Affiliate Program' : 'Programa de Afiliados'}
            </h2>
            <p className="text-white/85 text-base md:text-lg">
              {isEs 
                ? 'Cualquier usuario puede convertirse en afiliado de forma gratuita. Al ingresar a "Mi Red", simplemente acepte los términos (si aún no lo ha hecho) y copie su enlace exclusivo de recomendación. ¡Ganará comisiones directas e indirectas por cada persona que use su enlace y contrate los planos pro/premium!'
                : isEn
                ? 'Any user can become an affiliate for free. When accessing "My Network", simply accept the terms (if you haven\'t already) and copy your unique referral link. You will earn direct and indirect commissions for every person who uses your link and subscribes to pro/premium plans!'
                : 'Qualquer usuário pode virar afiliado gratuitamente. Ao entrar no "Minha Rede", basta aceitar os termos (se ainda não o fez) e copiar seu link exclusivo de indicação. Você ganhará comissões diretas e indiretas por cada pessoa que usar seu link e contratar os planos pro/premium!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


