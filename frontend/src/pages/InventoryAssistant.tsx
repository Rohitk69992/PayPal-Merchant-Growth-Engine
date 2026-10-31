import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Package,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Button } from '../components/common/Button';
import { ReorderModal } from '../components/inventory/ReorderModal';
import { apiClient } from '../services/apiClient';
import type { ProductInventory, ProductForecast } from '../types';

export const InventoryAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<ProductInventory[]>([]);
  const [forecast, setForecast] = useState<ProductForecast | null>(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [forecastHorizon] = useState('Next 3 months');

  const loadData = () => {
    apiClient.getInventory().then(setInventory);
    apiClient.getProductForecast('prod_1').then(setForecast);
  };

  useEffect(() => {
    loadData();
  }, []);

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
          <h1 className="text-base font-bold text-slate-900 leading-tight">
            AI Inventory Assistant
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">Demand forecasting & reorder triggers</p>
        </div>
      </div>

      {/* AI Recommendation Highlight Card (Wireframe Style: Green/Teal Card) */}
      <div className="bg-emerald-50/90 rounded-3xl p-5 border border-emerald-200/90 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
            AI Recommendation
          </span>
        </div>

        <p className="text-xs font-semibold text-emerald-900 leading-relaxed">
          {forecast?.rationale ||
            'Based on your sales trend and seasonal demand, we suggest ordering 120 units of Wireless Headphones in the next 2 weeks.'}
        </p>

        <Button
          variant="success"
          size="md"
          onClick={() => setIsReorderModalOpen(true)}
          className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs py-2.5 rounded-xl shadow-xs"
          leftIcon={<Package className="w-4 h-4" />}
        >
          Add to Order
        </Button>
      </div>

      {/* Demand Forecast Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Demand Forecast</h2>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
              <TrendingUp className="w-3 h-3" />
              <span>+{forecast?.growthProjectionPct || 42}%</span>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {forecastHorizon}
          </span>
        </div>

        {/* Forecast Chart */}
        <div className="h-44 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={forecast?.points || []}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  fontSize: '11px',
                  border: '1px solid #e2e8f0',
                }}
              />
              {/* Actual Sales Line */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#64748b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#64748b' }}
                name="Actual Sold"
              />
              {/* Projected Sales Line */}
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#0070e0"
                strokeWidth={3}
                dot={{ r: 4, fill: '#0070e0' }}
                activeDot={{ r: 6 }}
                name="Projected Demand"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span>Historical</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0070e0]" />
            <span className="font-semibold text-blue-700">Holt-Winters Holiday Spike</span>
          </div>
        </div>
      </div>

      {/* Inventory Status Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Inventory Status</h2>
          <span className="text-xs font-semibold text-slate-400">
            {inventory.length} items tracked
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          {inventory.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.status === 'LOW_STOCK' || item.id === 'prod_1') {
                  setIsReorderModalOpen(true);
                }
              }}
              className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                  <Package className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.status === 'LOW_STOCK'
                          ? 'bg-amber-500 animate-ping'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium ${
                        item.status === 'LOW_STOCK' ? 'text-amber-700 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {item.status === 'LOW_STOCK' ? 'Low stock' : 'In stock'} • {item.stockOnHand} units
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>

        {/* View All Suggestions Action */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsReorderModalOpen(true)}
            className="w-full text-blue-700 border-blue-200 hover:bg-blue-50 font-bold text-xs py-2.5 rounded-xl"
          >
            View All Suggestions
          </Button>
        </div>
      </div>

      {/* Interactive Reorder Confirmation Modal */}
      <ReorderModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
