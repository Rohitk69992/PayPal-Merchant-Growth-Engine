import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import {
  Building2,
  Download,
  LogOut,
  Shield,
  Clock,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

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
    <div className="space-y-5 pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D9E2EC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
              Merchant Account, Multi-Tenancy & Security
            </h1>
            <Badge variant="navy" size="sm">
              Tenant Settings
            </Badge>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage your merchant tenant workspace, authenticated profile, immutable audit ledger, and cryptographic data exports.
          </p>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={logout}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
        >
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Business & User Profile (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-5 border-[#D9E2EC]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#172B45] flex items-center gap-2 pb-3 border-b border-[#D9E2EC] mb-3">
              <Building2 className="w-4 h-4 text-[#4779A8]" />
              Active Merchant Profile
            </h2>

            {currentMerchant ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Business Legal Name
                  </label>
                  <p className="text-sm font-bold text-[#172B45] mt-0.5">{currentMerchant.business_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      Ledger Currency
                    </label>
                    <p className="text-xs font-semibold text-[#172B45] font-mono mt-0.5">{currentMerchant.currency}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      Industry Sector
                    </label>
                    <p className="text-xs font-semibold text-[#172B45] mt-0.5">{currentMerchant.category || 'General Retail'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Merchant Tenant ID
                  </label>
                  <p className="text-[11px] font-mono text-[#334155] bg-[#F1F5F9] p-2 rounded-md border border-[#D9E2EC] mt-0.5 truncate">
                    {currentMerchant.id}
                  </p>
                </div>

                {merchants.length > 1 && (
                  <div className="pt-2">
                    <label className="text-xs font-bold text-[#172B45] block mb-1">
                      Switch Active Merchant Tenant:
                    </label>
                    <select
                      value={currentMerchant.id}
                      onChange={(e) => switchMerchant(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#D9E2EC] rounded-lg bg-white text-[#172B45] focus:outline-none focus:border-[#4779A8]"
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
              <p className="text-xs text-[#64748B]">No active merchant selected.</p>
            )}
          </Card>

          <Card className="p-5 border-[#D9E2EC]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#172B45] flex items-center gap-2 pb-3 border-b border-[#D9E2EC] mb-3">
              <UserCheck className="w-4 h-4 text-[#16A085]" />
              Authenticated User Account
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Full Name</span>
                <p className="font-semibold text-[#172B45] mt-0.5">{user?.full_name}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Email</span>
                <p className="font-semibold text-[#172B45] font-mono mt-0.5">{user?.email}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Account Status</span>
                <p className="mt-1">
                  <Badge variant={user?.is_active ? 'success' : 'danger'} size="sm">
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Email Verification</span>
                <p className="mt-1">
                  <Badge variant={user?.is_verified ? 'success' : 'neutral'} size="sm">
                    {user?.is_verified ? 'Verified' : 'Pending Verification'}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Member Since</span>
                <p className="font-semibold text-[#172B45] mt-0.5">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Active Member'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white border-[#D9E2EC]">
            <div className="flex items-center gap-2 mb-1.5">
              <Download className="w-4 h-4 text-[#4779A8]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B45]">Data Portability & GDPR Export</h3>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed mb-3">
              Generate and download your complete JSON dataset including product catalog, daily sales records, transactions, customer profiles, and audit trails.
            </p>
            <Button
              variant="outline"
              size="md"
              onClick={handleExportData}
              disabled={isExporting}
              isLoading={isExporting}
              className="w-full"
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export Complete Tenant JSON
            </Button>
          </Card>
        </div>

        {/* Right Column: Immutable Audit Ledger (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="p-5 border-[#D9E2EC]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC] mb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#172B45] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#4779A8]" />
                  Immutable Platform Audit Ledger
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Append-only ledger of database mutations, sales entries, payment captures, and AI tool calls.
                </p>
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#64748B]">
                <Loader2 className="w-6 h-6 animate-spin text-[#4779A8] mb-2" />
                <span className="text-xs">Loading audit ledger...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 text-[#64748B] text-xs bg-[#F8FAFC] rounded-lg border border-dashed border-[#D9E2EC]">
                <Clock className="w-6 h-6 text-[#94A3B8] mx-auto mb-1.5" />
                No audit events recorded yet. Mutations will appear here automatically.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#F8FAFC] border-b border-[#D9E2EC] text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5">Timestamp</th>
                      <th className="px-3 py-2.5">Action</th>
                      <th className="px-3 py-2.5">Entity / Resource</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {auditLogs.slice(0, 15).map((log) => (
                      <tr key={log.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-3 py-2.5 text-[#64748B]">
                          {new Date(log.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-[#1E3A5F]">
                          <span className="px-1.5 py-0.5 rounded bg-[#E8EEF5] text-[10px] text-[#1E3A5F]">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[#334155]">
                          {log.entity_type || log.resource_type || 'SYSTEM'}{' '}
                          {log.entity_id || log.resource_id ? `(${String(log.entity_id || log.resource_id).slice(0, 8)}...)` : ''}
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
