import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';

interface CookieConsentBannerProps {
  onOpenPrivacyPolicy: () => void;
  forceOpen?: boolean;
  onCloseSettings?: () => void;
}

export type ConsentStatus = 'all' | 'essential' | null;

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onOpenPrivacyPolicy,
  forceOpen = false,
  onCloseSettings,
}) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [showManage, setShowManage] = useState<boolean>(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(true);

  useEffect(() => {
    const saved = localStorage.getItem('wouldyoumatch_cookie_consent');
    if (!saved || forceOpen) {
      setVisible(true);
      if (forceOpen) {
        setShowManage(true);
      }
    } else {
      setVisible(false);
    }
  }, [forceOpen]);

  const handleAcceptAll = () => {
    localStorage.setItem('wouldyoumatch_cookie_consent', 'all');
    localStorage.setItem('wouldyoumatch_consent_analytics', 'true');
    setVisible(false);
    if (onCloseSettings) onCloseSettings();
  };

  const handleEssentialOnly = () => {
    localStorage.setItem('wouldyoumatch_cookie_consent', 'essential');
    localStorage.setItem('wouldyoumatch_consent_analytics', 'false');
    setVisible(false);
    if (onCloseSettings) onCloseSettings();
  };

  const handleSavePreferences = () => {
    const status: ConsentStatus = analyticsEnabled ? 'all' : 'essential';
    localStorage.setItem('wouldyoumatch_cookie_consent', status);
    localStorage.setItem('wouldyoumatch_consent_analytics', analyticsEnabled ? 'true' : 'false');
    setVisible(false);
    setShowManage(false);
    if (onCloseSettings) onCloseSettings();
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie and Storage Preferences"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-slide-up"
    >
      <div className="max-w-4xl mx-auto bg-surface-container-lowest/95 backdrop-blur-md border border-primary/30 rounded-2xl p-4 sm:p-5 shadow-elevation-2 flex flex-col gap-3 ring-1 ring-primary/20">
        
        {!showManage ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-base">🍪</span>
                <span className="text-sm font-display font-bold text-on-surface">
                  Privacy & Storage Preferences
                </span>
              </div>
              <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">
                We use browser storage strictly for essential gameplay functions (remembering your guest session, theme, and authentication token). We do not use third-party ad tracking. View our{' '}
                <button
                  onClick={onOpenPrivacyPolicy}
                  className="text-primary underline hover:text-primary-container font-medium cursor-pointer"
                >
                  Privacy Policy
                </button>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                onClick={() => setShowManage(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Customize
              </button>
              <Button
                variant="secondary-solid"
                size="sm"
                onClick={handleEssentialOnly}
                className="text-xs py-1.5 px-3"
              >
                Essential Only
              </Button>
              <Button
                variant="primary-gradient"
                size="sm"
                onClick={handleAcceptAll}
                className="text-xs py-1.5 px-4 font-bold shadow-sm"
              >
                Accept All
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center justify-between border-b border-glass-border pb-2">
              <span className="text-sm font-display font-bold text-on-surface">
                Manage Storage Categories
              </span>
              {forceOpen && onCloseSettings && (
                <button
                  onClick={onCloseSettings}
                  className="text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  ✕ Close
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Essential Storage */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-glass-border flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">Essential Storage</span>
                  <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">
                    ALWAYS ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-normal">
                  Required for core arena matchmaking, authentication tokens, and maintaining your dark/light theme preference.
                </p>
              </div>

              {/* Functional Analytics */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-glass-border flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">Operational Insights</span>
                  <input
                    type="checkbox"
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                    aria-label="Toggle Operational Insights"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant leading-normal">
                  Anonymous performance metrics used to improve matchmaking queue speeds and prevent game dropouts.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-glass-border">
              <button
                onClick={() => setShowManage(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                Back
              </button>
              <Button
                variant="primary-gradient"
                size="sm"
                onClick={handleSavePreferences}
                className="text-xs py-1.5 px-4 font-bold"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
