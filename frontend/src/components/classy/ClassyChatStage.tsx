'use client';

import React, { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping, partnerStatusMessage]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [partnerStatusMessage]);

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="classy-chat-container"
    >
      {/* Glass Header Card */}
      <div className="classy-chat-header">
        <div className="classy-partner-info">
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            {partnerFlag}
          </div>
          <div>
            <div className="classy-partner-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Stranger from {partnerCountry}</span>
              <span>{partnerFlag}</span>
            </div>
            <div className="classy-partner-sub">
              <span className="classy-online-dot" />
              <span>Connected</span>
              <span>•</span>
              <span style={{ color: '#A5B4FC' }}>#{topic}</span>
            </div>
          </div>
        </div>

        <div className="classy-chat-actions">
          <button
            type="button"
            onClick={onNextPartner}
            className="classy-skip-btn"
            title="Fast Skip to Next Stranger (Press Esc)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              skip_next
            </span>
            <span>Skip (Esc)</span>
          </button>
          <button
            type="button"
            onClick={onLeaveChat}
            className="classy-leave-btn"
            title="End session"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="classy-chat-messages">
        {/* Country & IP Banner */}
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(168, 85, 247, 0.08))',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            fontSize: '0.85rem',
            color: '#E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>{partnerFlag}</span>
            <span>
              Connected with a <strong>Stranger from {partnerCountry}</strong> {partnerFlag}!
            </span>
          </div>
          <div
            style={{
              fontSize: '0.72rem',
              color: '#A5B4FC',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: 600,
            }}
          >
            Press Esc to Skip
          </div>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const isMe = m.sender === 'me';
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`classy-msg-row ${isMe ? 'is-me' : 'is-partner'}`}
              >
                {!isMe && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      flexShrink: 0,
                    }}
                  >
                    {partnerFlag}
                  </div>
                )}

                <div>
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
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="classy-typing-indicator"
          >
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </motion.div>
        )}

        {/* Stranger Disconnected / Skipped Banner */}
        {partnerStatusMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              padding: '16px 20px',
              margin: '16px 0',
              borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{partnerStatusMessage}</div>
            <button
              type="button"
              onClick={onNextPartner}
              style={{
                padding: '9px 22px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(79, 70, 229, 0.45)',
                transition: 'transform 0.15s ease',
              }}
            >
              <span>Next Stranger</span>
              <kbd style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                Esc
              </kbd>
            </button>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* Floating Capsule Input Bar */}
      <form onSubmit={handleSubmit} className="classy-input-form">
        <input
          ref={inputRef}
          type="text"
          value={text}
          disabled={Boolean(partnerStatusMessage)}
          onChange={handleInputChange}
          placeholder={
            partnerStatusMessage
              ? 'Stranger has disconnected. Press Esc to find a new stranger.'
              : 'Say something to stranger... (Press Enter to send, Esc to skip)'
          }
          className="classy-input-field"
        />
        <button
          type="submit"
          disabled={!text.trim() || Boolean(partnerStatusMessage)}
          className="classy-send-btn"
          title="Send"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            arrow_upward
          </span>
        </button>
      </form>
    </motion.div>
  );
};
