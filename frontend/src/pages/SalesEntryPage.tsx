import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type {
  ProductInventory,
  DailySale,
  CsvPreviewResponse,
  ImportSummaryResponse,
  DataImportJob,
} from '../types';
import {
  TrendingUp,
  Plus,
  Upload,
  Package,
  Loader2,
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  History,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';

export const SalesEntryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'history' | 'sales'>('manual');
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [sales, setSales] = useState<DailySale[]>([]);
  const [importHistory, setImportHistory] = useState<DataImportJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Manual Sale Form state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0.00');
  const [totalAmount, setTotalAmount] = useState('0.00');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [txStatus, setTxStatus] = useState('COMPLETED');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [deductInventory, setDeductInventory] = useState(true);
  const [notes, setNotes] = useState('');

  // CSV Import state
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewResult, setPreviewResult] = useState<CsvPreviewResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummaryResponse | null>(null);
  const [preserveInventory, setPreserveInventory] = useState(true); // Default true for historical imports
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prods, salesData, historyData] = await Promise.all([
        apiClient.getProducts(),
        apiClient.getSales({ limit: 50 }),
        apiClient.getImportHistory(),
      ]);
      setProducts(prods);
      setSales(salesData);
      setImportHistory(historyData);

      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
        setUnitPrice(prods[0].unitPrice.toFixed(2));
        setTotalAmount(prods[0].unitPrice.toFixed(2));
      }
    } catch (err) {
      console.error('Failed to load sales acquisition data:', err);
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
      const p = prod.unitPrice;
      const q = parseInt(quantity, 10) || 1;
      setUnitPrice(p.toFixed(2));
      setTotalAmount((p * q).toFixed(2));
    }
  };

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    const q = parseInt(val, 10) || 0;
    const p = parseFloat(unitPrice) || 0;
    setTotalAmount((p * q).toFixed(2));
  };

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const p = parseFloat(val) || 0;
    const q = parseInt(quantity, 10) || 0;
    setTotalAmount((p * q).toFixed(2));
  };

  const handleRecordManualSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setFormError('Quantity must be greater than zero.');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (prod && deductInventory && txStatus === 'COMPLETED' && prod.stockOnHand < qty) {
      setFormError(
        `Insufficient stock for '${prod.name}'. In stock: ${prod.stockOnHand}, requested: ${qty}. Uncheck 'Deduct current inventory' if this is a historical sale.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.recordManualSale({
        product_id: selectedProductId || undefined,
        quantity: qty,
        unit_price: parseFloat(unitPrice),
        total_amount: parseFloat(totalAmount),
        transaction_date: saleDate ? new Date(saleDate).toISOString() : undefined,
        payment_method: paymentMethod,
        transaction_status: txStatus,
        customer_email: customerEmail.trim() || undefined,
        customer_name: customerName.trim() || undefined,
        customer_city: customerCity.trim() || undefined,
        deduct_inventory: deductInventory,
        notes: notes.trim() || undefined,
      });

      setFormSuccess('Sale transaction successfully recorded into unified ledger.');
      // Reset inputs
      setCustomerEmail('');
      setCustomerName('');
      setCustomerCity('');
      setNotes('');
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record sales event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const template = await apiClient.getCsvTemplate();
      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sales_import_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setFormError('Failed to download CSV template.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      handlePreviewCsv(content);
    };
    reader.readAsText(file);
  };

  const handlePreviewCsv = async (contentToPreview?: string) => {
    const raw = contentToPreview || csvContent;
    if (!raw.trim()) {
      setFormError('Please select or paste CSV data to preview.');
      return;
    }
    setIsPreviewing(true);
    setFormError(null);
    setImportSummary(null);
    try {
      const preview = await apiClient.previewSalesCsv(raw);
      setPreviewResult(preview);
    } catch (err: any) {
      setFormError(err.message || 'Failed to parse CSV preview.');
      setPreviewResult(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!csvContent.trim()) {
      setFormError('No CSV content provided for import.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      // Historical imports: preserve current inventory by passing deductInventory=false
      const summary = await apiClient.importSalesCsv(csvContent, !preserveInventory, skipDuplicates);
      setImportSummary(summary);
      setFormSuccess(
        `Import completed! ${summary.imported_records} records ingested, ${summary.skipped_duplicates} duplicates skipped.`
      );
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'CSV import failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-5 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
              Unified Sales & Data Sources
            </h1>
            <Badge variant="navy" size="sm">
              {sales.length} Sales Records
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Single multi-tenant transaction architecture ingesting PayPal, manual sales entry, and batch CSV imports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            leftIcon={<Download className="w-3.5 h-3.5 text-[#4779A8]" />}
          >
            Download CSV Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-[#D9E2EC]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Catalog Products
          </span>
          <div className="text-lg font-bold text-[#172B45] font-numeric mt-0.5">
            {products.length} Products
          </div>
        </Card>
        <Card className="p-3 border-[#D9E2EC]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Daily Sales Entries
          </span>
          <div className="text-lg font-bold text-[#1E3A5F] font-numeric mt-0.5">
            {sales.length} Days Recorded
          </div>
        </Card>
        <Card className="p-3 border-[#D9E2EC]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            CSV Import Batches
          </span>
          <div className="text-lg font-bold text-[#172B45] font-numeric mt-0.5">
            {importHistory.length} Batches Processed
          </div>
        </Card>
        <Card className="p-3 border-[#D9E2EC]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            ML Forecast Pipeline
          </span>
          <div className="text-xs font-semibold text-[#16A085] mt-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {sales.length >= 5 ? 'Active (Holt-Winters)' : 'Requires ≥ 5 Sales Days'}
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#D9E2EC] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'manual'
              ? 'border-[#1E3A5F] text-[#1E3A5F] font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#172B45]'
          }`}
        >
          <Plus className="w-4 h-4" />
          Manual Sales Entry
        </button>
        <button
          onClick={() => setActiveTab('csv')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'csv'
              ? 'border-[#1E3A5F] text-[#1E3A5F] font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#172B45]'
          }`}
        >
          <Upload className="w-4 h-4" />
          CSV Historical Import
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-[#1E3A5F] text-[#1E3A5F] font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#172B45]'
          }`}
        >
          <History className="w-4 h-4" />
          Import & Sync History ({importHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sales'
              ? 'border-[#1E3A5F] text-[#1E3A5F] font-bold'
              : 'border-transparent text-[#64748B] hover:text-[#172B45]'
          }`}
        >
          <Layers className="w-4 h-4" />
          Daily Sales Demand Telemetry ({sales.length})
        </button>
      </div>

      {/* Feedback Alerts */}
      {formError && (
        <div className="p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded-lg text-xs text-[#9B1C1C] flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0 text-[#E02424]" />
          <span>{formError}</span>
        </div>
      )}
      {formSuccess && (
        <div className="p-3 bg-[#F3FAF7] border border-[#BCF0DA] rounded-lg text-xs text-[#03543F] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0E9F6E]" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* TAB 1: MANUAL SALES ENTRY */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-5 border-[#D9E2EC] bg-white">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#172B45] mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4779A8]" />
                Record Transaction Event
              </h2>

              {products.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No Products Cataloged"
                  description="Register products in your catalog first to associate line items and manage inventory."
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
              ) : (
                <form onSubmit={handleRecordManualSale} className="space-y-4">
                  {/* Product & Quantity */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-[#334155]">Product Line Item *</label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => handleProductChange(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-3 py-2 text-xs text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                        required
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name} (${p.unitPrice.toFixed(2)} | Stock: {p.stockOnHand})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#334155]">Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-3 py-2 text-xs text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                        required
                      />
                    </div>
                  </div>

                  {/* Pricing & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#334155]">Unit Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => handleUnitPriceChange(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-3 py-2 text-xs text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#334155]">Total Amount ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-3 py-2 text-xs font-bold text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#334155]">Transaction Date *</label>
                      <input
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-3 py-2 text-xs text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                        required
                      />
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="pt-2 border-t border-[#F1F5F9]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      Customer Attribution (Optional)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#334155]">Customer Email</label>
                        <input
                          type="email"
                          placeholder="shopper@domain.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-3 py-2 text-xs text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#334155]">Full Name</label>
                        <input
                          type="text"
                          placeholder="Customer full name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-3 py-2 text-xs text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#334155]">City</label>
                        <input
                          type="text"
                          placeholder="e.g. San Francisco"
                          value={customerCity}
                          onChange={(e) => setCustomerCity(e.target.value)}
                          className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-3 py-2 text-xs text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F1F5F9]">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#334155]">Payment Channel</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-3 py-2 text-xs text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                      >
                        <option value="CASH">In-Store Cash (POS)</option>
                        <option value="CREDIT_CARD">Credit / Debit Card</option>
                        <option value="BANK_TRANSFER">Direct Bank Transfer (ACH)</option>
                        <option value="PAYPAL_DIRECT">PayPal Direct Invoicing</option>
                        <option value="OTHER">Other Channel</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#334155]">Transaction Status</label>
                      <select
                        value={txStatus}
                        onChange={(e) => setTxStatus(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md px-3 py-2 text-xs text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                      >
                        <option value="COMPLETED">Completed (Deposited)</option>
                        <option value="PENDING">Pending Settlement</option>
                      </select>
                    </div>
                  </div>

                  {/* Inventory Deduction Checkbox */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="deduct_stock_cb"
                      checked={deductInventory}
                      onChange={(e) => setDeductInventory(e.target.checked)}
                      className="rounded border-[#D9E2EC] text-[#1E3A5F] focus:ring-[#1E3A5F]"
                    />
                    <label htmlFor="deduct_stock_cb" className="text-xs text-[#334155] cursor-pointer">
                      <strong>Deduct stock from current inventory</strong> (recommended for real-time sales)
                    </label>
                  </div>

                  <div className="pt-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={isSubmitting}
                      className="w-full justify-center"
                      leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    >
                      {isSubmitting ? 'Recording Transaction...' : 'Commit Sale to Unified Ledger'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>

          {/* Side Info & Stock Context */}
          <div className="space-y-4">
            <Card className="p-4 border-[#D9E2EC] bg-[#F8FAFC]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] mb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#4779A8]" />
                Stock & Pricing Context
              </h3>
              {selectedProduct ? (
                <div className="space-y-2 text-xs text-[#334155]">
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">SKU</span>
                    <span className="font-mono font-bold text-[#172B45]">{selectedProduct.sku}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Current Physical Stock</span>
                    <span
                      className={`font-numeric font-bold ${
                        selectedProduct.stockOnHand <= selectedProduct.safetyStock
                          ? 'text-[#C45B61]'
                          : 'text-[#16A085]'
                      }`}
                    >
                      {selectedProduct.stockOnHand} Units
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Safety Stock Threshold</span>
                    <span className="font-numeric">{selectedProduct.safetyStock} Units</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Supplier Unit Cost</span>
                    <span className="font-numeric">${selectedProduct.unitCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#64748B]">Retail Selling Price</span>
                    <span className="font-numeric font-bold text-[#172B45]">
                      ${selectedProduct.unitPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#64748B]">Select a product to view stock details.</p>
              )}
            </Card>

            <Card className="p-4 border-[#D9E2EC] bg-[#F8FAFC]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#4779A8]" />
                Automatic ML Synchrony
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Transactions recorded here automatically update the <strong>DailySale</strong> aggregation
                table, immediately feeding both the <strong>Holt-Winters</strong> demand forecast and RFM
                customer segmentation models without manual retraining.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: CSV HISTORICAL IMPORT */}
      {activeTab === 'csv' && (
        <div className="space-y-6">
          <Card className="p-5 border-[#D9E2EC] bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F1F5F9] gap-2 mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#172B45] flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#4779A8]" />
                  Batch Sales & Historical Import
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Import sales history safely. Automatic duplicate detection and memory-safe streaming processing.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download CSV Template
              </Button>
            </div>

            {/* Upload Area */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-[#64748B] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E8EEF5] file:text-[#1E3A5F] hover:file:bg-[#DCEAF5]"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePreviewCsv()}
                  disabled={!csvContent.trim() || isPreviewing}
                  leftIcon={isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                >
                  {isPreviewing ? 'Validating...' : 'Preview & Validate'}
                </Button>
              </div>
              {fileName && (
                <p className="text-[11px] text-[#4779A8] font-mono">Selected: {fileName}</p>
              )}

              {importSummary && (
                <div className="p-4 bg-[#F3FAF7] border border-[#BCF0DA] rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0E9F6E]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import Status: {importSummary.status} (Job ID: {importSummary.job_id.slice(0, 8)})</span>
                  </div>
                  <p className="text-xs text-[#03543F]">{importSummary.message}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#334155] block mb-1">
                  Or Paste Raw CSV Data:
                </label>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="date,sku,product_name,quantity,unit_price,total_amount,currency,customer_email,customer_name,payment_method,status,external_id"
                  rows={6}
                  className="w-full bg-[#F8FAFC] border border-[#D9E2EC] rounded-md p-3 text-xs font-mono text-[#172B45] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
                />
              </div>

              {/* Import Configuration Controls */}
              <div className="p-3 bg-[#F8FAFC] border border-[#D9E2EC] rounded-md flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#172B45] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preserveInventory}
                      onChange={(e) => setPreserveInventory(e.target.checked)}
                      className="rounded text-[#1E3A5F]"
                    />
                    <span>Preserve Current Inventory Stock (Historical Import Mode)</span>
                  </label>
                  <p className="text-[11px] text-[#64748B] ml-5">
                    Recommended. Historical records will be logged for reporting without reducing present-day stock on hand.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#172B45] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded text-[#1E3A5F]"
                    />
                    <span>Skip Existing External IDs</span>
                  </label>
                </div>
              </div>

              {/* Preview Results Display */}
              {previewResult && (
                <div className="space-y-4 pt-3 border-t border-[#D9E2EC]">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 bg-white border border-[#D9E2EC] rounded-lg">
                      <span className="text-[10px] font-bold text-[#64748B] uppercase">Total Rows</span>
                      <div className="text-base font-bold text-[#172B45] font-numeric">
                        {previewResult.total_rows}
                      </div>
                    </div>
                    <div className="p-2.5 bg-[#F3FAF7] border border-[#BCF0DA] rounded-lg">
                      <span className="text-[10px] font-bold text-[#03543F] uppercase">Valid Records</span>
                      <div className="text-base font-bold text-[#0E9F6E] font-numeric">
                        {previewResult.valid_rows_count}
                      </div>
                    </div>
                    <div className="p-2.5 bg-[#FEF08A]/30 border border-[#FDE047] rounded-lg">
                      <span className="text-[10px] font-bold text-[#854D0E] uppercase">Duplicates Detected</span>
                      <div className="text-base font-bold text-[#CA8A04] font-numeric">
                        {previewResult.duplicate_count}
                      </div>
                    </div>
                    <div className="p-2.5 bg-[#FDF2F2] border border-[#F8B4B4] rounded-lg">
                      <span className="text-[10px] font-bold text-[#9B1C1C] uppercase">Invalid Rows</span>
                      <div className="text-base font-bold text-[#E02424] font-numeric">
                        {previewResult.invalid_rows_count}
                      </div>
                    </div>
                  </div>

                  {/* Invalid Rows Reporting */}
                  {previewResult.errors.length > 0 && (
                    <div className="p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded-lg space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#9B1C1C]">
                        <AlertTriangle className="w-4 h-4 text-[#E02424]" />
                        <span>Validation Errors Detected ({previewResult.errors.length}):</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[11px] text-[#771D1D] font-mono">
                        {previewResult.errors.map((err, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="font-bold">Row {err.row_number}:</span>
                            <span>[{err.field}] {err.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Preview Table */}
                  <div className="overflow-x-auto rounded-lg border border-[#D9E2EC]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-[#D9E2EC] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Item Name</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2">Customer</th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] font-numeric">
                        {previewResult.preview_rows.map((r) => (
                          <tr key={r.row_number} className="hover:bg-[#F8FAFC]">
                            <td className="px-3 py-2 font-mono text-[#64748B]">{r.row_number}</td>
                            <td className="px-3 py-2">{r.date}</td>
                            <td className="px-3 py-2 font-mono font-bold text-[#172B45]">{r.sku || '—'}</td>
                            <td className="px-3 py-2 text-[#334155]">{r.product_name || 'Line Item'}</td>
                            <td className="px-3 py-2 text-right">{r.quantity}</td>
                            <td className="px-3 py-2 text-right font-bold text-[#172B45]">
                              ${r.total_amount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-[#64748B] truncate max-w-[120px]">
                              {r.customer_email || '—'}
                            </td>
                            <td className="px-3 py-2 text-center font-sans">
                              {r.validation_status === 'VALID' ? (
                                <Badge variant="success" size="sm">Valid</Badge>
                              ) : r.validation_status === 'DUPLICATE' ? (
                                <Badge variant="warning" size="sm">Duplicate</Badge>
                              ) : (
                                <Badge variant="danger" size="sm">Invalid</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Commit Button */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleExecuteImport}
                      disabled={isSubmitting || previewResult.valid_rows_count === 0}
                      leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    >
                      {isSubmitting ? 'Ingesting Records...' : `Commit ${previewResult.valid_rows_count} Valid Records`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: IMPORT & SYNC HISTORY */}
      {activeTab === 'history' && (
        <Card className="p-5 border-[#D9E2EC] bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#172B45] flex items-center gap-2">
              <History className="w-4 h-4 text-[#4779A8]" />
              Historical Acquisition Batches
            </h2>
            <Button variant="outline" size="sm" onClick={fetchData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
          </div>

          {importHistory.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Import Batches Logged"
              description="Historical CSV imports and scheduled PayPal synchronizations will be tracked here with comprehensive audit telemetry."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#D9E2EC]">
              <table className="w-full text-left text-xs font-numeric">
                <thead className="bg-[#F8FAFC] border-b border-[#D9E2EC] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  <tr>
                    <th className="px-4 py-3 font-sans">Date & Time</th>
                    <th className="px-4 py-3 font-sans">Source Type</th>
                    <th className="px-4 py-3 font-sans">File / Target</th>
                    <th className="px-4 py-3 text-right">Total Rows</th>
                    <th className="px-4 py-3 text-right">Imported</th>
                    <th className="px-4 py-3 text-right">Duplicates</th>
                    <th className="px-4 py-3 text-right">Failed</th>
                    <th className="px-4 py-3 font-sans text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {importHistory.map((job) => (
                    <tr key={job.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 font-mono text-[#64748B]">
                        {new Date(job.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <Badge variant="navy" size="sm">
                          {job.source_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-sans text-[#172B45] font-medium">
                        {job.filename || 'Direct Batch'}
                      </td>
                      <td className="px-4 py-3 text-right">{job.total_rows}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#16A085]">
                        {job.imported_records}
                      </td>
                      <td className="px-4 py-3 text-right text-[#CA8A04]">
                        {job.skipped_duplicates}
                      </td>
                      <td className="px-4 py-3 text-right text-[#C45B61]">
                        {job.failed_records}
                      </td>
                      <td className="px-4 py-3 text-center font-sans">
                        {job.status === 'COMPLETED' ? (
                          <Badge variant="success" size="sm">Completed</Badge>
                        ) : job.status === 'PARTIAL' ? (
                          <Badge variant="warning" size="sm">Partial</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">{job.status}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: DAILY SALES DEMAND TELEMETRY */}
      {activeTab === 'sales' && (
        <Card className="p-5 border-[#D9E2EC] bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#172B45] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#4779A8]" />
                Daily Demand Sales Aggregation
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Aggregated daily units and revenue feeding ML demand forecasting.
              </p>
            </div>
          </div>

          {sales.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No Sales Activity Recorded"
              description="Record daily sales manually or import a batch CSV to populate demand telemetry."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#D9E2EC]">
              <table className="w-full text-left text-xs font-numeric">
                <thead className="bg-[#F8FAFC] border-b border-[#D9E2EC] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  <tr>
                    <th className="px-4 py-3 font-sans">Sales Date</th>
                    <th className="px-4 py-3 font-sans">Product Name</th>
                    <th className="px-4 py-3 font-sans">SKU</th>
                    <th className="px-4 py-3 text-right">Units Sold</th>
                    <th className="px-4 py-3 text-right">Gross Revenue</th>
                    <th className="px-4 py-3 font-sans text-center">Channel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 font-mono font-medium text-[#172B45]">{s.date}</td>
                      <td className="px-4 py-3 font-sans text-[#334155]">{s.product_name || 'Item'}</td>
                      <td className="px-4 py-3 font-mono text-[#64748B]">{s.sku || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#172B45]">{s.units_sold}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#16A085]">
                        ${s.revenue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center font-sans">
                        <Badge variant="navy" size="sm">
                          {s.channel || 'PAYPAL_CHECKOUT'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
