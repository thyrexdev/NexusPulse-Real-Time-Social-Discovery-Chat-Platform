import { create } from 'zustand';
import { User, Conversation, Message, ConversationType, ParticipantRole, MessageType } from '@/types/chat';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';

export const DEMO_USERS: Record<'alice' | 'bob' | 'charlie' | 'stranger', User> = {
  alice: {
    id: 'usr-alice',
    username: 'alice',
    email: 'alice@chat.com',
    fullName: 'Alice Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  bob: {
    id: 'usr-bob',
    username: 'bob',
    email: 'bob@chat.com',
    fullName: 'Bob Smith',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  },
  charlie: {
    id: 'usr-charlie',
    username: 'charlie',
    email: 'charlie@chat.com',
    fullName: 'Charlie Davis',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  },
  stranger: {
    id: 'usr-stranger',
    username: 'stranger_neon',
    email: 'stranger@chat.com',
    fullName: 'Mysterious Stranger',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
  },
};

interface ChatState {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  onlineUserIds: Set<string>;
  typingUsers: Record<string, string[]>;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'demo';

  // Social Discovery & Matchmaking State
  matchStatus: 'idle' | 'searching' | 'matched' | 'ended';
  activeTopic: string;
  activeSession: any | null;
  activePeer: any | null;
  queuePosition: number | null;
  partnerStatusMessage: string | null;

  // Actions
  initAuth: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  quickSwitchUser: (preset: 'alice' | 'bob' | 'charlie') => Promise<void>;
  selectConversation: (conversationId: string) => void;
  refreshConversations: () => Promise<void>;
  seedDemoData: (user: User) => void;
  sendMessage: (content: string, attachmentUrl?: string) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  createPrivateChat: (targetUserId: string) => Promise<Conversation>;
  createGroupChat: (title: string, participantIds: string[], avatar?: string) => Promise<Conversation>;
  startStrangerChat: () => Promise<Conversation>;
  deleteMessage: (messageId: string) => Promise<void>;
  setupSocketListeners: () => void;

  // Matchmaking Actions
  joinMatchQueue: (topic?: string) => Promise<void>;
  leaveMatchQueue: () => void;
  skipCurrentMatch: (autoRequeue?: boolean) => Promise<void>;
  leaveCurrentSession: () => Promise<void>;
  reportCurrentPeer: (reason: string, details?: string) => Promise<void>;
  blockCurrentPeer: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentUser: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  conversations: [],
  activeConversationId: null,
  messages: [],
  onlineUserIds: new Set<string>(),
  typingUsers: {},
  connectionStatus: 'disconnected',

  // Matchmaking State
  matchStatus: 'idle',
  activeTopic: 'general',
  activeSession: null,
  activePeer: null,
  queuePosition: null,
  partnerStatusMessage: null,

  initAuth: async () => {
    set({ isLoading: true });
    const savedToken = api.getToken();
    if (savedToken) {
      try {
        const user = await api.getMe();
        set({ currentUser: user, token: savedToken, isAuthenticated: true, isLoading: false });
        get().setupSocketListeners();
        get().refreshConversations();
        return;
      } catch {
        api.setToken(null);
      }
    }

    if (typeof window !== 'undefined') {
      const savedDemo = localStorage.getItem('demo_user');
      if (savedDemo) {
        try {
          const parsed: User = JSON.parse(savedDemo);
          set({ currentUser: parsed, isAuthenticated: true, isLoading: false, connectionStatus: 'demo' });
          get().refreshConversations();
          return;
        } catch {
          // ignore error
        }
      }
    }
    set({ isLoading: false });
  },

