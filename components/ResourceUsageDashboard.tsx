import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Github, AlertTriangle, CheckCircle, BarChart3, RefreshCw, Power } from 'lucide-react';

export function ResourceUsageDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resource_monitoring_enabled');
      return saved !== 'false'; // defaults to true
    }
    return true;
  });

  // Mocking data based on typical free tiers. 
  // In a real application, these would be fetched from respective APIs 
  // (e.g., Vercel API, Firebase Monitoring API, GitHub API).
  const fetchMetrics = (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setTimeout(() => {
      setMetrics({
        vercel: {
          name: 'Vercel (Hospedagem)',
          icon: <Server className="w-6 h-6 text-black" />,
          limits: [
            { name: 'Largura de banda', used: 75, total: 100, unit: 'GB', percentage: 75 },
            { name: 'Execuções de Função', used: 350000, total: 500000, unit: 'reqs', percentage: 70 },
            { name: 'Imagens Otimizadas', used: 800, total: 1000, unit: 'imgs', percentage: 80 },
          ],
          overallPercentage: 75,
        },
        firebase: {
          name: 'Firebase (Banco de Dados)',
          icon: <Database className="w-6 h-6 text-yellow-500" />,
          limits: [
            { name: 'Leituras do Firestore', used: 38000, total: 50000, unit: 'reqs/dia', percentage: 76 },
            { name: 'Gravações do Firestore', used: 12000, total: 20000, unit: 'reqs/dia', percentage: 60 },
            { name: 'Armazenamento', used: 4.5, total: 5, unit: 'GB', percentage: 90 },
          ],
          overallPercentage: 76,
        },
        github: {
          name: 'GitHub (Código & CI/CD)',
          icon: <Github className="w-6 h-6 text-gray-800" />,
          limits: [
            { name: 'Actions (Minutos)', used: 1500, total: 2000, unit: 'min/mês', percentage: 75 },
            { name: 'Storage de Packages', used: 250, total: 500, unit: 'MB', percentage: 50 },
          ],
          overallPercentage: 75,
        }
      });
      setLoading(false);
    }, 1500);
  };

  const toggleMonitoring = () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('resource_monitoring_enabled', String(nextState));
    }
  };

  useEffect(() => {
    // Avoid synchronous setState within effect by executing asynchronously
    const timer = setTimeout(() => {
      fetchMetrics(false);
    }, 0);
    // Simulate daily report refresh
    const interval = setInterval(() => {
      fetchMetrics(false);
    }, 24 * 60 * 60 * 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <p>Analisando infraestrutura e contabilizando uso...</p>
      </div>
    );
  }

  const apps = [metrics.vercel, metrics.firebase, metrics.github];
  const appsOver75 = apps.filter(app => app.overallPercentage >= 75 || app.limits.some((l:any) => l.percentage >= 75));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Monitoramento de Limites (Plano Gratuito)
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Relatório diário de uso de recursos do Vercel, Firebase e GitHub.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Toggle Button */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full select-none">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status:</span>
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${isEnabled ? 'text-emerald-600' : 'text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              {isEnabled ? 'Ativo' : 'Inativo'}
            </span>
            <button
              onClick={toggleMonitoring}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ml-1 ${
                isEnabled ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
              aria-label="Alternar monitoramento de limites"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button 
            onClick={() => fetchMetrics(true)}
            disabled={!isEnabled}
            className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${!isEnabled ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="Atualizar dados"
          >
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Disabled Overlay Panel */}
        {!isEnabled && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="bg-gray-50 border border-gray-100 p-4 rounded-full shadow-sm mb-4">
              <Power className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-bold text-gray-800 mb-1">Monitoramento de Limites Pausado</h4>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              O rastreamento de cotas de infraestrutura (Vercel, Firebase e GitHub) está atualmente inativo. Ative o monitoramento para obter relatórios atualizados e alertas de consumo de recursos.
            </p>
            <button
              onClick={toggleMonitoring}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Ativar Monitoramento
            </button>
          </motion.div>
        )}

        <div className={!isEnabled ? 'opacity-30 select-none pointer-events-none' : ''}>
          {appsOver75.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl mb-6 flex items-start gap-3"
            >
              <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">Aviso de Limite de Consumo!</h4>
                <p className="text-sm mt-1">
                  Algumas aplicações atingiram ou ultrapassaram <strong>75%</strong> da cota do plano gratuito. 
                  Considere planejar um upgrade para evitar interrupções no serviço.
                </p>
                <ul className="mt-2 text-sm list-disc list-inside">
                  {appsOver75.map((app: any, idx) => (
                    <li key={idx}><strong>{app.name}</strong> possui recursos acima de 75% de uso.</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {apps.map((app: any, idx) => (
              <div key={idx} className="border border-gray-100 rounded-xl p-5 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-4">
                  {app.icon}
                  <h4 className="font-medium text-gray-800">{app.name}</h4>
                </div>
                <div className="space-y-4">
                  {app.limits.map((limit: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{limit.name}</span>
                        <span className="font-medium font-mono text-xs">
                          {limit.used.toLocaleString()} / {limit.total.toLocaleString()} {limit.unit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, limit.percentage)}%` }}
                          transition={{ duration: 1, delay: i * 0.2 }}
                          className={`h-2 rounded-full ${
                            limit.percentage >= 90 ? 'bg-red-500' :
                            limit.percentage >= 75 ? 'bg-orange-500' :
                            'bg-emerald-500'
                          }`}
                        />
                      </div>
                      <div className="text-right mt-0.5">
                        <span className={`text-[10px] font-bold ${
                          limit.percentage >= 90 ? 'text-red-600' :
                          limit.percentage >= 75 ? 'text-orange-600' :
                          'text-emerald-600'
                        }`}>
                          {limit.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
