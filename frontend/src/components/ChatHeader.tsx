'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { ConversationType } from '@/types/chat';

interface ChatHeaderProps {
  onOpenReport?: () => void;
  onOpenBlock?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onOpenReport, onOpenBlock }) => {
  const {
    conversations,
    activeConversationId,
    currentUser,
    onlineUserIds,
    typingUsers,
    activeSession,
    activePeer,
    activeTopic,
    connectionStatus,
    skipCurrentMatch,
    leaveCurrentSession,
  } = useChatStore();

  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Active Session Timer
  useEffect(() => {
    let interval: any;
    if (activeSession?.startedAt) {
      const startTime = new Date(activeSession.startedAt).getTime();
      interval = setInterval(() => {
        setSessionSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
      }, 1000);
    } else {
      setSessionSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  // Keyboard shortcut listener for rapid skipping (Alt+N or Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSession && (e.key === 'Escape' || (e.altKey && e.key.toLowerCase() === 'n'))) {
        e.preventDefault();
        skipCurrentMatch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSession, skipCurrentMatch]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // If in an active stranger match session
  if (activeSession && activePeer) {
    const formatTime = (total: number) => {
      const m = Math.floor(total / 60);
      const s = total % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isTyping = activeConversationId && (typingUsers[activeConversationId] || []).length > 0;

    return (
      <header
        style={{
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--surface-1)',
          zIndex: 10,
        }}
      >
        {/* Peer Info & Presence Beacon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={activePeer.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={activePeer.fullName || activePeer.username}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid rgba(0, 240, 208, 0.4)',
                boxShadow: '0 0 12px rgba(0, 240, 208, 0.2)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--conn-emerald)',
                border: '2px solid var(--surface-1)',
                boxShadow: '0 0 8px var(--conn-emerald)',
              }}
              className="beacon-pulse"
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-high)' }}>
                {activePeer.fullName || `@${activePeer.username}`}
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--pulse-cyan)',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                #{activeTopic || 'general'}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(0, 240, 208, 0.08)',
                  color: 'var(--pulse-cyan)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                }}
              >
                ⏱️ {formatTime(sessionSeconds)}
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: isTyping ? 'var(--pulse-cyan)' : 'var(--text-mid)', marginTop: '2px' }}>
              {isTyping ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    edit
                  </span>
                  <span>Partner is typing...</span>
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--conn-emerald)',
                    }}
                  />
                  <span>18ms Latency • WebSocket Synchronized</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => skipCurrentMatch(true)}
            className="btn-skip"
            title="Skip to next stranger (Shortcut: Esc or Alt+N)"
            style={{ fontSize: '0.82rem', padding: '7px 14px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              skip_next
            </span>
            <span>Next</span>
            <kbd
              style={{
                fontSize: '0.65rem',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '2px 5px',
                borderRadius: '3px',
                marginLeft: '4px',
              }}
            >
              Esc
            </kbd>
          </button>

          {onOpenReport && (
            <button
              type="button"
              onClick={onOpenReport}
              className="btn-ghost-stitch"
              style={{ padding: '7px 12px', fontSize: '0.82rem' }}
              title="Report User"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--human-ember)' }}>
                flag
              </span>
              <span className="hidden-sm">Report</span>
            </button>
          )}

          <button
            type="button"
            onClick={leaveCurrentSession}
            className="btn-danger-stitch"
            style={{ padding: '7px 12px', fontSize: '0.82rem' }}
            title="End Session"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              call_end
            </span>
            <span className="hidden-sm">End</span>
          </button>
        </div>

        <style jsx>{`
          @media (max-width: 640px) {
            .hidden-sm {
              display: none;
            }
          }
        `}</style>
      </header>
    );
  }

  // Standard Room Header (if not in a stranger session)
  if (!activeConversation) return null;

  const isGroup = activeConversation.type === ConversationType.GROUP;
  const otherParticipant = activeConversation.participants.find((p) => p.userId !== currentUser?.id);
  const otherUser = otherParticipant?.user;
  const isOnline = otherUser ? onlineUserIds.has(otherUser.id) : false;

  const title = isGroup
    ? activeConversation.title || 'Group Chat'
    : otherUser?.fullName || otherUser?.username || 'Direct Transmission';

  const avatar = isGroup
    ? activeConversation.avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150'
    : otherUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

  return (
    <header
      style={{
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--border-hairline)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ position: 'relative' }}>
          <img
            src={avatar}
            alt={title}
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
          />
          {!isGroup && isOnline && (
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--conn-emerald)',
                border: '2px solid var(--surface-1)',
              }}
              className="beacon-pulse"
            />
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-high)' }}>{title}</h3>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-mid)', marginTop: '2px' }}>
            {isGroup ? (
              `${activeConversation.participants.length} participants active`
            ) : isOnline ? (
              <span style={{ color: 'var(--conn-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--conn-emerald)' }} />
                Online on instance node
              </span>
            ) : (
              'Standby / Disconnected'
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
