'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface ClassyTopic {
  id: string;
  icon: string;
  label: string;
}

export const CLASSY_TOPICS: ClassyTopic[] = [
  { id: 'ai', icon: 'psychology', label: 'AI & Future' },
  { id: 'design', icon: 'palette', label: 'Design & Craft' },
  { id: 'philosophy', icon: 'menu_book', label: 'Philosophy & Mind' },
  { id: 'startups', icon: 'rocket_launch', label: 'Startups & Tech' },
  { id: 'culture', icon: 'public', label: 'Culture & World' },
  { id: 'science', icon: 'science', label: 'Science & Cosmos' },
];

interface ClassyHeroStageProps {
  selectedTopic: string;
  onSelectTopic: (topicId: string) => void;
  onStartPulse: () => void;
  isStarting?: boolean;
}

export const ClassyHeroStage: React.FC<ClassyHeroStageProps> = ({
  selectedTopic,
  onSelectTopic,
  onStartPulse,
  isStarting = false,
}) => {
  return (
    <motion.div
      key="classy-hero"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="classy-hero-stage"
    >
      {/* Soft Eyebrow Pill */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="classy-pill-eyebrow"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
          auto_awesome
        </span>
        <span>Spontaneous 1-on-1 Discovery</span>
      </motion.div>

      {/* Main Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="classy-headline"
      >
        Meet interesting minds,{' '}
        <span className="classy-headline-gradient">
          effortlessly.
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="classy-subtitle"
      >
        Pick a topic that sparks your curiosity. Get paired with someone worldwide
        in seconds — no profiles, no tracking, just meaningful real-time dialogue.
      </motion.p>

      {/* Topics Selector */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="classy-topics-wrap"
      >
        {CLASSY_TOPICS.map((topic) => {
          const isSelected = selectedTopic === topic.id;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => onSelectTopic(topic.id)}
              className={`classy-topic-pill ${isSelected ? 'selected' : ''}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {topic.icon}
              </span>
              <span>{topic.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Start Conversation CTA Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <button
          type="button"
          onClick={onStartPulse}
          disabled={isStarting}
          className="classy-start-btn"
        >
          <span>Start Conversation</span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            arrow_forward
          </span>
        </button>
      </motion.div>
    </motion.div>
  );
};
