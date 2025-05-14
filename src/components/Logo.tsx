import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`${className}`}>
      <svg 
        viewBox="0 0 600 600" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses[size]}`}
      >
        {/* P shape with gradient */}
        <path 
          d="M150 100C150 100 200 100 250 100C300 100 350 150 350 200C350 250 300 300 250 300C200 300 150 300 150 300V500" 
          stroke="url(#paint0_linear)" 
          strokeWidth="100" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Stars */}
        <path 
          d="M250 180L260 200L280 210L260 220L250 240L240 220L220 210L240 200L250 180Z" 
          fill="white"
        />
        <path 
          d="M200 240L205 250L215 255L205 260L200 270L195 260L185 255L195 250L200 240Z" 
          fill="white"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="paint0_linear" x1="150" y1="100" x2="350" y2="500" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7E57C2" />
            <stop offset="1" stopColor="#00A4B8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}