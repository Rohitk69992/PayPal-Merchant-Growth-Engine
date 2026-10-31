import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomeDashboard } from './pages/HomeDashboard';
import { MerchantGrowthEngine } from './pages/MerchantGrowthEngine';
import { ProductsPage } from './pages/ProductsPage';
import { SalesEntryPage } from './pages/SalesEntryPage';
import { MarketingInsights } from './pages/MarketingInsights';
import { InventoryAssistant } from './pages/InventoryAssistant';
import { TransactionsPage } from './pages/TransactionsPage';
import { PayPalConnectPage } from './pages/PayPalConnectPage';
import { SettingsPage } from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, currentMerchant, merchants } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0070BA] mb-2" />
        <span className="text-sm font-semibold">Initializing merchant session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if ((!merchants || merchants.length === 0) && !currentMerchant) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeDashboard onOpenAiDrawer={() => {}} />} />
            <Route path="grow" element={<MerchantGrowthEngine />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="sales" element={<SalesEntryPage />} />
            <Route path="inventory" element={<InventoryAssistant />} />
            <Route path="marketing" element={<MarketingInsights />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="paypal" element={<PayPalConnectPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="account-health" element={<Navigate to="/settings" replace />} />
            <Route path="crypto" element={<Navigate to="/grow" replace />} />
            <Route path="rewards" element={<Navigate to="/grow" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
