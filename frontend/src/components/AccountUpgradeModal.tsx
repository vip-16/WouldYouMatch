import React, { useState } from 'react';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { User } from '../types';
import { apiFetch, setAuthToken } from '../services/api';

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
  // Separate credential state per mode so switching never leaks or hides input.
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [signupUser, setSignupUser] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: 'upgrade' | 'login') => {
    setMode(next);
    setError(null);
    setCapsOn(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Bot honeypot trap
    if (honeypot.trim() !== '') {
      return;
    }

    if (mode === 'upgrade') {
      const cleanUser = signupUser.trim();
      const cleanEmail = signupEmail.trim().toLowerCase();
      // Passwords are never trimmed: spaces can be intentional.
      const rawPass = signupPass;

      if (!cleanUser || !cleanEmail || !rawPass) {
        setError('Please fill in all fields.');
        return;
      }

      if (cleanUser.length < 3 || cleanUser.length > 25) {
        setError('Username must be 3–25 characters.');
        return;
      }

      const userRegex = /^[a-zA-Z0-9_]+$/;
      if (!userRegex.test(cleanUser)) {
        setError('Username can only contain letters, numbers, and underscores.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setError('Please enter a valid email address.');
        return;
      }

      if (rawPass.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      setLoading(true);
      try {
        const res = await apiFetch(`/api/auth/upgrade`, {
          method: 'POST',
          body: JSON.stringify({
            user_id: currentUser?.id || '',
            username: cleanUser,
            email: cleanEmail,
            password: rawPass,
            honeypot: honeypot,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          if (data.access_token) setAuthToken(data.access_token);
          onSuccess(data.user);
          onClose();
        } else {
          setError(data.detail || 'Username or email is already taken.');
        }
      } catch {
        setError('Could not reach the server. Check your connection and retry.');
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      const cleanIdentifier = loginId.trim();
      const rawPass = loginPass;

      if (!cleanIdentifier || !rawPass) {
        setError('Please fill in all fields.');
        return;
      }

      setLoading(true);
      try {
        const res = await apiFetch(`/api/auth/login`, {
          method: 'POST',
          body: JSON.stringify({
            identifier: cleanIdentifier,
            password: rawPass,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          if (data.access_token) setAuthToken(data.access_token);
          onSuccess(data.user);
          onClose();
        } else {
          setError(data.detail || 'Invalid username or password.');
        }
      } catch {
        setError('Could not reach the server. Check your connection and retry.');
      } finally {
        setLoading(false);
      }
    }
  };

  const isLogin = mode === 'login';
  // Offer a one-tap escape hatch when signup fails on an existing identity.
  const suggestLogin = !isLogin && error !== null && /already (taken|registered)|log in/i.test(error);

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      maxWidth="lg"
      bodyClassName="p-0"
    >
      <div className="relative overflow-hidden rounded-[2.25rem_1.7rem_2.25rem_1.7rem]">
        {/* ── Mobile overlay strip (static; slide is desktop-only) ── */}
        <div className="sm:hidden bg-gradient-to-br from-primary via-primary-container to-accent px-6 py-5 text-center text-white">
          <p className="font-display text-lg font-bold leading-tight">
            {isLogin ? 'new here?' : 'already dueling?'}
          </p>
          <button
            type="button"
            onClick={() => switchMode(isLogin ? 'upgrade' : 'login')}
            className="mt-2.5 inline-flex h-9 items-center rounded-full border border-white/70 px-6 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10 cursor-pointer"
          >
            {isLogin ? 'sign up' : 'log in'}
          </button>
        </div>

        {/* ── Desktop split layout: only the active form is mounted ── */}
        <div className="relative hidden sm:grid sm:grid-cols-2 sm:min-h-[430px]">
          <div className="flex flex-col justify-center px-8 py-8 lg:px-10">
            {isLogin ? (
              <>
                <h3 className="font-display text-3xl font-bold text-on-surface">welcome back</h3>
                <div className="mt-5">
                  <AuthForm
                    mode="login"
                    fields={{ id: loginId, pass: loginPass, email: '' }}
                    setField={(k, v) => (k === 'id' ? setLoginId(v) : setLoginPass(v))}
                    honeypot={honeypot}
                    setHoneypot={setHoneypot}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    capsOn={capsOn}
                    setCapsOn={setCapsOn}
                    loading={loading}
                    error={error}
                    suggestLogin={false}
                    onSuggestLogin={() => {}}
                    onSubmit={handleSubmit}
                    onClose={onClose}
                  />
                </div>
              </>
            ) : (
              <div aria-hidden="true" />
            )}
          </div>

          <div className="flex flex-col justify-center px-8 py-8 lg:px-10">
            {!isLogin ? (
              <>
                <h3 className="font-display text-3xl font-bold text-on-surface">create your account</h3>
                <div className="mt-5">
                  <AuthForm
                    mode="upgrade"
                    fields={{ id: signupUser, pass: signupPass, email: signupEmail }}
                    setField={(k, v) => {
                      if (k === 'id') setSignupUser(v);
                      else if (k === 'email') setSignupEmail(v);
                      else setSignupPass(v);
                    }}
                    honeypot={honeypot}
                    setHoneypot={setHoneypot}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    capsOn={capsOn}
                    setCapsOn={setCapsOn}
                    loading={loading}
                    error={error}
                    suggestLogin={suggestLogin}
                    onSuggestLogin={() => switchMode('login')}
                    onSubmit={handleSubmit}
                    onClose={onClose}
                  />
                </div>
              </>
            ) : (
              <div aria-hidden="true" />
            )}
          </div>

          {/* Sliding overlay panel */}
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
              isLogin ? 'translate-x-full' : 'translate-x-0'
            }`}
          >
            <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary-container to-accent px-8 text-center text-white">
              <div
                aria-hidden={true}
                className="absolute -right-12 -top-14 h-44 w-44 rounded-[45%_55%_60%_40%] bg-white/10"
              />
              <div
                aria-hidden={true}
                className="absolute -left-10 -bottom-12 h-36 w-36 rounded-[60%_40%_45%_55%] bg-black/10"
              />
              <div key={mode} className="relative animate-tab-fade">
                <p className="font-display text-3xl font-bold leading-tight">
                  {isLogin ? 'new here?' : 'already dueling?'}
                </p>
                <button
                  type="button"
                  onClick={() => switchMode(isLogin ? 'upgrade' : 'login')}
                  className="pointer-events-auto mt-5 inline-flex h-10 items-center rounded-full border border-white/70 px-8 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10 cursor-pointer"
                >
                  {isLogin ? 'sign up' : 'log in'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile form (below the strip) ── */}
        <div className="px-5 py-6 sm:hidden">
          <h3 className="font-display text-2xl font-bold text-on-surface">
            {isLogin ? 'welcome back' : 'create your account'}
          </h3>
          <div className="mt-4">
            <AuthForm
              mode={mode}
              fields={
                isLogin
                  ? { id: loginId, pass: loginPass, email: '' }
                  : { id: signupUser, pass: signupPass, email: signupEmail }
              }
              setField={(k, v) => {
                if (isLogin) {
                  if (k === 'id') setLoginId(v);
                  else setLoginPass(v);
                } else if (k === 'id') setSignupUser(v);
                else if (k === 'email') setSignupEmail(v);
                else setSignupPass(v);
              }}
              honeypot={honeypot}
              setHoneypot={setHoneypot}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              capsOn={capsOn}
              setCapsOn={setCapsOn}
              loading={loading}
              error={error}
              suggestLogin={suggestLogin}
              onSuggestLogin={() => switchMode('login')}
              onSubmit={handleSubmit}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

interface AuthFields {
  id: string;
  pass: string;
  email: string;
}

interface AuthFormProps {
  mode: 'upgrade' | 'login';
  fields: AuthFields;
  setField: (k: 'id' | 'pass' | 'email', v: string) => void;
  honeypot: string;
  setHoneypot: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  capsOn: boolean;
  setCapsOn: (v: boolean) => void;
  loading: boolean;
  error: string | null;
  suggestLogin: boolean;
  onSuggestLogin: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  mode,
  fields,
  setField,
  honeypot,
  setHoneypot,
  showPassword,
  setShowPassword,
  capsOn,
  setCapsOn,
  loading,
  error,
  suggestLogin,
  onSuggestLogin,
  onSubmit,
  onClose,
}) => {
  const isLogin = mode === 'login';
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
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

      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-error/10 border border-error/25 text-xs text-error flex flex-col gap-1.5 animate-toast leading-relaxed"
        >
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span className="font-medium">{error}</span>
          </div>
          <span className="pl-6 text-error/80">
            {isLogin
              ? 'Double-check caps lock, or try your username instead of your email.'
              : 'Fix the field above, or log in if you already have an account.'}
          </span>
          {suggestLogin && (
            <button
              type="button"
              onClick={onSuggestLogin}
              className="ml-6 self-start font-bold underline underline-offset-2 hover:opacity-80 cursor-pointer"
            >
              switch to log in
            </button>
          )}
        </div>
      )}

      <Input
        label={isLogin ? 'Username or email' : 'Username'}
        placeholder={isLogin ? 'you' : 'pick a name'}
        value={fields.id}
        onChange={(e) => setField('id', e.target.value)}
        leftIcon="person"
        required
        autoFocus
        disabled={loading}
      />

      {!isLogin && (
        <Input
          label="Email"
          placeholder="you@example.com"
          type="email"
          value={fields.email}
          onChange={(e) => setField('email', e.target.value)}
          leftIcon="mail"
          required
          disabled={loading}
        />
      )}

      <Input
        label="Password"
        placeholder="••••••••"
        type={showPassword ? 'text' : 'password'}
        value={fields.pass}
        onChange={(e) => setField('pass', e.target.value)}
        onKeyUp={(e) => {
          const caps =
            typeof e.getModifierState === 'function' && e.getModifierState('CapsLock');
          setCapsOn(!!caps);
        }}
        leftIcon="lock"
        required
        disabled={loading}
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
      {capsOn && !loading && (
        <p className="text-[11px] text-tertiary font-semibold -mt-1.5">caps lock is on</p>
      )}

      <Button
        variant="primary-gradient"
        size="md"
        type="submit"
        isLoading={loading}
        disabled={loading}
        className="w-full mt-1"
      >
        {isLogin ? 'log in' : 'sign up'}
      </Button>
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer disabled:opacity-40"
      >
        cancel
      </button>
    </form>
  );
};
