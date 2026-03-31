import React from 'react';
import { GenericWizard, WizardActionButtons, type WizardStepConfig } from '@components/Wizard';

const showcaseSteps: WizardStepConfig[] = [
  { id: "start", label: "User Details", icon: "book-open" },
  { id: "settings", label: "Preferences", icon: "settings" },
  { id: "confirm", label: "Summary", icon: "check" },
];

export const WizardShowcase: React.FC = () => {
  return (
    <GenericWizard steps={showcaseSteps}>
      {/* Step 1: User Details */}
      <div className="space-y-8">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-text-primary">User Details</h2>
          <p className="text-text-secondary">
            Please provide your basic information to get started.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-surface-950 border border-border-subtle rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-12 h-12 bg-brand-600/10 text-brand-400 rounded-full flex items-center justify-center mb-2">
              <span className="font-black text-xl">JD</span>
            </div>
            <h4 className="font-bold text-text-primary">John Doe</h4>
            <p className="text-xs text-text-muted">Primary Profile</p>
          </div>
          <div className="p-6 bg-surface-950/40 border border-border-subtle/50 border-dashed rounded-2xl flex flex-col items-center justify-center text-center space-y-2 opacity-50 grayscale">
            <div className="w-12 h-12 border border-border-subtle rounded-full flex items-center justify-center mb-2">
              <span className="font-bold text-xl text-text-muted">+</span>
            </div>
            <h4 className="font-bold text-text-muted">New Profile</h4>
            <p className="text-xs text-text-muted">Add another account</p>
          </div>
        </div>

        <WizardActionButtons nextLabel="Configurar Preferencias" />
      </div>

      {/* Step 2: Preferences */}
      <div className="space-y-8">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-text-primary">App Preferences</h2>
          <p className="text-text-secondary">
            Customize your experience within the learning platform.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-surface-950 border border-border-subtle rounded-xl flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Enable Dark Mode</span>
            <div className="w-10 h-5 bg-brand-600 rounded-full relative">
              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="p-4 bg-surface-950 border border-border-subtle rounded-xl flex items-center justify-between opacity-50">
            <span className="text-sm font-semibold text-text-primary">Offline Mode (Automatic)</span>
            <div className="w-10 h-5 bg-surface-800 rounded-full relative">
              <div className="absolute left-1 top-1 w-3 h-3 bg-text-muted rounded-full"></div>
            </div>
          </div>
        </div>

        <WizardActionButtons backLabel="Volver a Perfil" nextLabel="Revisar Todo" />
      </div>

      {/* Step 3: Summary */}
      <div className="space-y-8 text-center pb-4">
        <div className="w-20 h-20 bg-brand-500/10 text-brand-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="font-black text-4xl leading-none">✓</span>
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-black text-text-primary">Everything Ready!</h2>
          <p className="text-text-secondary max-w-md mx-auto">
            Your account has been successfully configured. You can now start
            exploring the available courses offline.
          </p>
        </div>

        <div className="pt-4">
          <WizardActionButtons backLabel="Cambiar algo" />
        </div>
      </div>
    </GenericWizard>
  );
};
