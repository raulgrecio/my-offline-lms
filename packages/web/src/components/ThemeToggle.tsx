import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Initial load
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initial = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

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
      className="p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 border"
      style={{
        backgroundColor: 'var(--bg-surface-elevated)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-elevation)'
      }}
      title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
    >
      <div className="w-5 h-5 flex items-center justify-center">
        {theme === 'dark' ? (
          <Icon name="sun" size="md" />
        ) : (
          <Icon name="moon" size="md" />
        )}
      </div>
    </button>
  );
}
