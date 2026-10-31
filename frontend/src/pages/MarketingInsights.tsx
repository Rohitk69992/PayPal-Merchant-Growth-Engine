import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Users,
  Target,
  Plus,
  Loader2,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Button } from '../components/common/Button';
import { CampaignModal } from '../components/marketing/CampaignModal';
import { apiClient } from '../services/apiClient';
import type { CustomerSegment, LocationDistribution, CategoryPreference, MarketingCampaignDraft } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const MarketingInsights: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'Customers' | 'Trends' | 'Campaigns'>('Customers');
  const [rfmStatus, setRfmStatus] = useState<string>('LOADING');
  const [rfmMessage, setRfmMessage] = useState<string>('');
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [totalCustomersAnalyzed, setTotalCustomersAnalyzed] = useState(0);
  const [locations, setLocations] = useState<LocationDistribution[]>([]);
  const [preferences, setPreferences] = useState<CategoryPreference[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaignDraft[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>('High-Value Champions');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rfmData, locs, prefs, camps] = await Promise.all([
        apiClient.getRFMSegments(),
        apiClient.getCustomerLocations(),
        apiClient.getCategoryBreakdown(),
        apiClient.getCampaigns(),
      ]);
      setRfmStatus(rfmData.status);
      setRfmMessage(rfmData.message || '');
      setSegments(rfmData.segments || []);
      setTotalCustomersAnalyzed(rfmData.total_customers_analyzed || 0);
      setLocations(locs);
      setPreferences(prefs);
      setCampaigns(camps);

      if (rfmData.segments && rfmData.segments.length > 0) {
        setSelectedSegment(rfmData.segments[0].segment_name);
      }
    } catch (err) {
      console.error('Failed to load marketing analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const COLORS = ['#0070BA', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const pieData = segments.map((s, idx) => ({
    name: s.segment_name,
    value: s.percentage,
    color: s.color || COLORS[idx % COLORS.length],
    count: s.customer_count,
    avgSpend: s.avg_monetary,
  }));

  const activeSegmentData = segments.find((s) => s.segment_name === selectedSegment) || segments[0];

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24 sm:pb-8">
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
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              AI Marketing Insights
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Scikit-learn RFM customer clustering & campaign targeting
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCampaignModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center p-1 bg-slate-200/70 rounded-2xl">
        {(['Customers', 'Trends', 'Campaigns'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-sm">Executing Scikit-learn RFM clustering...</span>
        </div>
      ) : activeTab === 'Customers' ? (
        <div className="space-y-4">
          {rfmStatus === 'INSUFFICIENT_DATA' ? (
            <Card className="p-6 bg-white border-dashed border-2 border-slate-300 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Scikit-Learn Clustering Prerequisite Notice
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                {rfmMessage || `K-Means RFM clustering requires at least 4 unique customer profiles (currently ${totalCustomersAnalyzed} analyzed). Process transactions via PayPal or the Sandbox Simulator to calibrate behavioral clusters.`}
              </p>
              <div className="flex items-center justify-center gap-3 mt-5">
                <button
                  onClick={() => navigate('/paypal')}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl shadow-xs"
                >
                  Simulate Sandbox Buyers →
                </button>
              </div>
            </Card>
          ) : (
            <>
              {/* Donut Chart & Segments Card */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Your Best Customers</h2>
                  <Badge variant="success" size="sm">
                    Scikit-Learn K-Means ({totalCustomersAnalyzed} customers)
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                  {/* Pie Chart */}
                  <div className="sm:col-span-6 h-48 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`${value}% of customer base`, 'Proportion']}
                          contentStyle={{
                            borderRadius: '12px',
                            fontSize: '11px',
                            border: '1px solid #e2e8f0',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Segment Legends */}
                  <div className="sm:col-span-6 space-y-2">
                    {segments.map((seg, idx) => (
                      <div
                        key={seg.segment_name}
                        onClick={() => setSelectedSegment(seg.segment_name)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedSegment === seg.segment_name
                            ? 'border-blue-600 bg-blue-50/50'
                            : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: seg.color || COLORS[idx % COLORS.length] }}
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {seg.segment_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Avg spend: ${seg.avg_monetary.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-slate-800">
                          {seg.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Segment AI Strategy */}
                {activeSegmentData && (
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-2xl space-y-1.5 text-xs text-blue-900">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>AI Action for {activeSegmentData.segment_name}:</span>
                    </div>
                    <p className="text-blue-800 leading-relaxed text-[11px]">
                      {activeSegmentData.description || 'Target with promotional rewards to maximize retention.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Geographic Distribution Card */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Where They Come From
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Top Locations</span>
                </div>

                {locations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No customer locations recorded yet.</p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {locations.map((loc) => (
                      <div key={loc.city} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{loc.city}</span>
                          <span>{loc.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#0070BA] h-full rounded-full"
                            style={{ width: `${loc.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Create Targeted Campaign Button */}
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsCampaignModalOpen(true)}
            className="w-full bg-[#0070BA] hover:bg-[#003087] text-white font-bold text-xs py-3 rounded-2xl shadow-sm"
            leftIcon={<Target className="w-4 h-4" />}
          >
            Create Targeted Campaign
          </Button>
        </div>
      ) : activeTab === 'Trends' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Product Category Breakdown</h3>
            {preferences.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No sales categories recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {preferences.map((pref) => (
                  <div key={pref.category} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>{pref.category}</span>
                      <span>{pref.percentage}% ({pref.sales_count} sales)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${pref.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Campaigns Tab */
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <Card className="text-center py-16 px-6 border-dashed border-2 border-slate-300 bg-white">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Marketing Campaigns Active</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Draft a targeted promotional campaign tailored to your high-value or at-risk customers.
              </p>
              <button
                onClick={() => setIsCampaignModalOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl shadow-xs cursor-pointer"
              >
                Create First Campaign
              </button>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((camp) => (
                <div key={camp.id} className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">{camp.name}</h4>
                    <Badge variant="success" size="sm">
                      {camp.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">{camp.message_body}</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                    <span>Segment: <strong className="text-slate-700">{camp.target_segment}</strong></span>
                    <span>Code: <strong className="text-blue-700">{camp.promo_code}</strong> ({camp.discount_percentage}% off)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaign Modal */}
      <CampaignModal
        isOpen={isCampaignModalOpen}
        defaultSegment={selectedSegment}
        onClose={() => setIsCampaignModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
