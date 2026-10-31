import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSegment?: string;
  onSuccess?: () => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  onClose,
  defaultSegment = 'New Customers',
  onSuccess,
}) => {
  const [segment, setSegment] = useState(defaultSegment);
  const [headline, setHeadline] = useState('Special Offer for Valued Customers');
  const [emailSubject, setEmailSubject] = useState('A gift for you: Special discount on your next order');
  const [discountCode, setDiscountCode] = useState('GROWTH2026');
  const [discountPct, setDiscountPct] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const segmentOptions = ['High-Value Champions', 'Loyal Customers', 'Promising Growth', 'At-Risk / Needs Attention'];

  const handleCreate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.createCampaign({
        name: headline,
        target_segment: segment,
        discount_percentage: discountPct,
        promo_code: discountCode,
        channel: 'PAYPAL_OFFERS',
        headline,
        message_body: emailSubject,
      });
      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        setIsSubmitting(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Targeted Marketing Campaign"
      subtitle="AI-Generated Strategy Grounded in RFM Customer Segments"
      maxWidth="md"
    >
      {isDone ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">Campaign Activated!</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Targeted promotion recorded in marketing ledger. Promo code {discountCode} active.
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

          {/* Target Segment Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Select Target Segment
            </label>
            <div className="grid grid-cols-2 gap-2">
              {segmentOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSegment(opt)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                    segment === opt
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Campaign Headline */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Campaign Title / Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full text-xs font-semibold text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Email Subject Line */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Email / Notification Copy
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full text-xs text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Discount & Code Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Promo Code
              </label>
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="w-full text-xs font-mono font-bold text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Discount %
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={discountPct}
                onChange={(e) => setDiscountPct(parseInt(e.target.value) || 0)}
                className="w-full text-xs font-bold text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              isLoading={isSubmitting}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Activate Campaign
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
