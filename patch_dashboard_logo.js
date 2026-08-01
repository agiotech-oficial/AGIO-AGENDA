const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// DashboardView
code = code.replace(
  'const [isSidebarOpen, setIsSidebarOpen] = useState(false);',
  'const [isSidebarOpen, setIsSidebarOpen] = useState(false);\n  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);'
);

const dashboardLogoOld = `<img alt="Ágio Ícone" className="w-[32px] h-[32px] object-contain rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('main_menu')} src="/2zguve.png" />`;

const dashboardLogoNew = `<div className="relative flex items-center z-50 cursor-pointer">
              <img 
                alt="Ágio Ícone" 
                className="w-[32px] h-[32px] object-contain rounded-full overflow-hidden hover:opacity-80 transition-opacity" 
                src="/2zguve.png" 
                onClick={() => setIsLogoMenuOpen(!isLogoMenuOpen)}
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
                  <div className="absolute left-0 top-10 w-56 bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl overflow-hidden flex flex-col p-2 gap-1 z-50 text-left cursor-default" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { onNavigate('calendar'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest">
                      <span className="material-symbols-outlined text-[20px]">calendar_month</span> Calendário
                    </button>
                    <button onClick={() => { onNavigate('daily_agenda'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest">
                      <span className="material-symbols-outlined text-[20px]">view_day</span> Agenda Diária
                    </button>
                    <button onClick={() => { onNavigate('dashboard'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent bg-surface-container-lowest text-primary font-bold shadow-sm">
                      <span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
                    </button>
                    <button onClick={() => { onOpenAffiliate(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest">
                      <span className="material-symbols-outlined text-[20px]">groups</span> Minha Rede
                    </button>
                    <button onClick={() => { onOpenProfile(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest">
                      <span className="material-symbols-outlined text-[20px]">account_circle</span> Perfil
                    </button>
                    <button onClick={() => { onNavigate('instructions'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest">
                      <span className="material-symbols-outlined text-[20px]">menu_book</span> Instruções de uso
                    </button>
                  </div>
                </>
              )}
            </div>`;

code = code.replace(dashboardLogoOld, dashboardLogoNew);

// DailyAgendaView
code = code.replace(
  'const [dayAppointments, setDayAppointments] = useState', 
  '// no op'
);
// DailyAgendaView uses derived state for dayAppointments. Let's find where to inject isLogoMenuOpen
code = code.replace(
  'const dayAppointments = appointments.filter(a => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));',
  'const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);\n  const dayAppointments = appointments.filter(a => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));'
);

const dailyLogoOld = `<div className="flex items-center z-10 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate('main_menu')}>
            <img alt="Ágio Ícone" className="w-[40px] h-[40px] object-contain rounded-full overflow-hidden" src="/2zguve.png" />
          </div>`;

const dailyLogoNew = `<div className="relative flex items-center z-50 cursor-pointer">
            <img 
              alt="Ágio Ícone" 
              className="w-[40px] h-[40px] object-contain rounded-full overflow-hidden hover:opacity-80 transition-opacity" 
              src="/2zguve.png" 
              onClick={() => setIsLogoMenuOpen(!isLogoMenuOpen)}
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
                <div className="absolute left-0 top-12 w-56 bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl overflow-hidden flex flex-col p-2 gap-1 z-50 text-left cursor-default" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { onNavigate('calendar'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest">
                    <span className="material-symbols-outlined text-[20px]">calendar_month</span> Calendário
                  </button>
                  <button onClick={() => { onNavigate('daily_agenda'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent bg-surface-container-lowest text-primary font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">view_day</span> Agenda Diária
                  </button>
                  <button onClick={() => { onNavigate('dashboard'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest">
                    <span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
                  </button>
                  <button onClick={() => { onOpenAffiliate(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest">
                    <span className="material-symbols-outlined text-[20px]">groups</span> Minha Rede
                  </button>
                  <button onClick={() => { onOpenProfile(); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest">
                    <span className="material-symbols-outlined text-[20px]">account_circle</span> Perfil
                  </button>
                  <button onClick={() => { onNavigate('instructions'); setIsLogoMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all text-left border border-transparent text-on-surface hover:border-primary hover:bg-surface-container-highest">
                    <span className="material-symbols-outlined text-[20px]">menu_book</span> Instruções de uso
                  </button>
                </div>
              </>
            )}
          </div>`;

code = code.replace(dailyLogoOld, dailyLogoNew);

fs.writeFileSync('app/page.tsx', code);
