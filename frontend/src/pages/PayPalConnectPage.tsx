import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { PayPalConnectionStatus, ProductInventory } from '../types';
import { 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  ExternalLink, 
  Loader2,
  DollarSign
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const PayPalConnectPage: React.FC = () => {
  const [status, setStatus] = useState<PayPalConnectionStatus | null>(null);
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Connect Form State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [environment, setEnvironment] = useState('sandbox');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);

  // Simulation Form State
  const [simCustomerName, setSimCustomerName] = useState('Elena Rostova');
  const [simCustomerEmail, setSimCustomerEmail] = useState('elena.rostova@example.com');
  const [simAmount, setSimAmount] = useState('149.99');
  const [simDescription, setSimDescription] = useState('Purchase of Wireless Headphones');
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
        setSimDescription(`Purchase of ${prods[0].name}`);
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
      setConnectMessage('PayPal Sandbox credentials successfully connected and verified.');
    } catch (err: any) {
      setConnectMessage(err.message || 'Failed to connect PayPal Sandbox.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimulationResult(null);
    setSimulationError(null);
    try {
      const res = await apiClient.simulateSandboxPayment({
        amount: parseFloat(simAmount),
        description: simDescription,
        customer_email: simCustomerEmail,
        customer_name: simCustomerName,
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
      setSimDescription(`Purchase of ${prod.name}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-sm font-semibold">Verifying PayPal connection status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <CreditCard className="w-7 h-7 text-[#0070BA]" />
          PayPal Developer Platform Integration
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your PayPal REST API credentials, webhook telemetry handlers, and simulate real-time customer captures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Connection Setup (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Connection Credentials
              </h2>
              {status?.is_connected ? (
                <Badge variant="success" size="sm" className="gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active
                </Badge>
              ) : (
                <Badge variant="warning" size="sm" className="gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Not Connected
                </Badge>
              )}
            </div>

            {connectMessage && (
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-900 text-xs font-semibold">
                {connectMessage}
              </div>
            )}

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  PayPal Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
                >
                  <option value="sandbox">Sandbox (Development / Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Client ID *
                </label>
                <input
                  type="text"
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="e.g. A21AA...sandbox_client_id"
                  className="w-full px-3 py-2 text-sm border rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Client Secret *
                </label>
                <input
                  type="password"
                  required
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full px-3 py-2 text-sm border rounded-xl font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-bold bg-[#0070BA] hover:bg-[#003087] transition-colors cursor-pointer shadow-xs disabled:opacity-50 text-xs"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Save & Verify Credentials</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
              <p className="flex items-center gap-1.5 font-medium text-slate-700">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <a
                  href="https://developer.paypal.com/dashboard/applications/sandbox"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Get Sandbox Credentials from PayPal Developer Dashboard
                </a>
              </p>
              <p className="text-[11px] leading-relaxed">
                Credentials are encrypted symmetrically at rest using AES/XOR hashing before persistent database storage.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Interactive Sandbox Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Interactive Sandbox Payment Simulator
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Execute genuine end-to-end payment captures without requiring an external buyer checkout flow.
                </p>
              </div>
            </div>

            {simulationError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-800 text-xs font-semibold">
                {simulationError}
              </div>
            )}

            <form onSubmit={handleSimulatePayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Buyer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={simCustomerName}
                    onChange={(e) => setSimCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Buyer Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={simCustomerEmail}
                    onChange={(e) => setSimCustomerEmail(e.target.value)}
                    placeholder="buyer@example.com"
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
              </div>

              {products.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Catalog Product (Auto-fills Price & Deducts Inventory)
                  </label>
                  <select
                    value={simProductId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Payment Amount ($) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Order Description
                  </label>
                  <input
                    type="text"
                    value={simDescription}
                    onChange={(e) => setSimDescription(e.target.value)}
                    placeholder="Payment for goods"
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold bg-[#0070BA] hover:bg-[#003087] transition-colors cursor-pointer shadow-sm disabled:opacity-50 text-sm"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Sandbox Capture...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Simulate PayPal Payment Capture</span>
                  </>
                )}
              </button>
            </form>

            {/* Simulation Response Receipt */}
            {simulationResult && (
              <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Payment Captured Successfully
                  </span>
                  <Badge variant="success" size="sm">
                    {simulationResult.transaction.status}
                  </Badge>
                </div>

                <div className="text-xs text-emerald-800 space-y-1 pt-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">PayPal Order ID:</span>
                    <span className="font-bold">{simulationResult.transaction.paypal_order_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Captured:</span>
                    <span className="font-bold">${simulationResult.transaction.gross_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PayPal Fee (2.9% + $0.30):</span>
                    <span className="font-bold text-red-600">-${simulationResult.transaction.fee_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200 pt-1">
                    <span className="text-slate-700 font-bold font-sans">Net Merchant Deposit:</span>
                    <span className="font-bold text-emerald-900">${simulationResult.transaction.net_amount.toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-700 pt-1">
                  ✓ Recorded to Transactions table, updated Customer spend profile, and adjusted merchant balance.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
