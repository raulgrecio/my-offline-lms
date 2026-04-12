import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

import type { IconName } from '@web/ui/primitives/Icon';

export type WizardStepId = string;

export interface WizardStepConfig {
  id: WizardStepId;
  label: string;
  icon: IconName;
}

interface WizardContextType {
  currentStepIndex: number;
  steps: WizardStepConfig[];
  currentStep: WizardStepConfig;
  next: () => void;
  back: () => void;
  goTo: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
  canProceed: boolean;
  setCanProceed: (value: boolean) => void;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};

interface WizardProviderProps {
  children: React.ReactNode;
  steps: WizardStepConfig[];
  onFinish?: () => void;
  initialStepIndex?: number;
  initialStepId?: string;
}

export const WizardProvider: React.FC<WizardProviderProps> = ({
  children,
  steps,
  onFinish,
  initialStepIndex = 0,
  initialStepId
}) => {
  const calculatedInitialIndex = useMemo(() => {
    if (initialStepId) {
      const index = steps.findIndex(s => s.id === initialStepId);
      if (index !== -1) return index;
    }
    return initialStepIndex;
  }, [initialStepId, initialStepIndex, steps]);

  const [currentStepIndex, setCurrentStepIndex] = useState(calculatedInitialIndex);
  const [canProceed, setCanProceed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const next = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else if (onFinish) {
      onFinish();
    }
  }, [currentStepIndex, steps.length, onFinish]);

  const back = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }, [steps.length]);

  const reset = useCallback(() => {
    setCurrentStepIndex(calculatedInitialIndex);
    setCanProceed(true);
    setIsLoading(false);
  }, [calculatedInitialIndex]);

  const value = useMemo(() => ({
    currentStepIndex,
    steps,
    currentStep: steps[currentStepIndex],
    next,
    back,
    goTo,
    reset,
    isFirst: currentStepIndex === 0,
    isLast: currentStepIndex === steps.length - 1,
    canProceed,
    setCanProceed,
    isLoading,
    setIsLoading,
  }), [currentStepIndex, steps, next, back, goTo, reset, canProceed, isLoading]);

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};
