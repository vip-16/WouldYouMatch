import React, { useEffect } from 'react';
import { Button } from './Button';

export interface ModalShellProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen = true,
  onClose,
  title,
  description,
  icon,
  maxWidth = 'md',
  className,
  bodyClassName,
  children,
}) => {
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isInitialMount = React.useRef(true);
  const [targetHeight, setTargetHeight] = React.useState<number | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const updateHeight = () => {
      const rect = el.getBoundingClientRect();
      const newHeight = Math.round(rect.height) + 2; // +2 for 1px top and 1px bottom border

      if (newHeight <= 2) return;

      if (isInitialMount.current) {
        isInitialMount.current = false;
        setTargetHeight(newHeight);
        return;
      }

      setTargetHeight((prev) => {
        if (prev !== undefined && Math.abs(prev - newHeight) > 2) {
          setIsTransitioning(true);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setIsTransitioning(false);
          }, 360);
          return newHeight;
        }
        return prev ?? newHeight;
      });
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const maxWidthStyles: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isClamped =
    targetHeight !== undefined &&
    typeof window !== 'undefined' &&
    targetHeight >= window.innerHeight - 32;

  const modalStyle: React.CSSProperties = {
    height: targetHeight !== undefined ? `${targetHeight}px` : undefined,
    transition:
      isInitialMount.current || prefersReducedMotion
        ? 'none'
        : 'height 0.36s cubic-bezier(0.32, 0.72, 0, 1), max-width 0.36s cubic-bezier(0.32, 0.72, 0, 1)',
    overflow: isTransitioning ? 'hidden' : isClamped ? 'auto' : 'visible',
    maxHeight: 'calc(100vh - 2rem)',
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-backdrop-fade"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={modalStyle}
        className={`w-full ${maxWidthStyles[maxWidth] || 'max-w-md'} bg-surface-container-lowest border border-glass-border rounded-2xl shadow-elevation-2 relative animate-modal-pop my-auto ${className || ''}`}
      >
        <div ref={contentRef} className={`relative ${bodyClassName !== undefined ? bodyClassName : 'p-5 md:p-6'}`}>
          {/* Close Button */}
          <Button
            variant="ghost-icon"
            size="icon"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface rounded-full w-8 h-8 z-10 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </Button>

          {/* Header (optional) */}
          {(title || icon) && (
            <div className="flex items-start gap-3 mb-4 pr-8">
              {icon && (
                <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-glass-border flex items-center justify-center text-primary shrink-0 shadow-elevation-1 overflow-hidden">
                  {typeof icon === 'string' ? (
                    <span className="material-symbols-outlined text-[20px] leading-none select-none">{icon}</span>
                  ) : (
                    icon
                  )}
                </div>
              )}
              <div>
                {title && (
                  <h3 id="modal-title" className="font-display text-xl font-bold text-on-surface leading-snug">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          {children}
        </div>
      </div>
    </div>
  );
};
