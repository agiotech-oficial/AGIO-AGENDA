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
                <strong>{isEs ? 'Gestión de Cuentas & Formato de Valores' : isEn ? 'Account Management & Currency Formatting' : 'Gestão de Contas & Formatação Automática de Valores'}:</strong>{' '}
                {isEs ? 'Control financiero para gestionar cuentas por pagar, por cobrar, flujo de caja. Al ingresar montos en "Nova Conta" o "Novo Compromisso", el sistema reconoce y aplica automáticamente la separación de miles por punto (.) y centavos por coma (,) (p. ej. R$ 1.558,92).' : isEn ? 'Financial control for payables, receivables, and cash flow. When typing amounts in "New Account" or "New Event", the system automatically formats thousands separators with dots (.) and cents with commas (,) (e.g. R$ 1.558,92).' : 'Controle financeiro para gerenciar contas a pagar, a receber, fluxo de caixa e metas. Ao digitar valores em "Nova Conta", "Novo Compromisso" ou alterar preços, o sistema reconhece e aplica automaticamente a separação de milhares por ponto (.) e centavos por vírgula (,) (ex: R$ 1.558,92).'}
              </li>
              <li>
                <strong>{isEs ? 'Mi Red' : isEn ? 'My Network' : 'Minha Rede'}:</strong>{' '}
                {isEs ? 'Panel completo de Afiliados para copiar su enlace exclusivo y código QR, acceder a materiales de divulgación (textos, imágenes, videos, audios), gestionar y captar prospectos por WhatsApp y solicitar retiros de comisiones por PIX.' : isEn ? 'Full Affiliate dashboard to copy your unique referral link and QR Code, access promotional materials (texts, images, videos, audio), manage and capture WhatsApp leads, and request PIX commission payouts.' : 'Painel completo de Afiliado para copiar seu link exclusivo e QR Code, acessar materiais de divulgação (textos, imagens, vídeos, áudios), gerenciar e capturar leads via WhatsApp e solicitar saques de comissões via PIX.'}
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
              <li>
                <strong>{isEs ? 'Notificaciones Push Nativas y Segundo Plano:' : isEn ? 'Native Push Notifications & Background:' : 'Notificações Push Nativas e Segundo Plano:'}</strong>{' '}
                {isEs ? 'El sistema utiliza Web Push y Service Workers para enviar alarmas incluso con la aplicación totalmente cerrada. La tecnología Screen Wake Lock mantiene los procesos y audios listos en segundo plano, permitiendo abrir la cita con 1 toque en la notificación del sistema.' : isEn ? 'The system uses Web Push and Service Workers to trigger alarms even when the app is completely closed. Screen Wake Lock keeps background processes and audio active, allowing 1-tap direct opening to your appointment from native OS notifications.' : 'O sistema utiliza Web Push e Service Workers para disparar alarmes com som e vibração mesmo com o aplicativo ou a aba totalmente fechados. O Screen Wake Lock e o processo de segundo plano mantêm o áudio pronto, permitindo abrir o compromisso com apenas 1 toque na notificação do sistema operacional.'}
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
              <span className="material-symbols-outlined text-green-400 shrink-0 notranslate" translate="no">palette</span>
              {isEs ? 'Clasificación por Colores de Compromisos y Cuentas' : isEn ? 'Color Classification for Events & Accounts' : 'Classificação por Cores em Compromissos e Contas'}
            </h2>
            <p className="text-white/85 text-base md:text-lg mb-3">
              {isEs 
                ? 'Organice sus compromisos y finanzas visualmente asignando colores específicos:'
                : isEn
                ? 'Visually organize your events and finances by assigning custom classification colors:'
                : 'Organize seus compromissos e finanças de forma visual atribuindo cores de classificação:'}
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-2 text-base">
              <li>
                <strong>{isEs ? 'Selección de Color en el Formulario:' : isEn ? 'Color Selection in Form:' : 'Seleção de Cor no Formulário:'}</strong>{' '}
                {isEs ? 'Al crear o editar un compromiso o cuenta, elija entre Verde, Azul, Rojo, Amarillo, Morado, Naranja, Rosa, Ciano o un color personalizado.' : isEn ? 'When creating or editing an appointment or account, choose from Green, Blue, Red, Yellow, Purple, Orange, Pink, Cyan, or a custom hex color.' : 'Ao criar ou editar qualquer compromisso ou conta, escolha entre Verde, Azul, Vermelho, Amarelo, Roxo, Laranja, Rosa, Ciano ou selecione uma cor personalizada.'}
              </li>
              <li>
                <strong>{isEs ? 'Puntos Coloridos en el Calendario:' : isEn ? 'Colored Dots on Calendar:' : 'Pontos Coloridos no Calendário:'}</strong>{' '}
                {isEs ? 'Cada día del calendario mensual muestra pequeños puntos con los colores de las citas programadas para ese día.' : isEn ? 'Each day on the monthly calendar displays small dots matching the colors of scheduled events.' : 'Cada dia no calendário mensal exibe pequenos pontos coloridos correspondentes às cores dos compromissos agendados naquele dia.'}
              </li>
              <li>
                <strong>{isEs ? 'Borde Lateral Destacado:' : isEn ? 'Highlighted Side Border:' : 'Borda Lateral Destacada:'}</strong>{' '}
                {isEs ? 'En las listas de la Agenda Diaria y Gestión de Cuentas, las tarjetas tienen una barra de color a la izquierda para identificar rápidamente la categoría.' : isEn ? 'In Daily Agenda and Account Management lists, cards display a colored bar on the left for fast visual identification.' : 'Nas listas da Agenda Diária e Gestão de Contas, os cards ganham uma barra de cor destacada à esquerda para identificação visual imediata.'}
              </li>
            </ul>
          </div>

          <div className="bg-[#0a2d1f] border border-white/20 rounded-xl p-6 shadow-md backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-green-400 shrink-0 notranslate" translate="no">system_update_alt</span>
              {isEs ? 'Actualización Automática al Abrir el Aplicativo' : isEn ? 'Automatic System Updates on Launch' : 'Atualização Automática ao Abrir o Aplicativo'}
            </h2>
            <p className="text-white/85 text-base md:text-lg mb-2">
              {isEs 
                ? 'Ágio Agenda cuenta con un sistema de verificación automática de versiones y actualizaciones:'
                : isEn
                ? 'Ágio Agenda features an automated version and update check system:'
                : 'O Ágio Agenda possui um sistema de verificação e instalação automática de atualizações:'}
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2 ml-2 text-base">
              <li>
                <strong>{isEs ? 'Verificación al Abrir:' : isEn ? 'Launch Verification:' : 'Verificação ao Abrir:'}</strong>{' '}
                {isEs ? 'Cada vez que abre la aplicación, el sistema comprueba automáticamente si hay nuevas versiones o mejoras.' : isEn ? 'Every time you open the app, the system automatically checks for new releases or improvements.' : 'Sempre que você abre o aplicativo, o sistema verifica automaticamente se há novas versões, correções e recursos.'}
              </li>
              <li>
                <strong>{isEs ? 'Instalación Transparente:' : isEn ? 'Seamless Installation:' : 'Instalação Transparente:'}</strong>{' '}
                {isEs ? 'Si hay una actualización disponible, el aplicativo la descarga e instala automáticamente sin perder sus datos guardados.' : isEn ? 'If an update is available, the app downloads and installs it automatically without losing your stored data.' : 'Caso haja uma atualização disponível, o aplicativo a baixa e aplica automaticamente sem perder nenhum dos seus dados.'}
              </li>
              <li>
                <strong>{isEs ? 'Aplicación Instalable:' : isEn ? 'Installable App:' : 'Aplicativo Instalável:'}</strong>{' '}
                {isEs ? 'Puede instalar la app en su dispositivo móvil o computadora mediante la opción "Agregar a Pantalla de Inicio" del navegador.' : isEn ? 'You can install the app on your smartphone or desktop via your browser\'s "Add to Home Screen" menu.' : 'Você pode instalar o aplicativo direto no seu celular ou computador pelo menu "Adicionar à Tela Inicial" do seu navegador.'}
              </li>
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
              {isEs ? 'Programa de Afiliados (Mi Red)' : isEn ? 'Affiliate Program (My Network)' : 'Programa de Afiliados (Minha Rede)'}
            </h2>
            <p className="text-white/85 text-base md:text-lg mb-3">
              {isEs 
                ? 'Cualquier usuario puede convertirse en afiliado de forma gratuita para recomendar Ágio Agenda y ganar comisiones directas (Nivel 1) e indirectas (Nivel 2) en efectivo por cada suscripción confirmada:'
                : isEn
                ? 'Any user can become an affiliate for free to recommend Ágio Agenda and earn direct (Level 1) and indirect (Level 2) cash commissions for every confirmed subscription:'
                : 'Qualquer usuário pode se tornar um afiliado gratuitamente para indicar o Ágio Agenda e faturar comissões diretas (Nível 1) e indiretas (Nível 2) em dinheiro por cada assinatura confirmada:'}
            </p>
            <ul className="list-disc list-inside text-white/80 space-y-2.5 ml-2 text-base">
              <li>
                <strong>{isEs ? 'Enlace Exclusivo y Código QR:' : isEn ? 'Unique Link & QR Code:' : 'Link Exclusivo e QR Code:'}</strong>{' '}
                {isEs ? 'Copie su enlace personalizado de recomendación o comparta el código QR directamente en pantalla para que sus referidos se registren vinculados a su red.' : isEn ? 'Copy your customized referral link or share the QR Code directly on-screen so your referrals sign up linked to your network.' : 'Copie seu link personalizado de indicação ou compartilhe o QR Code direto na tela para que seus indicados se cadastrem vinculados à sua rede.'}
              </li>
              <li>
                <strong>{isEs ? 'Materiales de Divulgación Listos:' : isEn ? 'Ready-to-Use Marketing Materials:' : 'Materiais de Divulgação Prontos:'}</strong>{' '}
                {isEs ? 'Acceda a textos persuasivos, imágenes oficiales, videos demostrativos y audios grabados listos para usar. Su enlace exclusivo se adjunta automáticamente a la plantilla para copiar y publicar en WhatsApp, Instagram, Facebook o Telegram con un solo clic.' : isEn ? 'Access persuasive texts, official images, demo videos, and recorded audio ready for use. Your unique affiliate link is automatically attached to the template so you can copy and post to WhatsApp, Instagram, Facebook, or Telegram with a single click.' : 'Acesse textos persuasivos, imagens oficiais, vídeos demonstrativos e áudios gravados prontos para uso. O seu link exclusivo de afiliado é embutido automaticamente na mensagem para você copiar e postar no WhatsApp, Instagram, Facebook ou Telegram com apenas um clique.'}
              </li>
              <li>
                <strong>{isEs ? 'Captura y Gestión de Leads (WhatsApp):' : isEn ? 'WhatsApp Lead Management & Capture:' : 'Captura e Gestão de Leads (Agenda do WhatsApp):'}</strong>{' '}
                {isEs ? 'Importe contactos de su libreta telefónica a la tabla de prospectos. Puede seleccionar contactos específicos y enviar el enlace de afiliado combinado con el material de divulgación directamente por WhatsApp, con seguimiento de estado (Enviado / No Enviado) y protección anti-spam.' : isEn ? 'Import contacts from your phonebook into the lead table. You can select specific contacts and send your affiliate link combined with promotional materials directly via WhatsApp, complete with status tracking (Link Sent / Not Sent) and anti-spam protection.' : 'Importe contatos da sua agenda telefônica para a tabela de leads. Você pode selecionar contatos específicos e enviar o link de afiliado combinado com o material de divulgação diretamente pelo WhatsApp, com controle de status (Link Enviado / Não Enviado) e proteção anti-spam para envios conscientes.'}
              </li>
              <li>
                <strong>{isEs ? 'Panel de Comisiones y Retiros por PIX:' : isEn ? 'Commission Dashboard & PIX Cashouts:' : 'Painel de Comissões e Saques via PIX:'}</strong>{' '}
                {isEs ? 'Registre su clave PIX, siga el historial de referidos directos e indirectos, consulte su saldo disponible de comisiones y solicite retiros directamente a su cuenta bancaria.' : isEn ? 'Register your PIX key, track the history of direct and indirect referrals, check your available commission balance, and request payouts directly to your bank account.' : 'Cadastre sua chave PIX, acompanhe o histórico de indicados diretos e indiretos, consulte o saldo disponível de comissões e solicite saques diretamente para a sua conta bancária.'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};


