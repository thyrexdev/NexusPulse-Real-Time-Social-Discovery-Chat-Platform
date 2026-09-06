'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChatStore, DEMO_USERS } from '@/store/useChatStore';
import { Navbar } from '@/components/Navbar';
import { ArchitectureDrawer } from '@/components/ArchitectureDrawer';

export default function LobbyPage() {
  const router = useRouter();
  const { currentUser, createGroupChat, startStrangerChat, conversations } = useChatStore();

  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isMatchingStranger, setIsMatchingStranger] = useState(false);

  // Group creation state inside lobby
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['bob', 'charlie']);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const handleTalkWithStranger = async () => {
    setIsMatchingStranger(true);
    try {
      await new Promise((r) => setTimeout(r, 600)); // smooth matching visual
      await startStrangerChat();
      router.push('/chat');
    } catch {
      router.push('/chat');
    } finally {
      setIsMatchingStranger(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTitle.trim()) {
      alert('Please enter a group title');
      return;
    }

    setIsCreatingGroup(true);
    try {
      const memberIds = selectedMembers.map((k) => `usr-${k}`);
      await createGroupChat(groupTitle.trim(), memberIds);
      router.push('/chat');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar onToggleArchitecture={() => setIsArchitectureOpen(true)} />

      <main style={{ flex: 1, padding: '48px 24px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        {/* User Welcome Banner */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid var(--border-glow)',
              marginBottom: '16px',
              fontSize: '0.82rem',
              color: 'var(--accent-cyan)',
              fontWeight: 600,
            }}
          >
            <span>Connected as:</span>
            <strong style={{ color: '#fff' }}>{currentUser ? currentUser.fullName : 'Guest Session'}</strong>
            {currentUser && <span style={{ color: 'var(--text-muted)' }}>@{currentUser.username}</span>}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '12px',
            }}
          >
            What would you like to do today?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            Choose an action to start real-time messaging, or jump right back into your active channels.
          </p>
        </div>

        {/* Choice Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', marginBottom: '40px' }}>
          {/* Choice 1: Talk with a Stranger */}
          <div
            className="glass-panel"
            style={{
              borderRadius: 'var(--radius-xl)',
              padding: '36px 30px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid var(--border-glass-hover)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  marginBottom: '20px',
                  boxShadow: '0 8px 24px rgba(6, 182, 212, 0.3)',
                }}
              >
                🎭
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 700, marginBottom: '10px' }}>
                Talk with a Stranger
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.55, marginBottom: '24px' }}>
                Match instantly with an online peer or random anonymous chat partner in an isolated, private WebSocket channel.
              </p>
            </div>

            <div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ⚡ Auto-discovers online peer &bull; Ephemeral or saved session &bull; Sub-millisecond latency
              </div>
              <button
                onClick={handleTalkWithStranger}
                disabled={isMatchingStranger}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                }}
              >
                {isMatchingStranger ? 'Matching Online Peer...' : 'Match & Start Chatting 🚀'}
              </button>
            </div>
          </div>

          {/* Choice 2: Create Group Channel */}
          <div
            className="glass-panel"
            style={{
              borderRadius: 'var(--radius-xl)',
              padding: '36px 30px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid var(--border-glass-hover)',
            }}
          >
            <div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  marginBottom: '20px',
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                👥
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 700, marginBottom: '10px' }}>
                Create a Group Channel
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.55, marginBottom: '20px' }}>
                Start a multi-user collaborative room with role management (<code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>OWNER</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>ADMIN</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>MEMBER</code>).
              </p>

              <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Group Title (e.g. Distributed Systems Squad)"
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    className="input-field"
                    style={{ height: '42px', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Select Initial Members:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {(['alice', 'bob', 'charlie'] as const)
                      .filter((k) => DEMO_USERS[k].username !== currentUser?.username)
                      .map((key) => {
                        const u = DEMO_USERS[key];
                        const isChecked = selectedMembers.includes(key);
                        return (
                          <div
                            key={key}
                            onClick={() => {
                              setSelectedMembers((prev) =>
                                isChecked ? prev.filter((k) => k !== key) : [...prev, key],
                              );
                            }}
                            className="glass-panel-interactive"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{u.fullName.split(' ')[0]}</span>
                            <input type="checkbox" checked={isChecked} readOnly />
                          </div>
                        );
                      })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingGroup}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1rem',
                    marginTop: '6px',
                  }}
                >
                  {isCreatingGroup ? 'Creating Channel...' : 'Create & Launch Group 🚀'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Existing Conversations / Jump to Workspace */}
        <div
          className="glass-panel"
          style={{
            borderRadius: 'var(--radius-lg)',
            padding: '24px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-glass)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Resume Active Conversations</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>
              You have {conversations.length} active channel{conversations.length !== 1 ? 's' : ''} in your workspace.
            </p>
          </div>
          <Link href="/chat" className="btn-secondary" style={{ textDecoration: 'none', padding: '10px 20px', fontSize: '0.9rem' }}>
            Open Chat Workspace &rarr;
          </Link>
        </div>
      </main>

      <ArchitectureDrawer isOpen={isArchitectureOpen} onClose={() => setIsArchitectureOpen(false)} />
    </div>
  );
}
