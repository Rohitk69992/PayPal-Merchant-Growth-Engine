import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Building2,
  Music,
  ShoppingBag,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { apiClient } from '../services/apiClient';
import type { Transaction } from '../types';

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    apiClient
      .getTransactions({
        type: filterType === 'ALL' ? undefined : filterType,
        search: searchQuery || undefined,
      })
      .then((res) => setTransactions(res.items));
  }, [filterType, searchQuery]);

  const filterTabs = [
    { label: 'All', value: 'ALL' },
    { label: 'Received', value: 'RECEIVED' },
    { label: 'Sent', value: 'PAYMENT' },
    { label: 'Crypto', value: 'CRYPTO' },
    { label: 'Rewards', value: 'REWARDS' },
  ];

  const getTxIcon = (tx: Transaction) => {
    if (tx.title.includes('Nike')) {
      return (
        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-black text-xs">
          ✓
        </div>
      );
    }
    if (tx.title.includes('Acme')) {
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
          <Building2 className="w-5 h-5" />
        </div>
      );
    }
    if (tx.type === 'CRYPTO') {
      return (
        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">
          ₿
        </div>
      );
    }
    if (tx.type === 'REWARDS') {
      return (
        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
          ★
        </div>
      );
    }
    if (tx.title.includes('Spotify')) {
      return (
        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
          <Music className="w-5 h-5" />
        </div>
      );
    }
    if (tx.type === 'RECEIVED') {
      return (
        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
          P
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
        <ShoppingBag className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer sm:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Transactions</h1>
            <p className="text-xs text-slate-500">Live PayPal payments & receipts</p>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
          {transactions.length} records
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer ${
              filterType === tab.value
                ? 'bg-[#003087] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by payer, store, or category..."
          className="w-full pl-9 pr-4 py-2.5 text-xs rounded-2xl bg-white border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200/90 shadow-xs divide-y divide-slate-100">
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No transactions found matching your criteria.
          </div>
        ) : (
          transactions.map((tx) => {
            const isReceived = tx.amount > 0 && tx.type !== 'REWARDS';
            const isRewards = tx.type === 'REWARDS';

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {getTxIcon(tx)}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{tx.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tx.formattedDate} • {tx.type === 'PAYMENT' ? 'Payment' : tx.type === 'RECEIVED' ? 'Received' : tx.type === 'CRYPTO' ? 'Crypto' : 'Points Earned'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs sm:text-sm font-extrabold ${
                      isReceived
                        ? 'text-emerald-600'
                        : isRewards
                        ? 'text-purple-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {isRewards ? `+${tx.amount} pts` : `${tx.amount > 0 ? '+' : ''}$${Math.abs(tx.amount).toFixed(2)}`}
                  </span>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                    {tx.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Transaction Details Modal */}
      <Modal
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title="Transaction Details"
        subtitle={selectedTx?.title}
        maxWidth="sm"
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <span className="text-2xl font-black text-slate-900">
                {selectedTx.type === 'REWARDS'
                  ? `+${selectedTx.amount} pts`
                  : `${selectedTx.amount > 0 ? '+' : ''}$${Math.abs(selectedTx.amount).toFixed(2)}`}
              </span>
              <p className="text-xs text-slate-500 mt-1">{selectedTx.formattedDate}</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Transaction ID:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedTx.id}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Status:</span>
                <span className="font-bold text-emerald-700">{selectedTx.status}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Rail:</span>
                <span className="font-semibold text-slate-800">{selectedTx.source}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated PayPal Fee:</span>
                <span className="font-semibold text-slate-800">${selectedTx.feeAmount.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Net Credited:</span>
                <span className="text-blue-700">${selectedTx.netAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
