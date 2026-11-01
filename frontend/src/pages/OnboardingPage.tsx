import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button';

export const OnboardingPage: React.FC = () => {
  const { createMerchant, currentMerchant } = useAuth();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('Electronics & Gadgets');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already has merchant, redirect to dashboard
  useEffect(() => {
    if (currentMerchant) {
      navigate('/');
    }
  }, [currentMerchant, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await createMerchant({
        business_name: businessName,
        currency,
        category,
        address,
        phone,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create merchant profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#DCEAF5] selection:text-[#1E3A5F]">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1E3A5F] text-white shadow-xs mb-3 border border-[#162C48]">
          <Building2 className="w-6 h-6 text-[#DCEAF5]" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
          Establish Your Merchant Tenant Profile
        </h2>
        <p className="mt-1 text-xs text-[#64748B] max-w-md mx-auto">
          Set up your merchant workspace to activate real-time PayPal telemetry, demand forecasting, and customer cohort intelligence.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl sm:px-8 border border-[#D9E2EC]">
          {/* Progress Steps Header */}
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#D9E2EC]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#1E3A5F] text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span className="text-xs font-bold text-[#172B45]">Business Profile</span>
            </div>
            <div className="h-0.5 w-12 bg-[#D9E2EC]" />
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#E8EEF5] text-[#64748B] text-xs font-bold flex items-center justify-center border border-[#D9E2EC]">
                2
              </span>
              <span className="text-xs font-medium text-[#64748B]">Currency & Industry</span>
            </div>
            <div className="h-0.5 w-12 bg-[#D9E2EC]" />
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#E8EEF5] text-[#64748B] text-xs font-bold flex items-center justify-center border border-[#D9E2EC]">
                3
              </span>
              <span className="text-xs font-medium text-[#64748B]">Launch</span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-[#FADBD8] border border-[#F5B7B1] flex items-start gap-2.5 text-[#C45B61] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Setup Issue</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                Legal Business / Store Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Audio & Electronics Ltd"
                className="w-full px-3 py-2.5 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-xs text-[#172B45] placeholder-[#94A3B8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                  Primary Ledger Currency *
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-xs text-[#172B45] bg-white cursor-pointer font-mono"
                >
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                  Industry / Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-xs text-[#172B45] bg-white cursor-pointer"
                >
                  <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                  <option value="Apparel & Fashion">Apparel & Fashion</option>
                  <option value="Home & Living">Home & Living</option>
                  <option value="Health & Beauty">Health & Beauty</option>
                  <option value="Sports & Outdoors">Sports & Outdoors</option>
                  <option value="Digital Goods">Digital Goods</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                Operating Address (Optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="100 Enterprise Way, Suite 400"
                className="w-full px-3 py-2.5 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-xs text-[#172B45] placeholder-[#94A3B8]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                Business Phone (Optional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full px-3 py-2.5 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-xs text-[#172B45] placeholder-[#94A3B8]"
              />
            </div>

            {/* Zero-Fabrication Guarantee Box */}
            <div className="p-3.5 rounded-lg bg-[#E8EEF5] border border-[#CBD5E1] text-xs text-[#172B45] flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#4779A8] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#1E3A5F]">Zero-Fabrication Guarantee</p>
                <p className="mt-0.5 text-[#334155] leading-relaxed">
                  Your tenant workspace initializes with zero fabricated metrics or mock balances. All analytics and demand forecasts originate purely from verified transactions and inventory logs.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              variant="navy"
              size="lg"
              isLoading={isSubmitting}
              className="w-full py-2.5 text-xs font-bold mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Setup & Enter Workspace
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
