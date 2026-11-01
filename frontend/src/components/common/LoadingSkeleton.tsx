import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSkeletonProps {
  label?: string;
  rows?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  label = 'Loading financial telemetry...',
  rows = 3,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center space-y-4 ${className}`}>
      <div className="flex flex-col items-center justify-center gap-2 text-[#4779A8]">
        <Loader2 className="w-6 h-6 animate-spin text-[#4779A8]" />
        <span className="text-xs font-semibold text-[#64748B]">{label}</span>
      </div>
      <div className="space-y-2 max-w-md mx-auto pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-[#E8EEF5] rounded-md animate-pulse"
            style={{ width: `${100 - i * 15}%`, margin: '0 auto' }}
          />
        ))}
      </div>
    </div>
  );
};
