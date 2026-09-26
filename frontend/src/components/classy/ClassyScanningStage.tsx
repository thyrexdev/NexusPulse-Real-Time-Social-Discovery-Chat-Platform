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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="classy-scanning-stage"
    >
      {/* Celestial Pulse Animation */}
      <div className="classy-pulse-celestial">
        <div className="celestial-ring" />
        <div className="celestial-ring" />
        <div className="celestial-ring" />

        <div className="celestial-center-icon">
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
            wifi_tethering
          </span>
        </div>
      </div>

      <h2 className="classy-scan-title">
        Connecting you with someone...
      </h2>

      <p className="classy-scan-subtitle">
        Looking for a partner interested in <strong style={{ color: '#A5B4FC' }}>#{topic}</strong>
        <br />
        <span style={{ fontSize: '0.85rem', color: '#64748B', display: 'inline-block', marginTop: '6px' }}>
          Elapsed: {seconds}s
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