  setupSocketListeners: () => {
    const { token, currentUser } = get();
    if (!token || !currentUser) {
      socketManager.disconnect();
      return;
    }

    set({ connectionStatus: 'connecting' });
    const socket = socketManager.connect(token);

    socket.on('connect', () => {
      set({ connectionStatus: 'connected' });
    });

    socket.on('ready', (data: { userId: string; onlineUsers: string[]; joinedConversations: string[] }) => {
      set({
        onlineUserIds: new Set(data.onlineUsers || []),
        connectionStatus: 'connected',
      });
    });

    socket.on('user:online', (data: { userId: string }) => {
      set((state) => ({
        onlineUserIds: new Set([...state.onlineUserIds, data.userId]),
      }));
    });

    socket.on('user:offline', (data: { userId: string }) => {
      set((state) => {
        const next = new Set(state.onlineUserIds);
        next.delete(data.userId);
        return { onlineUserIds: next };
      });
    });

    socket.on('message:created', (message: Message) => {
      const { activeConversationId } = get();
      set((state) => {
        const newMessages =
          message.conversationId === activeConversationId && !state.messages.some((m) => m.id === message.id)
            ? [...state.messages, message]
            : state.messages;

        const newConversations = state.conversations.map((c) => {
          if (c.id === message.conversationId) {
            return {
              ...c,
              lastMessageId: message.id,
              lastMessageAt: message.createdAt,
              messages: [message],
            };
          }
          return c;
        });

        return { messages: newMessages, conversations: newConversations };
      });
    });

    socket.on('typing:started', (data: { conversationId: string; userId: string; username: string }) => {
      const { currentUser } = get();
      if (data.userId === currentUser?.id) return;
      set((state) => {
        const current = state.typingUsers[data.conversationId] || [];
        if (!current.includes(data.username)) {
          return {
            typingUsers: { ...state.typingUsers, [data.conversationId]: [...current, data.username] },
          };
        }
        return state;
      });
    });

    socket.on('typing:stopped', (data: { conversationId: string; userId: string }) => {
      set((state) => {
        const current = state.typingUsers[data.conversationId] || [];
        return {
          typingUsers: {
            ...state.typingUsers,
            [data.conversationId]: current.filter((u) => u !== data.userId),
          },
        };
      });
    });

    socket.on('match:found', (data: any) => {
      set({
        matchStatus: 'matched',
        activeSession: {
          id: data.sessionId,
          conversationId: data.conversationId,
          topic: data.topic,
          peer: data.peer,
          startedAt: data.startedAt,
          status: 'ACTIVE',
        },
        activePeer: data.peer,
        activeTopic: data.topic || 'general',
        activeConversationId: data.conversationId,
        partnerStatusMessage: null,
      });
      get().refreshConversations();
    });

    socket.on('peer:skipped', (data: { sessionId: string; message: string }) => {
      set({
        matchStatus: 'ended',
        partnerStatusMessage: data.message || 'Your chat partner skipped the session.',
      });
    });

    socket.on('peer:left', (data: { sessionId: string; message: string }) => {
      set({
        matchStatus: 'ended',
        partnerStatusMessage: data.message || 'Your partner left the conversation.',
      });
    });

    socket.on('peer:disconnected', (data: { sessionId: string; message: string }) => {
      set({
        matchStatus: 'ended',
        partnerStatusMessage: data.message || 'Your partner lost connection.',
      });
    });

    socket.on('peer:ended', (data: { sessionId: string; message: string }) => {
      set({
        matchStatus: 'ended',
        partnerStatusMessage: data.message || 'The conversation session was closed.',
      });
    });

    socket.on('disconnect', () => {
      set({ connectionStatus: 'disconnected' });
    });
  },

  refreshConversations: async () => {
    const { currentUser, activeConversationId } = get();
    if (!currentUser) return;

    try {
      const convs = await api.getConversations();
      set({ conversations: convs });
      if (convs.length > 0 && !activeConversationId) {
        get().selectConversation(convs[0].id);
      }
    } catch {
      get().seedDemoData(currentUser);
    }
  },

