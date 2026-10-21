import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  variant?: 'full' | 'icon-only' | 'text-only';
  className?: string;
  lightMode?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  variant = 'full',
  className = '',
  lightMode = false
}) => {
  const iconSizes = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
    xl: 'h-16 w-16'
  };

  const titleSizes = {
    sm: 'text-lg tracking-wider',
    md: 'text-2xl tracking-widest',
    lg: 'text-3xl tracking-widest',
    xl: 'text-5xl tracking-widest'
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base'
  };

  const textColor = lightMode ? 'text-white' : 'text-[#0B1B43]';
  const taglineColor = lightMode ? 'text-blue-100' : 'text-[#405B8B]';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {variant !== 'text-only' && (
        <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
          <img 
            src="/sarathi-logo.svg" 
            alt="SARATHI Icon" 
            className="w-full h-full object-contain filter drop-shadow-sm transition-transform hover:scale-105"
          />
        </div>
      )}

      {variant !== 'icon-only' && (
        <div className="flex flex-col justify-center">
          <div className={`font-black font-sans leading-none ${titleSizes[size]} ${textColor} flex items-center`}>
            <span>S</span>
            <span className="text-[#087BFA] mx-[1px]">Λ</span>
            <span>R</span>
            <span className="text-[#603DF5] mx-[1px]">Λ</span>
            <span>THI</span>
          </div>
          {showTagline && (
            <span className={`font-medium ${taglineSizes[size]} ${taglineColor} mt-1 tracking-normal font-sans`}>
              Your Skills. Your Journey. Our AI.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
