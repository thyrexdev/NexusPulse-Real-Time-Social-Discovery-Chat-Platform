'use client';

import React, { useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';

export interface ClassyTopic {
  id: string;
  icon: string;
  label: string;
}

export const CLASSY_TOPICS: ClassyTopic[] = [
  { id: 'ai', icon: 'psychology', label: 'AI & Future' },
  { id: 'design', icon: 'palette', label: 'Design' },
  { id: 'philosophy', icon: 'menu_book', label: 'Philosophy' },
  { id: 'startups', icon: 'rocket_launch', label: 'Startups' },
  { id: 'culture', icon: 'public', label: 'Culture' },
  { id: 'science', icon: 'science', label: 'Science' },
];

interface ClassyHeroStageProps {
  selectedTopic?: string;
  onSelectTopic?: (topicId: string) => void;
  onStartPulse: () => void;
  isStarting?: boolean;
}

export const ClassyHeroStage: React.FC<ClassyHeroStageProps> = ({
  onStartPulse,
  isStarting = false,
}) => {
  const [timeStr, setTimeStr] = useState('');

  // Live UTC/world clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toUTCString().slice(17, 22) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Quick start keyboard shortcut (Space or Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        onStartPulse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartPulse]);

  const lineVariants: Variants = {
    hidden: { opacity: 0, y: 35, skewY: 1.5 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      skewY: 0,
      transition: {
        delay: 0.1 + i * 0.12,
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    }),
  };

  return (
    <div className="hero-asymmetric-wrapper">
      <div className="hero-asymmetric-inner">
        {/* Top Minimalist Telemetry Bar */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="hero-telemetry-strip"
        >
          <div className="hero-telemetry-item">
            <span className="hero-pulse-dot" />
            <span>GLOBAL DISCOVERY MESH</span>
          </div>
          <span className="hero-telemetry-separator">•</span>
          <div className="hero-telemetry-item">
            <span>NO LOGS</span>
          </div>
          <span className="hero-telemetry-separator">•</span>
          <div className="hero-telemetry-item">
            <span>P2P WEBSOCKETS</span>
          </div>
          {timeStr && (
            <>
              <span className="hero-telemetry-separator">•</span>
              <div className="hero-telemetry-item hero-telemetry-time">
                <span>{timeStr}</span>
              </div>
            </>
          )}
        </motion.div>

        {/* Huge Left-Aligned Architectural Headline */}
        <div className="hero-monumental-heading">
          <div className="hero-line-mask">
            <motion.h1
              custom={0}
              variants={lineVariants}
              initial="hidden"
              animate="visible"
              className="hero-monumental-text"
            >
              TALK TO
            </motion.h1>
          </div>

          <div className="hero-line-mask">
            <motion.h1
              custom={1}
              variants={lineVariants}
              initial="hidden"
              animate="visible"
              className="hero-monumental-text hero-text-accent"
            >
              STRANGERS,
            </motion.h1>
          </div>

          <div className="hero-line-mask">
            <motion.h1
              custom={2}
              variants={lineVariants}
              initial="hidden"
              animate="visible"
              className="hero-monumental-text"
            >
              WORLDWIDE.
            </motion.h1>
          </div>
        </div>

        {/* Editorial Subtitle & Context */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="hero-editorial-sub"
        >
          Spontaneous real-time dialogue with interesting minds across the planet.
          No accounts, no surveillance, no social baggage. Just click and connect.
        </motion.p>

        {/* Main Kinetic Action Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="hero-cta-group"
        >
          <button
            type="button"
            onClick={onStartPulse}
            disabled={isStarting}
            className="hero-primary-trigger"
          >
            <span className="hero-btn-beacon" />
            <span className="hero-btn-label">Start Conversation</span>
            <span className="material-symbols-outlined hero-btn-arrow">
              arrow_forward
            </span>
          </button>

          <div className="hero-shortcut-hint">
            <span>or press</span>
            <kbd>Space</kbd>
            <span>or</span>
            <kbd>Enter ↵</kbd>
          </div>
        </motion.div>

        {/* Minimalist Micro Badges Bottom Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.6 }}
          className="hero-features-footer"
        >
          <div className="hero-feature-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              fast_forward
            </span>
            <span>Instant Skip (Esc)</span>
          </div>

          <div className="hero-feature-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              vpn_lock
            </span>
            <span>Anonymous Ephemeral Session</span>
          </div>

          <div className="hero-feature-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              public
            </span>
            <span>Live GeoIP Detection</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
