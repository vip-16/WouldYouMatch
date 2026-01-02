import React, { useState } from 'react';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { API_BASE } from '../services/api';

interface ShareModalProps {
  vibeScore: number;
  totalRounds: number;
  shareHash: string;
  opponentAlias: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  vibeScore,
  totalRounds,
  shareHash,
  opponentAlias,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${API_BASE}/share/${shareHash}`;
  const pct = Math.round((vibeScore / totalRounds) * 100);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      title="Share Your Duel Result"
      description="Share this match recap with your friends on social media or direct message."
      icon="share"
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        {/* Result Card Preview */}
        <div className="p-4 rounded-md bg-surface-container border border-glass-border text-center space-y-1.5">
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-primary text-white text-[11px] font-bold font-mono shadow-sm">
            WOULDYOUMATCH? DUEL
          </div>
          <div className="text-2xl font-display font-bold text-on-surface">
            {vibeScore} of {totalRounds} Synergy ({pct}%)
          </div>
          <p className="text-xs text-on-surface-variant">
            Matched with <strong className="text-on-surface">{opponentAlias}</strong> on 7 Would You Rather choices
          </p>
        </div>

        {/* Share Link Input */}
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={shareUrl}
            className="font-mono text-xs"
            aria-label="Shareable link URL"
          />
          <Button
            variant="primary-gradient"
            size="md"
            onClick={handleCopy}
            leftIcon={copied ? 'check' : 'content_copy'}
            className="shrink-0"
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};
