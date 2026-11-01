import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  TrendingUp,
  Target,
  Package,
  Bot,
  Users,
  Loader2,
  DollarSign,
  Plus,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import type {
  AnalyticsOverview,
  CustomerSegment,
  ReorderRecommendation,
  ProductInventory,
} from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CampaignModal } from '../components/marketing/CampaignModal';
import { ReorderModal } from '../components/inventory/ReorderModal';

export const MerchantGrowthEngine: React.FC = () => {
  const navigate = useNavigate();
  const outlet = useOutletContext<{ onOpenAiDrawer?: () => void }>();
  const handleOpenAi = outlet?.onOpenAiDrawer;
  const { currentMerchant } = useAuth();

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [reorders, setReorders] = useState<ReorderRecommendation[]>([]);
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string>('High-Value Champions');
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductInventory | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [overviewData, rfmData, reorderData, prodsData] = await Promise.all([
        apiClient.getOverview(),
        apiClient.getRFMSegments().catch(() => ({ status: 'INSUFFICIENT_DATA', segments: [], total_customers_analyzed: 0 })),
        apiClient.getReorderRecommendations().catch(() => []),
        apiClient.getProducts(),
      ]);
      setOverview(overviewData);
      setSegments(rfmData.segments || []);
      setReorders(reorderData);
      setProducts(prodsData);
    } catch (err) {
      console.error('Failed to load Growth Engine intelligence:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMerchant]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4779A8] mb-3" />
        <span className="text-xs font-semibold">Synthesizing merchant growth opportunities...</span>
      </div>
    );
  }

  const currencySymbol =
    currentMerchant?.currency === 'EUR' ? '€' : currentMerchant?.currency === 'GBP' ? '£' : '$';
  const totalBalance = overview?.total_balance ?? 0;
  const totalCustomers = overview?.customer_count ?? 0;

  return (
    <div className="space-y-6 pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
              Merchant Growth Engine
            </h1>
            <Badge variant="navy" size="sm">
              Intelligence Core
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cross-functional financial intelligence: identifying revenue expansion, retention cohorts, and supply replenishment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCampaignModalOpen(true)}
            leftIcon={<Target className="w-3.5 h-3.5 text-[#4779A8]" />}
          >
            New Campaign
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAi}
            leftIcon={<Bot className="w-3.5 h-3.5" />}
          >
            Consult Copilot
          </Button>
        </div>
      </div>

      {/* 3 Pillar Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: Revenue Velocity */}
        <Card className="p-4 border-[#D9E2EC]">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-semibold">
            <span>Processed Revenue Velocity</span>
            <div className="w-6 h-6 rounded-md bg-[#E8EEF5] text-[#1E3A5F] flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#172B45] font-numeric">
            {currencySymbol}
            {totalBalance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="mt-2 text-[11px] text-[#64748B]">
            {overview?.transaction_count ? `${overview.transaction_count} verified transactions recorded` : 'Awaiting live transaction telemetry'}
          </p>
        </Card>

        {/* Pillar 2: High-Value Retention Opportunity */}
        <Card className="p-4 border-[#D9E2EC]">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-semibold">
            <span>Customer Retention Potential</span>
            <div className="w-6 h-6 rounded-md bg-[#E8EEF5] text-[#1E3A5F] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#172B45] font-numeric">
            {totalCustomers > 0 ? `${totalCustomers} Profiles` : '0 Customers'}
          </div>
          <p className="mt-2 text-[11px] text-[#64748B]">
            {segments.length > 0
              ? `${segments.length} algorithmic cohorts identified via K-Means`
              : 'Requires ≥4 customer profiles for ML clustering'}
          </p>
        </Card>

        {/* Pillar 3: Inventory Capital Optimization */}
        <Card className="p-4 border-[#D9E2EC]">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-semibold">
            <span>Inventory Protection Alert</span>
            <div className="w-6 h-6 rounded-md bg-[#FEF9E7] text-[#D69E36] flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#172B45] font-numeric">
            {reorders.length > 0 ? `${reorders.length} SKU Reorders` : '0 Urgent Alerts'}
          </div>
          <p className="mt-2 text-[11px] text-[#64748B]">
            {reorders.length > 0
              ? 'Stockout risk detected based on lead times'
              : 'Catalog inventory operating above safety stock'}
          </p>
        </Card>
      </div>

      {/* Structured Growth Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Workspace 1: Customer Growth & Segment Targeting */}
        <Card className="p-5 border-[#D9E2EC] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#4779A8]" />
                <h3 className="text-sm font-bold text-[#172B45]">
                  Customer Cohort Intelligence & Offers
                </h3>
              </div>
              <button
                onClick={() => navigate('/marketing')}
                className="text-xs font-semibold text-[#4779A8] hover:text-[#1E3A5F]"
              >
                Marketing Hub →
              </button>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Targeted customer promotions improve repeat purchases without eroding profit margins. Based on our Scikit-Learn RFM analysis:
            </p>

            {segments.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#D9E2EC] text-xs text-[#64748B] space-y-2">
                <p className="font-semibold text-[#172B45]">
                  Insufficient Customer Density for Cohort Clustering
                </p>
                <p className="text-[11px]">
                  K-Means clustering requires at least 4 unique customer profiles with purchase recency and frequency.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/paypal')}
                  className="mt-1"
                >
                  Simulate Customer Purchases →
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {segments.map((seg) => (
                  <div
                    key={seg.segment_name}
                    className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EC] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-[#172B45]">
                        <span>{seg.segment_name}</span>
                        <span className="text-[10px] text-[#64748B] font-normal">
                          ({seg.customer_count} customers • {seg.percentage}%)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        Avg spend: ${(seg.avg_monetary ?? 0).toFixed(2)} • {seg.description || 'Target with promotional incentives'}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedSegment(seg.segment_name);
                        setIsCampaignModalOpen(true);
                      }}
                      className="shrink-0 text-[10px] py-1 px-2.5"
                    >
                      Campaign
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#D9E2EC]">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsCampaignModalOpen(true)}
              className="w-full"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Draft Targeted Segment Promotion
            </Button>
          </div>
        </Card>

        {/* Workspace 2: Inventory Replenishment & Capital Safety */}
        <Card className="p-5 border-[#D9E2EC] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#4779A8]" />
                <h3 className="text-sm font-bold text-[#172B45]">
                  Inventory Safety & Forecast Replenishment
                </h3>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                className="text-xs font-semibold text-[#4779A8] hover:text-[#1E3A5F]"
              >
                Inventory Assistant →
              </button>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Stockout prevention guarantees consistent order fulfillment. The table below lists items approaching or beneath empirical reorder points:
            </p>

            {products.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#D9E2EC] text-xs text-[#64748B] space-y-2">
                <p className="font-semibold text-[#172B45]">No Catalog Products Registered</p>
                <p className="text-[11px]">
                  Register your master product inventory to unlock deterministic reorder math and Holt-Winters forecasting.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/products')}
                  className="mt-1"
                >
                  Add Catalog Products →
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {products.slice(0, 3).map((p) => {
                  const isLow = p.stockOnHand <= p.reorderThreshold;
                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EC] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#172B45] truncate">{p.name}</p>
                          <Badge
                            variant={isLow ? 'warning' : 'success'}
                            size="sm"
                          >
                            {isLow ? 'Reorder Needed' : 'Healthy Stock'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                          On Hand: <strong>{p.stockOnHand}</strong> • Reorder Point: <strong>{p.reorderThreshold}</strong> • Lead: {p.leadTimeDays}d
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(p);
                          setIsReorderModalOpen(true);
                        }}
                        className="shrink-0 text-[10px] py-1 px-2.5"
                      >
                        Reorder
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#D9E2EC]">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/inventory')}
              className="w-full"
              leftIcon={<TrendingUp className="w-3.5 h-3.5" />}
            >
              Open Daily Demand Forecast Engine
            </Button>
          </div>
        </Card>
      </div>

      {/* Global Modals */}
      <CampaignModal
        isOpen={isCampaignModalOpen}
        defaultSegment={selectedSegment}
        onClose={() => setIsCampaignModalOpen(false)}
        onSuccess={loadData}
      />
      <ReorderModal
        isOpen={isReorderModalOpen}
        product={selectedProduct}
        onClose={() => {
          setIsReorderModalOpen(false);
          setSelectedProduct(null);
        }}
        onSuccess={loadData}
      />
    </div>
  );
};
