import React from 'react';
import { LucideIcon, Inbox, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryText?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
  secondaryText,
  onSecondaryAction
}) => {
  return (
    <div className="ios-empty-state py-16 px-6 text-center max-w-md mx-auto flex flex-col items-center select-none">
      <div className="w-14 h-14 rounded-[18px] bg-gradient-to-b from-white to-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-500 mb-4 shadow-sm">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed mb-5 max-w-sm">
        {description}
      </p>

      {(actionText || secondaryText) && (
        <div className="flex items-center gap-2">
          {actionText && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-[11px] text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{actionText}</span>
            </button>
          )}
          {secondaryText && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex items-center space-x-1 px-4 py-2 rounded-[11px] text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            >
              <span>{secondaryText}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
