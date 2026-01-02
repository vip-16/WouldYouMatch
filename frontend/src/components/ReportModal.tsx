import React, { useState } from 'react';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ReportModalProps {
  opponentName: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ opponentName, onClose, onSubmit }) => {
  const [reason, setReason] = useState('spam');
  const [honeypot, setHoneypot] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot.trim() !== '') {
      onClose();
      return;
    }
    onSubmit(reason);
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1400);
  };

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      title={submitted ? 'Report Submitted' : `Report or Block ${opponentName}`}
      description={
        submitted
          ? 'Thank you for keeping WouldYouMatch? safe. The player has been blocked and safety logs recorded.'
          : 'Reporting immediately blocks this user and submits recent chat logs for review.'
      }
      icon={
        submitted ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-error" />
        )
      }
      maxWidth="md"
    >
      {submitted ? (
        <div className="text-center py-4">
          <p className="text-xs text-on-surface-variant">Closing window...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
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
          <div className="space-y-2 text-xs">
            {[
              { val: 'spam', label: 'Spam, bot, or commercial advertising' },
              { val: 'inappropriate', label: 'Harassment, hate speech, or offensive behavior' },
              { val: 'other', label: 'Other safety concerns' },
            ].map((opt) => (
              <label
                key={opt.val}
                className="flex items-center gap-3 p-3 rounded-md bg-surface-container-low border border-glass-border cursor-pointer hover:border-primary/40 transition-colors"
              >
                <input
                  type="radio"
                  name="reason"
                  value={opt.val}
                  checked={reason === opt.val}
                  onChange={(e) => setReason(e.target.value)}
                  className="accent-primary w-4 h-4 cursor-pointer"
                />
                <span className="text-on-surface font-medium">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary-solid"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              leftIcon="block"
            >
              Submit Report & Block
            </Button>
          </div>
        </form>
      )}
    </ModalShell>
  );
};
