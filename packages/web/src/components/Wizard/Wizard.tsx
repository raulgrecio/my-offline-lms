import React from 'react';

import { WizardProvider, type WizardStepConfig } from './WizardContext';
import { useWizard } from './WizardContext';
import { WizardStepper } from './WizardStepper';

interface WizardProps {
  steps: WizardStepConfig[];
  children: React.ReactNode;
  onFinish?: () => void;
  initialStepIndex?: number;
  initialStepId?: string;
  className?: string;
}

const StepRenderer: React.FC<{ index: number, children: React.ReactNode }> = ({ index, children }) => {
  const { currentStepIndex } = useWizard();

  if (currentStepIndex !== index) return null;

  return (
    <div className="animate-in fade-in slide-in-from-right-10 duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
      {children}
    </div>
  );
};

export const GenericWizard: React.FC<WizardProps> = ({
  steps,
  children,
  onFinish,
  initialStepIndex = 0,
  initialStepId,
  className = ""
}) => {
  return (
    <WizardProvider steps={steps} onFinish={onFinish} initialStepIndex={initialStepIndex} initialStepId={initialStepId}>
      <div className={`max-w-5xl mx-auto ${className}`}>
        <WizardStepper />
        <div className="relative">
          {React.Children.map(children, (child, index) => {
            return (
              <StepRenderer index={index}>
                {child}
              </StepRenderer>
            );
          })}
        </div>
      </div>
    </WizardProvider>
  );
};

