'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/useChatStore';
import { ClassyHeader } from '@/components/classy/ClassyHeader';
import { ClassyHeroStage, CLASSY_TOPICS } from '@/components/classy/ClassyHeroStage';
import { ClassyScanningStage } from '@/components/classy/ClassyScanningStage';
import { ClassyChatStage, ChatMessage } from '@/components/classy/ClassyChatStage';

export default function StrangerChatPage() {
  const {
    currentUser,
    currentUserGeo,
    matchStatus,
    activeTopic,
    activePeer,
    activeConversationId,
    messages,
    typingUsers,
    partnerStatusMessage,
    onlineUserIds,
    initAuth,
    authAsStranger,
    joinMatchQueue,
    leaveMatchQueue,
    skipCurrentMatch,
    leaveCurrentSession,
    sendMessage,
    sendTyping,
  } = useChatStore();

  const [selectedTopic, setSelectedTopic] = useState('design');

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Convert store messages to ChatMessage format
  const formattedMessages: ChatMessage[] = useMemo(() => {
    return messages.map((m) => {
      const isMe = m.senderId === currentUser?.id;
      const timeStr = m.createdAt
        ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      return {
        id: m.id,
        sender: isMe ? 'me' : 'partner',
        senderName: isMe ? 'You' : activePeer?.username || 'Stranger',
        avatar: isMe ? currentUser?.avatar || undefined : activePeer?.avatar || undefined,
        timestamp: timeStr,
        content: m.content,
      };
    });
  }, [messages, currentUser, activePeer]);

  // Check if partner is typing
  const isPartnerTyping = useMemo(() => {
    if (!activeConversationId) return false;
    const typingList = typingUsers[activeConversationId] || [];
    return typingList.length > 0;
  }, [typingUsers, activeConversationId]);

  // Start matchmaking pulse
  const handleStartPulse = useCallback(() => {
    joinMatchQueue(selectedTopic);
  }, [joinMatchQueue, selectedTopic]);

  // Abort / Leave
  const handleAbort = useCallback(() => {
    if (matchStatus === 'searching') {
      leaveMatchQueue();
    } else {
      leaveCurrentSession();
    }
  }, [matchStatus, leaveMatchQueue, leaveCurrentSession]);

  // Send message
  const handleSendMessage = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  // Next partner / Fast skip
  const handleNextPartner = useCallback(() => {
    skipCurrentMatch(true);
  }, [skipCurrentMatch]);

  // Refresh Stranger Identity
  const handleRefreshIdentity = useCallback(() => {
    authAsStranger();
  }, [authAsStranger]);

  const activeTopicObj = CLASSY_TOPICS.find((t) => t.id === selectedTopic);

  return (
    <main style={{ minHeight: '100vh', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Ambient Radial Halo & Subtle Grid */}
      <div className="ambient-halo" />
      <div className="ambient-grid" />

      {/* Classy Glass Header */}
      <ClassyHeader
        currentUser={currentUser}
        currentUserGeo={currentUserGeo}
        onRefreshIdentity={handleRefreshIdentity}
        activeState={matchStatus}
        onlineCount={Math.max(1, onlineUserIds.size)}
      />

      {/* Main Stage Switching */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: matchStatus === 'idle' ? 'stretch' : 'center', justifyContent: 'center', width: '100%', position: 'relative', zIndex: 10 }}>
        <AnimatePresence mode="wait">
          {matchStatus === 'idle' && (
            <ClassyHeroStage
              selectedTopic={selectedTopic}
              onSelectTopic={setSelectedTopic}
              onStartPulse={handleStartPulse}
            />
          )}

          {matchStatus === 'searching' && (
            <ClassyScanningStage
              topic={activeTopicObj?.label || selectedTopic}
              onAbort={handleAbort}
            />
          )}

          {(matchStatus === 'matched' || matchStatus === 'ended') && (
            <ClassyChatStage
              topic={activeTopicObj?.label || activeTopic}
              partnerName={activePeer?.username || 'Stranger'}
              partnerAvatar={activePeer?.avatar || undefined}
              partnerCountry={activePeer?.country || 'Global'}
              partnerFlag={activePeer?.flag || '🌐'}
              partnerStatusMessage={partnerStatusMessage}
              messages={formattedMessages}
              onSendMessage={handleSendMessage}
              onNextPartner={handleNextPartner}
              onLeaveChat={handleAbort}
              onTypingChange={sendTyping}
              isPartnerTyping={isPartnerTyping}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
