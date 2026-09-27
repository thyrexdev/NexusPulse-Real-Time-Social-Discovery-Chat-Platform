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
    updateNickname,
    joinMatchQueue,
    leaveMatchQueue,
    skipCurrentMatch,
    leaveCurrentSession,
    sendMessage,
    sendTyping,
  } = useChatStore();

  const [selectedTopic, setSelectedTopic] = useState('design');
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // Dynamic visualViewport tracking for mobile virtual keyboard resizing
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };

    handleViewportChange();
    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

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

  // Start matchmaking pulse (with optional nickname update)
  const handleStartPulse = useCallback(
    async (nickname?: string) => {
      const cleanNick = nickname?.trim();
      if (cleanNick && cleanNick !== currentUser?.username) {
        await updateNickname(cleanNick);
      }
      joinMatchQueue(selectedTopic);
    },
    [joinMatchQueue, selectedTopic, updateNickname, currentUser?.username],
  );

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

  const activeTopicObj = CLASSY_TOPICS.find((t) => t.id === selectedTopic);
  const isChatActive = matchStatus === 'matched' || matchStatus === 'ended';

  return (
    <main
      style={{
        height: isChatActive
          ? viewportHeight
            ? `${viewportHeight}px`
            : '100dvh'
          : 'auto',
        minHeight: isChatActive
          ? viewportHeight
            ? `${viewportHeight}px`
            : '100dvh'
          : '100dvh',
        maxHeight: isChatActive
          ? viewportHeight
            ? `${viewportHeight}px`
            : '100dvh'
          : undefined,
        width: '100%',
        position: isChatActive ? 'fixed' : 'relative',
        top: isChatActive ? 0 : undefined,
        left: isChatActive ? 0 : undefined,
        right: isChatActive ? 0 : undefined,
        bottom: isChatActive ? 0 : undefined,
        display: 'flex',
        flexDirection: 'column',
        overflow: isChatActive ? 'hidden' : 'visible',
      }}
    >
      {/* Ambient Radial Halo & Subtle Grid */}
      <div className="ambient-halo" />
      <div className="ambient-grid" />

      {/* Classy Glass Header */}
      <ClassyHeader
        currentUser={currentUser}
        currentUserGeo={currentUserGeo}
        activeState={matchStatus}
        onlineCount={Math.max(1, onlineUserIds.size)}
      />

      {/* Main Stage Switching */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: matchStatus === 'idle' ? 'stretch' : 'center',
          justifyContent: isChatActive ? 'flex-start' : 'center',
          width: '100%',
          position: 'relative',
          zIndex: 10,
          minHeight: 0,
          height: isChatActive ? '100%' : 'auto',
          overflow: isChatActive ? 'hidden' : 'visible',
        }}
      >
        <AnimatePresence mode="wait">
          {matchStatus === 'idle' && (
            <ClassyHeroStage
              selectedTopic={selectedTopic}
              onSelectTopic={setSelectedTopic}
              onStartPulse={handleStartPulse}
              initialNickname={currentUser?.username || ''}
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
