import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { ProductInventory } from '../types';
import { 
  Package, 
  Plus, 
  Upload, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Boxes,
  Edit2,
  Trash2
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit product state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductInventory | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnitCost, setEditUnitCost] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editSafetyStock, setEditSafetyStock] = useState('');
  const [editLeadTimeDays, setEditLeadTimeDays] = useState('');
  const [editSupplierName, setEditSupplierName] = useState('');

  // New product form fields
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [unitCost, setUnitCost] = useState('45.00');
  const [unitPrice, setUnitPrice] = useState('89.99');
  const [stockOnHand, setStockOnHand] = useState('50');
  const [reorderThreshold, setReorderThreshold] = useState('15');
  const [safetyStock, setSafetyStock] = useState('10');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [supplierName, setSupplierName] = useState('Prime Supply Co.');

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getProducts({ search: searchQuery });
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient.createProduct({
        sku,
        name,
        category,
        unit_cost: parseFloat(unitCost),
        unit_price: parseFloat(unitPrice),
        stock_on_hand: parseInt(stockOnHand, 10),
        reorder_point: parseInt(reorderThreshold, 10),
        safety_stock: parseInt(safetyStock, 10),
        lead_time_days: parseInt(leadTimeDays, 10),
        supplier_name: supplierName,
      });
      setIsAddModalOpen(false);
      resetForm();
      await fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvContent.trim()) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiClient.importProductsCsv(csvContent);
      setIsCsvModalOpen(false);
      setCsvContent('');
      await fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'CSV import failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (p: ProductInventory) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditUnitCost(p.unitCost.toString());
    setEditUnitPrice(p.unitPrice.toString());
    setEditSafetyStock(p.safetyStock.toString());
    setEditLeadTimeDays(p.leadTimeDays.toString());
    setEditSupplierName(p.supplierName);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient.updateProduct(editingProduct.id, {
        name: editName,
        category: editCategory,
        unit_cost: parseFloat(editUnitCost),
        unit_price: parseFloat(editUnitPrice),
        safety_stock: parseInt(editSafetyStock, 10),
        lead_time_days: parseInt(editLeadTimeDays, 10),
        supplier_name: editSupplierName,
      });
      setIsEditModalOpen(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (p: ProductInventory) => {
    const confirmed = window.confirm(`Archive product "${p.name}" (SKU: ${p.sku})? It will be deactivated from active catalog.`);
    if (!confirmed) return;
    try {
      await apiClient.deleteProduct(p.id);
      await fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to archive product.');
    }
  };

  const resetForm = () => {
    setSku('');
    setName('');
    setCategory('Electronics');
    setUnitCost('45.00');
    setUnitPrice('89.99');
    setStockOnHand('50');
    setReorderThreshold('15');
    setSafetyStock('10');
    setLeadTimeDays('7');
    setSupplierName('Prime Supply Co.');
  };

  const sampleCsv = `sku,name,category,unit_cost,unit_price,stock_on_hand,reorder_point,safety_stock,lead_time_days,supplier_name
WH-1000,Wireless Noise-Canceling Headphones,Electronics,65.00,149.99,40,15,10,7,Acro Sound Labs
SW-400,Fitness Smartwatch Pro,Electronics,45.00,99.99,12,20,10,5,Zenith Tech
BP-50,Waterproof Commuter Backpack,Accessories,25.00,59.99,65,15,8,10,Nomad Gear`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-blue-600" />
            Product Catalog & Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain item master records, reorder thresholds, supplier lead times and current stock levels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCsvContent(sampleCsv);
              setIsCsvModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by SKU, name, or category..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border-none focus:outline-none focus:ring-0 text-slate-800 placeholder-slate-400"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 px-3">
          {products.length} {products.length === 1 ? 'Product' : 'Products'}
        </span>
      </div>

      {/* Main Table or Empty State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-sm">Loading product catalog...</span>
        </div>
      ) : products.length === 0 ? (
        <Card className="text-center py-16 px-6 border-dashed border-2 border-slate-300 bg-white">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Products in Catalog</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1.5">
            Your inventory is completely clean. Add your first item or upload your catalog CSV to enable deterministic Reorder Point math and Holt-Winters daily demand forecasts.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => {
                setCsvContent(sampleCsv);
                setIsCsvModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Upload Sample CSV
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl cursor-pointer shadow-xs"
            >
              Add First Product
            </button>
          </div>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Product & SKU</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Stock on Hand</th>
                  <th className="px-5 py-3.5">Reorder Point</th>
                  <th className="px-5 py-3.5">Unit Price</th>
                  <th className="px-5 py-3.5">Lead Time</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">SKU: {p.sku}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-black text-slate-900 text-base">{p.stockOnHand}</span>
                      <span className="text-xs text-slate-400 ml-1">units</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 text-xs">
                      ROP: <span className="font-semibold text-slate-800">{p.reorderThreshold}</span>
                      <span className="text-slate-400 ml-1">(SS: {p.safetyStock})</span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-900">
                      ${p.unitPrice.toFixed(2)}
                      <div className="text-[11px] font-normal text-slate-400">Cost: ${p.unitCost.toFixed(2)}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {p.leadTimeDays} days
                      <div className="text-[11px] text-slate-400 truncate max-w-[120px]">{p.supplierName}</div>
                    </td>
                    <td className="px-5 py-4">
                      {p.status === 'IN_STOCK' ? (
                        <Badge variant="success" size="sm" className="gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          In Stock
                        </Badge>
                      ) : p.status === 'LOW_STOCK' ? (
                        <Badge variant="warning" size="sm" className="gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm" className="gap-1">
                          <XCircle className="w-3 h-3 text-red-600" />
                          Out of Stock
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Product"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          title="Archive Product"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add New Master Product</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. WH-100"
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Electronics"
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wireless Noise-Canceling Headphones"
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Retail Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Stock On Hand</label>
                  <input
                    type="number"
                    required
                    value={stockOnHand}
                    onChange={(e) => setStockOnHand(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Reorder Point</label>
                  <input
                    type="number"
                    required
                    value={reorderThreshold}
                    onChange={(e) => setReorderThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Safety Stock</label>
                  <input
                    type="number"
                    required
                    value={safetyStock}
                    onChange={(e) => setSafetyStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    required
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Product'}
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
              <h3 className="text-lg font-bold text-slate-900">Import Product Catalog (CSV)</h3>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Paste standard CSV rows with columns: <code>sku,name,category,unit_cost,unit_price,stock_on_hand,reorder_point,safety_stock,lead_time_days,supplier_name</code>
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
                {isSubmitting ? 'Importing...' : 'Import Products'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Product</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">SKU: {editingProduct.sku}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
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

            <form onSubmit={handleUpdateProduct} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={editSupplierName}
                    onChange={(e) => setEditSupplierName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editUnitCost}
                    onChange={(e) => setEditUnitCost(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Retail Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editUnitPrice}
                    onChange={(e) => setEditUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Safety Stock</label>
                  <input
                    type="number"
                    required
                    value={editSafetyStock}
                    onChange={(e) => setEditSafetyStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    required
                    value={editLeadTimeDays}
                    onChange={(e) => setEditLeadTimeDays(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
