import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
import { ReorderModal } from '../components/inventory/ReorderModal';
import { apiClient } from '../services/apiClient';
import type { ProductInventory, ProductForecast } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

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
              AI Inventory Assistant
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Statsmodels Holt-Winters demand forecasting & deterministic ROP replenishment
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
        >
          <Boxes className="w-4 h-4" />
          <span>Catalog</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-sm">Evaluating inventory & demand models...</span>
        </div>
      ) : inventory.length === 0 ? (
        <Card className="text-center py-16 px-6 border-dashed border-2 border-slate-300 bg-white">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Inventory Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1.5">
            Your catalog is currently empty. Add your products and log historical sales to activate time-series forecasting.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => navigate('/products')}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl cursor-pointer shadow-xs"
            >
              Add First Product →
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Product Selector Dropdown */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Selected Item:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl focus:outline-none"
            >
              {inventory.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Stock: {p.stockOnHand} (ROP: {p.reorderThreshold})
                </option>
              ))}
            </select>
          </div>

          {/* AI Recommendation Highlight Card */}
          <div className="bg-emerald-50/90 rounded-3xl p-5 border border-emerald-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  AI Recommendation & ROP Math
                </span>
              </div>
              {forecast && (
                <Badge variant={forecast.status === 'OPTIMAL' ? 'success' : 'neutral'} size="sm">
                  {forecast.method}
                </Badge>
              )}
            </div>

            <p className="text-xs font-semibold text-emerald-900 leading-relaxed">
              {forecast?.rationale || 'Calculating inventory recommendations based on empirical sales cadence...'}
            </p>

            {forecast?.status === 'INSUFFICIENT_DATA' ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Holt-Winters Statistical Prerequisite Notice</p>
                  <p className="mt-0.5">
                    Statsmodels Holt-Winters requires at least 5 distinct sales days (currently {forecast.data_points_used || 0} recorded). Record sales via the Sales Entry page to activate exponential smoothing.
                  </p>
                </div>
              </div>
            ) : (
              <Button
                variant="success"
                size="md"
                onClick={() => {
                  if (currentProduct) openReorderForProduct(currentProduct);
                }}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs py-2.5 rounded-xl shadow-xs"
                leftIcon={<Package className="w-4 h-4" />}
              >
                Create Purchase Order for {currentProduct?.name || 'Selected Item'}
              </Button>
            )}
          </div>

          {/* Demand Forecast Chart Section */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Demand Forecast (Next 30 Days)</h2>
                {forecast && forecast.growth_rate_pct !== 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                    <TrendingUp className="w-3 h-3" />
                    <span>{forecast.growth_rate_pct > 0 ? `+${forecast.growth_rate_pct}%` : `${forecast.growth_rate_pct}%`}</span>
                  </div>
                )}
              </div>

              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Daily Horizon
              </span>
            </div>

            {isLoadingForecast ? (
              <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-600" />
                Forecasting demand trajectory...
              </div>
            ) : !forecast || forecast.points.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4 text-center">
                <TrendingUp className="w-8 h-8 text-slate-300 mb-1" />
                <p className="font-semibold text-slate-700">No Sales Time-Series Available</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Log daily sales on the Sales page to generate real statistical projection curves.
                </p>
                <button
                  onClick={() => navigate('/sales')}
                  className="mt-2 text-blue-600 font-bold hover:underline"
                >
                  Log Sales Data →
                </button>
              </div>
            ) : (
              <div className="h-44 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={forecast.points}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10 }}
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
                    <Line
                      type="monotone"
                      dataKey="projected_units"
                      stroke="#0070e0"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#0070e0' }}
                      name="Predicted Units"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0070e0]" />
                <span className="font-semibold text-blue-700">
                  Model: {forecast?.method || 'Statistical Time-Series'}
                </span>
              </div>
              <span>Data Points: {forecast?.data_points_used || 0}</span>
            </div>
          </div>

          {/* Inventory Status List */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Catalog Inventory Status</h2>
              <span className="text-xs font-semibold text-slate-400">
                {inventory.length} items
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectProduct(item.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    item.id === selectedProductId
                      ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
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
                              : item.status === 'OUT_OF_STOCK'
                              ? 'bg-red-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span className="text-[11px] font-medium text-slate-500">
                          {item.stockOnHand} on hand • ROP: {item.reorderThreshold}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openReorderForProduct(item);
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 rounded-lg"
                  >
                    Reorder
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Reorder Confirmation Modal */}
      <ReorderModal
        isOpen={isReorderModalOpen}
        product={modalProduct}
        onClose={() => setIsReorderModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
