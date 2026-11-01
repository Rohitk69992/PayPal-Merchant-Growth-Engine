import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
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
  AlertTriangle,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import type { AnalyticsOverview, Transaction, ProductInventory } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ReorderModal } from '../components/inventory/ReorderModal';

interface HomeDashboardProps {
  onOpenAiDrawer: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onOpenAiDrawer }) => {
  const navigate = useNavigate();
  const outlet = useOutletContext<{ onOpenAiDrawer?: () => void }>();
  const handleOpenAi = outlet?.onOpenAiDrawer ? outlet.onOpenAiDrawer : onOpenAiDrawer;
  const { user, currentMerchant } = useAuth();

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<ProductInventory[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Quick reorder modal
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductInventory | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [overviewData, txData, prodsData] = await Promise.all([
        apiClient.getOverview(),
        apiClient.getTransactions(),
        apiClient.getProducts(),
      ]);
      setOverview(overviewData);
      setRecentTransactions(txData.items.slice(0, 5));
      setLowStockProducts(
        prodsData.filter((p) => p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK')
      );
    } catch (err) {
      console.error('Failed to load merchant overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentMerchant]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4779A8] mb-3" />
        <span className="text-xs font-semibold">Calibrating merchant financial telemetry...</span>
      </div>
    );
  }

  const currencySymbol =
    currentMerchant?.currency === 'EUR' ? '€' : currentMerchant?.currency === 'GBP' ? '£' : '$';
  const totalRevenue = overview?.total_balance ?? 0;
  const totalTx = overview?.transaction_count ?? 0;
  const totalCust = overview?.customer_count ?? 0;
  const lowStock = overview?.low_stock_count ?? 0;

  return (
    <div className="space-y-5 pb-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#4779A8] tracking-tight">
            <span>{currentMerchant?.business_name || 'Merchant Tenant'}</span>
            <span className="w-1 h-1 rounded-full bg-[#94A3B8]" />
            <span className="text-[#64748B] font-mono">{currentMerchant?.currency || 'USD'} Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B45] tracking-tight mt-0.5">
            Good day, {user?.full_name || 'Partner'}
          </h1>
          <p className="text-xs text-[#64748B]">
            Financial operations, demand trajectory and inventory status overview.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/products')}
            leftIcon={<Plus className="w-3.5 h-3.5 text-[#4779A8]" />}
          >
            Add Product
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/sales')}
            leftIcon={<TrendingUp className="w-3.5 h-3.5 text-[#16A085]" />}
          >
            Log Sale
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAi}
            leftIcon={<Bot className="w-3.5 h-3.5" />}
          >
            Ask Copilot
          </Button>
        </div>
      </div>

      {/* 4-Column Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Processed Balance */}
        <Card className="p-4 border-[#D9E2EC] relative">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>Processed Balance</span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 hover:text-[#172B45] text-[#94A3B8] transition-colors cursor-pointer"
              aria-label="Toggle balance visibility"
            >
              {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#172B45] font-numeric">
            {showBalance
              ? `${currencySymbol}${totalRevenue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : '••••••••'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {totalTx > 0 ? (
              <span className="text-[#16A085] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {totalTx} verified captures
              </span>
            ) : (
              <span className="text-[#64748B]">Clean ledger initialized</span>
            )}
          </div>
        </Card>

        {/* Total Transactions */}
        <Card
          onClick={() => navigate('/transactions')}
          hoverable
          className="p-4 border-[#D9E2EC]"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>Settled Transactions</span>
            <div className="w-6 h-6 rounded-md bg-[#E8EEF5] text-[#1E3A5F] flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#172B45] font-numeric">
            {totalTx}
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] flex items-center justify-between">
            <span>{totalTx > 0 ? 'PayPal capture feed' : 'No settlements yet'}</span>
            <span className="text-[#4779A8] font-semibold">Ledger →</span>
          </div>
        </Card>

        {/* Unique Customers */}
        <Card
          onClick={() => navigate('/marketing')}
          hoverable
          className="p-4 border-[#D9E2EC]"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>Customer Profiles</span>
            <div className="w-6 h-6 rounded-md bg-[#E8EEF5] text-[#1E3A5F] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#172B45] font-numeric">
            {totalCust}
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] flex items-center justify-between">
            <span>{totalCust >= 4 ? 'RFM clustering active' : 'Need ≥4 for RFM'}</span>
            <span className="text-[#4779A8] font-semibold">Cohorts →</span>
          </div>
        </Card>

        {/* Low Stock Alerts */}
        <Card
          onClick={() => navigate('/inventory')}
          hoverable
          className="p-4 border-[#D9E2EC]"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>Stock Replenishment</span>
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                lowStock > 0
                  ? 'bg-[#FEF9E7] text-[#D69E36]'
                  : 'bg-[#E8F6F3] text-[#16A085]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#172B45] font-numeric">
            {lowStock}
          </div>
          <div className="mt-2 text-[11px] text-[#64748B] flex items-center justify-between">
            <span>{lowStock > 0 ? 'Below safety threshold' : 'Inventory optimal'}</span>
            <span className="text-[#4779A8] font-semibold">Forecasts →</span>
          </div>
        </Card>
      </div>

      {/* Getting Started Guide when Clean Slate */}
      {totalTx === 0 && (
        <Card className="p-5 bg-white border-[#CBD5E1]">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[#DCEAF5] text-[#1E3A5F] flex items-center justify-center shrink-0 border border-[#CBD5E1]">
              <Sparkles className="w-5 h-5 text-[#4779A8]" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
                  Clean-Slate Platform Quick Setup
                </h4>
                <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                  Your tenant operates with genuine data provenance. Execute these three setup workflows to populate your real-time analytics:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/products')}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EC] hover:bg-[#E8EEF5] hover:border-[#CBD5E1] transition-all text-left cursor-pointer"
                >
                  <Boxes className="w-4 h-4 text-[#4779A8] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#172B45]">1. Add Products</div>
                    <div className="text-[11px] text-[#64748B]">Set SKU, price & safety stock</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/sales')}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EC] hover:bg-[#E8EEF5] hover:border-[#CBD5E1] transition-all text-left cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-[#16A085] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#172B45]">2. Log Daily Sales</div>
                    <div className="text-[11px] text-[#64748B]">Calibrate Holt-Winters ML</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/paypal')}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EC] hover:bg-[#E8EEF5] hover:border-[#CBD5E1] transition-all text-left cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-[#1E3A5F] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#172B45]">3. Simulate Payment</div>
                    <div className="text-[11px] text-[#64748B]">Live PayPal capture feed</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid: 8 cols (Growth Engine + Recent Ledger) + 4 cols (Inventory alerts & Copilot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Growth Engine Banner - Refined Enterprise Fintech Card */}
          <Card className="p-5 bg-white border-[#D9E2EC]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#DCEAF5] text-[#1E3A5F] text-[10px] font-bold uppercase tracking-wider border border-[#CBD5E1]">
                  <Sparkles className="w-3 h-3 text-[#4779A8]" />
                  <span>Merchant Growth Engine</span>
                </div>
                <h3 className="text-base font-bold text-[#172B45] tracking-tight">
                  Holt-Winters Forecasting & RFM Segmentation Active
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed max-w-xl">
                  Automated intelligence calibrated on historical settlements: identifying high-value customer clusters, predicting SKU-level demand replenishment dates, and generating targeted marketing suggestions.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <Button
                    variant="navy"
                    size="sm"
                    onClick={() => navigate('/grow')}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View Growth Engine
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/marketing')}
                  >
                    Customer Cohorts
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Transactions Ledger Card */}
          <Card className="p-5 border-[#D9E2EC]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC] mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#172B45] tracking-tight">
                  Recent Verified Settlements
                </h3>
                <p className="text-xs text-[#64748B]">Real-time ledger captures with fee breakdowns</p>
              </div>
              <button
                onClick={() => navigate('/transactions')}
                className="text-xs font-semibold text-[#4779A8] hover:text-[#1E3A5F] flex items-center gap-1"
              >
                <span>Full Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-dashed border-[#D9E2EC]">
                <Receipt className="w-6 h-6 text-[#94A3B8] mx-auto mb-1.5" />
                <p className="font-semibold text-[#172B45]">No Settlements Captured Yet</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Process payments or run the Sandbox Simulator to populate the immutable ledger.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#D9E2EC] overflow-x-auto">
                <table className="w-full text-left text-xs font-numeric">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      <th className="py-2">Reference / Buyer</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Payment Source</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 font-sans">
                          <p className="font-semibold text-[#172B45] truncate max-w-[180px]">
                            {tx.customerName ? `Sale to ${tx.customerName}` : tx.title}
                          </p>
                          {tx.paypalOrderId && (
                            <p className="text-[10px] text-[#94A3B8] font-mono truncate max-w-[180px]">
                              {tx.paypalOrderId}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 text-[#64748B] font-mono text-[11px]">
                          {tx.formattedDate || new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 text-[#64748B] font-sans text-[11px]">
                          {tx.source || 'PayPal'}
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#172B45]">
                          {tx.type === 'RECEIVED' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right">
                          <Badge
                            variant={tx.status === 'COMPLETED' ? 'success' : 'neutral'}
                            size="sm"
                          >
                            {tx.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Inventory Urgent Alerts */}
          <Card className="p-4 border-[#D9E2EC]">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#D9E2EC] mb-2.5">
              <h3 className="text-xs font-bold text-[#172B45] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D69E36]" />
                Inventory Reorders
              </h3>
              <button
                onClick={() => navigate('/inventory')}
                className="text-[11px] font-semibold text-[#4779A8] hover:text-[#1E3A5F]"
              >
                Manage →
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#64748B]">
                <CheckCircle2 className="w-5 h-5 text-[#16A085] mx-auto mb-1.5" />
                <p className="font-semibold text-[#172B45]">Stock Levels Healthy</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  All items are currently above safety thresholds.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#D9E2EC] flex items-center justify-between gap-2"
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-[#172B45] truncate">{p.name}</p>
                      <p className="text-[10px] text-[#64748B] font-mono">
                        Stock: <span className="font-bold text-[#C45B61]">{p.stockOnHand}</span> (ROP: {p.reorderThreshold})
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsReorderOpen(true);
                      }}
                      className="shrink-0 text-[10px] py-1 px-2"
                    >
                      Reorder
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* AI Copilot Quick Assist Card */}
          <Card className="p-4 bg-[#F8FAFC] border-[#D9E2EC]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-[#1E3A5F] text-white flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-[#DCEAF5]" />
              </div>
              <h4 className="text-xs font-bold text-[#172B45]">Growth Copilot Shortcuts</h4>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed mb-3">
              Direct access to statistical modeling queries and inventory dispatch.
            </p>
            <div className="space-y-1.5">
              <button
                onClick={handleOpenAi}
                className="w-full text-left p-2 rounded-lg bg-white border border-[#D9E2EC] hover:bg-[#DCEAF5] hover:border-[#CBD5E1] text-[11px] text-[#172B45] font-medium transition-colors cursor-pointer"
              >
                • Reorder recommendations to avoid stockout
              </button>
              <button
                onClick={handleOpenAi}
                className="w-full text-left p-2 rounded-lg bg-white border border-[#D9E2EC] hover:bg-[#DCEAF5] hover:border-[#CBD5E1] text-[11px] text-[#172B45] font-medium transition-colors cursor-pointer"
              >
                • Identify top-tier RFM customer segments
              </button>
            </div>
          </Card>

          {/* Platform Security & Telemetry Card */}
          <Card className="p-4 border-[#D9E2EC]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
              Platform Telemetry
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Multi-Tenant Isolation</span>
                <span className="text-[#16A085] font-semibold font-mono text-[11px]">Enforced</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Statsmodels Holt-Winters</span>
                <span className="text-[#1E3A5F] font-semibold font-mono text-[11px]">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Scikit-Learn RFM</span>
                <span className="text-[#1E3A5F] font-semibold font-mono text-[11px]">K-Means</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Global Reorder Modal */}
      <ReorderModal
        isOpen={isReorderOpen}
        product={selectedProduct}
        onClose={() => {
          setIsReorderOpen(false);
          setSelectedProduct(null);
        }}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};
