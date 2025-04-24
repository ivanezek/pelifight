import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white/80 dark:bg-black/80 shadow hover:scale-110 transition"
      aria-label="Cambiar modo claro/oscuro"
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        // Icono sol
        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.47a1 1 0 010 1.42l-.7.7a1 1 0 01-1.42-1.42l.7-.7a1 1 0 011.42 0zM18 9a1 1 0 100 2h-1a1 1 0 100-2h1zm-2.47 4.22a1 1 0 01-1.42 0l-.7-.7a1 1 0 111.42-1.42l.7.7a1 1 0 010 1.42zM10 18a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zm-4.22-2.47a1 1 0 010-1.42l.7-.7a1 1 0 111.42 1.42l-.7.7a1 1 0 01-1.42 0zM2 11a1 1 0 110-2h1a1 1 0 110 2H2zm2.47-4.22a1 1 0 011.42 0l.7.7A1 1 0 014.17 8.9l-.7-.7a1 1 0 010-1.42zM10 6a4 4 0 100 8 4 4 0 000-8z" /></svg>
      ) : (
        // Icono luna
        <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
      )}
    </button>
  );
}
