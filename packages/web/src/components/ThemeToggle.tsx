import { useState, useEffect } from 'react';
import { Icon } from './Icon';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Only run on client
    const currentTheme = (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
    setTheme(currentTheme);
    setMounted(true);
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTheme = theme === 'dark' ? 'light' : 'dark';

    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  if (!mounted) {
    // Return a placeholder structure with same dimensions to avoid flicker
    return (
      <div className="p-2 w-10 h-10 rounded-xl border bg-surface-700 border-border-subtle" />
    );
  }

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
