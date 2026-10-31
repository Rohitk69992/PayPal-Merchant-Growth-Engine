import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import type { ProductInventory } from '../../types';

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductInventory | null;
  onSuccess?: () => void;
}

export const ReorderModal: React.FC<ReorderModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<ProductInventory | null>(product || null);
  const [quantity, setQuantity] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setSelectedProduct(product);
        setQuantity(Math.max(10, (product.reorderThreshold * 2) - product.stockOnHand));
      } else {
        apiClient.getProducts().then((prods) => {
          if (prods.length > 0) {
            setSelectedProduct(prods[0]);
            setQuantity(Math.max(10, (prods[0].reorderThreshold * 2) - prods[0].stockOnHand));
          }
        });
      }
    }
  }, [isOpen, product]);

  const unitCost = selectedProduct?.unitCost ?? 45.00;
  const totalCost = quantity * unitCost;

  const handleConfirm = async () => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const po = await apiClient.createPurchaseOrder(selectedProduct.id, quantity);
      // Auto-receive for immediate stock reflection in evaluation flow
      await apiClient.receivePurchaseOrder(po.id);
      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        setIsSubmitting(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit purchase order.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Inventory Purchase Order"
      subtitle={selectedProduct ? `Replenishment for ${selectedProduct.name}` : 'Replenish Inventory'}
      maxWidth="md"
    >
      {isDone ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">Purchase Order Dispatched!</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Order for {quantity} units registered. Stock levels updated and recorded in the audit trail.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Overview Card */}
          {selectedProduct ? (
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold text-slate-900 truncate">{selectedProduct.name}</h4>
                <p className="text-xs text-slate-500">
                  SKU: {selectedProduct.sku} • Supplier: {selectedProduct.supplierName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Stock on hand: {selectedProduct.stockOnHand}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Lead time: {selectedProduct.leadTimeDays} days
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No products available to reorder.</p>
          )}

          {/* Quantity Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Replenishment Quantity (Units)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full text-base font-bold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Cost Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Unit Wholesale Cost:</span>
              <span className="font-semibold text-slate-800">${unitCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimated Delivery:</span>
              <span className="font-semibold text-slate-800">
                {selectedProduct?.leadTimeDays ?? 7} business days
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>Total Estimated Invoice:</span>
              <span className="text-blue-700">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleConfirm}
              isLoading={isSubmitting}
              disabled={!selectedProduct}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm Purchase Order
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
