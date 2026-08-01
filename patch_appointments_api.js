const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// Replace saveAppointmentDirectly logic
const oldSaveFn = 'const saveAppointmentDirectly = (dataToSave: any, editId: string | null) => {';
const newSaveFn = `const saveAppointmentDirectly = async (dataToSave: any, editId: string | null) => {
    if (!currentUser?.firebaseUid) return;
    
    if (editId) {
      // API call to PUT
      const appData = { id: editId, ...dataToSave, category: dataToSave.category as CategoryType, userId: currentUser.firebaseUid };
      await fetch('/api/appointments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appData) });
      
      setAppointments(appointments.map(app => 
        app.id === editId ? { ...app, ...appData } : app
      ).sort((a, b) => a.date.localeCompare(b.date)));
    } else {
      const appData = { ...dataToSave, category: dataToSave.category as CategoryType, userId: currentUser.firebaseUid };
      // Note: In a real app we'd get the inserted ID, but for simplicity we rely on refetching or mocking ID
      await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appData) });
      
      // Let's refetch to get proper ID
      const appsRes = await fetch(\`/api/appointments?userId=\${currentUser.firebaseUid}\`);
      if (appsRes.ok) {
         const appsData = await appsRes.json();
         setAppointments(appsData.map((a: any) => ({ ...a, id: a.id.toString() })));
      }
    }
    
    setIsModalOpen(false);
    setEditingAppointmentId(null);
    setOptimizationAlert(null);
    setFormData({ title: '', date: '', time: '', category: 'Trabalho' as CategoryType, address: '', contact: '', reminders: [] as string[], value: 0, valueStatus: 'a_receber' });
  };`;

// Find and replace the function body
const saveFnStart = code.indexOf(oldSaveFn);
if (saveFnStart > -1) {
    const endFn = `setFormData({ title: '', date: '', time: '', category: 'Trabalho' as CategoryType, address: '', contact: '', reminders: [] as string[], value: 0, valueStatus: 'a_receber' });\n  };`;
    const saveFnEnd = code.indexOf(endFn, saveFnStart) + endFn.length;
    code = code.substring(0, saveFnStart) + newSaveFn + code.substring(saveFnEnd);
}

// Replace handleDeleteAppointment
const oldDelFn = `const handleDeleteAppointment = (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar este agendamento?')) {
      setAppointments(appointments.filter(app => app.id !== id));
    }
  };`;
const newDelFn = `const handleDeleteAppointment = async (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar este agendamento?')) {
      await fetch(\`/api/appointments?id=\${id}\`, { method: 'DELETE' });
      setAppointments(appointments.filter(app => app.id !== id));
    }
  };`;
code = code.replace(oldDelFn, newDelFn);

fs.writeFileSync('app/page.tsx', code);
console.log('Appointments API patched');
