import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Headphones,
  Shirt,
  Armchair,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Button } from '../components/common/Button';
import { CampaignModal } from '../components/marketing/CampaignModal';
import { apiClient } from '../services/apiClient';
import type { CustomerSegment, LocationDistribution, CategoryPreference } from '../types';

export const MarketingInsights: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'Customers' | 'Trends' | 'Campaigns'>('Customers');
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [locations, setLocations] = useState<LocationDistribution[]>([]);
  const [preferences, setPreferences] = useState<CategoryPreference[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>('New Customers');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

  useEffect(() => {
    apiClient.getCustomerSegments().then(setSegments);
    apiClient.getLocations().then(setLocations);
    apiClient.getCategoryPreferences().then(setPreferences);
  }, []);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'headphones':
        return <Headphones className="w-5 h-5 text-blue-600" />;
      case 'shirt':
        return <Shirt className="w-5 h-5 text-purple-600" />;
      case 'armchair':
        return <Armchair className="w-5 h-5 text-amber-600" />;
      default:
        return <LayoutGrid className="w-5 h-5 text-slate-600" />;
    }
  };

  const pieData = segments.map((s) => ({
    name: s.name,
    value: s.percentage,
    color: s.color,
    count: s.count,
    avgSpend: s.avgSpend,
  }));

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
            AI Marketing Insights
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">Customer behavioral intelligence</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center p-1 bg-slate-200/70 rounded-2xl">
        {(['Customers', 'Trends', 'Campaigns'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Customers' && (
        <div className="space-y-4">
          {/* Section 1: Your Best Customers */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Your Best Customers</h2>
              <p className="text-xs text-slate-500">Top 5 customer segments by spend</p>
            </div>

            {/* Donut Chart & Legend Row */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-40 h-40 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${val}% of total`, 'Share']}
                      contentStyle={{
                        borderRadius: '12px',
                        fontSize: '11px',
                        border: '1px solid #e2e8f0',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-black text-slate-800">900</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Total Buyers</span>
                </div>
              </div>

              {/* Segment Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 flex-1 w-full">
                {segments.map((seg) => (
                  <div
                    key={seg.id}
                    onClick={() => setSelectedSegment(seg.name)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer border ${
                      selectedSegment === seg.name
                        ? 'bg-blue-50/70 border-blue-200'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="font-semibold text-slate-800">{seg.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{seg.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Segment Highlight Callout */}
            {selectedSegment && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-blue-700">Segment Profile: {selectedSegment}</span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Avg Spend: ${segments.find((s) => s.name === selectedSegment)?.avgSpend.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {segments.find((s) => s.name === selectedSegment)?.description}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Where They Come From */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Where They Come From</h2>
              <p className="text-xs text-slate-500">Top customer shipping & billing locations</p>
            </div>

            <div className="space-y-2.5 pt-1">
              {locations.map((loc) => (
                <div key={loc.city} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      {loc.city}
                    </span>
                    <span className="text-slate-900 font-bold">{loc.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${loc.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: What They Prefer */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">What They Prefer</h2>
              <p className="text-xs text-slate-500">Top product categories by volume</p>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {preferences.map((pref) => (
                <div
                  key={pref.category}
                  className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 flex flex-col items-center text-center space-y-1.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-white shadow-2xs flex items-center justify-center">
                    {getCategoryIcon(pref.iconName)}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">
                    {pref.category}
                  </span>
                  <span className="text-xs font-extrabold text-blue-700">
                    {pref.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button: Create Targeted Campaign */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsCampaignModalOpen(true)}
              className="w-full bg-[#0070e0] hover:bg-[#005ea6] text-white font-bold text-sm shadow-md py-3 rounded-2xl"
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Create Targeted Campaign
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'Trends' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3 text-center py-10">
          <TrendingUp className="w-10 h-10 text-blue-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">Cohort Retention Trends</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Repeat purchasing rate increased by +8.4% month-over-month. VIP shoppers demonstrate a 42-day re-order velocity.
          </p>
        </div>
      )}

      {activeTab === 'Campaigns' && (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded-md">
                Active Promotion
              </span>
              <h4 className="text-xs font-bold text-slate-900 mt-1">Welcome Back 15% Audio Upgrade</h4>
              <p className="text-[11px] text-slate-500">Target: New Customers • Reach: 378</p>
            </div>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-xl">
              +14 Conversions
            </span>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={() => setIsCampaignModalOpen(true)}
            className="w-full"
            leftIcon={<Sparkles className="w-4 h-4 text-blue-600" />}
          >
            Draft Another Campaign
          </Button>
        </div>
      )}

      {/* Interactive Campaign Creation Modal */}
      <CampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        defaultSegment={selectedSegment}
      />
    </div>
  );
};
