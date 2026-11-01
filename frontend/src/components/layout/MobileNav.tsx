import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
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
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
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
    `flex flex-col items-center justify-center py-1.5 px-1 text-[10px] font-medium transition-colors ${
      isActive
        ? 'text-[#1E3A5F] font-bold border-t-2 border-[#1E3A5F]'
        : 'text-[#64748B] hover:text-[#172B45]'
    }`;

  return (
    <>
      {/* "More" Slide-up Sheet for Mobile */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#172B45]/50 backdrop-blur-xs flex items-end lg:hidden">
          <div
            className="fixed inset-0"
            onClick={() => setIsMoreMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white w-full rounded-t-2xl p-5 shadow-2xl border-t border-[#D9E2EC] z-10">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EC] mb-3">
              <span className="font-bold text-[#172B45] text-xs uppercase tracking-wider">
                All Navigation Modules
              </span>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-lg text-[#64748B] hover:bg-[#E8EEF5] cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#DCEAF5] text-[#172B45] font-medium text-xs border border-[#D9E2EC] transition-colors"
                  >
                    <Icon className="w-4 h-4 text-[#4779A8] shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#D9E2EC] shadow-sm lg:hidden">
        <div className="max-w-md mx-auto grid grid-cols-5 h-14">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink key={tab.path} to={tab.path} className={navClass}>
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{tab.name}</span>
              </NavLink>
            );
          })}

          {/* More Tab */}
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 text-[10px] font-medium transition-colors cursor-pointer ${
              isMoreMenuOpen
                ? 'text-[#1E3A5F] font-bold border-t-2 border-[#1E3A5F]'
                : 'text-[#64748B] hover:text-[#172B45]'
            }`}
          >
            <MoreHorizontal className="w-4 h-4 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
