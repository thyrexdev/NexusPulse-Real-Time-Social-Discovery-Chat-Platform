'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useChatStore } from '@/store/useChatStore';
import { Conversation, ConversationType } from '@/types/chat';

interface SidebarProps {
  onOpenNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenNewChat }) => {
  const { currentUser, conversations, activeConversationId, selectConversation, onlineUserIds } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');

  const getConversationMeta = (conv: Conversation) => {
    if (conv.type === ConversationType.GROUP) {
      return {
        title: conv.title || 'Group Chat',
        avatar: conv.avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
        isOnline: false,
        subtitle: `${conv.participants.length} members`,
      };
    }

    const otherParticipant = conv.participants.find((p) => p.userId !== currentUser?.id);
    const otherUser = otherParticipant?.user;
    const isOnline = otherUser ? onlineUserIds.has(otherUser.id) : false;

    return {
      title: otherUser?.fullName || otherUser?.username || 'Private Chat',
      avatar: otherUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      isOnline,
      subtitle: otherUser ? `@${otherUser.username}` : '',
    };
  };

  const filteredConversations = conversations.filter((c) => {
    const meta = getConversationMeta(c);
    return meta.title.toLowerCase().includes(searchQuery.toLowerCase()) || meta.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <aside
      className="glass-panel"
      style={{
        width: '340px',
        minWidth: '300px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        borderRight: '1px solid var(--border-glass)',
      }}
    >
      {/* Search Header & New Chat Action */}
      <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Channels</h2>
          <button
            onClick={onOpenNewChat}
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '38px', height: '38px', fontSize: '0.88rem' }}
          />
        </div>
      </div>

      {/* Social Discovery Quick Launch */}
      <div style={{ padding: '8px 12px 0' }}>
        <Link
          href="/discovery"
          className="glass-panel-interactive"
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-gradient-subtle)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              flexShrink: 0,
            }}
          >
            ⚡
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#fff' }}>Radar Discovery</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)' }}>Match with stranger &rarr;</div>
          </div>
        </Link>
      </div>

      {/* Conversation List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {filteredConversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No conversations found.
            <div style={{ marginTop: '8px' }}>
              <button onClick={onOpenNewChat} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                Start a New Conversation
              </button>
            </div>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const meta = getConversationMeta(conv);
            const isActive = activeConversationId === conv.id;
            const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={isActive ? 'glass-panel' : 'glass-panel-interactive'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: isActive ? 'var(--accent-gradient-subtle)' : 'transparent',
                  borderColor: isActive ? 'var(--border-glow)' : 'transparent',
                  position: 'relative',
                }}
              >
                {/* Avatar with live online badge */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meta.avatar}
                    alt={meta.title}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  {meta.isOnline && (
                    <span
                      className="status-online"
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--online)',
                        border: '2px solid var(--bg-primary)',
                      }}
                    />
                  )}
                </div>

                {/* Conversation Meta & Last Message */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {meta.title}
                    </h4>
                    {conv.lastMessageAt && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lastMsg ? lastMsg.content : 'No messages yet'}
                    </p>
                    {conv.unreadCount && conv.unreadCount > 0 ? (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: 'var(--accent-primary)', color: '#fff' }}>
                        {conv.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
