import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  HelpCircle,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  MoreHorizontal,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { apiClient } from '../services/apiClient';
import type { CryptoHolding } from '../types';

export const CryptoPage: React.FC = () => {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);

  useEffect(() => {
    apiClient.getCryptoHoldings().then(setHoldings);
  }, []);

  const chartData = [
    { day: 'Mon', val: 1950 },
    { day: 'Tue', val: 1990 },
    { day: 'Wed', val: 1980 },
    { day: 'Thu', val: 2040 },
    { day: 'Fri', val: 2010 },
    { day: 'Sat', val: 2090 },
    { day: 'Sun', val: 2130.47 },
  ];

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Crypto</h1>
            <p className="text-[11px] text-slate-500 font-medium">PayPal digital asset wallet</p>
          </div>
        </div>
        <HelpCircle className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
      </div>

      {/* Crypto Value Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Total Crypto Value</span>
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">
            ₿
          </div>
        </div>

        <div>
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">$2,130.47</span>
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+8.4% (24h)</span>
          </div>
        </div>

        {/* Portfolio Mini Chart */}
        <div className="h-28 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cryptoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="val"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#cryptoGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-col items-center gap-1.5">
            <button className="w-11 h-11 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors shadow-2xs">
              <ArrowDownLeft className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-bold text-slate-700">Buy</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button className="w-11 h-11 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors shadow-2xs">
              <ArrowUpRight className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-bold text-slate-700">Sell</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button className="w-11 h-11 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors shadow-2xs">
              <Repeat className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-bold text-slate-700">Swap</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-bold text-slate-700">More</span>
          </div>
        </div>
      </div>

      {/* Your Holdings Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Your Holdings</h2>

        <div className="space-y-2.5 pt-1">
          {holdings.map((h) => (
            <div
              key={h.symbol}
              className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                  {h.symbol === 'BTC' ? '₿' : h.symbol === 'ETH' ? 'Ξ' : 'S'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {h.name} <span className="text-slate-400 font-normal">({h.symbol})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {h.cryptoAmount} {h.symbol}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 block">
                  ${h.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-bold text-emerald-600">
                  +{h.change24hPct}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button className="w-full flex items-center justify-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 py-2 transition-colors">
            <span>View All Cryptocurrencies</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Regulated PayPal Disclaimer */}
      <div className="p-3 bg-slate-100/70 rounded-2xl border border-slate-200 text-[10px] text-slate-500 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
        <span>Crypto transactions are subject to market volatility. Available through PayPal Digital Inc.</span>
      </div>
    </div>
  );
};
