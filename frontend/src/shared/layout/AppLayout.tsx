// shared/layout/AppLayout.tsx
// Root shell used by EVERY role section (promoter, supervisor, admin).
// Pass your own navItems — each section owns its nav list.

import React from 'react';
import { TopBar }  from './TopBar';
import { Sidebar } from './Sidebar';
import type { NavItem } from './Sidebar';

interface AppLayoutProps {
  title?:     string;
  navItems:   NavItem[];
  activeNav:  string;
  onNavigate: (id: string) => void;
  children:   React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  title, navItems, activeNav, onNavigate, children,
}) => (
  <div style={{
    minHeight: '100vh', height: '100vh',
    background: '#080808',
    display: 'flex', flexDirection: 'column',
    color: '#F4EFE6',
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    overflow: 'hidden',
  }}>
    <TopBar title={title} />

    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <Sidebar items={navItems} activeId={activeNav} onNavigate={onNavigate} />

      <main style={{
        flex: 1, overflowY: 'auto',
        padding: '36px 40px',
        background: [
          'radial-gradient(ellipse at 15% 0%, rgba(196,151,58,0.05) 0%, transparent 55%)',
          'radial-gradient(ellipse at 85% 100%, rgba(196,151,58,0.03) 0%, transparent 50%)',
        ].join(','),
      }}>
        {children}
      </main>
    </div>
  </div>
);