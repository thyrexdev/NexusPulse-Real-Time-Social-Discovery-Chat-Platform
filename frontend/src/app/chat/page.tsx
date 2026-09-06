'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useChatStore } from '@/store/useChatStore';
import { AppShell } from '@/components/AppShell';
import { ChatHeader } from '@/components/ChatHeader';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { SessionContextPanel } from '@/components/SessionContextPanel';
import { ReportModal } from '@/components/ReportModal';
import { ArchitectureDrawer } from '@/components/ArchitectureDrawer';

export default function ChatPage() {
  const {
    isLoading,
    connectionStatus,
    activeSession,
    activePeer,
    activeTopic,
    conversations,
    activeConversationId,
    currentUser,
    quickSwitchUser,
    selectConversation,
    blockCurrentPeer,
  } = useChatStore();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isSyncBannerDismissed, setIsSyncBannerDismissed] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [sessionFilterTab, setSessionFilterTab] = useState<'active' | 'recent'>('active');

  React.useEffect(() => {
    if (!isLoading && !currentUser) {
      quickSwitchUser('alice');
    }
  }, [isLoading, currentUser, quickSwitchUser]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--surface-0)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '3px solid rgba(0, 240, 208, 0.2)',
              borderTopColor: 'var(--pulse-cyan)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: 'var(--text-mid)', fontSize: '0.9rem' }}>Synchronizing NexusPulse Engine...</p>
        </div>
      </div>
    );
  }

  const filteredConversations = conversations.filter((c) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return c.title?.toLowerCase().includes(q) || c.participants.some((p) => p.user?.username?.toLowerCase().includes(q));
  });

  return (
    <AppShell onToggleArchitecture={() => setIsArchitectureOpen(true)}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
          backgroundColor: 'var(--surface-0)',
        }}
      >
        {/* Column 1: Conversations & Sessions Drawer (Desktop width 280px) */}
        <aside
          className="hidden-mobile-sessions"
          style={{
            width: '280px',
            backgroundColor: 'var(--canvas-base)',
            borderRight: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            gap: '12px',
          }}
        >
          {/* Drawer Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-high)' }}>Sessions</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--surface-1)',
                color: 'var(--pulse-cyan)',
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--pulse-cyan)',
                }}
                className="beacon-pulse"
              />
              Live Hub
            </span>
          </div>

          {/* Filter Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: 'var(--text-low)' }}>
              search
            </span>
            <input
              type="text"
              placeholder="Filter sessions..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-high)',
                fontSize: '0.82rem',
                width: '100%',
                outline: 'none',
              }}
            />
          </div>

          {/* Filter Tabs (Active / Recent) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              backgroundColor: 'var(--surface-1)',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setSessionFilterTab('active')}
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                backgroundColor: sessionFilterTab === 'active' ? 'var(--surface-2)' : 'transparent',
                color: sessionFilterTab === 'active' ? 'var(--pulse-cyan)' : 'var(--text-mid)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Active ({activeSession ? 1 : conversations.length})
            </button>
            <button
              type="button"
              onClick={() => setSessionFilterTab('recent')}
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                backgroundColor: sessionFilterTab === 'recent' ? 'var(--surface-2)' : 'transparent',
                color: sessionFilterTab === 'recent' ? 'var(--pulse-cyan)' : 'var(--text-mid)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Recent (3)
            </button>
          </div>

          {/* Sessions Feed */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Active Match Session item (if matched) */}
            {activeSession && activePeer && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid rgba(0, 240, 208, 0.35)',
                  boxShadow: '0 0 12px rgba(0, 240, 208, 0.12)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <img
                        src={activePeer.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={activePeer.fullName || 'Peer'}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--conn-emerald)',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-high)' }}>
                        {activePeer.fullName || `@${activePeer.username}`}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--pulse-cyan)', textTransform: 'capitalize' }}>
                        #{activeTopic || 'general'}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--pulse-cyan)', fontWeight: 600 }}>Live</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Active real-time conversation session
                </p>
              </div>
            )}

            {/* Other active conversations */}
            {filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConversationId && !activeSession;
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--surface-2)' : 'var(--surface-1)',
                    border: isSelected ? '1px solid var(--pulse-cyan)' : '1px solid var(--border-hairline)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-high)' }}>
                      {conv.title || 'Direct Transmission'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-low)' }}>
                      {new Date(conv.lastMessageAt || conv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-mid)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.messages?.[0]?.content || 'Click to view transmission transcript'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Quick Hub Indicator */}
          <div
            style={{
              paddingTop: '8px',
              borderTop: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.68rem',
              color: 'var(--text-low)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--conn-emerald)' }} />
              Matching pool standby
            </span>
            <span>v2.4.0</span>
          </div>
        </aside>

        {/* Column 2: Center-Stage Conversational Workspace */}
        <section
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: 'var(--canvas-base)',
            position: 'relative',
          }}
        >
          <ChatHeader
            onOpenReport={() => setIsReportModalOpen(true)}
            onOpenBlock={() => {
              if (confirm('Block this user permanently and terminate current conversation?')) {
                blockCurrentPeer();
              }
            }}
          />

          {/* Non-Blocking Reconnection / Sync Banner */}
          {connectionStatus !== 'connected' && (
            <div
              style={{
                padding: '8px 20px',
                backgroundColor: 'var(--status-amber-soft)',
                borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'var(--status-amber)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  sync
                </span>
                <span style={{ fontWeight: 600 }}>Reconnecting to Socket.IO engine...</span>
                <span style={{ color: 'var(--text-low)' }}>• Retrying with exponential backoff</span>
              </div>
            </div>
          )}

          {connectionStatus === 'connected' && !isSyncBannerDismissed && (
            <div
              style={{
                padding: '6px 20px',
                backgroundColor: 'var(--surface-1)',
                borderBottom: '1px solid var(--border-hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-mid)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--pulse-cyan)' }}>
                  check_circle
                </span>
                <span style={{ color: 'var(--text-high)', fontWeight: 600 }}>Socket synchronized</span>
                <span style={{ color: 'var(--text-low)' }}>•</span>
                <span>Active session on primary Socket.IO node</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncBannerDismissed(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-low)', cursor: 'pointer', padding: '2px' }}
                title="Dismiss banner"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  close
                </span>
              </button>
            </div>
          )}

          <MessageList />
          <MessageInput />
        </section>

        {/* Column 3: Context & Safety Telemetry Panel (Desktop width 320px) */}
        <SessionContextPanel
          onOpenReport={() => setIsReportModalOpen(true)}
          onOpenBlock={() => {
            if (confirm('Block this user permanently and terminate current conversation?')) {
              blockCurrentPeer();
            }
          }}
        />
      </div>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
      <ArchitectureDrawer isOpen={isArchitectureOpen} onClose={() => setIsArchitectureOpen(false)} />

      <style jsx>{`
        @media (max-width: 900px) {
          .hidden-mobile-sessions {
            display: none !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
