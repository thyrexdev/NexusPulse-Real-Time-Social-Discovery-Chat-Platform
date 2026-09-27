'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ClassyHeaderProps {
  currentUser?: { username: string; fullName: string; avatar?: string | null } | null;
  currentUserGeo?: { country?: string; flag?: string; ip?: string } | null;
  activeState: 'idle' | 'searching' | 'matched' | 'ended';
  onlineCount?: number;
}

export const ClassyHeader: React.FC<ClassyHeaderProps> = ({
  currentUser,
  currentUserGeo,
  activeState,
  onlineCount = 1,
}) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="classy-header"
    >
      {/* Brand Minimalist Glyph & Wordmark */}
      <div className="classy-brand">
        <div className="classy-logo-icon">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            grain
          </span>
        </div>
        <div>
          <span className="classy-brand-text">NexusPulse</span>
        </div>
      </div>

      {/* Minimalist Live Status Telemetry (Hidden on narrow mobile to prevent squeeze) */}
      <div className="classy-badge-online classy-header-center-status">
        <span className="classy-online-dot" />
        <span>
          {activeState === 'matched'
            ? 'In Conversation'
            : activeState === 'searching'
            ? 'Matching...'
            : activeState === 'ended'
            ? 'Session Closed'
            : `${onlineCount} Online`}
        </span>
      </div>

      {/* User Location & Stranger Pseudonym */}
      <div className="classy-header-right-actions">
        {currentUserGeo && (
          <div
            className="classy-header-geo-pill"
            title={`Detected Location: ${currentUserGeo.country} (${currentUserGeo.ip})`}
          >
            <span>{currentUserGeo.flag || '🌐'}</span>
            <span className="classy-geo-country-label">{currentUserGeo.country}</span>
          </div>
        )}

        <div
          className="classy-user-chip"
          title={`Logged in as ${currentUser?.username || 'Stranger'}`}
        >
          <span style={{ fontSize: '13px', opacity: 0.8 }}>👤</span>
          <span className="classy-user-chip-name">{currentUser?.username || 'Stranger'}</span>
        </div>
      </div>
    </motion.header>
  );
};
