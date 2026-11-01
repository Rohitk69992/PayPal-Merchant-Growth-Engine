import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Users,
  Target,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { CampaignModal } from '../components/marketing/CampaignModal';
import { apiClient } from '../services/apiClient';
import type {
  CustomerSegment,
  LocationDistribution,
  CategoryPreference,
  MarketingCampaignDraft,
  Customer,
} from '../types';

export const MarketingInsights: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'Cohorts' | 'Categories' | 'Campaigns'>('Cohorts');
  const [rfmStatus, setRfmStatus] = useState<string>('LOADING');
  const [rfmMessage, setRfmMessage] = useState<string>('');
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [totalCustomersAnalyzed, setTotalCustomersAnalyzed] = useState(0);
  const [locations, setLocations] = useState<LocationDistribution[]>([]);
  const [preferences, setPreferences] = useState<CategoryPreference[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaignDraft[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>('High-Value Champions');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rfmData, locs, prefs, camps, custs] = await Promise.all([
        apiClient.getRFMSegments().catch(() => ({ status: 'INSUFFICIENT_DATA', message: '', segments: [], total_customers_analyzed: 0 })),
        apiClient.getCustomerLocations().catch(() => []),
        apiClient.getCategoryBreakdown().catch(() => []),
        apiClient.getCampaigns().catch(() => []),
        apiClient.getCustomers().catch(() => []),
      ]);
      setRfmStatus(rfmData.status);
      setRfmMessage(rfmData.message || '');
      setSegments(rfmData.segments || []);
      setTotalCustomersAnalyzed(rfmData.total_customers_analyzed || 0);
      setLocations(locs);
      setPreferences(prefs);
      setCampaigns(camps);
      setCustomers(custs);

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

  // Strict design system colors for charts
  const PALETTE = ['#1E3A5F', '#4779A8', '#16A085', '#D69E36', '#334155'];

  const pieData = segments.map((s, idx) => ({
    name: s.segment_name,
    value: s.percentage,
    color: PALETTE[idx % PALETTE.length],
    count: s.customer_count,
    avgSpend: s.avg_monetary,
  }));

  const activeSegmentData = segments.find((s) => s.segment_name === selectedSegment) || segments[0];

  return (
    <div className="space-y-5 pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
              Customer Intelligence & Marketing Analytics
            </h1>
            <Badge variant="navy" size="sm">
              Scikit-Learn RFM
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Recency-Frequency-Monetary cohort clustering, category affinities, and targeted campaign optimization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCampaignModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white p-1 rounded-lg border border-[#D9E2EC] shadow-2xs inline-flex gap-1">
        {(['Cohorts', 'Categories', 'Campaigns'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-[#1E3A5F] text-white shadow-2xs font-bold'
                : 'text-[#64748B] hover:text-[#172B45] hover:bg-[#F1F5F9]'
            }`}
          >
            {tab === 'Cohorts' ? 'Customer RFM Cohorts' : tab === 'Categories' ? 'Category Affinities' : 'Marketing Campaigns'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#64748B]">
          <Loader2 className="w-8 h-8 animate-spin text-[#4779A8] mb-2" />
          <span className="text-xs font-semibold">Executing Scikit-learn K-Means clustering...</span>
        </div>
      ) : activeTab === 'Cohorts' ? (
        <div className="space-y-5">
          {rfmStatus === 'INSUFFICIENT_DATA' ? (
            <Card className="p-8 border-dashed border-[#CBD5E1] text-center bg-white">
              <div className="w-12 h-12 rounded-xl bg-[#E8EEF5] text-[#4779A8] flex items-center justify-center mx-auto mb-3 border border-[#D9E2EC]">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#172B45]">
                Scikit-Learn Clustering Prerequisite Notice
              </h3>
              <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1 leading-relaxed">
                {rfmMessage ||
                  `K-Means RFM clustering requires at least 4 unique customer profiles (currently ${totalCustomersAnalyzed} analyzed). Process transactions via PayPal or the Sandbox Simulator to calibrate behavioral clusters.`}
              </p>
              <div className="mt-5 flex justify-center">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/paypal')}
                >
                  Simulate Buyer Transactions →
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Donut Chart & Legend (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                <Card className="p-5 border-[#D9E2EC]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC]">
                    <h3 className="text-sm font-bold text-[#172B45]">
                      RFM Customer Segmentation Distribution
                    </h3>
                    <Badge variant="success" size="sm">
                      K-Means ({totalCustomersAnalyzed} analyzed)
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 pt-2">
                    {/* Donut Chart */}
                    <div className="sm:col-span-6 h-52 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [`${value}% of total customers`, 'Cohort Share']}
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#D9E2EC',
                              borderRadius: '8px',
                              fontSize: '11px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Segment List Selector */}
                    <div className="sm:col-span-6 space-y-2">
                      {segments.map((seg, idx) => (
                        <div
                          key={seg.segment_name}
                          onClick={() => setSelectedSegment(seg.segment_name)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                            selectedSegment === seg.segment_name
                              ? 'border-[#4779A8] bg-[#DCEAF5]/50 ring-1 ring-[#4779A8]'
                              : 'border-[#D9E2EC] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                            />
                            <div>
                              <span className="text-xs font-bold text-[#172B45] block">
                                {seg.segment_name}
                              </span>
                              <span className="text-[10px] text-[#64748B] font-mono">
                                Spend: ${(seg.avg_monetary ?? 0).toFixed(2)} • {seg.customer_count} cust
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#172B45] font-numeric">
                            {seg.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Selected Segment AI Strategy Callout */}
                  {activeSegmentData && (
                    <div className="mt-4 p-3.5 bg-[#F8FAFC] border border-[#D9E2EC] rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#1E3A5F]">
                        <Sparkles className="w-3.5 h-3.5 text-[#4779A8]" />
                        <span>Actionable Strategy for {activeSegmentData.segment_name}:</span>
                      </div>
                      <p className="text-[#334155] leading-relaxed text-[11px]">
                        {activeSegmentData.description || 'Deliver targeted loyalty discounts to prevent churn.'}
                      </p>
                    </div>
                  )}
                </Card>

                {/* Customer Ledger Table for Current Segment */}
                <Card className="p-4 border-[#D9E2EC]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B45] mb-2.5">
                    Customer Profiles in Segment
                  </h3>
                  {customers.length === 0 ? (
                    <p className="text-xs text-[#64748B] italic">No customer profiles recorded.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-numeric">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#D9E2EC]">
                            <th className="py-2">Customer</th>
                            <th className="py-2">Email</th>
                            <th className="py-2 text-right">Orders</th>
                            <th className="py-2 text-right">Total Spend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {customers.slice(0, 5).map((c) => (
                            <tr key={c.id} className="hover:bg-[#F8FAFC]">
                              <td className="py-2 font-sans font-semibold text-[#172B45]">{c.name}</td>
                              <td className="py-2 text-[#64748B] font-mono text-[11px]">{c.email}</td>
                              <td className="py-2 text-right">{c.total_orders}</td>
                              <td className="py-2 text-right font-bold text-[#16A085]">${c.total_spend.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>

              {/* Right Column: Geographic Distribution (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                <Card className="p-5 border-[#D9E2EC]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC] mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B45] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#4779A8]" />
                      Geographic Customer Density
                    </h3>
                    <span className="text-[10px] text-[#64748B] font-mono">Cities</span>
                  </div>

                  {locations.length === 0 ? (
                    <p className="text-xs text-[#64748B] italic">No geographic location metadata recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {locations.map((loc) => (
                        <div key={loc.city} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-[#172B45]">
                            <span>{loc.city}</span>
                            <span className="font-mono text-[#4779A8]">{loc.percentage}%</span>
                          </div>
                          <div className="w-full bg-[#E8EEF5] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#4779A8] h-full rounded-full"
                              style={{ width: `${loc.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-4 bg-[#F8FAFC] border-[#D9E2EC]">
                  <h4 className="text-xs font-bold text-[#172B45] mb-1">
                    Automated Cohort Action
                  </h4>
                  <p className="text-[11px] text-[#64748B] leading-relaxed mb-3">
                    Deploy a targeted promo code directly to the selected customer cohort.
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setIsCampaignModalOpen(true)}
                    className="w-full"
                    leftIcon={<Target className="w-4 h-4" />}
                  >
                    Target {selectedSegment}
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'Categories' ? (
        /* Categories Tab */
        <Card className="p-5 border-[#D9E2EC]">
          <h3 className="text-sm font-bold text-[#172B45] mb-4">
            Product Category Affinities & Purchase Distribution
          </h3>
          {preferences.length === 0 ? (
            <p className="text-xs text-[#64748B] italic">No sales categories recorded yet.</p>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {preferences.map((pref) => (
                <div key={pref.category} className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EC] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#172B45]">
                    <span>{pref.category}</span>
                    <span className="font-mono text-[#4779A8]">{pref.percentage}% ({pref.sales_count} sales)</span>
                  </div>
                  <div className="w-full bg-[#E8EEF5] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#1E3A5F] h-full rounded-full"
                      style={{ width: `${pref.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        /* Campaigns Tab */
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No Active Marketing Campaigns"
              description="Draft a targeted promotion tailored to high-value or at-risk customers to boost retention."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCampaignModalOpen(true)}
                >
                  Create First Campaign
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((camp) => (
                <Card key={camp.id} className="p-4 border-[#D9E2EC] space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#172B45]">{camp.name}</h4>
                    <Badge variant="success" size="sm">
                      {camp.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#64748B]">{camp.message_body}</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] pt-2 border-t border-[#D9E2EC]">
                    <span>Target: <strong className="text-[#172B45]">{camp.target_segment}</strong></span>
                    <span>Code: <strong className="text-[#1E3A5F]">{camp.promo_code}</strong> ({camp.discount_percentage}% off)</span>
                  </div>
                </Card>
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
