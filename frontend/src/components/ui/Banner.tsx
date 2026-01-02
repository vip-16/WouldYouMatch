import React from 'react';

export interface BannerProps {
  type?: 'warning' | 'error' | 'info' | 'success';
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children: React.ReactNode;
  onDismiss?: () => void;
}

export const Banner: React.FC<BannerProps> = ({
  type = 'warning',
  icon,
  action,
  children,
  onDismiss,
}) => {
  const typeStyles = {
    warning: 'bg-primary/10 border-primary/25 text-on-surface',
    error: 'bg-error/10 border-error/25 text-on-surface',
    info: 'bg-surface-container-high border-glass-border text-on-surface',
    success: 'bg-tertiary/10 border-tertiary/25 text-on-surface',
  };

  const defaultIcon = {
    warning: 'wifi_off',
    error: 'error',
    info: 'info',
    success: 'check_circle',
  }[type];

  return (
    <div
      role="alert"
      className={`w-full px-4 py-2.5 border-b flex items-center justify-between gap-3 text-xs font-body-md animate-fade-in ${typeStyles[type]}`}
    >
      <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
        <span className="material-symbols-outlined text-[18px] shrink-0 text-primary">
          {icon || defaultIcon}
        </span>
        <div className="flex-1 leading-snug">{children}</div>
        {action && (
          <button
            onClick={action.onClick}
            className="underline font-bold hover:text-primary transition-colors cursor-pointer shrink-0 ml-2"
          >
            {action.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="p-1 rounded text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
};