  seedDemoData: (user: User) => {
    const otherUser = user.username === 'alice' ? DEMO_USERS.bob : DEMO_USERS.alice;
    const demoConv: Conversation = {
      id: 'demo-conv-1',
      type: ConversationType.PRIVATE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      lastMessageId: 'msg-demo-2',
      participants: [
        {
          id: 'p-1',
          conversationId: 'demo-conv-1',
          userId: user.id,
          role: ParticipantRole.MEMBER,
          joinedAt: new Date().toISOString(),
          user,
        },
        {
          id: 'p-2',
          conversationId: 'demo-conv-1',
          userId: 'usr-demo-other',
          role: ParticipantRole.MEMBER,
          joinedAt: new Date().toISOString(),
          user: {
            id: 'usr-demo-other',
            username: otherUser.username,
            email: otherUser.email,
            fullName: otherUser.fullName,
            avatar: otherUser.avatar,
          },
        },
      ],
      messages: [
        {
          id: 'msg-demo-1',
          conversationId: 'demo-conv-1',
          senderId: 'usr-demo-other',
          content: 'Hey! Welcome to the real-time messaging platform demo. Try sending a message! 🚀',
          type: MessageType.TEXT,
          isEdited: false,
          createdAt: new Date(Date.now() - 60000).toISOString(),
          sender: {
            id: 'usr-demo-other',
            username: otherUser.username,
            email: otherUser.email,
            fullName: otherUser.fullName,
            avatar: otherUser.avatar,
          },
        },
      ],
    };

    const groupConv: Conversation = {
      id: 'demo-conv-group',
      type: ConversationType.GROUP,
      title: 'Distributed Systems & Real-Time Engineering',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      participants: [
        { id: 'p-g1', conversationId: 'demo-conv-group', userId: user.id, role: ParticipantRole.OWNER, joinedAt: new Date().toISOString(), user },
        { id: 'p-g2', conversationId: 'demo-conv-group', userId: 'usr-demo-other', role: ParticipantRole.MEMBER, joinedAt: new Date().toISOString(), user: { id: 'usr-demo-other', username: otherUser.username, email: otherUser.email, fullName: otherUser.fullName, avatar: otherUser.avatar } },
        { id: 'p-g3', conversationId: 'demo-conv-group', userId: 'usr-demo-charlie', role: ParticipantRole.MEMBER, joinedAt: new Date().toISOString(), user: { id: 'usr-demo-charlie', username: DEMO_USERS.charlie.username, email: DEMO_USERS.charlie.email, fullName: DEMO_USERS.charlie.fullName, avatar: DEMO_USERS.charlie.avatar } },
      ],
      messages: [
        {
          id: 'msg-group-1',
          conversationId: 'demo-conv-group',
          senderId: 'usr-demo-charlie',
          content: 'The WebSocket gateway and Redis pub/sub sync are operating with sub-millisecond latency! ⚡',
          type: MessageType.TEXT,
          isEdited: false,
          createdAt: new Date(Date.now() - 120000).toISOString(),
          sender: {
            id: 'usr-demo-charlie',
            username: DEMO_USERS.charlie.username,
            email: DEMO_USERS.charlie.email,
            fullName: DEMO_USERS.charlie.fullName,
            avatar: DEMO_USERS.charlie.avatar,
          },
        },
      ],
    };

    set({
      conversations: [demoConv, groupConv],
      activeConversationId: demoConv.id,
      messages: demoConv.messages || [],
      onlineUserIds: new Set(['usr-demo-other', 'usr-demo-charlie', user.id]),
      connectionStatus: 'demo',
    });
  },

  selectConversation: async (id: string) => {
    set({ activeConversationId: id });
    const { connectionStatus, conversations } = get();
    if (connectionStatus === 'demo') {
      const conv = conversations.find((c) => c.id === id);
      if (conv) set({ messages: conv.messages || [] });
      return;
    }

    try {
      const res = await api.getMessages(id, 50);
      set({ messages: res.messages || [] });
    } catch (err) {
      console.warn('Could not fetch messages from server:', err);
    }
  },

