import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightElement,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="font-label-md text-xs font-semibold text-on-surface-variant">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-surface-container-low border ${
            error ? 'border-error' : 'border-glass-border'
          } rounded-md h-10 px-3 ${leftIcon ? 'pl-9' : ''} ${
            rightElement ? 'pr-11' : ''
          } text-sm text-on-surface placeholder:text-on-surface-variant/50 font-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors duration-150 ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-error font-body-md">{error}</span>}
    </div>
  );
};
