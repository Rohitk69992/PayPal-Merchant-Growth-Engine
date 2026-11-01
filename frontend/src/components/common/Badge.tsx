import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'navy' | 'success' | 'warning' | 'danger' | 'neutral' | 'ai';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  size = 'md',
}) => {
  const base = 'inline-flex items-center font-medium leading-none select-none tracking-tight';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] font-semibold rounded-md gap-1',
    md: 'px-2.5 py-1 text-xs font-semibold rounded-md gap-1.5',
  };

  const variantStyles = {
    primary: 'bg-[#DCEAF5] text-[#1E3A5F] border border-[#CBD5E1]',
    navy: 'bg-[#1E3A5F] text-white border border-[#162C48]',
    success: 'bg-[#E8F6F3] text-[#16A085] border border-[#A3E4D7]',
    warning: 'bg-[#FEF9E7] text-[#936B15] border border-[#FAD7A0]',
    danger: 'bg-[#FADBD8] text-[#C45B61] border border-[#F5B7B1]',
    neutral: 'bg-[#E8EEF5] text-[#334155] border border-[#D9E2EC]',
    ai: 'bg-[#1E3A5F] text-[#DCEAF5] border border-[#4779A8]/50 shadow-2xs',
  };

  return (
    <span className={`${base} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
