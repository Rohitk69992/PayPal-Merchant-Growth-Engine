import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  DollarSign,
  Sparkles,
  Bot,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import type { MerchantProfile } from '../types';

interface HomeDashboardProps {
  onOpenAiDrawer: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onOpenAiDrawer }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    apiClient.getMerchantProfile().then(setProfile);
  }, []);

  if (!profile) return null;

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-20 sm:pb-6">
      {/* Top Greeting Header (Mobile Wireframe Style) */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 tracking-tight">
            <span>PayPal Merchant</span>
            <span className="w-1 h-1 rounded-full bg-blue-700" />
            <span className="text-slate-500 font-medium">Verified</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Good morning, {profile.ownerName}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Your business. Your growth. Our support.
          </p>
        </div>
        <img
          src={profile.avatarUrl}
          alt={profile.ownerName}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100 shadow-xs"
        />
      </div>

      {/* Total Balance Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
          <span>Total Balance</span>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-1 hover:text-slate-800 transition-colors cursor-pointer"
          >
            {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {showBalance ? `$${profile.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••••••'}
          </span>
        </div>

        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+{profile.balanceGrowthPct30d}% vs. last 30 days</span>
        </div>
      </div>

      {/* Asset Balances 3-Card Row */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* USD Card */}
        <div
          onClick={() => navigate('/transactions')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 block">USD</span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
            {showBalance ? `$${profile.balances.usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••'}
          </span>
        </div>

        {/* BTC Card */}
        <div
          onClick={() => navigate('/crypto')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2 font-bold text-xs">
            ₿
          </div>
          <span className="text-[11px] font-semibold text-slate-400 block">BTC</span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
            {showBalance ? `$${profile.balances.btcValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••'}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            {profile.balances.btcAmount} BTC
          </span>
        </div>

        {/* Rewards Card */}
        <div
          onClick={() => navigate('/rewards')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-2 font-bold text-xs">
            ★
          </div>
          <span className="text-[11px] font-semibold text-slate-400 block">Rewards</span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block mt-0.5">
            {profile.balances.rewardsPoints.toLocaleString()} pts
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            ≈ ${profile.balances.rewardsValueUsd.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Prominent Hero Banner: Merchant Growth Engine */}
      <div className="relative rounded-3xl p-5 bg-gradient-to-br from-[#003087] via-[#005ea6] to-[#0070e0] text-white shadow-lg overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase tracking-wider mb-2.5 border border-white/20">
            <Sparkles className="w-3 h-3 text-blue-200" />
            <span>Merchant Growth Engine</span>
          </div>

          <h3 className="text-lg font-black tracking-tight leading-tight">
            Turn your data into more customers, higher sales and smarter decisions.
          </h3>

          <p className="mt-1.5 text-xs text-blue-100 leading-relaxed max-w-xs">
            AI-powered RFM clustering, time-series demand forecasting, and real-time inventory triggers.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => navigate('/grow')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#003087] font-bold text-xs shadow-md hover:bg-blue-50 transition-all cursor-pointer"
            >
              <span>Grow My Business</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenAiDrawer}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Health Banner Card */}
      <div
        onClick={() => navigate('/account-health')}
        className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Account Health</h4>
            <p className="text-[11px] text-slate-500">All systems secure • Fee schedule verified</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>

      {/* Quick Access Grid to Growth Tools */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          onClick={() => navigate('/marketing')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Customer Hub</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <p className="text-xs font-extrabold text-slate-900">Marketing Insights</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Top 5 segments & locations</p>
        </div>

        <div
          onClick={() => navigate('/inventory')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Stock Forecast</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xs font-extrabold text-slate-900">Inventory Assistant</p>
          <p className="text-[11px] text-slate-500 mt-0.5">+42% spike predicted</p>
        </div>
      </div>
    </div>
  );
};
