import React, { useState } from 'react';
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
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSound = () => {
    sounds.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const handleLogoClick = () => {
    setMobileMenuOpen(false);
    if (onNavigateHome) onNavigateHome();
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
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
    <header className="fixed top-1 sm:top-2 left-0 right-0 z-50 h-14 sm:h-16 px-2 pt-1 sm:pt-2 safe-top transition-colors duration-300">
      <div className="mx-auto max-w-6xl h-full px-2.5 sm:px-4 md:px-5 flex items-center justify-between rounded-full bg-surface/85 backdrop-blur-xl border border-glass-border shadow-elevation-1">
        
        {/* Left: Brand Identity with Red Logo */}
        <div
          onClick={handleLogoClick}
          className="flex items-center cursor-pointer select-none group shrink-0"
          tabIndex={0}
          role="button"
          aria-label="WouldYouMatch? Home"
        >
          <Logo size="md" textClassName="text-sm sm:text-base md:text-lg inline" />
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center md:w-80 justify-start gap-6">
          <button
            onClick={() => scrollToSection('how-it-feels')}
            className="text-xs font-body-md font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('rankings')}
            className="text-xs font-body-md font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Rankings
          </button>
        </nav>

        {/* Right: Controls, Auth & CTA */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Sound Toggle (Visible on sm and up) */}
          <Button
            variant="ghost-icon"
            size="icon"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            className="hidden sm:inline-flex w-8 h-8 min-w-[32px] min-h-[32px]"
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

          <div className="hidden sm:block w-px h-4 bg-glass-border mx-0.5" />

          {/* Login / Upgrade Text link (Desktop) */}
          {user?.is_guest ? (
            <button
              onClick={onOpenLogin || onOpenYouSpace}
              className="text-xs font-body-md font-semibold text-on-surface-variant hover:text-on-surface px-2 py-1 transition-colors cursor-pointer hidden md:inline-block"
            >
              Login
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-1">
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
            className="relative flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer border border-transparent hover:border-glass-border focus-visible:ring-2 focus-visible:ring-primary"
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

          {/* Primary Action Button */}
          {onFindMatch && (
            <Button
              variant="primary-gradient"
              size="sm"
              onClick={onFindMatch}
              className="rounded-full px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-bold shadow-elevation-1"
            >
              <span className="inline sm:hidden">Play</span>
              <span className="hidden sm:inline">Find a Match</span>
            </Button>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-[4.2rem] left-2 right-2 z-50 bg-surface-container-lowest/95 backdrop-blur-2xl border border-glass-border rounded-2xl p-4 shadow-elevation-2 flex flex-col gap-3 animate-fade-in">
          <div className="flex flex-col gap-1 pb-2 border-b border-glass-border">
            <button
              onClick={() => scrollToSection('how-it-feels')}
              className="flex items-center justify-between py-2 px-3 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors text-left"
            >
              <span>How It Works</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_forward</span>
            </button>
            <button
              onClick={() => scrollToSection('rankings')}
              className="flex items-center justify-between py-2 px-3 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors text-left"
            >
              <span>Rankings & Leaderboard</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_forward</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost-icon"
                size="sm"
                onClick={toggleSound}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-glass-border text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {soundEnabled ? 'volume_up' : 'volume_off'}
                </span>
                <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
              </Button>
            </div>

            {user?.is_guest ? (
              <Button
                variant="secondary-solid"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenLogin) onOpenLogin();
                  else onOpenYouSpace();
                }}
                className="text-xs px-3.5 py-1.5 rounded-full font-bold"
              >
                Login / Save
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary-solid"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenYouSpace();
                  }}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold"
                >
                  My Account
                </Button>
                {onLogout && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="text-xs font-mono text-error px-2 py-1 rounded hover:bg-error/10"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

