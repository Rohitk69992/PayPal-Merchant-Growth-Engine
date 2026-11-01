import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Zap,
  Download,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
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
    let isCurrent = true;
    setIsLoading(true);
    apiClient
      .getTransactions({
        type: filterType === 'ALL' ? undefined : filterType,
        search: searchQuery || undefined,
      })
      .then((res) => {
        if (isCurrent) setTransactions(res.items);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [filterType, searchQuery]);

  const filterTabs = [
    { label: 'All Transactions', value: 'ALL' },
    { label: 'Received / Sales', value: 'RECEIVED' },
    { label: 'Sent / Payments', value: 'PAYMENT' },
    { label: 'Refunds', value: 'REFUND' },
  ];

  // Calculate ledger totals
  const totalGross = transactions.reduce((acc, t) => acc + (t.type === 'RECEIVED' ? t.amount : -t.amount), 0);
  const totalFees = transactions.reduce((acc, t) => acc + t.feeAmount, 0);

  return (
    <div className="space-y-5 pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
              Transactions & Settlements Ledger
            </h1>
            <Badge variant="navy" size="sm">
              {transactions.length} Records
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Verified PayPal settlement telemetry, gross volume, automated interchange fee deductions, and net deposits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/paypal')}
            leftIcon={<Zap className="w-3.5 h-3.5 text-[#D69E36]" />}
          >
            Payment Simulator
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/settings')}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Ledger
          </Button>
        </div>
      </div>

      {/* Quick Volume Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 border-[#D9E2EC]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Filtered Gross Volume
          </span>
          <div className="text-lg font-bold text-[#172B45] font-numeric mt-0.5">
            ${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="p-3.5 border-[#D9E2EC]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Accumulated Processing Fees
          </span>
          <div className="text-lg font-bold text-[#C45B61] font-numeric mt-0.5">
            -${totalFees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="p-3.5 border-[#D9E2EC]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Total Entries
          </span>
          <div className="text-lg font-bold text-[#172B45] font-numeric mt-0.5">
            {transactions.length} Entries
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-[#D9E2EC] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterType(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                filterType === tab.value
                  ? 'bg-[#1E3A5F] text-white shadow-2xs font-bold'
                  : 'text-[#64748B] hover:text-[#172B45] hover:bg-[#F1F5F9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, buyer, title..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[#D9E2EC] text-[#172B45] placeholder-[#94A3B8] focus:outline-none focus:border-[#4779A8]"
          />
        </div>
      </div>

      {/* Table or Empty State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#64748B]">
          <Loader2 className="w-8 h-8 animate-spin text-[#4779A8] mb-2" />
          <span className="text-xs font-semibold">Loading verified transaction ledger...</span>
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No Transactions Found"
          description="There are no recorded transactions matching your search criteria. Execute a payment simulation to create entries."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/paypal')}
            >
              Simulate Sandbox Payment →
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-[#D9E2EC] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-numeric">
              <thead className="bg-[#F8FAFC] border-b border-[#D9E2EC] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                <tr>
                  <th className="px-4 py-3 font-sans">Transaction / Reference</th>
                  <th className="px-4 py-3 font-sans">Date</th>
                  <th className="px-4 py-3 font-sans">Source Method</th>
                  <th className="px-4 py-3 text-right">Gross Amount</th>
                  <th className="px-4 py-3 text-right">Fee</th>
                  <th className="px-4 py-3 text-right">Net Deposit</th>
                  <th className="px-4 py-3 text-center font-sans">Status</th>
                  <th className="px-4 py-3 text-right font-sans">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-sans">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center font-bold shrink-0 ${
                            tx.type === 'RECEIVED'
                              ? 'bg-[#E8F6F3] text-[#16A085] border border-[#A3E4D7]'
                              : 'bg-[#F1F5F9] text-[#64748B] border border-[#D9E2EC]'
                          }`}
                        >
                          {tx.type === 'RECEIVED' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-[#172B45] truncate">{tx.title}</p>
                          {tx.paypalOrderId && (
                            <p className="text-[10px] text-[#94A3B8] font-mono truncate max-w-[170px]">
                              {tx.paypalOrderId}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B] font-mono text-[11px]">
                      {tx.formattedDate || new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-sans text-[#64748B] text-[11px]">
                      {tx.source || 'PayPal Wallet'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold text-xs ${
                        tx.type === 'RECEIVED' ? 'text-[#16A085]' : 'text-[#172B45]'
                      }`}
                    >
                      {tx.type === 'RECEIVED' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#C45B61]">
                      -${tx.feeAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#172B45]">
                      ${tx.netAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={tx.status === 'COMPLETED' ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-sans">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                        }}
                        className="text-[11px] py-1 px-2 text-[#4779A8]"
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <Modal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          title="Transaction Receipt & Breakdown"
          subtitle={selectedTx.formattedDate || selectedTx.date}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="text-center py-3 bg-[#F8FAFC] rounded-lg border border-[#D9E2EC]">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#94A3B8]">
                Gross Settlement
              </span>
              <div
                className={`text-2xl font-bold font-numeric ${
                  selectedTx.type === 'RECEIVED' ? 'text-[#16A085]' : 'text-[#172B45]'
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
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-sans">Transaction Title:</span>
                <span className="font-semibold text-[#172B45] font-sans">{selectedTx.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-sans">Payment Method:</span>
                <span className="font-semibold text-[#172B45]">{selectedTx.source}</span>
              </div>
              {selectedTx.paypalOrderId && (
                <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B] font-sans">PayPal Order ID:</span>
                  <span className="font-semibold text-[#172B45]">{selectedTx.paypalOrderId}</span>
                </div>
              )}
              {selectedTx.customerName && (
                <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B] font-sans">Customer / Buyer:</span>
                  <span className="font-semibold text-[#172B45] font-sans">{selectedTx.customerName}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-sans">Interchange & Network Fee:</span>
                <span className="text-[#C45B61] font-semibold">-${selectedTx.feeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 font-bold text-xs">
                <span className="text-[#172B45] font-sans">Net Merchant Deposit:</span>
                <span className="text-[#1E3A5F]">${selectedTx.netAmount.toFixed(2)} {selectedTx.currency}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#D9E2EC] flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedTx(null)}>
                Close Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
