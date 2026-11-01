import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Receipt,
  Boxes,
  CreditCard,
  Settings,
  Target,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { currentMerchant } = useAuth();

  const navigationSections = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Growth Engine', path: '/grow', icon: TrendingUp, badge: 'AI' },
      ],
    },
    {
      title: 'BUSINESS OPERATIONS',
      items: [
        { name: 'Products Catalog', path: '/products', icon: Boxes },
        { name: 'Sales Entry', path: '/sales', icon: TrendingUp },
        { name: 'Inventory Assistant', path: '/inventory', icon: Package },
        { name: 'Transactions Ledger', path: '/transactions', icon: Receipt },
      ],
    },
    {
      title: 'BUSINESS INTELLIGENCE',
      items: [
        { name: 'Marketing & RFM', path: '/marketing', icon: Target, badge: 'ML' },
      ],
    },
    {
      title: 'INTEGRATIONS',
      items: [
        { name: 'PayPal Connections', path: '/paypal', icon: CreditCard },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { name: 'Profile & Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-120 ${
      isActive
        ? 'bg-[#DCEAF5] text-[#1E3A5F] font-semibold border-l-2 border-[#1E3A5F] pl-2.5 shadow-2xs'
        : 'text-[#64748B] hover:text-[#172B45] hover:bg-[#F1F5F9]'
    }`;

  return (
    <aside
      className={`w-60 bg-white border-r border-[#D9E2EC] flex flex-col justify-between p-3.5 select-none shrink-0 ${className}`}
    >
      <div className="space-y-5 overflow-y-auto pr-1">
        {navigationSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
              {section.title}
            </p>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.path} to={item.path} className={linkClass}>
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0 text-[#4779A8]" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#1E3A5F] text-white rounded font-mono">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Tenant Information Box */}
      <div className="pt-3 border-t border-[#D9E2EC]">
        <div className="p-3 rounded-lg bg-[#F1F5F9] border border-[#D9E2EC] text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Tenant Environment
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#16A085]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A085]" />
              Online
            </span>
          </div>
          <p className="font-bold text-[#172B45] truncate">
            {currentMerchant?.business_name || 'Merchant Workspace'}
          </p>
          <div className="flex items-center justify-between text-[10px] text-[#64748B] mt-1 font-mono">
            <span>Currency: {currentMerchant?.currency || 'USD'}</span>
            <NavLink
              to="/settings"
              className="text-[#4779A8] hover:text-[#1E3A5F] font-semibold flex items-center"
            >
              Audit <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>
        </div>
      </div>
    </aside>
  );
};
