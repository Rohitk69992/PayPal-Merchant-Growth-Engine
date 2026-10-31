import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Package, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReorderModal: React.FC<ReorderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState(120);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const unitCost = 45.00;
  const totalCost = quantity * unitCost;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.confirmReorder('prod_1', quantity);
      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        setIsSubmitting(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1400);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Inventory Replenishment"
      subtitle="AI-Calculated Purchase Order for Wireless Headphones"
      maxWidth="md"
    >
      {isDone ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">Purchase Order Confirmed!</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Order for {quantity} units dispatched to SoundWave Electronics Ltd. Current stock updated and transaction recorded.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Product Overview Card */}
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Wireless Headphones</h4>
              <p className="text-xs text-slate-500">SKU: WH-AUDIO-PRO • Category: Electronics</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Current Stock: 80 units
                </span>
                <span className="text-[11px] text-slate-500">Lead Time: 14 days</span>
              </div>
            </div>
          </div>

          {/* Quantity Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Replenishment Quantity (Units)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="10"
                step="10"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full text-base font-bold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-slate-500 font-medium shrink-0">
                Recommended: 120 units
              </span>
            </div>
          </div>

          {/* Cost & Supplier Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Supplier:</span>
              <span className="font-semibold text-slate-800">SoundWave Electronics Ltd</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Unit Wholesale Cost:</span>
              <span className="font-semibold text-slate-800">${unitCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimated Delivery:</span>
              <span className="font-semibold text-slate-800">14 business days</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>Total Supplier Invoice:</span>
              <span className="text-blue-700">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            * This action records a demonstration supplier disbursement and replenishes simulated stock.
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
