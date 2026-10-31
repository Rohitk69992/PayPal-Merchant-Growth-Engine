import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  TrendingUp,
  Target,
  Package,
  Receipt,
  Boxes,
  CreditCard,
  Settings,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const primaryNav = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Growth Engine', path: '/grow', icon: TrendingUp, badge: 'AI' },
    { name: 'Product Catalog', path: '/products', icon: Boxes },
    { name: 'Sales Entry', path: '/sales', icon: TrendingUp },
    { name: 'Inventory Assistant', path: '/inventory', icon: Package },
    { name: 'Marketing & RFM', path: '/marketing', icon: Target },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
  ];

  const secondaryNav = [
    { name: 'PayPal Integration', path: '/paypal', icon: CreditCard, badge: 'API' },
    { name: 'Settings & Audit', path: '/settings', icon: Settings },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <aside className={`w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 ${className}`}>
      <div className="space-y-6">
        {/* Core Growth Section */}
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Intelligence Engine
          </p>
          <nav className="space-y-1">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.path} to={item.path} className={linkClass}>
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-blue-600 text-white rounded-md tracking-wider">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Integration & Settings */}
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Platform & Developer
          </p>
          <nav className="space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.path} to={item.path} className={linkClass}>
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-emerald-600 text-white rounded-md tracking-wider">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Merchant Support Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-4 h-4 text-blue-300" />
          <span className="text-xs font-bold tracking-tight">PayPal AI Partner</span>
        </div>
        <p className="text-[11px] text-blue-200 leading-snug">
          Transaction stream continuously calibrated with Scikit-learn RFM and Holt-Winters models.
        </p>
        <NavLink
          to="/settings"
          className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-white/90 hover:text-white pt-2 border-t border-blue-800/80"
        >
          <span>Audit Ledger & Export</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </NavLink>
      </div>
    </aside>
  );
};
