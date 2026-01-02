import React from 'react';

export type ButtonVariant = 'primary-gradient' | 'secondary-solid' | 'ghost-icon' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary-solid',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Base classes with strict 8px / 12px radii, fast 150ms transitions, focus-visible
  const baseStyles = 'inline-flex items-center justify-center font-label-md font-semibold select-none transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
    md: 'h-10 px-4 text-sm rounded-md gap-2',
    lg: 'h-12 px-6 text-base rounded-lg gap-2.5',
    icon: 'w-9 h-9 p-0 rounded-md shrink-0 justify-center',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    'primary-gradient': 'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-elevation-1 hover:brightness-105 active:brightness-95',
    'secondary-solid': 'bg-surface-container-low hover:bg-surface-container border border-glass-border hover:border-glass-border-hover text-on-surface shadow-elevation-1',
    'ghost-icon': 'bg-transparent hover:bg-surface-container-high/60 text-on-surface-variant hover:text-on-surface',
    'accent': 'bg-accent hover:bg-accent-dim text-white shadow-elevation-1',
    'danger': 'bg-error/10 hover:bg-error/20 text-error border border-error/20',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
      ) : (
        <>
          {leftIcon && <span className="material-symbols-outlined text-[18px] shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="material-symbols-outlined text-[18px] shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
