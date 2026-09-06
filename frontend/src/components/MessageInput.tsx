'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';

export const MessageInput: React.FC = () => {
  const { sendMessage, sendTyping, conversations, activeConversationId, activeTopic, matchStatus } = useChatStore();
  const [content, setContent] = useState('');
  const [isTypingState, setIsTypingState] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setContent(val);

    if (val.trim().length > 0 && !isTypingState) {
      setIsTypingState(true);
      sendTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingState(false);
      sendTyping(false);
    }, 1800);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || !activeConversationId || isSending) return;

    const msgToSend = content.trim();
    setContent('');
    setIsTypingState(false);
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setIsSending(true);
    try {
      await sendMessage(msgToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertContextSnippet = (text: string) => {
    setContent((prev) => (prev ? `${prev} ${text}` : text));
  };

  const getContextChips = (topic?: string) => {
    switch (topic?.toLowerCase()) {
      case 'tech':
      case 'technology':
        return ['#Distributed', '#Consensus', '#Rust', '#Raft', '#Latency'];
      case 'philosophy':
        return ['#Epistemology', '#Ethics', '#Logic', '#Heuristics'];
      case 'languages':
        return ['#Grammar', '#Idioms', '#Fluency', '#Accent'];
      case 'design':
      case 'design systems':
        return ['#Tokens', '#DarkElevation', '#Accessibility', '#Typography'];
      default:
        return ['#RealTime', '#Insights', '#Questions', '#Perspective'];
    }
  };

  const chips = getContextChips(activeTopic);

  if (!activeConversation && matchStatus !== 'matched') return null;

  return (
    <footer
      style={{
        padding: '14px 24px',
        backgroundColor: 'var(--surface-1)',
        borderTop: '1px solid var(--border-hairline)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* Context Quick-Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        <span
          style={{
            fontSize: '0.65rem',
            color: 'var(--text-low)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginRight: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          Insert context:
        </span>
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => insertContextSnippet(chip)}
            style={{
              fontSize: '0.72rem',
              fontWeight: 500,
              padding: '2px 9px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-mid)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--pulse-cyan)';
              e.currentTarget.style.borderColor = 'rgba(0, 240, 208, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-mid)';
              e.currentTarget.style.borderColor = 'var(--border-hairline)';
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Assembly */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 8px',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.4)',
        }}
      >
        <button
          type="button"
          onClick={() => {
            const url = prompt(
              'Enter image URL to attach:',
              'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80',
            );
            if (url) sendMessage('Sent image 📷', url);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-low)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Attach media or artifact"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            attach_file
          </span>
        </button>

        <button
          type="button"
          onClick={() => setContent((prev) => (prev ? `\`${prev}\`` : '`code`'))}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-low)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Monospace format"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            code
          </span>
        </button>

        <input
          type="text"
          placeholder={
            matchStatus === 'ended'
              ? 'Session ended. Click "Find Someone New" to restart...'
              : `Type a message to peer...`
          }
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={matchStatus === 'ended'}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-high)',
            fontSize: '0.9rem',
            padding: '8px 6px',
            outline: 'none',
          }}
        />

        <button
          type="submit"
          disabled={!content.trim() || matchStatus === 'ended' || isSending}
          className="btn-primary-pulse"
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            opacity: !content.trim() || matchStatus === 'ended' ? 0.45 : 1,
            cursor: !content.trim() || matchStatus === 'ended' ? 'not-allowed' : 'pointer',
          }}
        >
          <span>Send</span>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            send
          </span>
        </button>
      </form>
    </footer>
  );
};
