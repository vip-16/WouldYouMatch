import React from 'react';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

interface TermsOfServiceModalProps {
  onClose: () => void;
  isStandalone?: boolean;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ onClose, isStandalone = false }) => {
  const content = (
    <div className="flex flex-col gap-6 text-on-surface text-sm leading-relaxed max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
      {/* Header */}
      <div className="border-b border-glass-border pb-4">
        <h1 className="text-xl font-display font-bold text-on-surface">Terms of Service</h1>
        <p className="text-xs text-on-surface-variant font-mono mt-1">
          Effective Date: September 7, 2026 • Version 2.0
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          1. Acceptance of Terms
        </h2>
        <p className="text-on-surface-variant">
          By accessing or playing <strong>WouldYouMatch?</strong> (the "Service"), whether as a guest or with a registered account, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          2. Eligibility & Age Requirements
        </h2>
        <p className="text-on-surface-variant">
          You must be at least 13 years of age (or the legal age of majority in your jurisdiction) to use WouldYouMatch?. By entering the matchmaking arena, you affirm that you meet this requirement.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          3. Fair Play & Gameplay Mechanics
        </h2>
        <div className="flex flex-col gap-2 text-on-surface-variant">
          <p>
            • <strong>Simultaneous Blind Voting:</strong> Dilemma choices are submitted under strict 20-second timers. Attempting to exploit, reverse engineer, or sniff opponent choices prior to reveal is strictly prohibited.
          </p>
          <p>
            • <strong>No Automated Bots:</strong> Using automated scripts, scrapers, or bot injectors to manipulate matchmaking queues or farm synergy scores is cause for immediate permanent ban.
          </p>
          <p>
            • <strong>Hypothetical Scenarios:</strong> All "Would You Rather" questions are playful, philosophical, or absurd hypothetical thought experiments. They do not constitute professional advice or endorsements of real-world harm.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          4. User Conduct & Communication Guidelines
        </h2>
        <p className="text-on-surface-variant">
          WouldYouMatch? provides live post-match chat and 1:1 Direct Messaging to connect like-minded players. You agree NOT to:
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1 text-on-surface-variant">
          <li>Harass, threaten, stalk, or demean other players.</li>
          <li>Transmit hate speech, discriminatory language, or sexually explicit content.</li>
          <li>Spam commercial advertisements, affiliate links, or deceptive phishing URLs.</li>
          <li>Impersonate other users, staff, or moderators.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          5. Moderation, Reporting & Account Termination
        </h2>
        <p className="text-on-surface-variant">
          We provide an in-app reporting tool in every post-game chat and profile. We reserve the right to review reports, shadowban malicious actors into an isolated queue, remove abusive content, and terminate offending accounts without prior notice.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          6. Disclaimer & Limitation of Liability
        </h2>
        <p className="text-on-surface-variant">
          The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind. WouldYouMatch? is not liable for indirect, incidental, or punitive damages resulting from your use of the platform or interactions with other players.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-display font-bold text-primary uppercase tracking-wider">
          7. Contact Information
        </h2>
        <p className="text-on-surface-variant">
          If you have questions regarding these Terms, contact our legal and support team at <a href="mailto:terms@wouldyoumatch.app" className="text-primary underline hover:text-primary-container">terms@wouldyoumatch.app</a>.
        </p>
      </section>

      <div className="pt-4 border-t border-glass-border flex justify-end">
        <Button variant="primary-gradient" size="sm" onClick={onClose}>
          I Accept
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
    <ModalShell isOpen={true} onClose={onClose} title="Terms of Service" maxWidth="2xl">
      {content}
    </ModalShell>
  );
};
