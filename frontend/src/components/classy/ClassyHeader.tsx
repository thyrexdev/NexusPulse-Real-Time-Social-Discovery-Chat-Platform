'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ClassyHeaderProps {
  currentUser?: { username: string; fullName: string; avatar?: string | null } | null;
  currentUserGeo?: { country?: string; flag?: string; ip?: string } | null;
  onRefreshIdentity?: () => void;
  activeState: 'idle' | 'searching' | 'matched' | 'ended';
  onlineCount?: number;
}

export const ClassyHeader: React.FC<ClassyHeaderProps> = ({
  currentUser,
  currentUserGeo,
  onRefreshIdentity,
  activeState,
  onlineCount = 1,
}) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="classy-header"
    >
      {/* Brand Identity */}
      <div className="classy-brand">
        <div className="classy-logo-icon">
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            forum
          </span>
        </div>
        <div>
          <span className="classy-brand-text">NexusPulse</span>
        </div>
      </div>

      {/* Center Live Mesh Status */}
      <div className="classy-badge-online">
        <span className="classy-online-dot" />
        <span>
          {activeState === 'matched'
            ? 'Stranger Connected'
            : activeState === 'searching'
            ? 'Searching for Stranger...'
            : activeState === 'ended'
            ? 'Chat Ended'
            : `${onlineCount} Strangers Online`}
        </span>
      </div>

      {/* User Location & Stranger ID Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {currentUserGeo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.8rem',
              color: '#CBD5E1',
            }}
            title={`Your Detected IP Location: ${currentUserGeo.country} (${currentUserGeo.ip})`}
          >
            <span>{currentUserGeo.flag || '🌐'}</span>
            <span style={{ fontWeight: 600 }}>{currentUserGeo.country}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onRefreshIdentity}
          className="classy-user-chip"
          title="Get a new anonymous Stranger ID"
        >
          <span style={{ fontSize: '14px' }}>👤</span>
          <span>{currentUser?.username || 'Stranger'}</span>
          <span style={{ fontSize: '0.7rem', color: '#818CF8', fontWeight: 600 }}>New ID</span>
        </button>
      </div>
    </motion.header>
  );
};
