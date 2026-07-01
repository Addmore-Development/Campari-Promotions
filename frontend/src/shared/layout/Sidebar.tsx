// shared/layout/Sidebar.tsx
// Used by ALL role sections — promoter, supervisor, admin.
// Each section passes its own navItems array.

import React from 'react';

// Admin‑style tokens
const G = '#C4973A';
const B = '#080808';
const BC = '#161616';
const BB = 'rgba(255,255,255,0.07)';
const W = '#F4EFE6';
const WM = 'rgba(244,239,230,0.55)';
const WD = 'rgba(244,239,230,0.22)';
const FB = "'DM Sans', system-ui, sans-serif";

export interface NavItem {
  id:      string;
  label:   string;
  icon:    string;
  badge?:  number;   // red dot / count
  locked?: boolean;  // shows 🔒 and blocks navigation
}

interface SidebarProps {
  items:      NavItem[];
  activeId:   string;
  onNavigate: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, activeId, onNavigate }) => (
  <aside style={{
    width: '220px', flexShrink: 0,
    background: BC,
    borderRight: `1px solid ${BB}`,
    padding: '24px 12px',
    display: 'flex', flexDirection: 'column', gap: '4px',
    overflowY: 'auto',
  }}>
    {items.map(item => {
      const isActive = item.id === activeId;
      return (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', borderRadius: '10px', border: 'none',
            cursor: item.locked ? 'not-allowed' : 'pointer',
            background: isActive ? 'rgba(196,151,58,0.12)' : 'transparent',
            color: isActive ? G : item.locked ? '#333' : WM,
            fontFamily: FB, fontSize: '13px', fontWeight: isActive ? 700 : 500,
            transition: 'background 0.15s, color 0.15s',
            textAlign: 'left', width: '100%', position: 'relative',
          }}
          onMouseEnter={e => { if (!item.locked && !isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 }}>
            {item.locked ? '🔒' : item.icon}
          </span>
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span style={{
              background: G, color: B,
              fontSize: '10px', fontWeight: 800,
              borderRadius: '999px', padding: '1px 6px', lineHeight: '16px',
            }}>
              {item.badge}
            </span>
          )}
          {isActive && (
            <span style={{
              position: 'absolute', left: 0, top: '20%', bottom: '20%',
              width: '3px', borderRadius: '0 3px 3px 0',
              background: G,
            }} />
          )}
        </button>
      );
    })}
  </aside>
);