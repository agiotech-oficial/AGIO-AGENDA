const fs = require('fs');
const path = '/app/applet/app/AdminDashboardView.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add state variable
if (!code.includes('const [isUsageModalOpen, setIsUsageModalOpen]')) {
  code = code.replace(
    /const \[isAdminSettingsModalOpen, setIsAdminSettingsModalOpen\] = useState\(false\);/,
    `const [isAdminSettingsModalOpen, setIsAdminSettingsModalOpen] = useState(false);\n  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);`
  );
}

// 2. Add the button to open it
const buttonCode = `
                <button onClick={() => setIsUsageModalOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/20 hover:bg-white/10 transition-all group">
                  <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">monitoring</span>
                  <span className="text-base font-medium text-white flex-1 text-left">Uso de Recursos (Limites)</span>
                </button>`;

if (!code.includes('Uso de Recursos (Limites)')) {
  code = code.replace(
    /(<button onClick=\{\(\) => setIsAdminSettingsModalOpen\(true\)\}[\s\S]*?<\/button>)/,
    `$1${buttonCode}`
  );
}

// 3. Add the Modal render
const modalCode = `
      {isUsageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">monitoring</span>
                Relatório Diário - Uso de Planos Gratuitos
              </h2>
              <button onClick={() => setIsUsageModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <span className="material-symbols-outlined text-gray-600">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <ResourceUsageDashboard />
            </div>
          </div>
        </div>
      )}
`;

if (!code.includes('isUsageModalOpen &&')) {
  code = code.replace(
    /(<\/div>\s*<\/div>\s*\)\s*;\s*\}\s*)$/,
    `${modalCode}\n$1`
  );
}

// 4. Import ResourceUsageDashboard
if (!code.includes('ResourceUsageDashboard')) {
  code = code.replace(
    /import \{ NavigationBar \} from '\.\.\/components\/NavigationBar';/,
    `import { NavigationBar } from '../components/NavigationBar';\nimport { ResourceUsageDashboard } from '../components/ResourceUsageDashboard';`
  );
}

fs.writeFileSync(path, code);
console.log('AdminDashboardView patched successfully');
