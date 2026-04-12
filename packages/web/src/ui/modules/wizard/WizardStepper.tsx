import React from 'react';

import { Icon } from '@web/ui/primitives/Icon';
import { useWizard } from './WizardContext';

export const WizardStepper: React.FC = () => {
  const { steps, currentStepIndex } = useWizard();

  return (
    <div className="flex items-center justify-between mb-10 px-4">
      {steps.map((step, idx) => {
        const isActive = currentStepIndex === idx;
        const isPast = currentStepIndex > idx;
        const isFuture = currentStepIndex < idx;

        return (
          <React.Fragment key={step.id}>
            {/* Step Item */}
            <div className="flex items-center gap-4 group relative">
              {/* Circle Indicator */}
              <div
                className={`
                  relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-700 ease-out
                  ${isActive
                    ? 'bg-brand-600 text-white shadow-2xl shadow-brand-600/40 scale-110 z-10'
                    : isPast
                      ? 'bg-surface-950 border-2 border-brand-500/30 text-brand-400'
                      : 'bg-surface-900 border border-border-subtle text-text-muted opacity-40'}
                `}
              >
                {/* Active Glow */}
                {isActive && (
                  <div className="absolute inset-0 bg-brand-400 blur-2xl opacity-20 animate-pulse" />
                )}

                <Icon
                  name={isPast ? 'check' : (step.icon as any)}
                  size={isActive ? 'sm' : 'xs'}
                  className={`transition-transform duration-500 ${isActive ? 'scale-110' : ''}`}
                />
              </div>

              {/* Label Info */}
              <div className="hidden md:flex flex-col">
                <span className={`
                  text-2xs font-black uppercase tracking-[0.2em] transition-colors duration-500
                  ${isActive ? 'text-brand-400' : 'text-text-muted'}
                `}>
                  Paso {idx + 1}
                </span>
                <span className={`
                  text-sm font-bold transition-all duration-500
                  ${isActive ? 'text-text-primary' : 'text-text-secondary opacity-60'}
                `}>
                  {step.label}
                </span>
              </div>
            </div>

            {/* Connector Line */}
            {idx < steps.length - 1 && (
              <div className="flex-1 mx-6 flex items-center">
                <div className="h-[1.5px] w-full bg-surface-800 relative rounded-full overflow-hidden">
                  <div
                    className={`
                      absolute inset-0 bg-linear-to-r from-brand-600 to-brand-400 transition-transform duration-1000 ease-in-out origin-left
                      ${isPast ? 'translate-x-0' : '-translate-x-full'}
                    `}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
