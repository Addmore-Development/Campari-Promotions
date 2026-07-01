// shared/layout/TopBar.tsx
// Sticky top bar — shows the page title and sign-out button.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Admin‑style tokens
const G = '#C4973A';
const B = '#080808';
const BB = 'rgba(255,255,255,0.07)';
const W = '#F4EFE6';
const WM = 'rgba(244,239,230,0.55)';
const FB = "'DM Sans', system-ui, sans-serif";

interface TopBarProps {
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title = 'Honey Group Promotions' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      height: '56px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px',
      background: 'rgba(10,10,10,0.95)',
      borderBottom: `1px solid ${BB}`,
      backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '6px',
          background: 'linear-gradient(135deg, #C4973A, #DDB55A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 900, color: '#0A0A0A',
        }}>
          H
        </div>
        <span style={{ color: W, fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          {title}
        </span>
      </div>

      {/* User info + sign out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user && (
          <span style={{ color: '#555', fontSize: '12px' }}>
            {user.name}
          </span>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: `1px solid ${BB}`,
            borderRadius: '8px', color: WM, fontSize: '12px', fontWeight: 600,
            padding: '6px 14px', cursor: 'pointer', fontFamily: FB,
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = G; (e.currentTarget as HTMLButtonElement).style.color = G; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BB; (e.currentTarget as HTMLButtonElement).style.color = WM; }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
};