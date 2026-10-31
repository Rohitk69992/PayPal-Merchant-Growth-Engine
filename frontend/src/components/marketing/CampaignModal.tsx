import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Sparkles, Send, CheckCircle2 } from 'lucide-react';
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
  const [headline, setHeadline] = useState('Unlock 15% Off Your Next Audio Upgrade');
  const [emailSubject, setEmailSubject] = useState('A gift for you: 15% off your next PayPal order');
  const [discountCode, setDiscountCode] = useState('WELCOME15PAYPAL');
  const [discountPct, setDiscountPct] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const segmentOptions = ['New Customers', 'Returning', 'Loyal', 'VIP'];

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.createCampaign({
        targetSegment: segment,
        headline,
        emailSubject,
        bodyCopy: `Special offer for ${segment}: Use code ${discountCode} at PayPal checkout for ${discountPct}% off.`,
        discountCode,
        discountPct,
        estimatedReach: segment === 'New Customers' ? 378 : segment === 'Returning' ? 252 : 90,
        expectedConversionRatePct: 7.2,
      });
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
            Targeted promotion scheduled for dispatch. Discount code {discountCode} created in PayPal offers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
              Campaign Headline (AI-Drafted)
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
              Email Subject Line
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
                Discount Code
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

          {/* AI Reach Projection */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Projected Reach: <strong>{segment === 'New Customers' ? 378 : 252} shoppers</strong></span>
            </div>
            <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md text-[11px]">
              Est. +$1,650 GMV
            </span>
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
