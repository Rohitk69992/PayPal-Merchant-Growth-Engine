import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Check,
  Info,
  Calculator,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import type { AccountHealthStatus } from '../types';

export const AccountHealthPage: React.FC = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<AccountHealthStatus | null>(null);

  // Interactive Fee Calculator (Fixes Fee Confusion Pain Point)
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [isCrossBorder, setIsCrossBorder] = useState<boolean>(false);

  useEffect(() => {
    apiClient.getAccountHealth().then(setHealth);
  }, []);

  if (!health) return null;

  // Exact PayPal Fee Calculation Formula
  const baseRate = isCrossBorder ? 0.039 : 0.029;
  const fixedFee = 0.30;
  const calculatedFee = calcAmount > 0 ? parseFloat((calcAmount * baseRate + fixedFee).toFixed(2)) : 0;
  const netReceivable = calcAmount > 0 ? parseFloat((calcAmount - calculatedFee).toFixed(2)) : 0;

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">Account Health</h1>
          <p className="text-[11px] text-slate-500 font-medium">Security status and fee transparency</p>
        </div>
      </div>

      {/* Main Status Hero Card */}
      <div className="bg-emerald-50/90 rounded-3xl p-5 border border-emerald-200/90 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">
            {health.statusMessage}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">{health.subMessage}</p>
        </div>
      </div>

      {/* Security Checklist Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          System Safeguards & Monitoring
        </h2>

        <div className="space-y-3 pt-1">
          {health.checklist.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                  <p className="text-[11px] text-slate-500">{item.description}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Fees Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900">Transaction Fees</h2>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <span className="text-[10px] font-semibold text-slate-400">Standard Tier</span>
        </div>

        <div className="space-y-2 text-xs divide-y divide-slate-100 pt-1">
          <div className="flex items-center justify-between pt-1 text-slate-600">
            <span>Domestic (US)</span>
            <span className="font-bold text-slate-900">{health.feeSchedule.domesticUs}</span>
          </div>
          <div className="flex items-center justify-between pt-2 text-slate-600">
            <span>International (Cross-Border)</span>
            <span className="font-bold text-slate-900">{health.feeSchedule.international}</span>
          </div>
          <div className="flex items-center justify-between pt-2 text-slate-600">
            <span>Currency Conversion</span>
            <span className="font-bold text-slate-900">{health.feeSchedule.currencyConversion}</span>
          </div>
          <div className="flex items-center justify-between pt-2 text-slate-600">
            <span>Crypto Buy / Sell</span>
            <span className="font-bold text-slate-900">{health.feeSchedule.cryptoTrade}</span>
          </div>
        </div>

        {/* Live Transparent Fee Calculator */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Calculator className="w-4 h-4 text-blue-600" />
            <span>Interactive Fee Estimator</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                min="1"
                value={calcAmount}
                onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                Transaction Type
              </label>
              <button
                type="button"
                onClick={() => setIsCrossBorder(!isCrossBorder)}
                className={`w-full text-xs font-semibold px-2 py-1.5 rounded-lg border transition-colors ${
                  isCrossBorder
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                {isCrossBorder ? 'International (3.9%)' : 'Domestic (2.9%)'}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">PayPal Fee:</span>
              <span className="font-extrabold text-rose-600">-${calculatedFee.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">You Receive (Net):</span>
              <span className="font-extrabold text-emerald-700 text-sm">
                ${netReceivable.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-1">
          <button className="text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors">
            View full fee details
          </button>
        </div>
      </div>
    </div>
  );
};
