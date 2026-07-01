import React from 'react';

type BadgeVariant = 'gold' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

// New status colors based on admin palette
const STATUS_COLORS = {
  gold:    { bg: 'rgba(232,168,32,0.15)', text: '#E8A820', border: 'rgba(232,168,32,0.4)' },      // AMBER/GL
  success: { bg: 'rgba(74,171,184,0.12)',  text: '#4AABB8', border: 'rgba(74,171,184,0.3)' },    // TEAL
  warning: { bg: 'rgba(232,168,32,0.12)', text: '#E8A820', border: 'rgba(232,168,32,0.3)' },     // AMBER
  danger:  { bg: 'rgba(196,97,74,0.12)',  text: '#C4614A', border: 'rgba(196,97,74,0.3)' },      // CORAL
  neutral: { bg: 'rgba(255,255,255,0.08)', text: '#FAF3E8', border: 'rgba(255,255,255,0.15)' },  // W
  info:    { bg: 'rgba(90,158,196,0.12)', text: '#5A9EC4', border: 'rgba(90,158,196,0.3)' },     // SKY
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  const colors = STATUS_COLORS[variant];
  return (
    <span
      className={className}
      style={{
        ...colors,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
};