  login: async (identifier: string, pass: string) => {
    try {
      const res = await api.login({ identifier, password: pass });
      set({ currentUser: res.user, token: res.accessToken, isAuthenticated: true });
      get().setupSocketListeners();
      await get().refreshConversations();
    } catch {
      const demoUser: User = {
        id: `usr-${Date.now()}`,
        username: identifier.split('@')[0],
        email: identifier.includes('@') ? identifier : `${identifier}@chat.com`,
        fullName: identifier.charAt(0).toUpperCase() + identifier.slice(1),
        avatar: DEMO_USERS.alice.avatar,
      };
      set({ currentUser: demoUser, isAuthenticated: true, connectionStatus: 'demo' });
      if (typeof window !== 'undefined') localStorage.setItem('demo_user', JSON.stringify(demoUser));
      get().seedDemoData(demoUser);
    }
  },

  register: async (username: string, email: string, pass: string, fullName: string) => {
    try {
      const res = await api.register({ username, email, password: pass, fullName });
      set({ currentUser: res.user, token: res.accessToken, isAuthenticated: true });
      get().setupSocketListeners();
      await get().refreshConversations();
    } catch {
      const demoUser: User = {
        id: `usr-${Date.now()}`,
        username,
        email,
        fullName,
        avatar: DEMO_USERS.alice.avatar,
      };
      set({ currentUser: demoUser, isAuthenticated: true, connectionStatus: 'demo' });
      if (typeof window !== 'undefined') localStorage.setItem('demo_user', JSON.stringify(demoUser));
      get().seedDemoData(demoUser);
    }
  },

  quickSwitchUser: async (preset: 'alice' | 'bob' | 'charlie') => {
    const p = DEMO_USERS[preset];
    try {
      try {
        const res = await api.login({ identifier: p.email, password: 'password123' });
        set({ currentUser: res.user, token: res.accessToken, isAuthenticated: true });
        get().setupSocketListeners();
        await get().refreshConversations();
      } catch {
        const res = await api.register({
          username: p.username,
          email: p.email,
          password: 'password123',
          fullName: p.fullName,
          avatar: p.avatar || undefined,
        });
        set({ currentUser: res.user, token: res.accessToken, isAuthenticated: true });
        get().setupSocketListeners();
        await get().refreshConversations();
      }
    } catch {
      const demoUser: User = {
        id: `usr-${preset}`,
        username: p.username,
        email: p.email,
        fullName: p.fullName,
        avatar: p.avatar,
      };
      set({ currentUser: demoUser, isAuthenticated: true, connectionStatus: 'demo' });
      if (typeof window !== 'undefined') localStorage.setItem('demo_user', JSON.stringify(demoUser));
      get().seedDemoData(demoUser);
    }
  },

  logout: () => {
    api.setToken(null);
    socketManager.disconnect();
    if (typeof window !== 'undefined') localStorage.removeItem('demo_user');
    set({
      currentUser: null,
      token: null,
      isAuthenticated: false,
      conversations: [],
      messages: [],
      activeConversationId: null,
      connectionStatus: 'disconnected',
    });
  },

  sendMessage: async (content: string, attachmentUrl?: string) => {
    const { activeConversationId, currentUser, connectionStatus } = get();
    if (!activeConversationId || !currentUser) return;

    if (connectionStatus === 'demo') {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        conversationId: activeConversationId,
        senderId: currentUser.id,
        content,
        attachmentUrl,
        type: MessageType.TEXT,
        isEdited: false,
        createdAt: new Date().toISOString(),
        sender: currentUser,
      };

      set((state) => ({ messages: [...state.messages, newMsg] }));

      setTimeout(() => {
        const botReply: Message = {
          id: `msg-reply-${Date.now()}`,
          conversationId: activeConversationId,
          senderId: 'usr-demo-other',
          content: `Real-time ack received for: "${content.length > 25 ? content.slice(0, 25) + '...' : content}". Message broadcasted over Redis Pub/Sub cluster! ⚡`,
          type: MessageType.TEXT,
          isEdited: false,
          createdAt: new Date().toISOString(),
          sender: {
            id: 'usr-demo-other',
            username: currentUser.username === 'alice' ? 'bob' : 'alice',
            email: 'bot@chat.com',
            fullName: currentUser.username === 'alice' ? 'Bob Smith' : 'Alice Johnson',
            avatar: currentUser.username === 'alice' ? DEMO_USERS.bob.avatar : DEMO_USERS.alice.avatar,
          },
        };
        set((state) => ({ messages: [...state.messages, botReply] }));
      }, 900);
      return;
    }

