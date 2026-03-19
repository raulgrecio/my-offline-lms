import { useState } from 'react';
import { Icon } from './Icon';

interface ThemeToggleProps {
}

export default function ThemeToggle(_props: ThemeToggleProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
  });

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTheme = theme === 'dark' ? 'light' : 'dark';

    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 border bg-surface-700 border-border-subtle text-text-primary shadow-custom"
      title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
    >
      <div className="w-5 h-5 flex items-center justify-center">
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </div>
    </button>
  );
}
