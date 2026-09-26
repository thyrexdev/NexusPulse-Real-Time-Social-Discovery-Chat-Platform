'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ClassyScanningStageProps {
  topic: string;
  onAbort: () => void;
}

export const ClassyScanningStage: React.FC<ClassyScanningStageProps> = ({ topic, onAbort }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      key="classy-scanning"
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="classy-scanning-stage"
    >
      {/* Minimalist Celestial Radar */}
      <div className="classy-pulse-celestial">
        <div className="celestial-ring" />
        <div className="celestial-ring" />
        <div className="celestial-ring" />

        <div className="celestial-center-icon">
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
            radar
          </span>
        </div>
      </div>

      <h2 className="classy-scan-title">
        Connecting with a stranger...
      </h2>

      <p className="classy-scan-subtitle">
        Scanning active peers for topic <strong style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>#{topic}</strong>
        <br />
        <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', display: 'inline-block', marginTop: '8px' }}>
          Elapsed: {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
        </span>
      </p>

      <button
        type="button"
        onClick={onAbort}
        className="classy-cancel-btn"
      >
        Cancel Search
      </button>
    </motion.div>
  );
};
