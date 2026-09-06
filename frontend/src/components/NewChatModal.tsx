'use client';

import React, { useState } from 'react';
import { useChatStore, DEMO_USERS } from '@/store/useChatStore';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, createPrivateChat, createGroupChat } = useChatStore();
  const [chatType, setChatType] = useState<'PRIVATE' | 'GROUP'>('PRIVATE');
  const [groupTitle, setGroupTitle] = useState('');
  const [customUserId, setCustomUserId] = useState('');
  const [selectedDemoUser, setSelectedDemoUser] = useState<string>('bob');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>(['bob', 'charlie']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      if (chatType === 'PRIVATE') {
        const targetId = customUserId.trim() || `usr-${selectedDemoUser}`;
        await createPrivateChat(targetId);
      } else {
        if (!groupTitle.trim()) {
          alert('Please provide a group title');
          setIsSubmitting(false);
          return;
        }
        const memberIds = selectedGroupMembers.map((k) => `usr-${k}`);
        await createGroupChat(groupTitle.trim(), memberIds);
      }
      onClose();
    } catch (err: any) {
      alert(`Error creating chat: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: 'var(--radius-lg)',
          padding: '28px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-glass-hover)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Start New Conversation
          </h3>
          <button onClick={onClose} className="btn-ghost">
            ✕
          </button>
        </div>

        {/* Type Toggle */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-glass)',
          }}
        >
          <button
            onClick={() => setChatType('PRIVATE')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: chatType === 'PRIVATE' ? 'var(--accent-gradient)' : 'transparent',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Direct 1-on-1 Chat
          </button>
          <button
            onClick={() => setChatType('GROUP')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: chatType === 'GROUP' ? 'var(--accent-gradient)' : 'transparent',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Group Channel
          </button>
        </div>

        {chatType === 'PRIVATE' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Select a Contact to Message:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(['alice', 'bob', 'charlie'] as const)
                .filter((k) => DEMO_USERS[k].username !== currentUser?.username)
                .map((key) => {
                  const u = DEMO_USERS[key];
                  const isSelected = selectedDemoUser === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedDemoUser(key)}
                      className={isSelected ? 'glass-panel' : 'glass-panel-interactive'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--accent-gradient-subtle)' : 'transparent',
                        borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-glass)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u.avatar || ''} alt={u.fullName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username} ({u.email})</div>
                      </div>
                      {isSelected && <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>✓</span>}
                    </div>
                  );
                })}
            </div>

            <div style={{ marginTop: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Or enter specific User UUID:</label>
              <input
                type="text"
                placeholder="e.g. usr_1c2deb4d-3b7d-4bad..."
                value={customUserId}
                onChange={(e) => setCustomUserId(e.target.value)}
                className="input-field"
                style={{ marginTop: '4px', height: '38px', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Group Title</label>
              <input
                type="text"
                placeholder="e.g. Real-Time Architecture Squad"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                className="input-field"
                style={{ marginTop: '6px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Add Members</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                {(['alice', 'bob', 'charlie'] as const).map((key) => {
                  const u = DEMO_USERS[key];
                  const isChecked = selectedGroupMembers.includes(key);
                  return (
                    <div
                      key={key}
                      onClick={() => {
                        setSelectedGroupMembers((prev) =>
                          isChecked ? prev.filter((k) => k !== key) : [...prev, key],
                        );
                      }}
                      className="glass-panel-interactive"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u.avatar || ''} alt={u.fullName} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                        <span style={{ fontSize: '0.85rem' }}>{u.fullName}</span>
                      </div>
                      <input type="checkbox" checked={isChecked} readOnly />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 16px' }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSubmitting}
            className="btn-primary"
            style={{ padding: '8px 20px' }}
          >
            {isSubmitting ? 'Creating...' : 'Create Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
};
