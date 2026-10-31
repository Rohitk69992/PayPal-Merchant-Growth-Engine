import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Bot,
  Package,
  Receipt,
  Users,
  CreditCard,
  Boxes,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import type { AnalyticsOverview } from '../types';
import { Card } from '../components/common/Card';

interface HomeDashboardProps {
  onOpenAiDrawer: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onOpenAiDrawer }) => {
  const navigate = useNavigate();
  const { user, currentMerchant } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const data = await apiClient.getOverview();
        setOverview(data);
      } catch (err) {
        console.error('Failed to load merchant overview:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-sm font-semibold">Loading merchant intelligence...</span>
      </div>
    );
  }

  const totalRevenue = overview?.total_balance ?? 0;
  const totalTx = overview?.transaction_count ?? 0;
  const totalCust = overview?.customer_count ?? 0;
  const lowStock = overview?.low_stock_count ?? 0;

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20 sm:pb-6">
      {/* Top Greeting Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 tracking-tight">
            <span>{currentMerchant?.business_name || 'PayPal Merchant'}</span>
            <span className="w-1 h-1 rounded-full bg-blue-700" />
            <span className="text-slate-500 font-medium">{currentMerchant?.currency || 'USD'} Tenant</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Good day, {user?.full_name || 'Partner'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Your business. Your growth. Our support.
          </p>
        </div>

        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center ring-2 ring-blue-100 shadow-xs text-sm">
          {user?.full_name ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'ME'}
        </div>
      </div>

      {/* Total Revenue Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
          <span>Processed Revenue ({currentMerchant?.currency || 'USD'})</span>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-1 hover:text-slate-800 transition-colors cursor-pointer"
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {showBalance ? `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••••'}
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          {totalTx > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{totalTx} verified captures</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-xs">
              <span>Clean-slate workspace initialized</span>
            </div>
          )}
        </div>
      </div>

      {/* Operational Metrics 3-Card Row */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Transactions Card */}
        <div
          onClick={() => navigate('/transactions')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Transactions</span>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 truncate block mt-0.5">
            {totalTx}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            {totalTx === 0 ? 'No transactions yet' : 'Verified settlements'}
          </span>
        </div>

        {/* Customers Card */}
        <div
          onClick={() => navigate('/marketing')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Customers</span>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 truncate block mt-0.5">
            {totalCust}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            {totalCust < 4 ? 'Need ≥4 for RFM ML' : 'Clustered via RFM'}
          </span>
        </div>

        {/* Low Stock Alert Card */}
        <div
          onClick={() => navigate('/inventory')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
            <Package className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Low Stock</span>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 truncate block mt-0.5">
            {lowStock}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            {lowStock > 0 ? 'Below safety stock' : 'Optimal inventory'}
          </span>
        </div>
      </div>

      {/* Getting Started Guide when Clean Slate */}
      {totalTx === 0 && (
        <Card className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border-blue-200/80">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-3 flex-1">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Getting Started with Genuine Business Intelligence
                </h4>
                <p className="text-xs text-blue-800 mt-0.5">
                  Your platform starts 100% clean. Complete these 3 quick steps to power up predictive analytics:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => navigate('/products')}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white text-slate-800 font-semibold shadow-2xs border border-slate-200 hover:border-blue-400 transition-all text-left cursor-pointer"
                >
                  <Boxes className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-bold">1. Add Products</div>
                    <div className="text-[10px] text-slate-400">Master inventory records</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/sales')}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white text-slate-800 font-semibold shadow-2xs border border-slate-200 hover:border-blue-400 transition-all text-left cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold">2. Log Sales</div>
                    <div className="text-[10px] text-slate-400">Daily sales history</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/paypal')}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white text-slate-800 font-semibold shadow-2xs border border-slate-200 hover:border-blue-400 transition-all text-left cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-[#0070BA] shrink-0" />
                  <div>
                    <div className="font-bold">3. Simulate Pay</div>
                    <div className="text-[10px] text-slate-400">Live sandbox capture</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Prominent Hero Banner: Merchant Growth Engine */}
      <div className="relative rounded-3xl p-5 bg-gradient-to-br from-[#003087] via-[#005ea6] to-[#0070e0] text-white shadow-lg overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase tracking-wider mb-2.5 border border-white/20">
            <Sparkles className="w-3 h-3 text-blue-200" />
            <span>Merchant Growth Engine</span>
          </div>

          <h3 className="text-lg font-black tracking-tight leading-tight">
            Turn your transaction data into more customers, higher sales and smarter decisions.
          </h3>

          <p className="mt-1.5 text-xs text-blue-100 leading-relaxed max-w-sm">
            Continuous analytical calibration powered by Statsmodels Holt-Winters demand forecasting, Scikit-learn RFM segmentation, and Gemini decision support.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => navigate('/grow')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#003087] font-bold text-xs shadow-md hover:bg-blue-50 transition-all cursor-pointer"
            >
              <span>Explore Engine Capabilities</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenAiDrawer}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask AI Copilot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Navigation Row */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          onClick={() => navigate('/marketing')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Customer Hub</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <p className="text-xs font-extrabold text-slate-900">Marketing & RFM Insights</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Scikit-learn RFM Clustering</p>
        </div>

        <div
          onClick={() => navigate('/inventory')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Stock Forecast</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xs font-extrabold text-slate-900">AI Inventory Assistant</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Holt-Winters Daily Predictions</p>
        </div>
      </div>
    </div>
  );
};
