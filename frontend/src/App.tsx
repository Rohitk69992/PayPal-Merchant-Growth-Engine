import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomeDashboard } from './pages/HomeDashboard';
import { MerchantGrowthEngine } from './pages/MerchantGrowthEngine';
import { MarketingInsights } from './pages/MarketingInsights';
import { InventoryAssistant } from './pages/InventoryAssistant';
import { TransactionsPage } from './pages/TransactionsPage';
import { CryptoPage } from './pages/CryptoPage';
import { RewardsPage } from './pages/RewardsPage';
import { AccountHealthPage } from './pages/AccountHealthPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomeDashboard onOpenAiDrawer={() => {}} />} />
          <Route path="grow" element={<MerchantGrowthEngine />} />
          <Route path="marketing" element={<MarketingInsights />} />
          <Route path="inventory" element={<InventoryAssistant />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="crypto" element={<CryptoPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="account-health" element={<AccountHealthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
