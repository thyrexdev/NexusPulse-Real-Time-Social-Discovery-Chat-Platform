'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useChatStore } from '@/store/useChatStore';
import { AppShell } from '@/components/AppShell';

interface TopicOption {
  id: string;
  label: string;
  icon: string;
  activity: string;
}

const DISCOVERY_TOPICS: TopicOption[] = [
  { id: 'technology', label: 'Technology', icon: 'code', activity: 'High Activity' },
  { id: 'philosophy', label: 'Philosophy', icon: 'psychology', activity: 'Moderate' },
  { id: 'languages', label: 'Languages', icon: 'translate', activity: 'High Activity' },
  { id: 'creative', label: 'Creative Craft', icon: 'palette', activity: 'Normal' },
  { id: 'design', label: 'Design Systems', icon: 'dashboard', activity: 'High Activity' },
  { id: 'science', label: 'Science', icon: 'biotech', activity: 'Balanced' },
];

export default function DiscoveryPage() {
  const router = useRouter();
  const {
    currentUser,
    matchStatus,
    activeTopic,
    activePeer,
    activeSession,
    connectionStatus,
    joinMatchQueue,
    leaveMatchQueue,
    quickSwitchUser,
    skipCurrentMatch,
  } = useChatStore();

  const [selectedTopic, setSelectedTopic] = useState(activeTopic || 'technology');
  const [secondsSearching, setSecondsSearching] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      quickSwitchUser('alice');
    }
  }, [currentUser, quickSwitchUser]);

  // Search timer
  useEffect(() => {
    let interval: any;
    if (matchStatus === 'searching') {
      interval = setInterval(() => {
        setSecondsSearching((prev) => prev + 1);
      }, 1000);
    } else {
      setSecondsSearching(0);
    }
    return () => clearInterval(interval);
  }, [matchStatus]);

  const handleToggleSearch = async () => {
    if (matchStatus === 'searching') {
      leaveMatchQueue();
      return;
    }

    if (!currentUser) {
      await quickSwitchUser('alice');
    }
    joinMatchQueue(selectedTopic);
  };

  const handleStartChat = () => {
    router.push('/chat');
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AppShell>
      <div
        style={{
          flex: 1,
          padding: '32px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          maxWidth: '1440px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Top Context Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-high)', letterSpacing: '-0.02em' }}>
                Who will you meet today?
              </h1>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--surface-1)',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--pulse-cyan)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--pulse-cyan)',
                  }}
                  className="beacon-pulse"
                />
                Active on Socket • Ready
              </div>
            </div>
            <p style={{ color: 'var(--text-mid)', fontSize: '0.92rem', maxWidth: '620px', lineHeight: 1.5 }}>
              Connect with someone around shared interests in real time. Ephemeral sessions powered by low-latency WebSockets.
            </p>
          </div>

          {/* Direct Link to Chat if in conversation */}
          {activeSession && (
            <Link
              href="/chat"
              className="btn-primary-pulse"
              style={{ textDecoration: 'none', padding: '10px 20px', fontSize: '0.88rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                chat
              </span>
              <span>Return to Active Chat</span>
            </Link>
          )}
        </div>

        {/* Main Grid: 8 Cols Stage + 4 Cols Ledger */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '28px', alignItems: 'start' }}>
          {/* Left 8 Columns: Radar Stage & Controls */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '24px' }} className="grid-col-8">
            {/* Primary Radar Hub Stage */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                minHeight: '380px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--canvas-base)',
                border: '1px solid var(--border-hairline)',
                overflow: 'hidden',
                padding: '36px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-layer-2)',
              }}
            >
              {/* Ambient Glowing Orbs */}
              <div
                style={{
                  position: 'absolute',
                  width: '360px',
                  height: '360px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 240, 208, 0.04)',
                  filter: 'blur(70px)',
                  pointerEvents: 'none',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '260px',
                  height: '260px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 107, 74, 0.05)',
                  filter: 'blur(60px)',
                  pointerEvents: 'none',
                  top: '-40px',
                  right: '-40px',
                }}
              />

              {/* Top Corner Badges */}
              <div
                style={{
                  position: 'absolute',
                  top: '18px',
                  left: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--surface-1)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  color: 'var(--text-mid)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--conn-emerald)' }} />
                <span>1:1 Ephemeral Text Session</span>
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--surface-1)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  color: 'var(--text-mid)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--pulse-cyan)' }}>
                  speed
                </span>
                <span>Latency: <strong style={{ color: 'var(--text-high)' }}>18ms</strong></span>
              </div>

              {/* Central Dynamic Stage based on matchStatus */}
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* IDLE STATE */}
                {matchStatus === 'idle' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    {/* Concentric rings */}
                    <div
                      style={{
                        position: 'relative',
                        width: '200px',
                        height: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          width: '190px',
                          height: '190px',
                          borderRadius: '50%',
                          border: '1px solid rgba(31, 44, 66, 0.6)',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          width: '140px',
                          height: '140px',
                          borderRadius: '50%',
                          border: '1px solid rgba(31, 44, 66, 0.8)',
                        }}
                      />

                      {/* Central Core Icon */}
                      <div
                        style={{
                          width: '88px',
                          height: '88px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--surface-1)',
                          border: '2px solid rgba(0, 240, 208, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 32px rgba(0, 240, 208, 0.18)',
                        }}
                      >
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--pulse-cyan)',
                            color: '#080B11',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 16px rgba(0, 240, 208, 0.4)',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                            wifi_tethering
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-high)' }}>
                        Queue Standing By
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          color: 'var(--text-low)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          marginTop: '4px',
                        }}
                      >
                        Process-Local Match Engine • FIFO Queue
                      </span>
                    </div>
                  </div>
                )}

                {/* SEARCHING STATE */}
                {matchStatus === 'searching' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '200px',
                        height: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* Expanding Wave Rings */}
                      <div
                        style={{
                          position: 'absolute',
                          width: '180px',
                          height: '180px',
                          borderRadius: '50%',
                          border: '2px solid rgba(0, 240, 208, 0.3)',
                          backgroundColor: 'rgba(0, 240, 208, 0.05)',
                        }}
                        className="animate-pulse-radar"
                      />

                      {/* Rotating Center Core */}
                      <div
                        style={{
                          width: '88px',
                          height: '88px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--surface-1)',
                          border: '2px solid var(--pulse-cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 32px rgba(0, 240, 208, 0.35)',
                        }}
                        className="animate-spin-slow"
                      >
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0, 240, 208, 0.2)',
                            color: 'var(--pulse-cyan)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                            radar
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--pulse-cyan)' }}>
                        Evaluating Match Pool...
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.78rem',
                          color: 'var(--text-mid)',
                          fontFamily: 'var(--font-mono)',
                          marginTop: '4px',
                        }}
                      >
                        Searching for {formatTimer(secondsSearching)} • Bias: #{selectedTopic}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleSearch}
                      className="btn-danger-stitch"
                      style={{ marginTop: '6px', padding: '6px 16px', fontSize: '0.8rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        close
                      </span>
                      <span>Cancel Search</span>
                    </button>
                  </div>
                )}

                {/* MATCH FOUND STATE */}
                {matchStatus === 'matched' && activePeer && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
                    {/* Dual Connection Nodes */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                      {/* You */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ position: 'relative' }}>
                          <img
                            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt="You"
                            style={{
                              width: '68px',
                              height: '68px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid var(--pulse-cyan)',
                              boxShadow: '0 0 20px rgba(0, 240, 208, 0.3)',
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
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-high)' }}>You</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--pulse-cyan)' }}>Local Node</span>
                      </div>

                      {/* Connection Wave Graphic */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'rgba(0, 240, 208, 0.1)',
                            border: '1px solid rgba(0, 240, 208, 0.3)',
                            color: 'var(--pulse-cyan)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            sync_alt
                          </span>
                          <span>Peer Paired</span>
                        </div>

                        <svg style={{ width: '120px', height: '24px' }} viewBox="0 0 120 24" fill="none">
                          <path
                            d="M0 12 C30 0, 60 24, 90 12 C105 6, 120 12, 120 12"
                            stroke="url(#matchGradient)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#00F0D0" />
                              <stop offset="100%" stopColor="#FF6B4A" />
                            </linearGradient>
                          </defs>
                        </svg>

                        <span style={{ fontSize: '0.68rem', color: 'var(--text-low)' }}>Socket Handshake Ready</span>
                      </div>

                      {/* Peer */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ position: 'relative' }}>
                          <img
                            src={activePeer.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                            alt={activePeer.fullName || 'Peer'}
                            style={{
                              width: '68px',
                              height: '68px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid var(--human-ember)',
                              boxShadow: '0 0 20px rgba(255, 107, 74, 0.3)',
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
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-high)' }}>
                          {activePeer.fullName || `@${activePeer.username}`}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--human-ember)' }}>Peer Node</span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-1)',
                        border: '1px solid var(--border-hairline)',
                        fontSize: '0.85rem',
                        color: 'var(--text-high)',
                      }}
                    >
                      Matching Topic: <strong style={{ color: 'var(--pulse-cyan)', textTransform: 'capitalize' }}>#{selectedTopic}</strong>
                    </div>

                    {/* CTAs */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={handleStartChat}
                        className="btn-primary-pulse"
                        style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          forum
                        </span>
                        <span>Start Conversation</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => skipCurrentMatch(true)}
                        className="btn-ghost-stitch"
                        style={{ padding: '12px 20px', fontSize: '0.88rem' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          skip_next
                        </span>
                        <span>Skip & Continue Searching</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Topic Selector Zone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-low)',
                  }}
                >
                  Primary Affinity / Match Focus
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-mid)' }}>Select 1 topic to bias queue</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="topics-grid-3">
                {DISCOVERY_TOPICS.map((topic) => {
                  const isSelected = selectedTopic === topic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopic(topic.id)}
                      disabled={matchStatus === 'searching'}
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isSelected ? 'var(--surface-2)' : 'var(--surface-1)',
                        border: isSelected ? '1px solid var(--pulse-cyan)' : '1px solid var(--border-hairline)',
                        boxShadow: isSelected ? '0 0 16px rgba(0, 240, 208, 0.15)' : 'none',
                        cursor: matchStatus === 'searching' ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isSelected ? 'rgba(0, 240, 208, 0.15)' : 'var(--surface-2)',
                            color: isSelected ? 'var(--pulse-cyan)' : 'var(--text-mid)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            {topic.icon}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: isSelected ? 'var(--pulse-cyan)' : 'var(--text-high)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {topic.label}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: isSelected ? 'var(--pulse-cyan)' : 'var(--text-low)' }}>
                            {topic.activity}
                          </span>
                        </div>
                      </div>

                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '18px', color: isSelected ? 'var(--pulse-cyan)' : 'var(--border-hairline)' }}
                      >
                        {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div
              style={{
                padding: '20px 24px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                boxShadow: 'var(--shadow-layer-1)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--pulse-cyan)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                    hub
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-high)' }}>
                    Socket.IO Matchmaking Engine
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-mid)' }}>
                    Deterministic pairing based on latency and selected focus topic.
                  </span>
                </div>
              </div>

              {matchStatus !== 'matched' && (
                <button
                  type="button"
                  onClick={handleToggleSearch}
                  className={matchStatus === 'searching' ? 'btn-danger-stitch' : 'btn-primary-pulse'}
                  style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {matchStatus === 'searching' ? 'stop' : 'play_arrow'}
                  </span>
                  <span>{matchStatus === 'searching' ? 'Cancel Search' : 'Start Discovery'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right 4 Columns: Connection Ledger & Sanctuary Protocol */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '20px' }} className="grid-col-4">
            {/* Recent Sessions Ledger */}
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--canvas-base)',
                border: '1px solid var(--border-hairline)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: 'var(--shadow-layer-1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--pulse-cyan)' }}>
                    history
                  </span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-high)' }}>Recent Sessions</h3>
                </div>
                <span
                  style={{
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--surface-1)',
                    color: 'var(--text-low)',
                    fontWeight: 600,
                  }}
                >
                  Past 24h
                </span>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-mid)', lineHeight: 1.5 }}>
                Log of past ephemeral encounters. Sessions remain private and unindexed.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-1)',
                    border: '1px solid var(--border-hairline)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-high)' }}>Astrid V.</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--pulse-cyan)' }}>Just now</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-mid)' }}>#Technology • Raft Consensus</span>
                </div>

                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-1)',
                    border: '1px solid var(--border-hairline)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-high)' }}>Julian K.</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-low)' }}>2h ago</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-mid)' }}>#Philosophy • Virtual Environments</span>
                </div>

                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-1)',
                    border: '1px solid var(--border-hairline)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-high)' }}>Elena R.</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-low)' }}>Yesterday</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-mid)' }}>#Design Systems • Tokens Cadence</span>
                </div>
              </div>
            </div>

            {/* Sanctuary Protocol Guidelines */}
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-hairline)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--conn-emerald)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  verified
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Sanctuary Protocol Active
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-mid)', lineHeight: 1.6 }}>
                NexusPulse is committed to respectful interaction. You can disconnect or block any peer instantly at any moment.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          .grid-col-8 {
            grid-column: span 12 !important;
          }
          .grid-col-4 {
            grid-column: span 12 !important;
          }
        }
        @media (max-width: 640px) {
          .topics-grid-3 {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </AppShell>
  );
}
