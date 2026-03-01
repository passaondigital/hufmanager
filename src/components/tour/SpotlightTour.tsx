import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TourStep {
  /** CSS selector for the target element */
  target: string;
  /** Title of the step */
  title: string;
  /** Description text */
  description: string;
  /** Position of the tooltip relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface SpotlightTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function SpotlightTour({ steps, isOpen, onClose, onComplete }: SpotlightTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }
    updateTargetRect();
    const interval = setInterval(updateTargetRect, 500);
    return () => clearInterval(interval);
  }, [isOpen, currentStep, updateTargetRect]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrev();
  }, [currentStep, steps.length]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !step) return null;

  const padding = 8;
  const tooltipWidth = 320;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const pos = step.position || 'bottom';
    const cx = targetRect.left + targetRect.width / 2;
    const cy = targetRect.top + targetRect.height / 2;

    switch (pos) {
      case 'bottom':
        return {
          top: targetRect.bottom + padding + 12,
          left: Math.max(16, Math.min(cx - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
        };
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + padding + 12,
          left: Math.max(16, Math.min(cx - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
        };
      case 'left':
        return {
          top: Math.max(16, cy - 60),
          right: window.innerWidth - targetRect.left + padding + 12,
        };
      case 'right':
        return {
          top: Math.max(16, cy - 60),
          left: targetRect.right + padding + 12,
        };
      default:
        return { top: targetRect.bottom + 16, left: cx - tooltipWidth / 2 };
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]" ref={overlayRef}>
        {/* Overlay with spotlight hole */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'auto' }}>
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - padding}
                  y={targetRect.top - padding}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0" y="0"
            width="100%" height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#spotlight-mask)"
            onClick={onClose}
          />
        </svg>

        {/* Spotlight border glow */}
        {targetRect && (
          <motion.div
            layoutId="spotlight-border"
            className="absolute border-2 border-primary rounded-lg pointer-events-none"
            style={{
              left: targetRect.left - padding,
              top: targetRect.top - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
              boxShadow: '0 0 0 4px hsl(var(--primary) / 0.2)',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute bg-card border border-border rounded-xl shadow-2xl p-5 z-10"
          style={{ width: tooltipWidth, ...getTooltipStyle() }}
        >
          {/* Step counter */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">
              {currentStep + 1} / {steps.length}
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <h3 className="text-base font-semibold text-foreground mb-1.5">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Fertig
                </>
              ) : (
                <>
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
