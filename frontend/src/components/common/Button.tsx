import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'navy' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5 font-medium',
    md: 'px-3.5 py-2 text-xs font-semibold rounded-lg gap-2',
    lg: 'px-4.5 py-2.5 text-sm font-semibold rounded-xl gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[#4779A8] hover:bg-[#3B6891] text-white focus:ring-[#4779A8]/40 shadow-xs active:bg-[#32587B]',
    navy:
      'bg-[#1E3A5F] hover:bg-[#162C48] text-white focus:ring-[#1E3A5F]/40 shadow-xs active:bg-[#11233A]',
    secondary:
      'bg-[#E8EEF5] hover:bg-[#DCEAF5] text-[#172B45] border border-[#D9E2EC] focus:ring-[#4779A8]/30',
    outline:
      'bg-white hover:bg-[#F1F5F9] text-[#172B45] border border-[#D9E2EC] hover:border-[#CBD5E1] focus:ring-[#4779A8]/30 shadow-2xs',
    ghost:
      'bg-transparent hover:bg-[#E8EEF5] text-[#64748B] hover:text-[#172B45] focus:ring-[#4779A8]/20',
    danger:
      'bg-[#C45B61] hover:bg-[#AF4E54] text-white focus:ring-[#C45B61]/40 shadow-xs active:bg-[#9B4247]',
    success:
      'bg-[#16A085] hover:bg-[#138D75] text-white focus:ring-[#16A085]/40 shadow-xs active:bg-[#0F7560]',
  };

  return (
    <button
      className={`${base} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-current" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
