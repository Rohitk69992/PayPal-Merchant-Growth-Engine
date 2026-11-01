import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Package,
  Calendar,
  Info,
  Loader2,
  Boxes,
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
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { ReorderModal } from '../components/inventory/ReorderModal';
import { apiClient } from '../services/apiClient';
import type { ProductInventory, ProductForecast } from '../types';

export const InventoryAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<ProductInventory[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [forecast, setForecast] = useState<ProductForecast | null>(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<ProductInventory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const prods = await apiClient.getProducts();
      setInventory(prods);
      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
        fetchForecast(prods[0].id);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchForecast = async (productId: string) => {
    setIsLoadingForecast(true);
    try {
      const fc = await apiClient.getProductForecast(productId);
      setForecast(fc);
    } catch (err) {
      console.error('Failed to load forecast for product:', err);
    } finally {
      setIsLoadingForecast(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    fetchForecast(prodId);
  };

  const openReorderForProduct = (prod: ProductInventory) => {
    setModalProduct(prod);
    setIsReorderModalOpen(true);
  };

  const currentProduct = inventory.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-5 pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
              AI Inventory Assistant & Demand Forecasting
            </h1>
            <Badge variant="navy" size="sm">
              Holt-Winters ML
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Statistical exponential smoothing, safety stock calibration, and deterministic purchase order replenishment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/products')}
            leftIcon={<Boxes className="w-3.5 h-3.5 text-[#4779A8]" />}
          >
            Catalog Management
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (currentProduct) openReorderForProduct(currentProduct);
            }}
            disabled={!currentProduct}
            leftIcon={<Package className="w-3.5 h-3.5" />}
          >
            Create Purchase Order
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#64748B]">
          <Loader2 className="w-8 h-8 animate-spin text-[#4779A8] mb-2" />
          <span className="text-xs font-semibold">Evaluating inventory thresholds & forecasting models...</span>
        </div>
      ) : inventory.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Products Available in Catalog"
          description="Your inventory is currently empty. Register your products to activate real-time demand curves and replenishment automation."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/products')}
            >
              Add First Product →
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Forecast & Recommendation (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Product Selector Bar */}
            <Card className="p-3 border-[#D9E2EC]">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#172B45] shrink-0">
                  Select Item:
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full text-xs font-bold text-[#172B45] bg-[#F8FAFC] border border-[#D9E2EC] px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#4779A8]"
                >
                  {inventory.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Stock: {p.stockOnHand} (ROP: {p.reorderThreshold})
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            {/* AI Recommendation Card */}
            <Card className="p-4 border-[#D9E2EC] bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#1E3A5F] text-white flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-[#DCEAF5]" />
                  </div>
                  <span className="text-xs font-bold text-[#172B45] uppercase tracking-wider">
                    Model Evaluation & Replenishment Logic
                  </span>
                </div>
                {forecast && (
                  <Badge
                    variant={forecast.status === 'OPTIMAL' ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {forecast.method}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-[#334155] leading-relaxed font-medium">
                {forecast?.rationale || 'Evaluating empirical sales rate and safety stock calculations...'}
              </p>

              {forecast?.status === 'INSUFFICIENT_DATA' ? (
                <div className="p-3 bg-[#FEF9E7] rounded-lg border border-[#FAD7A0] text-[#936B15] text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Holt-Winters Statistical Prerequisite Notice</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      Holt-Winters exponential smoothing requires at least 5 distinct sales days (currently {forecast.data_points_used || 0} recorded). Record sales via the Sales Entry page to activate exponential smoothing.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/sales')}
                      className="mt-2 text-xs"
                    >
                      Log Sales for this Product →
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (currentProduct) openReorderForProduct(currentProduct);
                    }}
                    className="w-full"
                    leftIcon={<Package className="w-4 h-4" />}
                  >
                    Dispatch Purchase Order for {currentProduct?.name}
                  </Button>
                </div>
              )}
            </Card>

            {/* Demand Forecast Chart Card */}
            <Card className="p-5 border-[#D9E2EC] bg-white space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9E2EC]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#172B45]">
                    30-Day Projected Demand Curve
                  </h3>
                  {forecast && forecast.growth_rate_pct !== 0 && (
                    <Badge variant={forecast.growth_rate_pct > 0 ? 'success' : 'neutral'} size="sm">
                      {forecast.growth_rate_pct > 0 ? `+${forecast.growth_rate_pct}%` : `${forecast.growth_rate_pct}%`}
                    </Badge>
                  )}
                </div>

                <span className="text-xs text-[#64748B] flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                  Daily Time Horizon
                </span>
              </div>

              {isLoadingForecast ? (
                <div className="h-48 flex items-center justify-center text-[#64748B] text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#4779A8]" />
                  Generating projection curve...
                </div>
              ) : !forecast || forecast.points.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-xs bg-[#F8FAFC] rounded-lg border border-dashed border-[#D9E2EC] p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-[#94A3B8] mb-1.5" />
                  <p className="font-semibold text-[#172B45]">No Sales Time-Series Available</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Log daily sales on the Sales Entry page to generate empirical projection curves.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/sales')}
                    className="mt-2.5"
                  >
                    Log Sales Records →
                  </Button>
                </div>
              ) : (
                <div className="h-48 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={forecast.points}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EEF5" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={{ stroke: '#D9E2EC' }}
                        tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'monospace' }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={{ stroke: '#D9E2EC' }}
                        tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'monospace' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#D9E2EC',
                          borderRadius: '8px',
                          fontSize: '11px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="projected_units"
                        stroke="#4779A8"
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: '#1E3A5F' }}
                        name="Projected Units"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#D9E2EC] font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4779A8]" />
                  Algorithm: {forecast?.method || 'Statistical Time-Series'}
                </span>
                <span>Verified Historical Points: {forecast?.data_points_used || 0}</span>
              </div>
            </Card>
          </div>

          {/* Right Column: Inventory Table / List (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <Card className="p-4 border-[#D9E2EC]">
              <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC] mb-3">
                <div>
                  <h3 className="text-xs font-bold text-[#172B45] uppercase tracking-wider">
                    Catalog Stock Status
                  </h3>
                  <p className="text-[11px] text-[#64748B]">Real-time safety stock monitoring</p>
                </div>
                <span className="text-xs font-mono font-semibold text-[#64748B]">
                  {inventory.length} SKUs
                </span>
              </div>

              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {inventory.map((item) => {
                  const isSelected = item.id === selectedProductId;
                  const isLow = item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK';
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectProduct(item.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#4779A8] bg-[#DCEAF5]/50 ring-1 ring-[#4779A8]'
                          : 'border-[#D9E2EC] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-[#172B45] truncate">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-[#64748B]">
                            <span>SKU: {item.sku}</span>
                            <span>•</span>
                            <span className={isLow ? 'text-[#C45B61] font-bold' : 'text-[#16A085]'}>
                              Stock: {item.stockOnHand}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#94A3B8] mt-0.5">
                            ROP: {item.reorderThreshold} (SS: {item.safetyStock}) • Lead: {item.leadTimeDays}d
                          </div>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openReorderForProduct(item);
                          }}
                          className="shrink-0 text-[10px] py-1 px-2.5"
                        >
                          Reorder
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Reorder Modal */}
      <ReorderModal
        isOpen={isReorderModalOpen}
        product={modalProduct}
        onClose={() => setIsReorderModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
