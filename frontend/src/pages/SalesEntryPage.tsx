import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { ProductInventory, DailySale } from '../types';
import { 
  TrendingUp, 
  Plus, 
  Upload, 
  Calendar, 
  Package, 
  Loader2, 
  Sparkles,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const SalesEntryPage: React.FC = () => {
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [sales, setSales] = useState<DailySale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [selectedProductId, setSelectedProductId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [unitsSold, setUnitsSold] = useState('5');
  const [revenue, setRevenue] = useState('449.95');
  const [channel, setChannel] = useState('PAYPAL_CHECKOUT');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prods, salesData] = await Promise.all([
        apiClient.getProducts(),
        apiClient.getSales({ limit: 50 }),
      ]);
      setProducts(prods);
      setSales(salesData);
      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
      }
    } catch (err) {
      console.error('Failed to load sales or products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      const units = parseInt(unitsSold, 10) || 1;
      setRevenue((prod.unitPrice * units).toFixed(2));
    }
  };

  const handleUnitsChange = (val: string) => {
    setUnitsSold(val);
    const units = parseInt(val, 10) || 0;
    const prod = products.find((p) => p.id === selectedProductId);
    if (prod) {
      setRevenue((prod.unitPrice * units).toFixed(2));
    }
  };

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setFormError('Please select a product.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient.recordSale({
        product_id: selectedProductId,
        units_sold: parseInt(unitsSold, 10),
        revenue: parseFloat(revenue),
        date: saleDate,
        channel,
      });
      setIsRecordModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record sales event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvContent.trim()) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiClient.importSalesCsv(csvContent);
      setIsCsvModalOpen(false);
      setCsvContent('');
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to import CSV.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate a sample 7-day CSV for the first product if exists
  const sampleSku = products[0]?.sku || 'WH-1000';
  const sampleSalesCsv = `sku,date,units_sold,revenue,channel
${sampleSku},2026-10-24,14,1259.86,PAYPAL_CHECKOUT
${sampleSku},2026-10-25,18,1619.82,PAYPAL_CHECKOUT
${sampleSku},2026-10-26,22,1979.78,PAYPAL_CHECKOUT
${sampleSku},2026-10-27,15,1349.85,PAYPAL_CHECKOUT
${sampleSku},2026-10-28,29,2609.71,PAYPAL_CHECKOUT
${sampleSku},2026-10-29,32,2879.68,PAYPAL_CHECKOUT
${sampleSku},2026-10-30,25,2249.75,PAYPAL_CHECKOUT`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-blue-600" />
            Sales & Demand History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Log genuine day-by-day sales data to fuel Statsmodels Holt-Winters and Moving-Average ML forecasting pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCsvContent(sampleSalesCsv);
              setIsCsvModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Import Sales CSV</span>
          </button>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            disabled={products.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Record Daily Sale</span>
          </button>
        </div>
      </div>

      {/* ML Threshold Status Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/80 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Statistical Machine Learning Criteria
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              Holt-Winters Exponential Smoothing activates automatically once a product reaches <strong>&ge; 5 distinct sales days</strong>. Fewer sales days will gracefully return a deterministic Moving Average or an explicit <code>INSUFFICIENT_DATA</code> status in accordance with our transparent data provenance policy.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Table or Empty State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-sm">Loading sales history...</span>
        </div>
      ) : products.length === 0 ? (
        <Card className="text-center py-16 px-6 border-dashed border-2 border-slate-300 bg-white">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Products in Catalog Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1.5">
            Before recording sales, you must register at least one product in your inventory catalog.
          </p>
          <a
            href="/products"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl shadow-xs"
          >
            Go to Products Page →
          </a>
        </Card>
      ) : sales.length === 0 ? (
        <Card className="text-center py-16 px-6 border-dashed border-2 border-slate-300 bg-white">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Sales Recorded</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1.5">
            Record daily sales manually or import a batch CSV to immediately trigger the demand forecasting pipeline and replenish stock alerts.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => {
                setCsvContent(sampleSalesCsv);
                setIsCsvModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Upload 7-Day Sample Sales
            </button>
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl cursor-pointer shadow-xs"
            >
              Record First Sale
            </button>
          </div>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Product ID / SKU</th>
                  <th className="px-5 py-3.5">Units Sold</th>
                  <th className="px-5 py-3.5">Revenue</th>
                  <th className="px-5 py-3.5">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {s.date}
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-mono text-xs">
                      {s.product_name || s.product_id}
                    </td>
                    <td className="px-5 py-4 font-black text-slate-900">
                      {s.units_sold} <span className="text-xs font-normal text-slate-400">units</span>
                    </td>
                    <td className="px-5 py-4 font-bold text-emerald-700">
                      ${s.revenue.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="neutral" size="sm">
                        {s.channel || 'PAYPAL_CHECKOUT'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Sale Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Record Daily Sales Activity</h3>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-800 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordSale} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — ${p.unitPrice}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sales Date *</label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Units Sold *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={unitsSold}
                    onChange={(e) => handleUnitsChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total Revenue ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
                >
                  <option value="PAYPAL_CHECKOUT">PayPal Checkout</option>
                  <option value="ONLINE_STORE">Online Web Store</option>
                  <option value="IN_STORE">In-Person POS</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Recording...' : 'Record Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Import Daily Sales (CSV)</h3>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Paste standard CSV rows with columns: <code>sku,date,units_sold,revenue,channel</code>
            </p>

            <textarea
              rows={8}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="mt-3 w-full p-3 font-mono text-xs border rounded-xl bg-slate-50 text-slate-800"
            />

            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleImportCsv}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl shadow-xs"
              >
                {isSubmitting ? 'Importing...' : 'Import Sales'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
