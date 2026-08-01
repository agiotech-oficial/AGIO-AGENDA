import * as fs from 'fs';

let page = fs.readFileSync('app/page.tsx', 'utf-8');
const lines = page.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('fixed inset-0')) {
    if (i + 1 < lines.length) {
      lines[i + 1] = lines[i + 1].replace('bg-[#480082]', 'bg-[#06402B]');
    }
  }
}
fs.writeFileSync('app/page.tsx', lines.join('\n'));

let admin = fs.readFileSync('app/AdminDashboardView.tsx', 'utf-8');
const adminLines = admin.split('\n');
for (let i = 0; i < adminLines.length; i++) {
  if (adminLines[i].includes('fixed inset-0')) {
    if (i + 1 < adminLines.length) {
      adminLines[i + 1] = adminLines[i + 1].replace('bg-[#480082]', 'bg-[#06402B]');
    }
  }
}
fs.writeFileSync('app/AdminDashboardView.tsx', adminLines.join('\n'));

console.log("Done");
