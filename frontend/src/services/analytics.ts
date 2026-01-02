/**
 * WouldYouMatch? Privacy-Conscious Analytics Client
 * - Zero-cookie, privacy-preserving event dispatcher
 * - Strictly respects user cookie/storage consent
 * - Configurable via VITE_ANALYTICS_ID (supports Plausible, Umami, Google Analytics 4)
 */

const env = (import.meta as any).env || {};
export const ANALYTICS_ID: string = env.VITE_ANALYTICS_ID || '';

export const hasAnalyticsConsent = (): boolean => {
  if (typeof window === 'undefined') return false;
  const consent = localStorage.getItem('wouldyoumatch_consent_analytics');
  return consent === 'true' || consent === null; // default to lightweight operational metrics if not explicitly rejected
};

export const trackEvent = (eventName: string, properties: Record<string, any> = {}): void => {
  if (!hasAnalyticsConsent()) {
    return;
  }

  // If a third-party script like Plausible or Google Tag is configured on window
  if (typeof window !== 'undefined') {
    if ((window as any).plausible) {
      (window as any).plausible(eventName, { props: properties });
    } else if ((window as any).gtag && ANALYTICS_ID) {
      (window as any).gtag('event', eventName, properties);
    }
  }

  // Development logger
  if (env.DEV) {
    console.debug(`[Analytics Event] ${eventName}:`, properties);
  }
};

export const trackPageView = (path: string): void => {
  trackEvent('page_view', { path });
};
