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
  DollarSign,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';

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
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
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
        setRevenue((prods[0].unitPrice * 5).toFixed(2));
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
    <div className="space-y-5 pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
              Sales Entry & Historical Demand
            </h1>
            <Badge variant="navy" size="sm">
              {sales.length} Records
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Log genuine day-by-day sales data to fuel Statsmodels Holt-Winters and Moving-Average ML forecasting pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCsvContent(sampleSalesCsv);
              setIsCsvModalOpen(true);
            }}
            leftIcon={<Upload className="w-3.5 h-3.5 text-[#4779A8]" />}
          >
            Import Sales CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsRecordModalOpen(true)}
            disabled={products.length === 0}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Record Daily Sale
          </Button>
        </div>
      </div>

      {/* ML Threshold Status Banner */}
      <Card className="p-4 bg-[#F8FAFC] border-[#D9E2EC]">
        <div className="flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#4779A8] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
              Statistical Machine Learning Criteria
            </h4>
            <p className="text-xs text-[#334155] leading-relaxed">
              Holt-Winters Exponential Smoothing activates automatically once a product reaches <strong>&ge; 5 distinct sales days</strong>. Fewer sales days will gracefully return a deterministic Moving Average or an explicit <code className="bg-[#E8EEF5] px-1 py-0.5 rounded font-mono text-[10px]">INSUFFICIENT_DATA</code> status in accordance with our transparent data provenance policy.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Table or Empty State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
          <Loader2 className="w-8 h-8 animate-spin text-[#4779A8] mb-2" />
          <span className="text-xs font-semibold">Loading sales records...</span>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Products in Catalog Yet"
          description="Before recording sales, you must register at least one product in your inventory catalog."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => (window.location.href = '/products')}
            >
              Go to Products Catalog →
            </Button>
          }
        />
      ) : sales.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No Sales Activity Recorded"
          description="Log daily item sales manually or upload a batch CSV to immediately trigger the Holt-Winters demand forecasting pipeline."
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCsvContent(sampleSalesCsv);
                  setIsCsvModalOpen(true);
                }}
              >
                Upload Sample 7-Day CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsRecordModalOpen(true)}
              >
                Record First Sale
              </Button>
            </div>
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-[#D9E2EC] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-numeric">
              <thead className="bg-[#F8FAFC] border-b border-[#D9E2EC] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                <tr>
                  <th className="px-4 py-3 font-sans">Date</th>
                  <th className="px-4 py-3 font-sans">Product / SKU</th>
                  <th className="px-4 py-3 text-right">Units Sold</th>
                  <th className="px-4 py-3 text-right">Gross Revenue</th>
                  <th className="px-4 py-3 font-sans text-center">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-[#172B45] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                      {s.date}
                    </td>
                    <td className="px-4 py-3 font-sans font-semibold text-[#172B45]">
                      {s.product_name || s.product_id}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-[#172B45] text-sm">{s.units_sold}</span>
                      <span className="text-[10px] text-[#94A3B8] ml-1 font-sans">units</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#16A085] text-sm">
                      ${s.revenue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center font-sans">
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
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Daily Sales Activity"
        subtitle="Log manual sales transactions to feed time-series models"
        maxWidth="md"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-[#FADBD8] text-[#C45B61] text-xs font-semibold">
            {formError}
          </div>
        )}

        <form onSubmit={handleRecordSale} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
              Select Product *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] bg-white text-[#172B45] focus:outline-none focus:border-[#4779A8]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — ${p.unitPrice.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Sales Date *
              </label>
              <input
                type="date"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] text-[#172B45] focus:outline-none focus:border-[#4779A8]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Units Sold *
              </label>
              <input
                type="number"
                min="1"
                required
                value={unitsSold}
                onChange={(e) => handleUnitsChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] text-[#172B45] focus:outline-none focus:border-[#4779A8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
              Total Revenue ($) *
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                required
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#D9E2EC] text-[#172B45] font-mono focus:outline-none focus:border-[#4779A8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
              Sales Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] bg-white text-[#172B45] focus:outline-none focus:border-[#4779A8]"
            >
              <option value="PAYPAL_CHECKOUT">PayPal Checkout</option>
              <option value="ONLINE_STORE">Online Web Store</option>
              <option value="IN_STORE">In-Person POS</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9E2EC]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRecordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Record Daily Sale
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Import Historical Sales (CSV)"
        subtitle="Batch upload daily unit sales and revenues"
        maxWidth="lg"
      >
        <p className="text-xs text-[#64748B] mb-2">
          Required header order: <code className="font-mono text-[#1E3A5F] bg-[#E8EEF5] px-1.5 py-0.5 rounded">sku,date,units_sold,revenue,channel</code>
        </p>

        <textarea
          rows={7}
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          className="w-full p-3 font-mono text-xs border border-[#D9E2EC] rounded-lg bg-[#F8FAFC] text-[#172B45] focus:outline-none focus:border-[#4779A8]"
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9E2EC] mt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsCsvModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleImportCsv}
            isLoading={isSubmitting}
          >
            Import Sales Records
          </Button>
        </div>
      </Modal>
    </div>
  );
};
