import React from 'react';
import { Bot, ShieldCheck } from 'lucide-react';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleAiDrawer: () => void;
  isAiDrawerOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleAiDrawer,
  isAiDrawerOpen,
}) => {
  const { user, currentMerchant } = useAuth();

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ME';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Left Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* PayPal Stylized Double-P Logo */}
            <div className="w-8 h-8 rounded-lg bg-[#003087] flex items-center justify-center text-white font-black text-lg tracking-tighter shadow-xs">
              <span className="text-[#0079C1]">P</span>
              <span className="-ml-1 text-white">P</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#003087]">
              PayPal <span className="text-slate-500 font-semibold text-sm">Growth Engine</span>
            </span>
          </div>

          <Badge variant="success" size="sm" className="hidden sm:inline-flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sandbox Active
          </Badge>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* AI Copilot Quick Launcher Button */}
          <button
            onClick={onToggleAiDrawer}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs ${
              isAiDrawerOpen
                ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Copilot</span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-100 shadow-xs">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {user?.full_name || 'Partner'}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span className="truncate max-w-[120px]">
                  {currentMerchant?.business_name || 'Verified Merchant'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
