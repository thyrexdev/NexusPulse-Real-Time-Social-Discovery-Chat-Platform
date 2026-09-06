'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useChatStore, DEMO_USERS } from '@/store/useChatStore';

interface NavbarProps {
  onToggleArchitecture: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleArchitecture }) => {
  const { currentUser, connectionStatus, quickSwitchUser, logout } = useChatStore();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  return (
    <header className="glass-panel" style={{
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: '1px solid var(--border-glass)',
      zIndex: 40,
      position: 'relative',
    }}>
      {/* Brand Logo & Architecture Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              NexusPulse
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Social Discovery & Chat Platform
            </div>
          </div>
        </Link>

        {/* Live System Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-glass)',
          fontSize: '0.78rem',
          fontWeight: 600,
        }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor:
                connectionStatus === 'connected'
                  ? 'var(--online)'
                  : connectionStatus === 'connecting'
                  ? 'var(--warning)'
                  : connectionStatus === 'demo'
                  ? 'var(--accent-cyan)'
                  : 'var(--offline)',
            }}
            className={connectionStatus === 'connected' || connectionStatus === 'demo' ? 'status-online' : ''}
          />
          <span style={{ color: 'var(--text-secondary)' }}>
            {connectionStatus === 'connected'
              ? 'WSS: Connected'
              : connectionStatus === 'connecting'
              ? 'WSS: Reconnecting...'
              : connectionStatus === 'demo'
              ? 'Interactive Demo Mode'
              : 'WSS: Offline'}
          </span>
          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
            Socket.io + Redis
          </span>
        </div>
      </div>

      {/* Navigation Links & Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link href="/discovery" className="btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px', textDecoration: 'none', fontWeight: 600 }}>
          ⚡ Match Radar
        </Link>
        <Link href="/lobby" className="btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 14px', textDecoration: 'none' }}>
          Choice Hub
        </Link>

        {/* Architecture Drawer Trigger */}
        <button
          onClick={onToggleArchitecture}
          className="btn-secondary"
          style={{ fontSize: '0.85rem', padding: '8px 14px', gap: '6px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
            <line x1="6" y1="6" x2="6.01" y2="6"></line>
            <line x1="6" y1="18" x2="6.01" y2="18"></line>
          </svg>
          System Docs
        </button>

        {/* Quick Demo Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSwitchMenu(!showSwitchMenu)}
            className="btn-secondary"
            style={{ fontSize: '0.85rem', padding: '8px 14px', gap: '6px' }}
          >
            <span>Switch User</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {showSwitchMenu && (
            <div className="glass-panel" style={{
              position: 'absolute',
              top: '46px',
              right: '0',
              width: '220px',
              borderRadius: 'var(--radius-md)',
              padding: '8px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <div style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Simulate Multi-User Tab
              </div>
              {(['alice', 'bob', 'charlie'] as const).map((key) => {
                const u = DEMO_USERS[key];
                const isActive = currentUser?.username === u.username;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      quickSwitchUser(key);
                      setShowSwitchMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive ? 'var(--accent-gradient-subtle)' : 'transparent',
                      border: 'none',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-main)',
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isActive ? 'var(--accent-gradient-subtle)' : 'transparent')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.avatar || ''} alt={u.fullName} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div>{u.fullName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Current User Card & Logout */}
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', borderLeft: '1px solid var(--border-glass)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
              alt={currentUser.fullName}
              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{currentUser.fullName}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{currentUser.username}</span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="btn-ghost"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/login" className="btn-secondary" style={{ fontSize: '0.85rem', padding: '6px 12px', textDecoration: 'none' }}>
              Sign In
            </Link>
            <Link href="/register" className="btn-primary" style={{ fontSize: '0.85rem', padding: '6px 14px', textDecoration: 'none' }}>
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
