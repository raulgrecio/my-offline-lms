import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { GenericWizard } from '@web/components/Wizard/Wizard';
import { WizardActionButtons, type WizardStepConfig, useWizard } from '@web/components/Wizard';

const mockSteps: WizardStepConfig[] = [
  { id: 'step1', label: 'Step 1', icon: 'book-open' },
  { id: 'step2', label: 'Step 2', icon: 'settings' },
  { id: 'step3', label: 'Step 3', icon: 'check' },
];

describe('GenericWizard', () => {
  it('renders the first step by default', () => {
    render(
      <GenericWizard steps={mockSteps}>
        <div data-testid="content-1">Content 1</div>
        <div data-testid="content-2">Content 2</div>
        <div data-testid="content-3">Content 3</div>
      </GenericWizard>
    );

    expect(screen.getByTestId('content-1')).toBeInTheDocument();
    expect(screen.queryByTestId('content-2')).not.toBeInTheDocument();
  });

  it('navigates to the next step when next button is clicked', async () => {
    render(
      <GenericWizard steps={mockSteps}>
        <div>
          <div data-testid="content-1">Content 1</div>
          <WizardActionButtons />
        </div>
        <div>
          <div data-testid="content-2">Content 2</div>
          <WizardActionButtons />
        </div>
        <div>
          <div data-testid="content-3">Content 3</div>
          <WizardActionButtons />
        </div>
      </GenericWizard>
    );

    const nextButton = screen.getByText(/Siguiente Paso/i);
    fireEvent.click(nextButton);

    expect(screen.queryByTestId('content-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('content-2')).toBeInTheDocument();
  });

  it('navigates back when back button is clicked', () => {
    render(
      <GenericWizard steps={mockSteps} initialStepIndex={1}>
        <div>
          <div data-testid="content-1">Content 1</div>
          <WizardActionButtons />
        </div>
        <div>
          <div data-testid="content-2">Content 2</div>
          <WizardActionButtons />
        </div>
        <div>
          <div data-testid="content-3">Content 3</div>
          <WizardActionButtons />
        </div>
      </GenericWizard>
    );

    expect(screen.getByTestId('content-2')).toBeInTheDocument();

    const backButton = screen.getByText(/Atrás/i);
    fireEvent.click(backButton);

    expect(screen.queryByTestId('content-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('content-1')).toBeInTheDocument();
  });

  it('calls onFinish when clicking next on the last step', () => {
    const onFinish = vi.fn();
    render(
      <GenericWizard steps={mockSteps} initialStepIndex={2} onFinish={onFinish}>
        <div>
          <div data-testid="content-1">Content 1</div>
          <WizardActionButtons />
        </div>
        <div>
          <div data-testid="content-2">Content 2</div>
          <WizardActionButtons />
        </div>
        <div>
          <div data-testid="content-3">Content 3</div>
          <WizardActionButtons />
        </div>
      </GenericWizard>
    );

    const finishButton = screen.getByText(/Finalizar/i);
    fireEvent.click(finishButton);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('disables the next button when loading', () => {
    // Note: We'd need to trigger loading state which is inside the context.
    // In a real scenario, a component inside the wizard would call setIsLoading(true)

    const LoadingTrigger = () => {
      const { setIsLoading } = useWizard();
      return <button onClick={() => setIsLoading(true)}>Start Loading</button>;
    };

    render(
      <GenericWizard steps={mockSteps}>
        <div>
          <LoadingTrigger />
          <WizardActionButtons />
        </div>
        <div>Step 2</div>
      </GenericWizard>
    );

    const nextButton = screen.getByText(/Siguiente Paso/i);
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(screen.getByText('Start Loading'));

    const button = screen.getByRole('button', { name: /Siguiente Paso/i });
    expect(button).toBeDisabled();
  });
});
