'use client';

import React from 'react';
import { useChatStore } from '@/store/useChatStore';

interface ArchitectureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureDrawer: React.FC<ArchitectureDrawerProps> = ({ isOpen, onClose }) => {
  const { connectionStatus, onlineUserIds, conversations, messages } = useChatStore();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 150,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '540px',
          height: '100%',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-glass-hover)',
          padding: '28px',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700 }}>
              System Architecture & Docs
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-Time Messaging Platform Engineering Breakdown
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost">
            ✕
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="glass-panel" style={{ padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              WebSocket Status
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--online)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-online" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--online)' }} />
              {connectionStatus.toUpperCase()}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Online Users (Set)
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '4px' }}>
              {onlineUserIds.size} Active Nodes
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Active Channels
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
              {conversations.length} Rooms
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Message Stream
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {messages.length} Cached
            </div>
          </div>
        </div>

        {/* Technical Highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Distributed Systems Highlights
          </h3>

          <div className="glass-panel" style={{ padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>
              1. Redis Pub/Sub Horizontal Scaling
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Stateless NestJS instances coordinate live room broadcasts across independent server processes using Redis adapter channels (`conversation:&lt;id&gt;`).
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>
              2. Atomic ACID Database Transactions
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Message insertion and `lastMessageAt` conversation inbox sort denormalization execute inside `Prisma.$transaction` preventing state drift.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>
              3. Cursor-Based Message Pagination
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Constant-time $O(\log N)$ seeks on composite index `(conversationId, createdAt)` eliminating offset pagination degradation on large message histories.
            </p>
          </div>
        </div>

        {/* Documentation Links */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Engineering Reports (10 Guides in `docs/`)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { name: 'ARCHITECTURE.md', desc: 'System architecture, diagrams, layer boundaries' },
              { name: 'REALTIME_PROTOCOL.md', desc: 'WebSocket event contract & payload schemas' },
              { name: 'API.md', desc: 'REST HTTP API specification' },
              { name: 'LEARNING_REPORT.md', desc: 'Master Study Guide for technical interviews' },
              { name: 'INTERVIEW_QUESTIONS.md', desc: '50+ categorized interview questions & answers' },
              { name: 'ARCHITECTURAL_DECISIONS.md', desc: 'Architectural Decision Records (ADRs)' },
              { name: 'FINAL_REPORT.md', desc: 'Production readiness score (9.5/10) & CV points' },
            ].map((doc) => (
              <div
                key={doc.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass)',
                  fontSize: '0.82rem',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    docs/{doc.name}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                    {doc.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
