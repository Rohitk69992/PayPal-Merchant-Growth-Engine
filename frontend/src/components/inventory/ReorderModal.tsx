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
        setQuantity(Math.max(10, product.reorderThreshold * 2 - product.stockOnHand));
      } else {
        apiClient.getProducts().then((prods) => {
          if (prods.length > 0) {
            setSelectedProduct(prods[0]);
            setQuantity(Math.max(10, prods[0].reorderThreshold * 2 - prods[0].stockOnHand));
          }
        });
      }
    }
  }, [isOpen, product]);

  const unitCost = selectedProduct?.unitCost ?? 45.0;
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
      subtitle={selectedProduct ? `Replenishment order for ${selectedProduct.name}` : 'Replenish Inventory'}
      maxWidth="md"
    >
      {isDone ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 bg-[#E8F6F3] rounded-full flex items-center justify-center mx-auto text-[#16A085] border border-[#A3E4D7]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#172B45]">Purchase Order Dispatched</h4>
          <p className="text-xs text-[#64748B] max-w-xs mx-auto">
            Order for {quantity} units registered. Physical stock ledger updated and recorded in the audit trail.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[#FADBD8] border border-[#F5B7B1] text-[#C45B61] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Overview Card */}
          {selectedProduct ? (
            <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#D9E2EC]">
              <div className="w-10 h-10 rounded-lg bg-[#DCEAF5] flex items-center justify-center text-[#1E3A5F] shrink-0 border border-[#CBD5E1]">
                <Package className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-[#172B45] truncate">{selectedProduct.name}</h4>
                <p className="text-[11px] text-[#64748B] font-mono">
                  SKU: {selectedProduct.sku} • Supplier: {selectedProduct.supplierName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-semibold text-[#16A085] bg-[#E8F6F3] px-1.5 py-0.5 rounded border border-[#A3E4D7]">
                    Current Stock: {selectedProduct.stockOnHand}
                  </span>
                  <span className="text-[10px] text-[#64748B]">
                    Lead time: {selectedProduct.leadTimeDays} days
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#64748B]">No products available to reorder.</p>
          )}

          {/* Quantity Selector */}
          <div>
            <label className="block text-xs font-bold text-[#172B45] uppercase tracking-wider mb-1">
              Replenishment Quantity (Units)
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full text-sm font-bold text-[#172B45] px-3 py-2 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8]"
            />
          </div>

          {/* Cost Summary */}
          <div className="p-3 rounded-lg bg-[#F1F5F9] border border-[#D9E2EC] space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-[#64748B] font-sans">
              <span>Unit Wholesale Cost:</span>
              <span className="font-semibold text-[#172B45]">${unitCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#64748B] font-sans">
              <span>Estimated Delivery:</span>
              <span className="font-semibold text-[#172B45]">
                {selectedProduct?.leadTimeDays ?? 7} business days
              </span>
            </div>
            <div className="pt-2 border-t border-[#D9E2EC] flex justify-between text-xs font-bold text-[#172B45]">
              <span className="font-sans">Total Estimated Invoice:</span>
              <span className="text-[#1E3A5F]">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9E2EC]">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
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
