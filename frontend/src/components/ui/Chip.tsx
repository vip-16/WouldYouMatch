import React from 'react';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  emoji?: string;
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'outline';
  size?: 'sm' | 'md';
  active?: boolean;
  children: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  icon,
  emoji,
  variant = 'default',
  size = 'sm',
  active = false,
  className = '',
  children,
  ...props
}) => {
  const isClickable = Boolean(props.onClick);

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-1.5 text-xs md:text-sm gap-2',
  };

  const variantStyles = {
    default: active
      ? 'bg-surface-container-highest text-on-surface border-glass-border-hover font-semibold'
      : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border-glass-border',
    primary: active
      ? 'bg-primary/20 text-primary border-primary/40 font-bold'
      : 'bg-primary/10 hover:bg-primary/15 text-primary border-primary/20 font-medium',
    accent: active
      ? 'bg-accent/20 text-accent border-accent/40 font-bold'
      : 'bg-accent/10 hover:bg-accent/15 text-accent border-accent/20 font-medium',
    success: 'bg-tertiary/10 text-tertiary border-tertiary/20 font-medium',
    outline: 'bg-transparent border-glass-border text-on-surface-variant hover:text-on-surface',
  };

  const Component = isClickable ? 'button' : 'div';

  return (
    // @ts-expect-error Polymorphic container
    <Component
      className={`inline-flex items-center rounded-full border font-label-md transition-all duration-150 shrink-0 ${sizeStyles[size]} ${variantStyles[variant]} ${isClickable ? 'cursor-pointer active:scale-95' : ''} ${className}`}
      {...props}
    >
      {emoji && <span className="text-sm shrink-0 leading-none">{emoji}</span>}
      {icon && <span className="material-symbols-outlined text-[16px] shrink-0 leading-none">{icon}</span>}
      <span className="truncate">{children}</span>
    </Component>
  );
};