    socketManager.sendMessage(
      {
        conversationId: activeConversationId,
        content,
        attachmentUrl,
        type: 'TEXT',
      },
      (res) => {
        if (res.status === 'error') {
          api.sendMessage(activeConversationId, content, attachmentUrl);
        }
      },
    );
  },

  sendTyping: (isTyping: boolean) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;
    if (isTyping) {
      socketManager.startTyping(activeConversationId);
    } else {
      socketManager.stopTyping(activeConversationId);
    }
  },

  createPrivateChat: async (targetUserId: string): Promise<Conversation> => {
    const conv = await api.createConversation({
      type: 'PRIVATE',
      participantIds: [targetUserId],
    });
    await get().refreshConversations();
    get().selectConversation(conv.id);
    return conv;
  },

  createGroupChat: async (title: string, participantIds: string[], avatar?: string): Promise<Conversation> => {
    const conv = await api.createConversation({
      type: 'GROUP',
      title,
      participantIds,
      avatar,
    });
    await get().refreshConversations();
    get().selectConversation(conv.id);
    return conv;
  },

  startStrangerChat: async (): Promise<Conversation> => {
    const { currentUser } = get();
    const stranger = DEMO_USERS.stranger;
    const myUser = currentUser || DEMO_USERS.alice;
    const strangerConv: Conversation = {
      id: `stranger-conv-${Date.now()}`,
      type: ConversationType.PRIVATE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      participants: [
        {
          id: 'p-me',
          conversationId: `stranger-conv-${Date.now()}`,
          userId: myUser.id,
          role: ParticipantRole.MEMBER,
          joinedAt: new Date().toISOString(),
          user: myUser,
        },
        {
          id: 'p-stranger',
          conversationId: `stranger-conv-${Date.now()}`,
          userId: stranger.id,
          role: ParticipantRole.MEMBER,
          joinedAt: new Date().toISOString(),
          user: stranger,
        },
      ],
      messages: [
        {
          id: `msg-stranger-${Date.now()}`,
          conversationId: `stranger-conv-${Date.now()}`,
          senderId: stranger.id,
          content: 'Connected to a random online peer! Say hi! 👋',
          type: MessageType.TEXT,
          isEdited: false,
          createdAt: new Date().toISOString(),
          sender: stranger,
        },
      ],
    };

    set((state) => ({
      conversations: [strangerConv, ...state.conversations],
      activeConversationId: strangerConv.id,
      messages: strangerConv.messages || [],
      onlineUserIds: new Set([...state.onlineUserIds, stranger.id]),
    }));

    return strangerConv;
  },

  deleteMessage: async (messageId: string) => {
    const { connectionStatus } = get();
    if (connectionStatus === 'demo') {
      set((state) => ({ messages: state.messages.filter((m) => m.id !== messageId) }));
      return;
    }
    await api.deleteMessage(messageId);
    set((state) => ({ messages: state.messages.filter((m) => m.id !== messageId) }));
  },

  joinMatchQueue: async (topic = 'general') => {
    const { connectionStatus, currentUser } = get();
    set({
      matchStatus: 'searching',
      activeTopic: topic,
      partnerStatusMessage: null,
      activePeer: null,
      activeSession: null,
    });

    if (connectionStatus === 'demo' || !currentUser) {
      setTimeout(() => {
        const other = currentUser?.username === 'alice' ? DEMO_USERS.bob : DEMO_USERS.alice;
        const fakeSession = {
          id: `demo-sess-${Date.now()}`,
          conversationId: `demo-conv-${Date.now()}`,
          topic,
          peer: other,
          startedAt: new Date().toISOString(),
          status: 'ACTIVE',
        };
        const fakeConv: Conversation = {
          id: fakeSession.conversationId,
          type: ConversationType.PRIVATE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          participants: [
            {
              id: 'p1',
              conversationId: fakeSession.conversationId,
              userId: currentUser?.id || 'guest',
              role: ParticipantRole.MEMBER,
              joinedAt: new Date().toISOString(),
              user: currentUser || DEMO_USERS.alice,
            },
            {
              id: 'p2',
              conversationId: fakeSession.conversationId,
              userId: other.id,
              role: ParticipantRole.MEMBER,
              joinedAt: new Date().toISOString(),
              user: other,
            },
          ],
          messages: [
            {
              id: `msg-${Date.now()}`,
              conversationId: fakeSession.conversationId,
              senderId: other.id,
              content: `Hey there! Matched on #${topic}. Great to meet you! ✨`,
              type: MessageType.TEXT,
              isEdited: false,
              createdAt: new Date().toISOString(),
              sender: other,
            },
          ],
        };
        set((state) => ({
          matchStatus: 'matched',
          activeSession: fakeSession,
          activePeer: other,
          activeConversationId: fakeConv.id,
          conversations: [fakeConv, ...state.conversations],
          messages: fakeConv.messages || [],
        }));
      }, 1400);
      return;
    }

    socketManager.joinMatchQueue(topic, (response) => {
      if (response.status === 'queued') {
        set({ matchStatus: 'searching', queuePosition: response.position || 1 });
      }
    });
  },

  leaveMatchQueue: () => {
    const { connectionStatus } = get();
    if (connectionStatus !== 'demo') {
      socketManager.leaveMatchQueue();
    }
    set({ matchStatus: 'idle', queuePosition: null });
  },

  skipCurrentMatch: async (autoRequeue = true) => {
    const { activeSession, connectionStatus, activeTopic } = get();
    if (!activeSession) return;

    if (connectionStatus === 'demo') {
      set({ matchStatus: 'ended', partnerStatusMessage: 'Skipping to next stranger...' });
      if (autoRequeue) {
        setTimeout(() => {
          get().joinMatchQueue(activeTopic);
        }, 300);
      }
      return;
    }

    socketManager.skipMatch(activeSession.id, autoRequeue, activeTopic, (res) => {
      if (autoRequeue && res?.status === 'queued') {
        set({
          matchStatus: 'searching',
          queuePosition: res.position || 1,
          activeSession: null,
          activePeer: null,
          messages: [],
        });
      }
    });

    if (!autoRequeue) {
      set({ matchStatus: 'ended', partnerStatusMessage: 'You skipped the chat.' });
    }
  },

  leaveCurrentSession: async () => {
    const { activeSession, connectionStatus } = get();
    if (activeSession && connectionStatus !== 'demo') {
      socketManager.leaveMatchSession(activeSession.id);
    }
    set({
      matchStatus: 'idle',
      activeSession: null,
      activePeer: null,
      partnerStatusMessage: null,
    });
  },

  reportCurrentPeer: async (reason: string, details?: string) => {
    const { activePeer, activeSession, activeConversationId } = get();
    if (!activePeer) return;

    socketManager.reportUser({
      reportedUserId: activePeer.id,
      reason,
      details,
      conversationId: activeConversationId || undefined,
      sessionId: activeSession?.id,
    });

    set({
      matchStatus: 'ended',
      partnerStatusMessage: 'User has been reported and session terminated.',
    });
  },

  blockCurrentPeer: async () => {
    const { activePeer, activeSession } = get();
    if (!activePeer) return;

    socketManager.blockUser({
      targetUserId: activePeer.id,
      sessionId: activeSession?.id,
    });

    set({
      matchStatus: 'ended',
      partnerStatusMessage: 'User has been blocked. You will never be matched with them again.',
    });
  },
}));
