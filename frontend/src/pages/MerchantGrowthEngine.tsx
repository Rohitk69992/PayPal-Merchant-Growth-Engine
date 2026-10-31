import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Target,
  Package,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const MerchantGrowthEngine: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-20 sm:pb-6">
      {/* Header with Back Arrow */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-[#003087] text-white text-[10px] font-black flex items-center justify-center">
              AI
            </span>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Merchant Growth Engine
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Powered by PayPal AI</p>
        </div>
      </div>

      {/* Hero Banner: Smarter insights. Bigger opportunities. */}
      <div className="bg-gradient-to-b from-[#003087] to-[#001c4d] text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <h2 className="text-2xl font-black tracking-tight leading-tight">
            Smarter insights. <br />
            Bigger opportunities.
          </h2>

          <p className="text-xs text-blue-100/90 leading-relaxed">
            We analyze your transactions, customer behavior and market trends to help you attract new customers, increase sales and manage your inventory — automatically.
          </p>

          {/* AI Feature Pill Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2.5 my-3">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-white">
              <CheckCircle2 className="w-4 h-4 text-blue-300" />
              <span>Customer insights</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-white">
              <CheckCircle2 className="w-4 h-4 text-blue-300" />
              <span>Targeted marketing</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-white">
              <CheckCircle2 className="w-4 h-4 text-blue-300" />
              <span>Inventory forecasting</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/marketing')}
            className="w-full bg-white hover:bg-blue-50 text-[#003087] font-bold text-sm shadow-md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Get Started
          </Button>
        </div>
      </div>

      {/* "How it helps" Section */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-slate-900 px-1">How it helps</h3>

        {/* Feature 1 */}
        <div
          onClick={() => navigate('/marketing')}
          className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all flex items-start gap-3.5 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-900">Find your best customers</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              See who buys most, where they're from and what they prefer through RFM cohort analysis.
            </p>
          </div>
        </div>

        {/* Feature 2 */}
        <div
          onClick={() => navigate('/marketing')}
          className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all flex items-start gap-3.5 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-900">Reach new audiences</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Get AI-powered marketing suggestions to grow your customer base with high-ROI offers.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div
          onClick={() => navigate('/inventory')}
          className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all flex items-start gap-3.5 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-900">Optimize inventory</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Predict demand and get smart stock recommendations before seasonal spikes happen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
