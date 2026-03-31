import React from 'react';
import { type IconName } from '@components/Icon';
import { Button } from '@components/Button';
import { useWizard } from './WizardContext';

export interface ActionButtonProps {
  nextLabel?: string;
  backLabel?: string;
  nextIcon?: IconName;
  backIcon?: IconName;
  hideNext?: boolean;
  hideBack?: boolean;
  onNext?: () => void | Promise<void>;
  onBack?: () => void;
}

export const WizardActionButtons: React.FC<ActionButtonProps> = ({
  nextLabel = 'Siguiente Paso',
  backLabel = 'Atrás',
  nextIcon = 'chevron-right',
  backIcon = 'chevron-left',
  hideNext = false,
  hideBack = false,
  onNext,
  onBack
}) => {
  const { isFirst, isLast, next, back, isLoading, canProceed } = useWizard();

  const handleNext = async () => {
    if (onNext) {
      await onNext();
    } else {
      next();
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      back();
    }
  };

  return (
    <div className="flex justify-between items-center pt-8 border-t border-border-subtle mt-12 bg-surface-950/20 px-4 -mx-4 rounded-b-3xl">
      <div>
        {!isFirst && !hideBack && (
          <Button
            onClick={handleBack}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            icon={backIcon}
            iconClass="group-hover:-translate-x-1 transition-transform"
            className="font-black uppercase tracking-widest px-6"
          >
            {backLabel}
          </Button>
        )}
      </div>

      <div>
        {!hideNext && (
          <Button
            disabled={!canProceed || isLoading}
            onClick={handleNext}
            variant="primary"
            size="md"
            loading={isLoading}
            iconRight={isLast && !onNext ? undefined : nextIcon}
            iconRightClass="group-hover:translate-x-1 transition-transform"
            className="shadow-2xl shadow-brand-600/20 font-black uppercase tracking-widest px-10"
          >
            {isLast && !onNext ? 'Finalizar' : nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
