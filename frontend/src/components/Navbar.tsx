import React from 'react';
import { User } from '../types';
import { sounds } from '../services/sound';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Logo } from './ui/Logo';

interface NavbarProps {
  user: User | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenYouSpace: () => void;
  unreadCount?: number;
  onFindMatch?: () => void;
  onOpenLogin?: () => void;
  onNavigateHome?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  darkMode,
  onToggleDarkMode,
  onOpenYouSpace,
  unreadCount = 0,
  onFindMatch,
  onOpenLogin,
  onNavigateHome,
  onLogout,
}) => {
  const [soundEnabled, setSoundEnabled] = React.useState(sounds.enabled);

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleLogoClick = () => {
    if (onNavigateHome) onNavigateHome();
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else if (onNavigateHome) {
      onNavigateHome();
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-surface/85 dark:bg-surface/80 backdrop-blur-md border-b border-glass-border safe-top transition-colors duration-150">
      <div className="mx-auto max-w-6xl h-full px-4 md:px-6 flex items-center justify-between">
        
        {/* Left: Brand Identity with New Red Logo */}
        <div
          onClick={handleLogoClick}
          className="flex items-center cursor-pointer select-none group shrink-0"
          tabIndex={0}
          role="button"
          aria-label="WouldYouMatch? Home"
        >
          <Logo size="md" />
        </div>

        {/* Center: Navigation Links (Matching Video Reference) */}
        <nav className="hidden lg:flex items-center gap-6">
          <button
            onClick={() => scrollToSection('about')}
            className="text-xs font-body-md font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="text-xs font-body-md font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('what-you-get')}
            className="text-xs font-body-md font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            What you get
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="text-xs font-body-md font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            FAQ
          </button>
        </nav>

        {/* Right: Controls, Auth & CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sound Toggle */}
          <Button
            variant="ghost-icon"
            size="icon"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            className="w-8 h-8 min-w-[32px] min-h-[32px]"
          >
            <span className="material-symbols-outlined text-[18px]">
              {soundEnabled ? 'volume_up' : 'volume_off'}
            </span>
          </Button>

          {/* Theme Switcher */}
          <Button
            variant="ghost-icon"
            size="icon"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 min-w-[32px] min-h-[32px]"
          >
            <span className="material-symbols-outlined text-[18px]">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </Button>

          <div className="w-px h-4 bg-glass-border mx-0.5" />

          {/* Login / Upgrade Text link (Matching Video) */}
          {user?.is_guest ? (
            <button
              onClick={onOpenLogin || onOpenYouSpace}
              className="text-xs font-body-md font-semibold text-on-surface-variant hover:text-on-surface px-2 py-1 transition-colors cursor-pointer hidden sm:inline-block"
            >
              Login
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={onOpenYouSpace}
                className="text-xs font-body-md font-semibold text-on-surface-variant hover:text-on-surface px-2 py-1 transition-colors cursor-pointer"
              >
                Account
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-[11px] font-mono text-on-surface-variant/70 hover:text-error px-1.5 py-1 transition-colors cursor-pointer"
                  title="Sign out of account"
                >
                  Sign Out
                </button>
              )}
            </div>
          )}

          {/* Profile Trigger (Avatar + Alias + Unread Badges) */}
          <button
            onClick={onOpenYouSpace}
            aria-label={`Open profile for ${user?.alias || 'User'}`}
            title="Open Profile (Friends, History, Stats)"
            className="relative flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer border border-transparent hover:border-glass-border focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="relative">
              <Avatar
                alias={user?.alias}
                size="sm"
                showStatus={true}
                statusColor="online"
                isGradient={!user?.is_guest}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="hidden md:flex flex-col items-start leading-none text-left">
              <span className="font-label-md text-xs font-bold text-on-surface max-w-[85px] truncate">
                {user?.alias || 'Guest'}
              </span>
              <span className="text-[10px] text-on-surface-variant font-mono">
                {user?.is_guest ? 'Guest' : 'Member'}
              </span>
            </div>
          </button>

          {/* Primary Action Button (Matching Video: "Get started" / "Find a Match") */}
          {onFindMatch && (
            <Button
              variant="primary-gradient"
              size="sm"
              onClick={onFindMatch}
              className="rounded-full px-3.5 py-1.5 text-xs font-bold shadow-elevation-1"
            >
              Find a Match
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
