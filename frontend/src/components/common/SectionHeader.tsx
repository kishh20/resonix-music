import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex items-end justify-between mb-4 ${className}`}>
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="text-xs md:text-sm font-semibold text-aurora-accent hover:text-aurora-accentHover transition-colors hover:underline"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
