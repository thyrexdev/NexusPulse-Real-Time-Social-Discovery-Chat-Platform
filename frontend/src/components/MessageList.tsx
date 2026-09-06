'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChatStore } from '@/store/useChatStore';
import { Message } from '@/types/chat';

export const MessageList: React.FC = () => {
  const {
    messages,
    currentUser,
    activeConversationId,
    activeSession,
    activePeer,
    activeTopic,
    matchStatus,
    partnerStatusMessage,
    typingUsers,
    skipCurrentMatch,
    sendMessage,
  } = useChatStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, partnerStatusMessage, matchStatus]);

  const isPartnerTyping = activeConversationId && (typingUsers[activeConversationId] || []).length > 0;

  const handleRetry = async () => {
    if (!failedMessage) return;
    setIsRetrying(true);
    await sendMessage(failedMessage);
    setFailedMessage(null);
    setIsRetrying(false);
  };

  const getTopicIcebreaker = (topic: string) => {
    switch (topic?.toLowerCase()) {
      case 'tech':
      case 'technology':
        return 'What are you currently architecting or hacking on right now?';
      case 'philosophy':
        return 'What is an idea or mental model that changed how you see the world?';
      case 'languages':
        return 'What languages are you currently learning or practicing?';
      case 'design':
      case 'design systems':
        return 'What is your favorite design token or UI interaction paradigm?';
      case 'science':
        return 'What recent scientific discovery or hypothesis fascinates you most?';
      default:
        return 'What is a passion or project you have been thinking about lately?';
    }
  };

  // If no conversation is selected and idle
  if (!activeConversationId && matchStatus === 'idle') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--canvas-base)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid rgba(0, 240, 208, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--pulse-cyan)',
            marginBottom: '20px',
            boxShadow: '0 0 24px rgba(0, 240, 208, 0.15)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
            radar
          </span>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-high)', marginBottom: '8px' }}>
          Real-Time Social Discovery
        </h2>
        <p style={{ color: 'var(--text-mid)', maxWidth: '420px', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.6 }}>
          Connect with peers over shared technical and intellectual affinities through low-latency Socket.IO channels.
        </p>
        <Link
          href="/discovery"
          className="btn-primary-pulse"
          style={{ textDecoration: 'none', padding: '12px 28px', fontSize: '0.95rem' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            play_arrow
          </span>
          <span>Enter Discovery Radar</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: 'var(--canvas-base)',
      }}
    >
      {/* Stitch Icebreaker Card */}
      {activeSession && activePeer && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            maxWidth: '680px',
            margin: '0 auto 8px',
            boxShadow: 'var(--shadow-layer-1)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pulse-cyan)',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              psychology
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-high)' }}>
                Connected through #{activeTopic || 'general'}
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text-low)',
                  fontWeight: 600,
                }}
              >
                Icebreaker Prompt
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', lineHeight: 1.5 }}>
              {getTopicIcebreaker(activeTopic || 'general')}
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {messages.length === 0 && matchStatus !== 'ended' && (
        <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-low)', fontSize: '0.88rem' }}>
          No messages in this session yet. Say hello and initiate conversation! 👋
        </div>
      )}

      {/* Message Feed Stream */}
      {messages.map((msg: Message, index: number) => {
        const isMe = msg.senderId === currentUser?.id;
        const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: isMe ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: '10px',
              maxWidth: '85%',
              alignSelf: isMe ? 'flex-end' : 'flex-start',
            }}
          >
            {!isMe && (
              <div style={{ width: '32px', height: '32px', flexShrink: 0 }}>
                {showAvatar ? (
                  <img
                    src={msg.sender?.avatar || activePeer?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={msg.sender?.fullName || 'Peer'}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : null}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && showAvatar && (
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-low)', marginBottom: '3px', paddingLeft: '4px' }}>
                  {msg.sender?.fullName || msg.sender?.username || activePeer?.fullName || 'Peer'}
                </span>
              )}

              <div className={isMe ? 'stitch-bubble-self' : 'stitch-bubble-partner'}>
                {msg.content}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.65rem',
                  color: 'var(--text-low)',
                  marginTop: '3px',
                  padding: '0 4px',
                }}
              >
                <span>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isMe && (
                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--pulse-cyan)' }}>
                    done_all
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Failed Message Demonstration state (if triggered) */}
      {failedMessage && (
        <div style={{ alignSelf: 'flex-end', maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div className="stitch-bubble-self" style={{ opacity: 0.8, textDecoration: 'line-through' }}>
            {failedMessage}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--status-crimson)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                error
              </span>
              Delivery timeout
            </span>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--status-crimson)',
                background: 'var(--status-crimson-soft)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-xs)',
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* Partner Typing Pulse Indicator */}
      {isPartnerTyping && (
        <div
          style={{
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 14px',
            boxShadow: 'var(--shadow-layer-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span
              style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--pulse-cyan)' }}
              className="typing-dot-1"
            />
            <span
              style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--pulse-cyan)' }}
              className="typing-dot-2"
            />
            <span
              style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--pulse-cyan)' }}
              className="typing-dot-3"
            />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontWeight: 500 }}>
            {activePeer?.fullName || 'Partner'} is typing...
          </span>
        </div>
      )}

      {/* Partner Disconnected / Session Ended Card */}
      {(matchStatus === 'ended' || partnerStatusMessage) && (
        <div
          style={{
            padding: '24px 28px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-hairline)',
            textAlign: 'center',
            maxWidth: '520px',
            margin: '24px auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            boxShadow: 'var(--shadow-layer-2)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-amber-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-amber)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              call_end
            </span>
          </div>

          <div>
            <h4 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-high)', marginBottom: '4px' }}>
              {partnerStatusMessage || 'Conversation Session Ended'}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', lineHeight: 1.5 }}>
              The other person disconnected or skipped the session. Would you like to match with someone new?
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => skipCurrentMatch(true)}
              className="btn-primary-pulse"
              style={{ padding: '10px 24px', fontSize: '0.9rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                sync
              </span>
              <span>Find Someone New</span>
            </button>

            <Link
              href="/discovery"
              className="btn-ghost-stitch"
              style={{ textDecoration: 'none', padding: '10px 18px', fontSize: '0.88rem' }}
            >
              Return to Discover
            </Link>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
