import React, { useEffect, useMemo, useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const SPOTLIGHT_PADDING = 10;

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const OnboardingOverlay = () => {
  const {
    running,
    currentStep,
    stepIndex,
    steps,
    isFirstStep,
    isLastStep,
    goToNextStep,
    goToPreviousStep,
    closeOnboarding,
    skipOnboarding,
    completeOnboarding,
  } = useOnboarding();

  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    if (!running || !currentStep) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      if (!currentStep.target) {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(currentStep.target);
      if (!element) {
        setTargetRect(null);
        return;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: Math.max(0, rect.top - SPOTLIGHT_PADDING),
        left: Math.max(0, rect.left - SPOTLIGHT_PADDING),
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      });
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [running, currentStep]);

  const panelStyle = useMemo(() => {
    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      // Mobile: keep the panel docked to bottom with safe spacing so actions never get cut.
      return {
        top: 'auto',
        left: '12px',
        right: '12px',
        bottom: '12px',
        transform: 'none',
        width: 'auto',
        maxHeight: 'calc(100dvh - 24px)',
      };
    }

    const defaultStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };

    if (!targetRect) {
      return defaultStyle;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = Math.min(420, viewportWidth - 32);

    const preferTop = targetRect.top > viewportHeight * 0.55;
    const top = preferTop
      ? clamp(targetRect.top - 220, 16, viewportHeight - 220)
      : clamp(targetRect.top + targetRect.height + 16, 16, viewportHeight - 220);
    const left = clamp(targetRect.left + targetRect.width / 2 - panelWidth / 2, 16, viewportWidth - panelWidth - 16);

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
      width: `${panelWidth}px`,
    };
  }, [targetRect]);

  if (!running || !currentStep) {
    return null;
  }

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
      return;
    }
    goToNextStep();
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/45" />

      {/* Spotlight */}
      {targetRect && (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-indigo-300"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
          }}
        />
      )}

      {/* Panel */}
      <div
        className="absolute bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 overflow-y-auto"
        style={panelStyle}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Guia interactiva
          </span>
          <span className="text-xs font-medium text-slate-500">
            Paso {stepIndex + 1} de {steps.length}
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-2">{currentStep.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{currentStep.description}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={isFirstStep}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {isLastStep ? 'Finalizar' : 'Siguiente'}
          </button>

          <button
            type="button"
            onClick={skipOnboarding}
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Omitir
          </button>

          <button
            type="button"
            onClick={closeOnboarding}
            className="ml-auto px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Mas tarde
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
