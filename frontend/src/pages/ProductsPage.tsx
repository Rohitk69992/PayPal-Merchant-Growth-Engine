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
  Edit2,
  Trash2,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';

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
    const confirmed = window.confirm(
      `Archive product "${p.name}" (SKU: ${p.sku})? It will be removed from the active catalog.`
    );
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
    <div className="space-y-5 pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
              Product Catalog & Master Inventory
            </h1>
            <Badge variant="navy" size="sm">
              {products.length} Items
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Operational master records, safety stock thresholds, supplier lead times and real-time inventory counts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCsvContent(sampleCsv);
              setIsCsvModalOpen(true);
            }}
            leftIcon={<Upload className="w-3.5 h-3.5 text-[#4779A8]" />}
          >
            Import CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-[#D9E2EC] shadow-2xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by SKU, item name, or category..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-[#172B45] placeholder-[#94A3B8]"
          />
        </div>
        <span className="text-xs font-semibold text-[#64748B] shrink-0 pr-1">
          Total: {products.length}
        </span>
      </div>

      {/* Main Table or Empty State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
          <Loader2 className="w-8 h-8 animate-spin text-[#4779A8] mb-2" />
          <span className="text-xs font-semibold">Loading product master records...</span>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Products in Catalog"
          description="Your catalog is completely empty. Add your first item or import batch records via CSV to establish deterministic reorder thresholds."
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCsvContent(sampleCsv);
                  setIsCsvModalOpen(true);
                }}
              >
                Upload Sample CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
              >
                Add First Product
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
                  <th className="px-4 py-3 font-sans">Product & SKU</th>
                  <th className="px-4 py-3 font-sans">Category</th>
                  <th className="px-4 py-3 text-right">Stock On Hand</th>
                  <th className="px-4 py-3 text-right">Reorder Point</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 font-sans">Supplier & Lead</th>
                  <th className="px-4 py-3 text-center font-sans">Status</th>
                  <th className="px-4 py-3 text-right font-sans">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-sans">
                      <div className="font-bold text-[#172B45] text-xs">{p.name}</div>
                      <div className="text-[11px] font-mono text-[#64748B]">SKU: {p.sku}</div>
                    </td>
                    <td className="px-4 py-3 font-sans text-[#64748B]">
                      <span className="px-2 py-0.5 rounded bg-[#E8EEF5] text-[11px] font-medium text-[#1E3A5F]">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-[#172B45] text-sm">{p.stockOnHand}</span>
                      <span className="text-[10px] text-[#94A3B8] ml-1 font-sans">units</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#64748B]">
                      <span className="font-semibold text-[#172B45]">{p.reorderThreshold}</span>
                      <span className="text-[10px] text-[#94A3B8] ml-1">(SS: {p.safetyStock})</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#172B45]">
                      ${p.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#64748B]">
                      ${p.unitCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-sans text-[#64748B]">
                      <div>{p.leadTimeDays} business days</div>
                      <div className="text-[10px] text-[#94A3B8] truncate max-w-[120px]">
                        {p.supplierName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.status === 'IN_STOCK' ? (
                        <Badge variant="success" size="sm" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          In Stock
                        </Badge>
                      ) : p.status === 'LOW_STOCK' ? (
                        <Badge variant="warning" size="sm" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Out of Stock
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Product"
                          className="p-1.5 rounded text-[#64748B] hover:text-[#4779A8] hover:bg-[#E8EEF5] transition-colors cursor-pointer"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          title="Archive Product"
                          className="p-1.5 rounded text-[#64748B] hover:text-[#C45B61] hover:bg-[#FADBD8] transition-colors cursor-pointer"
                          aria-label={`Archive ${p.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Master Product"
        subtitle="Register a new SKU with unit pricing and replenishment constraints"
        maxWidth="lg"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-[#FADBD8] text-[#C45B61] text-xs font-semibold">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                SKU Identifier *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. WH-100"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] font-mono focus:outline-none focus:border-[#4779A8]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Electronics"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wireless Noise-Canceling Headphones"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Wholesale Unit Cost ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Selling Retail Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Stock On Hand
              </label>
              <input
                type="number"
                required
                value={stockOnHand}
                onChange={(e) => setStockOnHand(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Reorder Point
              </label>
              <input
                type="number"
                required
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Safety Stock
              </label>
              <input
                type="number"
                required
                value={safetyStock}
                onChange={(e) => setSafetyStock(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Lead Time (Days)
              </label>
              <input
                type="number"
                required
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Supplier Name
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9E2EC]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Save Master Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Batch Import Products (CSV)"
        subtitle="Import catalog items in standard comma-separated format"
        maxWidth="lg"
      >
        <p className="text-xs text-[#64748B] mb-2">
          Required header order: <code className="font-mono text-[#1E3A5F] bg-[#E8EEF5] px-1.5 py-0.5 rounded">sku,name,category,unit_cost,unit_price,stock_on_hand,reorder_point,safety_stock,lead_time_days,supplier_name</code>
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
            Execute CSV Import
          </Button>
        </div>
      </Modal>

      {/* Edit Product Modal */}
      {isEditModalOpen && editingProduct && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Product Details"
          subtitle={`Modifying SKU: ${editingProduct.sku}`}
          maxWidth="lg"
        >
          {formError && (
            <div className="mb-4 p-3 rounded-lg bg-[#FADBD8] text-[#C45B61] text-xs font-semibold">
              {formError}
            </div>
          )}

          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={editSupplierName}
                  onChange={(e) => setEditSupplierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                  Wholesale Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editUnitCost}
                  onChange={(e) => setEditUnitCost(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] font-mono focus:outline-none focus:border-[#4779A8]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                  Selling Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editUnitPrice}
                  onChange={(e) => setEditUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] font-mono focus:outline-none focus:border-[#4779A8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                  Safety Stock
                </label>
                <input
                  type="number"
                  required
                  value={editSafetyStock}
                  onChange={(e) => setEditSafetyStock(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
                  Lead Time (Days)
                </label>
                <input
                  type="number"
                  required
                  value={editLeadTimeDays}
                  onChange={(e) => setEditLeadTimeDays(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9E2EC]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
              >
                Update Product
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
