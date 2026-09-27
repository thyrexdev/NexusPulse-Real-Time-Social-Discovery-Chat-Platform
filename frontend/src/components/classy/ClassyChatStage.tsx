'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatMessage {
  id: string;
  sender: 'me' | 'partner';
  senderName: string;
  avatar?: string;
  timestamp: string;
  content: string;
}

interface ClassyChatStageProps {
  topic: string;
  partnerName: string;
  partnerAvatar?: string;
  partnerCountry?: string;
  partnerFlag?: string;
  partnerStatusMessage?: string | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onNextPartner: () => void;
  onLeaveChat: () => void;
  onTypingChange?: (isTyping: boolean) => void;
  isPartnerTyping?: boolean;
}

export const isStrangerName = (name?: string | null): boolean => {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === 'stranger') return true;
  if (/^stranger_\d+$/i.test(trimmed)) return true;
  return false;
};

export const ClassyChatStage: React.FC<ClassyChatStageProps> = ({
  topic,
  partnerName,
  partnerAvatar,
  partnerCountry = 'Global',
  partnerFlag = '🌐',
  partnerStatusMessage,
  messages,
  onSendMessage,
  onNextPartner,
  onLeaveChat,
  onTypingChange,
  isPartnerTyping = false,
}) => {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isCustomName = !isStrangerName(partnerName);

  // Umingle/Omegle Fast Skip keyboard shortcut (Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onNextPartner();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNextPartner]);

  const scrollToBottom = useCallback((smooth = true) => {
    endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isPartnerTyping, partnerStatusMessage, scrollToBottom]);

  // Handle mobile visualViewport resize when virtual keyboard opens
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewportChange = () => {
      scrollToBottom(false);
    };
    window.visualViewport.addEventListener('resize', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
    };
  }, [scrollToBottom]);

  useEffect(() => {
    if (!partnerStatusMessage) {
      // Only auto-focus on desktop devices with fine pointer (mouse)
      // to avoid aggressively opening the mobile virtual keyboard unprompted
      const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
      if (!isTouch) {
        inputRef.current?.focus();
      }
    }
  }, [partnerStatusMessage]);

  const handleInputFocus = useCallback(() => {
    setTimeout(() => scrollToBottom(false), 80);
    setTimeout(() => scrollToBottom(true), 280);
  }, [scrollToBottom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (onTypingChange) {
      onTypingChange(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTypingChange(false);
      }, 1500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || partnerStatusMessage) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (onTypingChange) onTypingChange(false);
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <motion.div
      key="classy-chat"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="classy-chat-container"
    >
      {/* Clean Minimalist Top Chat Header */}
      <div className="classy-chat-header">
        <div className="classy-partner-info">
          <div className="classy-partner-avatar">
            {partnerFlag}
          </div>
          <div>
            <div className="classy-partner-name">
              {isCustomName ? (
                <>
                  <span className="classy-partner-highlight-name">{partnerName}</span>
                  <span className="classy-partner-geo-tag">
                    • from {partnerCountry} {partnerFlag}
                  </span>
                </>
              ) : (
                <>
                  <span>Stranger from {partnerCountry}</span>
                  <span>{partnerFlag}</span>
                </>
              )}
            </div>
            <div className="classy-partner-sub">
              <span className="classy-online-dot" />
              <span>Live</span>
              <span>•</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>#{topic}</span>
            </div>
          </div>
        </div>

        <div className="classy-chat-actions">
          <button
            type="button"
            onClick={onLeaveChat}
            className="classy-leave-btn"
            title="End session and return home"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="classy-chat-messages">
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const isMe = m.sender === 'me';
            const authorName = m.senderName || partnerName;
            const hasCustomAuthor = !isStrangerName(authorName);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className={`classy-msg-row ${isMe ? 'is-me' : 'is-partner'}`}
              >
                {!isMe && (
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    {partnerFlag}
                  </div>
                )}

                <div>
                  {!isMe && hasCustomAuthor && (
                    <div className="classy-msg-sender-header">
                      {authorName}
                    </div>
                  )}
                  <div className={isMe ? 'classy-msg-bubble-me' : 'classy-msg-bubble-partner'}>
                    {m.content}
                  </div>
                  <div className="classy-msg-time">{m.timestamp}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Partner Typing Indicator */}
        {isPartnerTyping && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="classy-typing-indicator"
          >
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
              {isCustomName ? `${partnerName} is typing...` : 'typing...'}
            </span>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* Ergonomic Bottom Action & Input Dock (Thumb-Zone Optimization) */}
      <div className="classy-bottom-dock">
        {partnerStatusMessage ? (
          /* When partner disconnected, show action bar anchored directly at bottom */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="classy-bottom-disconnected-card"
          >
            <div className="classy-disconnect-info">
              <span className="classy-disconnect-dot" />
              <span>{partnerStatusMessage}</span>
            </div>
            <button
              type="button"
              onClick={onNextPartner}
              className="classy-bottom-next-btn"
              title="Next Stranger (Esc)"
            >
              <span>Next Stranger</span>
              <kbd>Esc</kbd>
            </button>
          </motion.div>
        ) : (
          /* Normal Active Chat: Bottom Skip Button paired with Message Composer */
          <form onSubmit={handleSubmit} className="classy-bottom-composer-wrapper">
            <button
              type="button"
              onClick={onNextPartner}
              className="classy-bottom-skip-btn"
              title="Skip to next stranger (Esc)"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                skip_next
              </span>
              <span className="skip-label">Skip</span>
              <kbd className="skip-kbd">Esc</kbd>
            </button>

            <div className="classy-input-form-inner">
              <input
                ref={inputRef}
                type="text"
                value={text}
                disabled={Boolean(partnerStatusMessage)}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder="Message stranger... (Enter to send, Esc to skip)"
                className="classy-input-field"
              />
              <button
                type="submit"
                disabled={!text.trim() || Boolean(partnerStatusMessage)}
                className="classy-send-btn"
                title="Send message"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  arrow_upward
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
};
