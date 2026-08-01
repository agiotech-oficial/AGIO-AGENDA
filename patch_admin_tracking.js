const fs = require('fs');
let code = fs.readFileSync('app/AdminDashboardView.tsx', 'utf8');

// 1. Add 'analytics' to state type
code = code.replace(
  "const [trackingTab, setTrackingTab] = useState<'logs' | 'offers'>('logs');",
  "const [trackingTab, setTrackingTab] = useState<'logs' | 'offers' | 'analytics'>('logs');"
);

// 2. Add 'analytics' tab button
const tabButtonStr = `<button 
                onClick={() => setTrackingTab('offers')} 
                className={\`py-3 px-4 font-bold text-sm border-b-2 transition-colors \${trackingTab === 'offers' ? 'border-[#ec4899] text-[#ec4899]' : 'border-transparent text-[#4b5563] hover:text-[#ec4899]'}\`}
              >
                Acompanhamento de Gratuidade & Ofertas (40 Dias)
              </button>`;

const newTabButtonStr = `<button 
                onClick={() => setTrackingTab('analytics')} 
                className={\`py-3 px-4 font-bold text-sm border-b-2 transition-colors \${trackingTab === 'analytics' ? 'border-[#ec4899] text-[#ec4899]' : 'border-transparent text-[#4b5563] hover:text-[#ec4899]'}\`}
              >
                Análises e Relatórios
              </button>`;

code = code.replace(tabButtonStr, tabButtonStr + '\n              ' + newTabButtonStr);

// 3. Add analytics content logic inside trackingTab
const oldLogsView = `{trackingTab === 'logs' ? (`;

const analyticsView = `{trackingTab === 'analytics' ? (
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
              ) : trackingTab === 'logs' ? (`;

code = code.replace(oldLogsView, analyticsView);

fs.writeFileSync('app/AdminDashboardView.tsx', code);
