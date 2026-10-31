import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Gift,
  Coins,
  Percent,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { apiClient } from '../services/apiClient';
import type { RewardsSummary } from '../types';

export const RewardsPage: React.FC = () => {
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemOption, setRedeemOption] = useState<'Cash Back' | 'Gift Cards' | 'Merchant Discounts'>('Cash Back');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  const loadRewards = () => {
    apiClient.getRewardsSummary().then(setRewards);
  };

  useEffect(() => {
    loadRewards();
  }, []);

  const handleRedeem = async () => {
    setIsRedeeming(true);
    try {
      const required = redeemOption === 'Gift Cards' ? 1500 : 1000;
      await apiClient.redeemRewards(required, redeemOption);
      setRedeemSuccess(true);
      setTimeout(() => {
        setRedeemSuccess(false);
        setIsRedeeming(false);
        setIsRedeemModalOpen(false);
        loadRewards();
      }, 1400);
    } catch (err) {
      console.error(err);
      setIsRedeeming(false);
    }
  };

  if (!rewards) return null;

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">PayPal Rewards</h1>
          <p className="text-[11px] text-slate-500 font-medium">Earn points on every merchant settlement</p>
        </div>
      </div>

      {/* Rewards Points Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center font-bold text-xl shadow-xs">
            ★
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {rewards.points.toLocaleString()} pts
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              ≈ ${rewards.equivalentUsd.toFixed(2)} USD
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsRedeemModalOpen(true)}
          className="bg-[#0070e0] hover:bg-[#005ea6] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs"
        >
          Redeem
        </Button>
      </div>

      {/* Ways to use your points */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Ways to use your points</h2>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* Cash Back */}
          <div
            onClick={() => {
              setRedeemOption('Cash Back');
              setIsRedeemModalOpen(true);
            }}
            className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col items-center text-center space-y-1.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800">Cash Back</span>
            <span className="text-[10px] text-slate-500">(1,000 pts = $10)</span>
          </div>

          {/* Gift Cards */}
          <div
            onClick={() => {
              setRedeemOption('Gift Cards');
              setIsRedeemModalOpen(true);
            }}
            className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all flex flex-col items-center text-center space-y-1.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800">Gift Cards</span>
            <span className="text-[10px] text-slate-500">(1,500 pts = $15)</span>
          </div>

          {/* Merchant Discounts */}
          <div
            onClick={() => {
              setRedeemOption('Merchant Discounts');
              setIsRedeemModalOpen(true);
            }}
            className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-all flex flex-col items-center text-center space-y-1.5 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800">Fee Discounts</span>
            <span className="text-[10px] text-slate-500">(1,000 pts = 5%)</span>
          </div>
        </div>
      </div>

      {/* Promotional Banner: Shop. Earn. Grow. */}
      <div className="rounded-3xl bg-[#001c4d] text-white p-5 shadow-md flex items-center justify-between overflow-hidden relative">
        <div className="relative z-10 space-y-2 max-w-[65%]">
          <h3 className="text-base font-black tracking-tight">Shop. Earn. Grow.</h3>
          <p className="text-[11px] text-blue-200 leading-snug">
            Use your points at millions of merchants worldwide or offset business fees.
          </p>
          <button
            onClick={() => setIsRedeemModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors cursor-pointer mt-1"
          >
            <span>Explore Partners</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-white/20 shadow-md">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80"
            alt="Merchant partner"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Redeem Simulation Modal */}
      <Modal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        title="Redeem PayPal Rewards"
        subtitle={`Current Balance: ${rewards.points} points`}
        maxWidth="sm"
      >
        {redeemSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Redemption Successful!</h4>
            <p className="text-xs text-slate-500">
              {redeemOption === 'Cash Back'
                ? '$10.00 has been credited to your primary USD balance.'
                : 'Your redemption voucher has been generated.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Selected Option:</span>
                <span className="font-bold text-slate-900">{redeemOption}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Points Cost:</span>
                <span className="font-bold text-amber-600">
                  {redeemOption === 'Gift Cards' ? '1,500 pts' : '1,000 pts'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Disbursed Value:</span>
                <span className="font-bold text-emerald-600">
                  {redeemOption === 'Gift Cards' ? '$15.00' : '$10.00'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsRedeemModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleRedeem} isLoading={isRedeeming}>
                Confirm Redemption
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
