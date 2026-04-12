import React from 'react';

interface ToggleProps {
  /** Label text for the toggle */
  label: string;
  /** Whether the toggle is active or not (controlled) */
  checked?: boolean;
  /** Initial value (uncontrolled) */
  defaultChecked?: boolean;
  /** Callback when state changes */
  onChange?: (checked: boolean) => void;
  /** Optional ID for the checkbox element */
  id?: string;
  /** Optional additional container classes */
  className?: string;
}

/**
 * A premium, minimalist toggle switch component.
 * Uses peer-driven Tailwind CSS for smooth state transitions.
 */
export const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  defaultChecked,
  onChange,
  id,
  className = '',
}) => {
  const toggleId = id || `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <label
      htmlFor={toggleId}
      className={`flex items-center gap-2 cursor-pointer group select-none ${className}`}
    >
      <span className="text-2xs font-bold text-text-muted group-hover:text-brand-500 transition-colors uppercase tracking-tight">
        {label}
      </span>
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          id={toggleId}
          className="sr-only peer"
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        {/* Track */}
        <div
          className="w-7 h-4 bg-surface-600 rounded-full peer peer-checked:bg-brand-600 transition-colors ring-1 ring-white/5"
        >
        </div>
        {/* Thumb */}
        <div
          className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-3 shadow-sm"
        >
        </div>
      </div>
    </label>
  );
};
