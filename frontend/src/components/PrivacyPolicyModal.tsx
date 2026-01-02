import React from 'react';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

interface PrivacyPolicyModalProps {
  onClose: () => void;
  isStandalone?: boolean;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose, isStandalone = false }) => {
  const content = (
    <div className="flex flex-col gap-6 text-on-surface text-sm leading-relaxed max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
      {/* Header Info */}
      <div className="border-b border-glass-border pb-4">
        <h1 className="text-xl font-display font-bold text-on-surface">Privacy Policy</h1>
        <p className="text-xs text-on-surface-variant font-mono mt-1">
          Effective Date: September 7, 2026 • Version 2.0
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          1. Overview & Our Commitment
        </h2>
        <p className="text-on-surface-variant">
          At <strong>WouldYouMatch?</strong>, we believe in radical transparency and zero-friction privacy. 
          You can play live dilemma duels completely anonymously as a guest without providing an email, phone number, or real name. 
          This policy accurately outlines the information we process, store, and protect.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          2. Information We Actually Collect
        </h2>
        <div className="flex flex-col gap-2 text-on-surface-variant">
          <p>
            <strong>A. Anonymous Guest Data:</strong> When you start a duel without an account, we generate an anonymous identifier (e.g. <code className="font-mono text-xs bg-surface-container px-1 py-0.5 rounded">usr_...</code>), a randomized colorful alias, an avatar seed, and an optional device fingerprint to reconnect your active match if your network drops.
          </p>
          <p>
            <strong>B. Optional Account Data:</strong> If you choose to upgrade your guest account, we collect your chosen username, email address, and a cryptographically salted PBKDF2-SHA256 password hash. <em>We never store plaintext passwords.</em>
          </p>
          <p>
            <strong>C. Gameplay & Compatibility Data:</strong> We record your answers to hypothetical dilemmas (Option A vs Option B), round response times, computed Mutual Synergy scores, and win/loss statistics to show your vibe compatibility archetype.
          </p>
          <p>
            <strong>D. Communication & Social Data:</strong> Messages sent in post-game private chat and 1:1 Direct Messages are transmitted in real-time to your match partner. Friend requests, block lists, and moderation reports submitted for rule violations are securely retained.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          3. How We Use Your Data
        </h2>
        <ul className="list-disc pl-5 flex flex-col gap-1.5 text-on-surface-variant">
          <li>To match you in real-time with compatible opponents in the dilemma arena.</li>
          <li>To calculate instantaneous synergy percentages based on shared choices.</li>
          <li>To persist your friends list, chat history, and personal achievements.</li>
          <li>To detect spam, enforce safety, and maintain a respectful community through automated moderation and user reports.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          4. Local Storage & Cookies
        </h2>
        <p className="text-on-surface-variant">
          We use browser <code className="font-mono text-xs bg-surface-container px-1 py-0.5 rounded">localStorage</code> strictly for functional purposes:
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1 text-on-surface-variant text-xs font-mono">
          <li><strong>wouldyoumatch_user_id:</strong> Restores your guest session between visits.</li>
          <li><strong>wouldyoumatch_auth_token:</strong> Keeps your registered account logged in.</li>
          <li><strong>wouldyoumatch_theme:</strong> Remembers your dark or light mode preference.</li>
          <li><strong>wouldyoumatch_cookie_consent:</strong> Stores your cookie/storage consent preferences.</li>
        </ul>
        <p className="text-on-surface-variant text-xs mt-1">
          We do NOT utilize tracking pixels, third-party advertising cookies, or cross-site fingerprinting trackers.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          5. Data Sharing & Third Parties
        </h2>
        <p className="text-on-surface-variant">
          <strong>We never sell, rent, or monetize your personal data.</strong> Your dilemma answers and scores are shared only with the specific player you match against in the arena. Question generation may utilize the Google Gemini API solely for hypothetical dilemma prompts, without sharing your personal account information.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          6. Your Rights & Data Deletion
        </h2>
        <p className="text-on-surface-variant">
          You have full control over your data. You may request account deletion, unfriend or block users, and clear your browser storage at any time. For full account or data deletion requests, contact us at <a href="mailto:privacy@wouldyoumatch.app" className="text-primary underline hover:text-primary-container">privacy@wouldyoumatch.app</a>.
        </p>
      </section>

      <div className="pt-4 border-t border-glass-border flex justify-end">
        <Button variant="primary-gradient" size="sm" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-3xl bg-surface-container-low border border-glass-border rounded-2xl p-6 sm:p-8 shadow-elevation-2">
          {content}
        </div>
      </div>
    );
  }

  return (
    <ModalShell isOpen={true} onClose={onClose} title="Privacy Policy" maxWidth="2xl">
      {content}
    </ModalShell>
  );
};
