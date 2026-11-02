import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { PayPalConnectionStatus, ProductInventory } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
  ExternalLink,
  Loader2,
  DollarSign,
  RefreshCw,
  PowerOff,
  UserCheck,
  Clock,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export const PayPalConnectPage: React.FC = () => {
  const [status, setStatus] = useState<PayPalConnectionStatus | null>(null);
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Connect Form State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [environment, setEnvironment] = useState('sandbox');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Simulation Form State (Zero hardcoded defaults)
  const [simCustomerName, setSimCustomerName] = useState('');
  const [simCustomerEmail, setSimCustomerEmail] = useState('');
  const [simAmount, setSimAmount] = useState('25.00');
  const [simDescription, setSimDescription] = useState('');
  const [simProductId, setSimProductId] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const [st, prods] = await Promise.all([
        apiClient.getPayPalStatus(),
        apiClient.getProducts(),
      ]);
      setStatus(st);
      setProducts(prods);
      if (st.client_id) {
        setClientId(st.client_id);
      }
      if (prods.length > 0 && !simProductId) {
        setSimProductId(prods[0].id);
        setSimAmount(prods[0].unitPrice.toFixed(2));
        setSimDescription(`Store Order: ${prods[0].name}`);
      }
    } catch (err) {
      console.error('Failed to load PayPal status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setConnectMessage(null);
    try {
      const res = await apiClient.connectPayPal({
        client_id: clientId,
        client_secret: clientSecret,
        environment,
      });
      setStatus(res);
      setConnectMessage({
        type: 'success',
        text: 'PayPal credentials verified and encrypted at rest.',
      });
    } catch (err: any) {
      setConnectMessage({
        type: 'error',
        text: err.message || 'Failed to verify PayPal credentials. Check Client ID and Secret.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect PayPal? Live automated syncing will be paused.')) {
      return;
    }
    try {
      await apiClient.disconnectPayPal();
      await fetchStatus();
      setConnectMessage({ type: 'success', text: 'PayPal connection deactivated.' });
    } catch (err: any) {
      setConnectMessage({ type: 'error', text: err.message || 'Failed to disconnect.' });
    }
  };

  const handleSyncTransactions = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await apiClient.syncPayPal();
      setSyncResult(res.message);
      await fetchStatus();
    } catch (err: any) {
      setSyncResult(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simCustomerEmail.trim()) {
      setSimulationError('Customer email is required for payment simulation.');
      return;
    }
    setIsSimulating(true);
    setSimulationResult(null);
    setSimulationError(null);
    try {
      const res = await apiClient.simulateSandboxPayment({
        amount: parseFloat(simAmount),
        description: simDescription || 'Sandbox Payment',
        customer_email: simCustomerEmail,
        customer_name: simCustomerName || 'Guest Shopper',
        product_id: simProductId || undefined,
      });
      setSimulationResult(res);
    } catch (err: any) {
      setSimulationError(err.message || 'Payment simulation failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleProductSelect = (prodId: string) => {
    setSimProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setSimAmount(prod.unitPrice.toFixed(2));
      setSimDescription(`Store Order: ${prod.name}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4779A8] mb-2" />
        <span className="text-xs font-semibold">Verifying PayPal platform connection...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
              PayPal Developer Platform & Sandbox Integration
            </h1>
            {status?.is_connected ? (
              <Badge variant="success" size="sm" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active ({status.environment || 'Sandbox'})
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Not Connected
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Partner consent onboarding, historical synchronization, encrypted credentials, and sandbox payment simulation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status?.is_connected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncTransactions}
              disabled={isSyncing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
            >
              {isSyncing ? 'Synchronizing...' : 'Sync Transactions'}
            </Button>
          )}
        </div>
      </div>

      {syncResult && (
        <div className="p-3 bg-[#E8F6F3] border border-[#A3E4D7] rounded-lg text-xs text-[#16A085] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A085]" />
            <span>{syncResult}</span>
          </div>
          <button onClick={() => setSyncResult(null)} className="text-[#64748B] hover:text-[#172B45]">✕</button>
        </div>
      )}

      {/* Production Onboarding Notice */}
      <Card className="p-4 bg-[#F8FAFC] border-[#D9E2EC]">
        <div className="flex items-start gap-3">
          <UserCheck className="w-5 h-5 text-[#4779A8] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F]">
              Production Partner Consent Architecture
            </h4>
            <p className="text-xs text-[#334155] leading-relaxed">
              In production, individual merchant seller data is accessed via <strong>PayPal Partner Onboarding / OAuth consent</strong>.
              Platform-level application credentials are never conflated with seller account ownership. Below you may connect
              dedicated merchant credentials or launch seller consent onboarding.
            </p>
            {status?.partner_onboarding_url && (
              <div className="pt-2">
                <a
                  href={status.partner_onboarding_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] hover:bg-[#172B45] text-white rounded text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Launch PayPal Seller Onboarding (Partner Referral)
                </a>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Connection Setup (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-5 border-[#D9E2EC]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC] mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#172B45] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4779A8]" />
                Direct API Credentials
              </h2>
              {status?.is_connected ? (
                <span className="text-[10px] font-mono font-bold text-[#16A085] bg-[#E8F6F3] px-2 py-0.5 rounded border border-[#A3E4D7]">
                  Connected
                </span>
              ) : (
                <span className="text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#D9E2EC]">
                  Unconfigured
                </span>
              )}
            </div>

            {connectMessage && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs font-medium ${
                  connectMessage.type === 'success'
                    ? 'bg-[#E8F6F3] text-[#16A085] border border-[#A3E4D7]'
                    : 'bg-[#FADBD8] text-[#C45B61] border border-[#F5B7B1]'
                }`}
              >
                {connectMessage.text}
              </div>
            )}

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                  PayPal Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] bg-white text-[#172B45] focus:outline-none focus:border-[#4779A8]"
                >
                  <option value="sandbox">Sandbox (Development / Testing)</option>
                  <option value="live">Live / Production</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                  REST Client ID *
                </label>
                <input
                  type="text"
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="e.g. A21AA...merchant_client_id"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#D9E2EC] text-[#172B45] focus:outline-none focus:border-[#4779A8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                  Client Secret *
                </label>
                <input
                  type="password"
                  required
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#D9E2EC] text-[#172B45] focus:outline-none focus:border-[#4779A8]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="navy"
                  size="md"
                  isLoading={isConnecting}
                  className="flex-1 justify-center"
                >
                  Save & Verify Credentials
                </Button>
                {status?.is_connected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleDisconnect}
                    className="text-[#C45B61] hover:bg-[#FDF2F2]"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-4 pt-3 border-t border-[#D9E2EC] text-xs text-[#64748B] space-y-2">
              <div className="flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Last Sync: {status?.last_sync_at ? new Date(status.last_sync_at).toLocaleString() : 'Never'}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#94A3B8]">
                Credentials encrypted at rest using AES-256 before persistence in PostgreSQL.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Interactive Sandbox Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="p-5 border-[#D9E2EC]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC] mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172B45] flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#D69E36]" />
                  Interactive Sandbox Payment Simulator
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Simulate live PayPal transactions into the unified ledger with verified fee calculation and stock deduction.
                </p>
              </div>
            </div>

            {simulationError && (
              <div className="mb-4 p-3 rounded-lg bg-[#FADBD8] text-[#C45B61] text-xs font-semibold">
                {simulationError}
              </div>
            )}

            <form onSubmit={handleSimulatePayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                    Buyer Name
                  </label>
                  <input
                    type="text"
                    value={simCustomerName}
                    onChange={(e) => setSimCustomerName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] text-[#172B45] focus:outline-none focus:border-[#4779A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                    Buyer Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={simCustomerEmail}
                    onChange={(e) => setSimCustomerEmail(e.target.value)}
                    placeholder="e.g. alex.morgan@domain.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] text-[#172B45] focus:outline-none focus:border-[#4779A8]"
                  />
                </div>
              </div>

              {products.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                    Select Catalog Product
                  </label>
                  <select
                    value={simProductId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] bg-white text-[#172B45] focus:outline-none focus:border-[#4779A8]"
                  >
                    <option value="">-- Custom Order / Direct Payment --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — ${p.unitPrice.toFixed(2)} (Stock: {p.stockOnHand})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                    Payment Amount ($) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-[#D9E2EC] text-[#172B45] focus:outline-none focus:border-[#4779A8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                    Order Description
                  </label>
                  <input
                    type="text"
                    value={simDescription}
                    onChange={(e) => setSimDescription(e.target.value)}
                    placeholder="Payment for merchandise"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9E2EC] text-[#172B45] focus:outline-none focus:border-[#4779A8]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSimulating}
                className="w-full justify-center"
                leftIcon={<Zap className="w-4 h-4" />}
              >
                Execute Sandbox Payment Capture
              </Button>
            </form>

            {/* Simulation Response Receipt */}
            {simulationResult && (
              <div className="mt-4 p-4 rounded-lg bg-[#E8F6F3] border border-[#A3E4D7] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#16A085] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Payment Captured Successfully
                  </span>
                  <Badge variant="success" size="sm">
                    {simulationResult.transaction?.status || 'COMPLETED'}
                  </Badge>
                </div>

                <div className="text-xs text-[#334155] space-y-1 pt-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">PayPal Order ID:</span>
                    <span className="font-bold text-[#172B45]">{simulationResult.paypal_order_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Gross Amount:</span>
                    <span className="font-bold text-[#172B45]">
                      ${Number(simulationResult.gross_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Interchange Fee (2.9% + $0.30):</span>
                    <span className="font-bold text-[#C45B61]">
                      -${Number(simulationResult.paypal_fee).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#A3E4D7] pt-1">
                    <span className="font-bold text-[#172B45] font-sans">Net Merchant Deposit:</span>
                    <span className="font-bold text-[#16A085]">
                      ${Number(simulationResult.net_amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#16A085] pt-1">
                  ✓ Ingested via UnifiedTransactionService: inventory decremented, customer profile updated, daily sales aggregated.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
