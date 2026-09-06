'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChatStore } from '@/store/useChatStore';

interface AppShellProps {
  children: React.ReactNode;
  onToggleArchitecture?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, onToggleArchitecture }) => {
  const pathname = usePathname();
  const { currentUser, connectionStatus, conversations, matchStatus } = useChatStore();
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

  const isDiscover = pathname === '/discovery';
  const isChat = pathname === '/chat';

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', backgroundColor: 'var(--surface-0)', overflow: 'hidden' }}>
      {/* Desktop Sidebar (Pinned Left 260px on screens >= 1024px) */}
      <aside
        className="hidden-mobile"
        style={{
          width: '256px',
          backgroundColor: 'var(--canvas-base)',
          borderRight: '1px solid var(--border-hairline)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
        }}
      >
        {/* Top: Brand & Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Brand Emblem */}
          <div
            style={{
              height: '68px',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(0, 240, 208, 0.12)',
                border: '1px solid rgba(0, 240, 208, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--pulse-cyan)',
                boxShadow: '0 0 16px rgba(0, 240, 208, 0.25)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                wifi_tethering
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-high)',
                }}
              >
                Nexus<span style={{ color: 'var(--pulse-cyan)' }}>Pulse</span>
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-low)',
                  fontWeight: 600,
                }}
              >
                Atmospheric Core
              </span>
            </div>
          </div>

          {/* Operations Menu */}
          <div style={{ padding: '20px 16px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-low)',
                padding: '0 8px',
                marginBottom: '12px',
              }}
            >
              Operations
            </span>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Discover Link */}
              <Link
                href="/discovery"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isDiscover ? 700 : 500,
                  color: isDiscover ? 'var(--canvas-base)' : 'var(--text-mid)',
                  backgroundColor: isDiscover ? 'var(--pulse-cyan)' : 'transparent',
                  boxShadow: isDiscover ? '0 0 16px var(--pulse-cyan-glow)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                    radar
                  </span>
                  <span>Discover</span>
                </div>
                {matchStatus === 'searching' ? (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isDiscover ? '#080B11' : 'var(--pulse-cyan)',
                      boxShadow: '0 0 8px var(--pulse-cyan)',
                    }}
                    className="beacon-pulse"
                  />
                ) : (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isDiscover ? '#080B11' : 'var(--pulse-cyan)',
                    }}
                  />
                )}
              </Link>

              {/* Transmissions / Chats Link */}
              <Link
                href="/chat"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isChat ? 700 : 500,
                  color: isChat ? 'var(--canvas-base)' : 'var(--text-mid)',
                  backgroundColor: isChat ? 'var(--pulse-cyan)' : 'transparent',
                  boxShadow: isChat ? '0 0 16px var(--pulse-cyan-glow)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                    chat_bubble
                  </span>
                  <span>Transmissions</span>
                </div>
                {conversations.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isChat ? '#080B11' : 'var(--surface-high)',
                      color: isChat ? 'var(--pulse-cyan)' : 'var(--text-mid)',
                    }}
                  >
                    {conversations.length}
                  </span>
                )}
              </Link>

              {/* Safety & Protocol Button */}
              <button
                type="button"
                onClick={() => setIsSafetyModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--text-mid)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-high)';
                  e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-mid)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                  verified_user
                </span>
                <span>Safety & Rules</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom User Capsule & Sync Badge */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-hairline)' }}>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt={currentUser?.fullName || 'User'}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: connectionStatus === 'connected' ? 'var(--conn-emerald)' : 'var(--status-amber)',
                    border: '1.5px solid var(--canvas-base)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-high)' }}>
                  {currentUser?.fullName || currentUser?.username || 'Guest Peer'}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--pulse-cyan)', fontWeight: 500 }}>
                  {connectionStatus === 'connected' ? 'Active on Socket' : 'Reconnecting...'}
                </span>
              </div>
            </div>

            {onToggleArchitecture && (
              <button
                type="button"
                onClick={onToggleArchitecture}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-mid)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="View Architecture"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  terminal
                </span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container Envelope */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: '256px',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: 'var(--surface-0)',
        }}
        className="main-viewport-offset"
      >
        {/* Pinned Top Bar */}
        <header
          style={{
            height: '64px',
            backgroundColor: 'rgba(16, 19, 26, 0.85)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-low)', fontWeight: 500 }}>Nexus</span>
              <span style={{ color: 'var(--border-hairline)' }}>/</span>
              <span style={{ color: 'var(--text-high)', fontWeight: 700 }}>
                {isDiscover ? 'Signals' : isChat ? 'Transmissions' : 'Console'}
              </span>
            </div>

            <div
              style={{
                width: '1px',
                height: '16px',
                backgroundColor: 'var(--border-hairline)',
                margin: '0 4px',
              }}
            />

            {/* Socket Heartbeat Chip */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-hairline)',
                fontSize: '0.72rem',
                color: connectionStatus === 'connected' ? 'var(--pulse-cyan)' : 'var(--status-amber)',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: connectionStatus === 'connected' ? 'var(--pulse-cyan)' : 'var(--status-amber)',
                  boxShadow: connectionStatus === 'connected' ? '0 0 6px var(--pulse-cyan)' : 'none',
                }}
              />
              <span>{connectionStatus === 'connected' ? 'Socket Active • 18ms' : 'Syncing Engine...'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/discovery"
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: isDiscover ? 'var(--pulse-cyan)' : 'var(--text-mid)',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Discover
            </Link>

            <Link
              href="/chat"
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: isChat ? 'var(--pulse-cyan)' : 'var(--text-mid)',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Chat
            </Link>

            {onToggleArchitecture && (
              <button
                type="button"
                onClick={onToggleArchitecture}
                className="btn-ghost-stitch"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                title="Engineering Architecture"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  account_tree
                </span>
                <span>Specs</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</main>
      </div>

      {/* Safety & Protocol Modal */}
      {isSafetyModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(8, 11, 17, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setIsSafetyModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-layer-3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pulse-cyan)' }}>
                <span className="material-symbols-outlined">verified_user</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-high)' }}>Sanctuary Protocol</h3>
              </div>
              <button
                onClick={() => setIsSafetyModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-mid)', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-mid)', lineHeight: 1.6, marginBottom: '16px' }}>
              NexusPulse is engineered for authentic, high-respect real-time connections. Every session is ephemeral and 1-on-1:
            </p>

            <ul style={{ paddingLeft: '20px', color: 'var(--text-mid)', fontSize: '0.85rem', lineHeight: 1.8, marginBottom: '20px' }}>
              <li><strong>Zero Harassment:</strong> Any toxic or abusive behavior can be reported immediately.</li>
              <li><strong>Permanent Blocking:</strong> Blocking a user terminates the session and prevents rematching forever.</li>
              <li><strong>Mutual Consent:</strong> You can skip or disconnect at any time without penalty.</li>
            </ul>

            <button
              type="button"
              onClick={() => setIsSafetyModalOpen(false)}
              className="btn-primary-pulse"
              style={{ width: '100%' }}
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Responsive CSS for Mobile */}
      <style jsx global>{`
        @media (max-width: 1024px) {
          .hidden-mobile {
            display: none !important;
          }
          .main-viewport-offset {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
