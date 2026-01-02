import React, { useState } from 'react';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { User } from '../types';
import { API_BASE } from '../services/api';

interface AccountUpgradeModalProps {
  currentUser: User | null;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  initialMode?: 'upgrade' | 'login';
}

export const AccountUpgradeModal: React.FC<AccountUpgradeModalProps> = ({
  currentUser,
  onClose,
  onSuccess,
  initialMode = 'upgrade',
}) => {
  const [mode, setMode] = useState<'upgrade' | 'login'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Bot honeypot trap
    if (honeypot.trim() !== '') {
      return;
    }

    if (mode === 'upgrade') {
      const cleanUser = username.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();

      if (!cleanUser || !cleanEmail || !cleanPass) {
        setError('Please fill in all required fields');
        return;
      }

      if (cleanUser.length < 3 || cleanUser.length > 25) {
        setError('Username must be between 3 and 25 characters');
        return;
      }

      const userRegex = /^[a-zA-Z0-9_]+$/;
      if (!userRegex.test(cleanUser)) {
        setError('Username can only contain letters, numbers, and underscores');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setError('Please provide a valid email address');
        return;
      }

      if (cleanPass.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/auth/upgrade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser?.id || '',
            username: cleanUser,
            email: cleanEmail,
            password: cleanPass,
            honeypot: honeypot,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('wouldyoumatch_auth_token', data.access_token);
          localStorage.setItem('wyrmg_auth_token', data.access_token);
          onSuccess(data.user);
          onClose();
        } else {
          setError(data.detail || 'Failed to register account. Username or email may already be taken.');
        }
      } catch {
        setError('Network error connecting to auth service. Please check your connection.');
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      const cleanIdentifier = username.trim();
      const cleanPass = password.trim();

      if (!cleanIdentifier || !cleanPass) {
        setError('Please enter your username/email and password');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: cleanIdentifier,
            password: cleanPass,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('wouldyoumatch_auth_token', data.access_token);
          localStorage.setItem('wyrmg_auth_token', data.access_token);
          onSuccess(data.user);
          onClose();
        } else {
          setError(data.detail || 'Invalid username/email or password');
        }
      } catch {
        setError('Network error connecting to auth service. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      title={mode === 'upgrade' ? (currentUser ? 'Save Your Profile & Unlock Friends' : 'Create an Account') : 'Welcome Back'}
      description={
        mode === 'upgrade'
          ? 'Attach your history and vibe statistics to a permanent account with a custom username.'
          : 'Log into your permanent WouldYouMatch? account to access your friends and duel history.'
      }
      icon={mode === 'upgrade' ? 'stars' : 'lock'}
      maxWidth="md"
    >
      {/* Symmetrical Mode Switch Tabs */}
      <div className="grid grid-cols-2 bg-surface-container/60 p-1 rounded-xl border border-glass-border mb-5">
        <button
          type="button"
          onClick={() => {
            setMode('upgrade');
            setError(null);
          }}
          className={`py-2 text-xs font-label-md font-bold transition-all cursor-pointer rounded-lg flex items-center justify-center gap-1.5 ${
            mode === 'upgrade'
              ? 'bg-surface-container-lowest text-on-surface shadow-elevation-1 border border-glass-border'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          <span>{currentUser?.is_guest ? 'Save Account' : 'Register'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          className={`py-2 text-xs font-label-md font-bold transition-all cursor-pointer rounded-lg flex items-center justify-center gap-1.5 ${
            mode === 'login'
              ? 'bg-surface-container-lowest text-on-surface shadow-elevation-1 border border-glass-border'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">login</span>
          <span>Existing Login</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 text-xs text-error flex items-start gap-2.5 animate-toast leading-relaxed">
          <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form key={mode} onSubmit={handleSubmit} className="animate-tab-fade flex flex-col gap-3.5">
        {/* Anti-spam bot trap */}
        <input
          type="text"
          name="website_url_hp"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <Input
          label={mode === 'upgrade' ? 'Username' : 'Username or Email'}
          placeholder={mode === 'upgrade' ? 'e.g. CosmicRider' : 'Enter your username or email'}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          leftIcon="person"
          required
          autoFocus
        />

        {mode === 'upgrade' && (
          <Input
            label="Email Address"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon="mail"
            required
          />
        )}

        <Input
          label="Password"
          placeholder="••••••••"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon="lock"
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              <span className="material-symbols-outlined text-[18px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          }
        />

        {mode === 'upgrade' && (
          <p className="text-[11px] text-on-surface-variant leading-relaxed flex items-center gap-1.5 pt-1">
            <span className="material-symbols-outlined text-primary text-[15px] shrink-0">verified</span>
            <span>Your duel history and vibe personality will be preserved permanently.</span>
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 mt-2 pt-3 border-t border-glass-border">
          <Button variant="secondary-solid" size="md" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary-gradient" size="md" type="submit" isLoading={loading}>
            {mode === 'upgrade' ? (currentUser?.is_guest ? 'Save Account' : 'Create Account') : 'Log In'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
};
