'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/store/useChatStore';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_CATEGORIES = [
  { id: 'harassment', label: 'Harassment or Abuse', icon: 'security' },
  { id: 'spam', label: 'Spam or Commercial Bot', icon: 'smart_toy' },
  { id: 'inappropriate', label: 'Inappropriate behavior', icon: 'visibility_off' },
  { id: 'other', label: 'Other reason', icon: 'more_horiz' },
];

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
  const { activePeer, reportCurrentPeer, blockCurrentPeer } = useChatStore();
  const [category, setCategory] = useState('harassment');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !activePeer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (alsoBlock) {
        await blockCurrentPeer();
      }
      await reportCurrentPeer(category, details.trim() || undefined);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(8, 11, 17, 0.85)',
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
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-layer-3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--status-crimson)' }}>
              flag
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-high)' }}>Report an issue</h3>
          </div>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--text-mid)',
            }}
          >
            Confidential
          </span>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', lineHeight: 1.5, marginBottom: '16px' }}>
          Select violation observed with <strong style={{ color: 'var(--text-high)' }}>@{activePeer.username}</strong>:
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Categories Radio Group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {REPORT_CATEGORIES.map((item) => {
              const isSelected = category === item.id;
              return (
                <label
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--surface-2)' : 'var(--canvas-base)',
                    border: isSelected ? '1px solid var(--pulse-cyan)' : '1px solid var(--border-hairline)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="radio"
                      name="report_cat"
                      value={item.id}
                      checked={isSelected}
                      onChange={() => setCategory(item.id)}
                      style={{ accentColor: 'var(--pulse-cyan)' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: isSelected ? 'var(--text-high)' : 'var(--text-mid)' }}>
                      {item.label}
                    </span>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-low)' }}>
                    {item.icon}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Optional Details */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>
              Optional context (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any details for atmospheric review..."
              rows={2}
              style={{
                width: '100%',
                backgroundColor: 'var(--canvas-base)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                color: 'var(--text-high)',
                fontSize: '0.85rem',
                resize: 'none',
                outline: 'none',
              }}
            />
          </div>

          {/* Permanent Block Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-hairline)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={(e) => setAlsoBlock(e.target.checked)}
              style={{ accentColor: 'var(--pulse-cyan)', marginTop: '3px' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-high)' }}>
                Block user permanently
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-mid)' }}>
                Prevents @{activePeer.username} from future matchmaking sweeps.
              </span>
            </div>
          </label>

          <p style={{ fontSize: '0.72rem', color: 'var(--text-low)', lineHeight: 1.4 }}>
            Submitting will immediately end the current session and report the peer.
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={isSubmitting || submitted}
              className="btn-danger-stitch"
              style={{ flex: 1, padding: '10px', justifyContent: 'center', fontSize: '0.88rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                report
              </span>
              <span>{submitted ? 'Report Processed' : isSubmitting ? 'Transmitting...' : 'Submit Report'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-ghost-stitch"
              style={{ padding: '10px 18px', fontSize: '0.88rem' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
