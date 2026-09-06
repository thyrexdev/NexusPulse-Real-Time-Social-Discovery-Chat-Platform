'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChatStore, DEMO_USERS } from '@/store/useChatStore';
import { ArchitectureDrawer } from '@/components/ArchitectureDrawer';

const QUICK_TOPICS = [
  { id: 'technology', label: 'Technology', icon: 'code' },
  { id: 'languages', label: 'Languages', icon: 'translate' },
  { id: 'philosophy', label: 'Philosophy', icon: 'psychology' },
  { id: 'design', label: 'Design Systems', icon: 'dashboard' },
  { id: 'science', label: 'Science', icon: 'biotech' },
  { id: 'creative', label: 'Creative Craft', icon: 'palette' },
];

export default function LandingPage() {
  const router = useRouter();
  const { currentUser, quickSwitchUser, joinMatchQueue, connectionStatus } = useChatStore();
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);

  const handleLaunchTopic = async (topicId: string) => {
    if (!currentUser) {
      await quickSwitchUser('alice');
    }
    joinMatchQueue(topicId);
    router.push('/discovery');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--canvas-base)',
        position: 'relative',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          backgroundColor: 'rgba(16, 19, 26, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-hairline)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 240, 208, 0.12)',
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
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--text-high)' }}>
              Nexus<span style={{ color: 'var(--pulse-cyan)' }}>Pulse</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-low)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Atmospheric Core
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-hairline)',
              fontSize: '0.75rem',
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
              }}
              className="beacon-pulse"
            />
            {connectionStatus === 'connected' ? 'Active on Socket' : 'Engine Ready'}
          </div>

          <button
            type="button"
            onClick={() => setIsArchitectureOpen(true)}
            className="btn-ghost-stitch"
            style={{ fontSize: '0.82rem', padding: '7px 14px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              terminal
            </span>
            <span>System Specs</span>
          </button>

          <Link
            href="/discovery"
            className="btn-primary-pulse"
            style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '8px 18px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              play_arrow
            </span>
            <span>Discover</span>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '60px 24px 50px',
          maxWidth: '1120px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Category Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-hairline)',
            marginBottom: '24px',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--pulse-cyan)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
            hub
          </span>
          <span>Real-Time Social Discovery &bull; Low-Latency WebSockets &bull; Ephemeral Sessions</span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            maxWidth: '920px',
            color: 'var(--text-high)',
          }}
        >
          Spontaneous Conversations around Shared Topics in{' '}
          <span style={{ color: 'var(--pulse-cyan)' }}>Real Time</span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 1.8vw, 1.18rem)',
            color: 'var(--text-mid)',
            maxWidth: '720px',
            lineHeight: 1.6,
            marginBottom: '36px',
          }}
        >
          An atmospheric real-time discovery engine built with NestJS, Socket.IO, PostgreSQL, and Redis. Select an affinity focus, enter the queue, and begin a 1-on-1 session instantly.
        </p>

        {/* Quick Topics Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', maxWidth: '800px', marginBottom: '36px' }}>
          {QUICK_TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleLaunchTopic(t.id)}
              className="btn-ghost-stitch"
              style={{ fontSize: '0.85rem', padding: '8px 16px', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--pulse-cyan)' }}>
                {t.icon}
              </span>
              <span>#{t.label}</span>
            </button>
          ))}
        </div>

        {/* Primary CTAs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginBottom: '48px' }}>
          <Link
            href="/discovery"
            className="btn-primary-pulse"
            style={{
              textDecoration: 'none',
              fontSize: '1rem',
              padding: '14px 32px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              radar
            </span>
            <span>Launch Live Discovery</span>
          </Link>

          <Link
            href="/chat"
            className="btn-ghost-stitch"
            style={{
              textDecoration: 'none',
              fontSize: '1rem',
              padding: '14px 28px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              chat_bubble
            </span>
            <span>Open Chat Workspace</span>
          </Link>
        </div>

        {/* 1-Click Recruiter Demo Login Bar */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-hairline)',
            maxWidth: '680px',
            width: '100%',
            marginBottom: '50px',
            boxShadow: 'var(--shadow-layer-1)',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--pulse-cyan)',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '12px',
              letterSpacing: '0.08em',
            }}
          >
            ⚡ 1-Click Portfolio Demo Switcher
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {(['alice', 'bob', 'charlie'] as const).map((key) => {
              const u = DEMO_USERS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={async () => {
                    await quickSwitchUser(key);
                    router.push('/discovery');
                  }}
                  className="stitch-card"
                  style={{
                    padding: '12px 8px',
                    fontSize: '0.82rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    border: '1px solid var(--border-hairline)',
                  }}
                >
                  <img
                    src={u.avatar || ''}
                    alt={u.fullName}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ fontWeight: 700, color: 'var(--text-high)' }}>{u.fullName}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-low)' }}>@{u.username}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Architectural Features Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            width: '100%',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div style={{ color: 'var(--pulse-cyan)', marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                hub
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-high)', marginBottom: '8px' }}>
              In-Memory Matchmaking
            </h3>
            <p style={{ color: 'var(--text-mid)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              Mutex-extracted process-local FIFO matchmaking queue with atomic pairing, self-match exclusion, and topic affinity.
            </p>
          </div>

          <div
            style={{
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div style={{ color: 'var(--pulse-cyan)', marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                skip_next
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-high)', marginBottom: '8px' }}>
              Instant Peer Cycling
            </h3>
            <p style={{ color: 'var(--text-mid)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              Rapid stranger skipping via keyboard shortcut (Esc / Alt+N). Defensive session cleanup with immediate queue re-entry.
            </p>
          </div>

          <div
            style={{
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div style={{ color: 'var(--human-ember)', marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                shield
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-high)', marginBottom: '8px' }}>
              Sanctuary Moderation
            </h3>
            <p style={{ color: 'var(--text-mid)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              Complete moderation lifecycle with immediate peer blocking, categorized abuse reporting, and permanent pair exclusion.
            </p>
          </div>

          <div
            style={{
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div style={{ color: 'var(--conn-emerald)', marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                wifi
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-high)', marginBottom: '8px' }}>
              Multi-Socket Presence
            </h3>
            <p style={{ color: 'var(--text-mid)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              Multi-socket tracking per user, tab disconnect isolation, and graceful partner disconnect notifications.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture Spec Drawer */}
      <ArchitectureDrawer isOpen={isArchitectureOpen} onClose={() => setIsArchitectureOpen(false)} />
    </div>
  );
}
