import React from 'react';
import { Bot, ShieldCheck, Smartphone, Monitor } from 'lucide-react';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onToggleAiDrawer: () => void;
  isAiDrawerOpen: boolean;
  isMobileDeviceView: boolean;
  onToggleDeviceView: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleAiDrawer,
  isAiDrawerOpen,
  isMobileDeviceView,
  onToggleDeviceView,
}) => {
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
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Responsive Device View Toggle for Reviewers */}
          <button
            onClick={onToggleDeviceView}
            title={isMobileDeviceView ? "Switch to Full Desktop View" : "Switch to Mobile Device Wireframe View"}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {isMobileDeviceView ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">Full Desktop</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">Mobile Wireframe</span>
              </>
            )}
          </button>

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
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Aanya"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-100"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">Aanya Sharma</p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Verified Merchant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
