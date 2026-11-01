import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-[#D9E2EC] shadow-2xs transition-all duration-150 ${
        hoverable ? 'hover:border-[#CBD5E1] hover:shadow-xs cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
