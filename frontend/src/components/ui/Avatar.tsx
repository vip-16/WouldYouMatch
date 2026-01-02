import React from 'react';

export interface AvatarProps {
  alias?: string;
  seed?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  statusColor?: 'online' | 'busy' | 'offline';
  className?: string;
  isGradient?: boolean;
}

const SEED_PALETTE_MAP: Record<string, string> = {
  seed_cosmic: 'bg-gradient-to-br from-[#800b0b] to-[#b31b1b] text-white',
  seed_neon: 'bg-gradient-to-br from-[#1e2022] to-[#3a3f44] text-white',
  seed_emerald: 'bg-gradient-to-br from-[#4a0d13] to-[#800b0b] text-white',
  seed_cyan: 'bg-gradient-to-br from-[#2a2d32] to-[#4c5259] text-white',
  seed_solar: 'bg-gradient-to-br from-[#b45309] to-[#d97706] text-white',
  seed_velvet: 'bg-gradient-to-br from-[#9c1414] to-[#c92a2a] text-white',
  seed_mystic: 'bg-gradient-to-br from-[#5c0f16] to-[#8d1924] text-white',
  seed_lime: 'bg-gradient-to-br from-[#78350f] to-[#b45309] text-white',
};

const PALETTES = [
  'bg-gradient-to-br from-[#800b0b] to-[#b31b1b] text-white', // Crimson
  'bg-gradient-to-br from-[#1e2022] to-[#3a3f44] text-white', // Charcoal
  'bg-gradient-to-br from-[#9c1414] to-[#c92a2a] text-white', // Ruby
  'bg-gradient-to-br from-[#b45309] to-[#d97706] text-white', // Warm Amber
  'bg-gradient-to-br from-[#5c0f16] to-[#8d1924] text-white', // Burgundy
  'bg-gradient-to-br from-[#2a2d32] to-[#4c5259] text-white', // Ink
  'bg-gradient-to-br from-[#6b1414] to-[#9c1d1d] text-white', // Wine
  'bg-gradient-to-br from-[#78350f] to-[#92400e] text-white', // Bronze
];

export const Avatar: React.FC<AvatarProps> = ({
  alias = '?',
  seed,
  size = 'md',
  showStatus = false,
  statusColor = 'online',
  className = '',
  isGradient = true,
}) => {
  const initial = (alias.replace(/^seed_/, '')[0] || '?').toUpperCase();

  // Deterministic palette index or explicit seed mapping
  let bgGradient = SEED_PALETTE_MAP[seed || alias];
  if (!bgGradient) {
    let hash = 0;
    const str = seed || alias;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    bgGradient = PALETTES[Math.abs(hash) % PALETTES.length];
  }

  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  };

  const statusStyles = {
    online: 'bg-tertiary',
    busy: 'bg-primary',
    offline: 'bg-on-surface-variant',
  };

  const bgStyle = isGradient
    ? bgGradient
    : 'bg-surface-container-high text-on-surface font-bold border border-glass-border';

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full font-display font-bold shrink-0 select-none shadow-elevation-1 ${sizeStyles[size]} ${bgStyle} ${className}`}
    >
      {initial}
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${statusStyles[statusColor]}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
