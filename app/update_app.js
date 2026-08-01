const fs = require('fs');

let content = fs.readFileSync('/app/page.tsx', 'utf8');

// 1. Add import
if (!content.includes("import { AffiliateView }")) {
  content = content.replace(
    "import { AccountsManagementView } from './AccountsManagementView';",
    "import { AccountsManagementView } from './AccountsManagementView';\nimport { AffiliateView } from './AffiliateView';"
  );
}

// 2. Remove state declaration
content = content.replace(
  "  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);",
  ""
);

// 3. Update isAnyModalActive
content = content.replace("    isAffiliateModalOpen ||\n", "");

// 4. Replace onOpenAffiliate={() => setIsAffiliateModalOpen(true)} with onOpenAffiliate={() => setView('affiliate')}
content = content.replaceAll("onOpenAffiliate={() => setIsAffiliateModalOpen(true)}", "onOpenAffiliate={() => setView('affiliate')}");

// 5. Update Profile modal button
content = content.replace(
  "onClick={() => { setIsProfileModalOpen(false); setIsAffiliateModalOpen(true); }}",
  "onClick={() => { setIsProfileModalOpen(false); setView('affiliate'); }}"
);

// 6. Update Hamburger drawer button
content = content.replace(
  `onClick={() => { setIsAffiliateModalOpen(true); setIsHamburgerOpen(false); }}`,
  `onClick={() => { setView('affiliate'); setIsHamburgerOpen(false); }}`
);

// 7. Add view === 'affiliate' render line
const targetInstructions = `{view === 'instructions' && <InstructionsView onNavigate={setView} onOpenProfile={() => setIsProfileModalOpen(true)} onOpenAffiliate={() => setView('affiliate')} onOpenSupport={() => setIsSupportModalOpen(true)} onOpenSubscription={() => setIsSubscriptionModalOpen(true)} currentUser={currentUser} isAdmin={isCurrentlyAdmin} />}`;
const newAffiliateViewRender = `${targetInstructions}\n        {view === 'affiliate' && <AffiliateView onNavigate={setView} currentUser={currentUser} setCurrentUser={setCurrentUser} handleUpdateUserData={handleUpdateUserData} directCommissionPct={directCommissionPct} indirectCommissionPct={indirectCommissionPct} directCommissionMonths={directCommissionMonths} indirectCommissionMonths={indirectCommissionMonths} automaticCommissionPayment={automaticCommissionPayment} onOpenProfile={() => setIsProfileModalOpen(true)} onOpenSupport={() => setIsSupportModalOpen(true)} onOpenSubscription={() => setIsSubscriptionModalOpen(true)} isAdmin={isCurrentlyAdmin} />}`;

if (content.includes(targetInstructions) && !content.includes("{view === 'affiliate' && <AffiliateView")) {
  content = content.replace(targetInstructions, newAffiliateViewRender);
}

// 8. Remove the old isAffiliateModalOpen JSX block from page.tsx
const modalStartStr = "{/* Affiliate Network Modal */}\n      {isAffiliateModalOpen && (";
const modalStartIndex = content.indexOf(modalStartStr);
if (modalStartIndex !== -1) {
  const modalEndStr = "{/* 2FA Setup Modal */}";
  const modalEndIndex = content.indexOf(modalEndStr, modalStartIndex);
  if (modalEndIndex !== -1) {
    content = content.slice(0, modalStartIndex) + content.slice(modalEndIndex);
    console.log('Successfully removed old isAffiliateModalOpen JSX block!');
  }
}

fs.writeFileSync('/app/page.tsx', content);
console.log('Done modifying page.tsx!');
