import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  textClassName?: string;
  iconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
  iconOnly = false,
}) => {
  const sizeMap = {
    sm: { img: 'h-6 w-auto', container: 'w-7 h-7' },
    md: { img: 'h-8 w-auto', container: 'w-8 h-8' },
    lg: { img: 'h-10 w-auto', container: 'w-10 h-10' },
    xl: { img: 'h-14 w-auto', container: 'w-14 h-14' },
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Brand Icon: Interlocking Hearts with Question Mark in vibrant theme red */}
      <div className={`relative flex items-center justify-center shrink-0 ${sizeMap[size].container}`}>
        <img
          src="/logo.png"
          alt="WouldYouMatch? Logo"
          width="36"
          height="36"
          loading="eager"
          decoding="async"
          className={`${sizeMap[size].img} object-contain filter drop-shadow-[0_2px_8px_rgba(224,49,49,0.35)] transition-transform duration-200 group-hover:scale-105`}
        />
      </div>

      {!iconOnly && showText && (
        <span className={`font-display font-bold text-on-surface tracking-tight leading-none group-hover:text-primary transition-colors ${textSizes[size]} ${textClassName}`}>
          WouldYou<span className="text-primary font-black">Match?</span>
        </span>
      )}
    </div>
  );
};
