'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';

interface SessionContextPanelProps {
  onOpenReport: () => void;
  onOpenBlock: () => void;
}

export const SessionContextPanel: React.FC<SessionContextPanelProps> = ({ onOpenReport, onOpenBlock }) => {
  const { activeSession, activePeer, activeTopic, connectionStatus } = useChatStore();
  const [durationSeconds, setDurationSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    if (activeSession?.startedAt) {
      const startTime = new Date(activeSession.startedAt).getTime();
      interval = setInterval(() => {
        setDurationSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
      }, 1000);
    } else {
      setDurationSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatDuration = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTopicKeywords = (topic: string) => {
    switch (topic?.toLowerCase()) {
      case 'tech':
      case 'technology':
        return ['#DistributedSystems', '#Consensus', '#DatabaseEngines', '#RaftProtocol'];
      case 'philosophy':
        return ['#Epistemology', '#Ethics', '#Logic', '#Metaphysics'];
      case 'languages':
        return ['#LanguageExchange', '#Polyglot', '#CulturalSync', '#Grammar'];
      case 'design':
      case 'design systems':
        return ['#TokensCadence', '#UIArchitecture', '#Fidelity', '#Accessibility'];
      case 'science':
        return ['#QuantumPhysics', '#Astrophysics', '#Empirical', '#Complexity'];
      default:
        return ['#RealTime', '#Serendipity', '#OpenDiscourse', '#Community'];
    }
  };

  const keywords = getTopicKeywords(activeTopic || 'general');

  return (
    <aside
      style={{
        width: '320px',
        backgroundColor: 'var(--canvas-base)',
        borderLeft: '1px solid var(--border-hairline)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        overflowY: 'auto',
      }}
      className="hidden-mobile-telemetry"
    >
      {/* Session Telemetry Card */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-hairline)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-low)',
            }}
          >
            Session Node
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.7rem',
              color: 'var(--conn-emerald)',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--conn-emerald)',
              }}
              className="beacon-pulse"
            />
            Connected
          </span>
        </div>

        {/* Live Sparkline Vector */}
        <div
          style={{
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-mid)' }}>
            <span>Network Latency</span>
            <span style={{ color: 'var(--pulse-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>18ms avg</span>
          </div>
          <svg style={{ width: '100%', height: '24px', color: 'var(--pulse-cyan)' }} viewBox="0 0 100 24" fill="none">
            <path
              d="M0 12 L15 12 L20 4 L28 20 L35 8 L42 16 L50 12 L65 12 L72 6 L80 18 L88 12 L100 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* 2-Column Transport & Duration Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-2)' }}>
            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-low)', textTransform: 'uppercase' }}>
              Transport
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-high)' }}>WebSocket</span>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-2)' }}>
            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-low)', textTransform: 'uppercase' }}>
              Duration
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--pulse-cyan)', fontFamily: 'var(--font-mono)' }}>
              {formatDuration(durationSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Shared Interest Anchors Card */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-hairline)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-low)',
            }}
          >
            Shared Interest
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--pulse-cyan)' }}>
            hub
          </span>
        </div>

        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-high)', textTransform: 'capitalize' }}>
            {activeTopic || 'General Discovery'}
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-mid)', marginTop: '4px', lineHeight: 1.5 }}>
            Matched through concurrent preference for this focus topic in the real-time queue.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
          {keywords.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '0.68rem',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--pulse-cyan)',
                fontWeight: 600,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Safety & Moderation Controls Card */}
      <div
        style={{
          marginTop: 'auto',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-hairline)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--human-ember)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            shield
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Safety Controls
          </span>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-mid)', lineHeight: 1.5 }}>
          NexusPulse enforces safe conversation standards. Messages are transport verified.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={onOpenReport}
            className="btn-ghost-stitch"
            style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--human-ember)' }}>
              flag
            </span>
            <span>Report User</span>
          </button>

          <button
            type="button"
            onClick={onOpenBlock}
            className="btn-danger-stitch"
            style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              block
            </span>
            <span>Block from Matching</span>
          </button>
        </div>

        <span style={{ fontSize: '0.68rem', color: 'var(--text-low)', textAlign: 'center', display: 'block' }}>
          You will not be paired with this peer again.
        </span>
      </div>

      <style jsx>{`
        @media (max-width: 1200px) {
          .hidden-mobile-telemetry {
            display: none !important;
          }
        }
      `}</style>
    </aside>
  );
};
