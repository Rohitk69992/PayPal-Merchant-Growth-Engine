import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Receipt,
  Boxes,
  Package,
  Target,
  CreditCard,
  Settings,
  MoreHorizontal,
  X,
  TrendingUp,
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const mainTabs = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Catalog', path: '/products', icon: Boxes },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Marketing', path: '/marketing', icon: Target },
  ];

  const moreItems = [
    { name: 'Growth Engine', path: '/grow', icon: TrendingUp },
    { name: 'Sales Entry', path: '/sales', icon: TrendingUp },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
    { name: 'PayPal Integration', path: '/paypal', icon: CreditCard },
    { name: 'Settings & Audit', path: '/settings', icon: Settings },
  ];

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center py-2 px-1 text-[11px] font-medium transition-colors ${
      isActive ? 'text-[#0070e0] font-bold' : 'text-slate-500 hover:text-slate-900'
    }`;

  return (
    <>
      {/* "More" Drawer for Mobile Viewport */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 shadow-2xl border-t border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="font-bold text-slate-800 text-sm">All Merchant Growth Tools</span>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium text-xs border border-slate-100 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg lg:hidden">
        <div className="max-w-md mx-auto grid grid-cols-5 h-16">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink key={tab.path} to={tab.path} className={navClass}>
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{tab.name}</span>
              </NavLink>
            );
          })}

          {/* More Tab */}
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`flex flex-col items-center justify-center py-2 px-1 text-[11px] font-medium transition-colors cursor-pointer ${
              isMoreMenuOpen ? 'text-[#0070e0] font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
