import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-dashed border-[#CBD5E1] bg-white p-8 sm:p-12 text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-[#E8EEF5] text-[#4779A8] flex items-center justify-center mx-auto mb-3 border border-[#D9E2EC]">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-[#172B45] tracking-tight">{title}</h3>
      <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
};
