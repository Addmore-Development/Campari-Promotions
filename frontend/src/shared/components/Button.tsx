import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

// New admin‑style tokens
const G = '#D4880A';
const GL = '#E8A820';
const B = '#0C0A07';
const BB = 'rgba(212,136,10,0.14)';
const W = '#FAF3E8';
const WM = 'rgba(250,243,232,0.55)';
const CORAL = '#C4614A';
const FB = "'DM Sans', system-ui, sans-serif";

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  style,
  ...rest
}) => {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '8px',
    fontFamily: FB,
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.5 : 1,
    transition: 'all 0.2s ease',
    border: 'none',
    outline: 'none',
    width: fullWidth ? '100%' : undefined,
  };

  const sizes: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: '7px 16px', fontSize: '12px' },
    md: { padding: '11px 24px', fontSize: '14px' },
    lg: { padding: '15px 32px', fontSize: '16px' },
  };

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary:   { background: `linear-gradient(135deg, ${G}, ${GL})`, color: B },
    secondary: { background: 'rgba(232,168,32,0.1)', color: GL, border: `1px solid ${GL}80` },
    ghost:     { background: 'transparent', color: WM, border: `1px solid ${BB}` },
    danger:    { background: 'rgba(196,97,74,0.15)', color: CORAL, border: `1px solid ${CORAL}80` },
  };

  return (
    <button
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span style={{ fontSize: '14px' }}>⟳</span> : null}
      {children}
    </button>
  );
};