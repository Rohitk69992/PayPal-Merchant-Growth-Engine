import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { 
  Settings, 
  Building2, 
  Download, 
  LogOut, 
  Shield, 
  Clock, 
  UserCheck, 
  Loader2 
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const { user, currentMerchant, merchants, switchMerchant, logout } = useAuth();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const logs = await apiClient.getAuditLogs();
        setAuditLogs(logs);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setIsLoadingLogs(false);
      }
    };
    fetchLogs();
  }, []);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const exportJson = await apiClient.exportData();
      const blob = new Blob([JSON.stringify(exportJson, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `merchant_export_${currentMerchant?.id || 'all'}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export data: ' + err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-blue-600" />
            Account, Multi-Tenancy & Compliance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your merchant tenant profiles, session security, immutable audit logs, and data exports.
          </p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer border border-red-200 self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Business & User Profile (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <Building2 className="w-5 h-5 text-blue-600" />
              Active Merchant Profile
            </h2>

            {currentMerchant ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Business Name
                  </label>
                  <p className="text-base font-bold text-slate-900">{currentMerchant.business_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Currency
                    </label>
                    <p className="text-sm font-semibold text-slate-800">{currentMerchant.currency}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Industry
                    </label>
                    <p className="text-sm font-semibold text-slate-800">{currentMerchant.category || 'General'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Merchant Tenant ID
                  </label>
                  <p className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {currentMerchant.id}
                  </p>
                </div>

                {merchants.length > 1 && (
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Switch Active Merchant:
                    </label>
                    <select
                      value={currentMerchant.id}
                      onChange={(e) => switchMerchant(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
                    >
                      {merchants.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.business_name} ({m.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active merchant selected.</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Authenticated User
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Name</span>
                <p className="font-semibold text-slate-800">{user?.full_name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Email</span>
                <p className="font-semibold text-slate-800">{user?.email}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Account Status</span>
                <p className="mt-0.5">
                  <Badge variant="success" size="sm">
                    Active & Verified
                  </Badge>
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-slate-900 to-blue-950 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-blue-300" />
              <h3 className="text-base font-bold">GDPR & Tenant Data Export</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Download your complete cryptographic JSON payload encompassing products, daily sales, transactions, customer profiles, and audit trails.
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Generating JSON Export...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Download Full JSON Export</span>
                </>
              )}
            </button>
          </Card>
        </div>

        {/* Right Column: Immutable Audit Logs (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Platform Security & Audit Trails
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable ledger of operational mutations, transactions, and AI tool invocations.
                </p>
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                <span className="text-xs">Loading audit ledger...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No audit events recorded yet. Perform actions like product creation, sales entry, or payment capture.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Timestamp</th>
                      <th className="px-3 py-2.5">Action</th>
                      <th className="px-3 py-2.5">Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.slice(0, 15).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 font-mono text-slate-500">
                          {new Date(log.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-800">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-mono">
                          {log.entity_type || log.resource_type || 'SYSTEM'}{' '}
                          {(log.entity_id || log.resource_id) ? `(${String(log.entity_id || log.resource_id).slice(0, 8)}...)` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
