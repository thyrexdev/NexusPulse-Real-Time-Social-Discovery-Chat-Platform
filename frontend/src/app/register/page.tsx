'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChatStore, DEMO_USERS } from '@/store/useChatStore';

export default function RegisterPage() {
  const router = useRouter();
  const { register, quickSwitchUser } = useChatStore();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      await register(username, email, password, fullName);
      router.push('/lobby');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (preset: 'alice' | 'bob' | 'charlie') => {
    await quickSwitchUser(preset);
    router.push('/lobby');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-primary)',
        position: 'relative',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          borderRadius: 'var(--radius-xl)',
          padding: '36px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-glass-hover)',
        }}
      >
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'var(--accent-gradient)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)',
                marginBottom: '14px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Create Account
            </h1>
          </Link>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Join the real-time messaging platform
          </p>
        </div>

        {/* 1-Click Instant Demo Login */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            border: '1px solid var(--border-glass)',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            ⚡ 1-Click Instant Demo Access
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {(['alice', 'bob', 'charlie'] as const).map((key) => {
              const u = DEMO_USERS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleQuickDemo(key)}
                  className="btn-secondary"
                  style={{
                    padding: '8px 4px',
                    fontSize: '0.78rem',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.avatar || ''} alt={u.fullName} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                  <span>{u.fullName.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-sm)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Full Name</label>
            <input
              type="text"
              required
              placeholder="Alice Johnson"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
              style={{ marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Username</label>
            <input
              type="text"
              required
              placeholder="alice"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              style={{ marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Email Address</label>
            <input
              type="email"
              required
              placeholder="alice@chat.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              style={{ marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              style={{ marginTop: '4px' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '0.95rem' }}
          >
            {isLoading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
