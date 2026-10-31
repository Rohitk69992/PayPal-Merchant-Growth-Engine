import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Zap,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { apiClient } from '../services/apiClient';
import type { Transaction } from '../types';

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .getTransactions({
        type: filterType === 'ALL' ? undefined : filterType,
        search: searchQuery || undefined,
      })
      .then((res) => setTransactions(res.items))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [filterType, searchQuery]);

  const filterTabs = [
    { label: 'All', value: 'ALL' },
    { label: 'Received', value: 'RECEIVED' },
    { label: 'Sent', value: 'PAYMENT' },
    { label: 'Refunds', value: 'REFUND' },
  ];

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Transactions & Settlements
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Verified PayPal transaction feed and fee deductions
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/paypal')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0070BA] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Simulator</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
              filterType === tab.value
                ? 'bg-blue-600 text-white font-bold'
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
          placeholder="Search by customer name, order ID, or title..."
          className="w-full bg-white text-xs font-medium text-slate-800 pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 shadow-2xs"
        />
      </div>

      {/* Transaction List or Empty State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-sm">Fetching verified ledger...</span>
        </div>
      ) : transactions.length === 0 ? (
        <Card className="text-center py-16 px-6 border-dashed border-2 border-slate-300 bg-white">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Transactions Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are no recorded transactions matching your search criteria. Execute a live payment simulation to populate records.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={() => navigate('/paypal')}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0070BA] hover:bg-[#003087] rounded-xl shadow-xs"
            >
              Simulate Sandbox Payment →
            </button>
          </div>
        </Card>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    tx.type === 'RECEIVED'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {tx.type === 'RECEIVED' ? (
                    <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-slate-600" />
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {tx.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {tx.formattedDate || tx.date} • {tx.source || 'PayPal Wallet'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-xs font-black tracking-tight ${
                    tx.type === 'RECEIVED' ? 'text-emerald-600' : 'text-slate-900'
                  }`}
                >
                  {tx.type === 'RECEIVED' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {tx.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedTx && (
        <Modal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          title="Transaction Details"
          subtitle={selectedTx.formattedDate || selectedTx.date}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="text-center py-2 border-b border-slate-100">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Gross Amount
              </span>
              <div
                className={`text-2xl font-black ${
                  selectedTx.type === 'RECEIVED' ? 'text-emerald-600' : 'text-slate-900'
                }`}
              >
                {selectedTx.type === 'RECEIVED' ? '+' : '-'}${Math.abs(selectedTx.amount).toFixed(2)} {selectedTx.currency}
              </div>
              <div className="mt-1">
                <Badge variant={selectedTx.status === 'COMPLETED' ? 'success' : 'neutral'} size="sm">
                  {selectedTx.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Payment Method:</span>
                <span className="font-semibold text-slate-800">{selectedTx.source}</span>
              </div>
              {selectedTx.paypalOrderId && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">PayPal Order ID:</span>
                  <span className="font-semibold text-slate-800">{selectedTx.paypalOrderId}</span>
                </div>
              )}
              {selectedTx.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Customer:</span>
                  <span className="font-semibold text-slate-800">{selectedTx.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Standard PayPal Fee:</span>
                <span className="text-red-600 font-semibold">-${selectedTx.feeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                <span className="text-slate-700 font-sans">Net Merchant Deposit:</span>
                <span className="text-slate-900 font-bold">${selectedTx.netAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full mt-2 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
