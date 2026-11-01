import React, { useState, useEffect, useRef } from 'react';
import { Bot, ChevronDown, Check, LogOut, Settings, ExternalLink } from 'lucide-react';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import type { PayPalConnectionStatus } from '../../types';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleAiDrawer: () => void;
  isAiDrawerOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleAiDrawer,
  isAiDrawerOpen,
}) => {
  const { user, currentMerchant, merchants, switchMerchant, logout } = useAuth();
  const navigate = useNavigate();
  const [payPalStatus, setPayPalStatus] = useState<PayPalConnectionStatus | null>(null);
  const [isMerchantMenuOpen, setIsMerchantMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const merchantMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Check PayPal connection status from API
  useEffect(() => {
    let isMounted = true;
    apiClient
      .getPayPalStatus()
      .then((res) => {
        if (isMounted) setPayPalStatus(res);
      })
      .catch(() => {
        if (isMounted) setPayPalStatus({ is_connected: false });
      });
    return () => {
      isMounted = false;
    };
  }, [currentMerchant]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        merchantMenuRef.current &&
        !merchantMenuRef.current.contains(event.target as Node)
      ) {
        setIsMerchantMenuOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ME';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#D9E2EC] px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Left Info */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 focus:outline-none">
            {/* PayPal Stylized Monogram */}
            <div className="w-8 h-8 rounded-lg bg-[#1E3A5F] flex items-center justify-center text-white font-black text-base tracking-tighter shadow-2xs border border-[#162C48]">
              <span className="text-[#DCEAF5]">P</span>
              <span className="-ml-1 text-white">P</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-base tracking-tight text-[#1E3A5F]">
                  PayPal
                </span>
                <span className="text-xs font-semibold text-[#4779A8] tracking-tight">
                  Growth Engine
                </span>
              </div>
              <span className="text-[10px] text-[#94A3B8] font-medium tracking-wide">
                Financial Intelligence
              </span>
            </div>
          </Link>

          {/* Current Merchant Switcher */}
          {currentMerchant && (
            <div className="relative hidden md:block" ref={merchantMenuRef}>
              <button
                onClick={() => setIsMerchantMenuOpen(!isMerchantMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E8EEF5] border border-[#D9E2EC] text-xs font-semibold text-[#172B45] transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#4779A8]" />
                <span className="truncate max-w-[140px]">{currentMerchant.business_name}</span>
                <span className="px-1.5 py-0.2 text-[10px] bg-[#DCEAF5] text-[#1E3A5F] rounded font-mono font-bold">
                  {currentMerchant.currency}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
              </button>

              {/* Merchant Dropdown */}
              {isMerchantMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-[#D9E2EC] py-1.5 z-40 animate-in fade-in-50 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#D9E2EC]">
                    Switch Merchant Tenant
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {merchants.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          switchMerchant(m.id);
                          setIsMerchantMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                          m.id === currentMerchant.id
                            ? 'bg-[#DCEAF5] text-[#1E3A5F] font-bold'
                            : 'text-[#172B45] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate font-medium">{m.business_name}</p>
                          <p className="text-[10px] text-[#64748B] font-mono">{m.currency} • {m.category || 'General'}</p>
                        </div>
                        {m.id === currentMerchant.id && (
                          <Check className="w-4 h-4 text-[#1E3A5F] shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-[#D9E2EC]">
                    <Link
                      to="/onboarding"
                      onClick={() => setIsMerchantMenuOpen(false)}
                      className="block px-3 py-1.5 text-xs text-[#4779A8] font-semibold hover:bg-[#F1F5F9]"
                    >
                      + Register New Merchant Tenant
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Genuine PayPal Status Badge */}
          {payPalStatus?.is_connected ? (
            <Badge variant="success" size="sm" className="hidden lg:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A085]" />
              PayPal Connected ({payPalStatus.environment || 'Sandbox'})
            </Badge>
          ) : (
            <Link to="/paypal" className="hidden lg:inline-flex">
              <Badge variant="neutral" size="sm" className="hover:bg-[#DCEAF5] text-[#64748B] gap-1 cursor-pointer">
                <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                PayPal Not Connected
              </Badge>
            </Link>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* AI Copilot Quick Launcher Button */}
          <button
            onClick={onToggleAiDrawer}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
              isAiDrawerOpen
                ? 'bg-[#1E3A5F] text-white border-[#162C48] shadow-xs'
                : 'bg-[#E8EEF5] hover:bg-[#DCEAF5] text-[#1E3A5F] border-[#D9E2EC]'
            }`}
          >
            <Bot className="w-4 h-4 text-[#4779A8]" />
            <span>AI Copilot</span>
          </button>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-xs border border-[#162C48] shadow-2xs">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-[#172B45] leading-tight">
                  {user?.full_name || 'Merchant'}
                </p>
                <p className="text-[10px] text-[#64748B] truncate max-w-[110px]">
                  {user?.email || 'Authenticated'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B] hidden sm:block" />
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-[#D9E2EC] py-1.5 z-40 animate-in fade-in-50 duration-100">
                <div className="px-3 py-2 border-b border-[#D9E2EC]">
                  <p className="text-xs font-bold text-[#172B45] truncate">{user?.full_name}</p>
                  <p className="text-[11px] text-[#64748B] font-mono truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#172B45] hover:bg-[#F1F5F9]"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Account & Settings</span>
                  </Link>
                  <Link
                    to="/paypal"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#172B45] hover:bg-[#F1F5F9]"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>PayPal Integration</span>
                  </Link>
                </div>
                <div className="pt-1 border-t border-[#D9E2EC]">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#C45B61] font-semibold hover:bg-[#FADBD8]/40 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
