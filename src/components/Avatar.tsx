import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
}

// Permitir tamaño custom por clase, no aplicar width/height inline por defecto
export const Avatar: React.FC<AvatarProps> = ({ src, alt, fallback, className = '' }) => {
  return (
    <div className={`rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}>
      {src ? (
        <img src={src} alt={alt || 'avatar'} className="w-full h-full object-cover" />
      ) : (
        <span className="text-2xl text-gray-500 font-bold">{fallback || '?'}</span>
      )}
    </div>
  );
};
