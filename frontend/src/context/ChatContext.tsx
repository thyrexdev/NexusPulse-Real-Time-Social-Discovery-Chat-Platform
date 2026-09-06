'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Conversation, Message, ConversationType, ParticipantRole, MessageType } from '@/types/chat';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';

interface ChatContextType {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  onlineUserIds: Set<string>;
  typingUsers: Record<string, string[]>; // conversationId -> array of usernames typing
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'demo';
  
  // Actions
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  quickSwitchUser: (presetUser: 'alice' | 'bob' | 'charlie') => Promise<void>;
  selectConversation: (conversationId: string) => void;
  sendMessage: (content: string, attachmentUrl?: string) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  createPrivateChat: (targetUserId: string) => Promise<Conversation>;
  createGroupChat: (title: string, participantIds: string[], avatar?: string) => Promise<Conversation>;
  deleteMessage: (messageId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
}

// Preset Demo Users for instant testing
export const DEMO_USERS: Record<'alice' | 'bob' | 'charlie', { username: string; email: string; fullName: string; avatar: string }> = {
  alice: {
    username: 'alice',
    email: 'alice@chat.com',
    fullName: 'Alice Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  bob: {
    username: 'bob',
    email: 'bob@chat.com',
    fullName: 'Bob Smith',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  },
  charlie: {
    username: 'charlie',
    email: 'charlie@chat.com',
    fullName: 'Charlie Davis',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  },
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'demo'>('disconnected');

  // Load existing session
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = api.getToken();
      if (savedToken) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
          setToken(savedToken);
        } catch {
          // Token expired or server unreachable; check if demo mode user stored
          const savedDemo = localStorage.getItem('demo_user');
          if (savedDemo) {
            try {
              const parsed = JSON.parse(savedDemo);
              setCurrentUser(parsed);
              setConnectionStatus('demo');
            } catch {
              api.setToken(null);
            }
          } else {
            api.setToken(null);
          }
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  // Fetch conversations when user is authenticated
  const refreshConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const convs = await api.getConversations();
      setConversations(convs);
      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
      }
    } catch {
      // Fallback demo conversations
      seedDemoData(currentUser);
    }
  }, [currentUser, activeConversationId]);

  useEffect(() => {
    if (currentUser) {
      refreshConversations();
    }
  }, [currentUser, refreshConversations]);

  // Seed demo data for offline/demo mode
  const seedDemoData = (user: User) => {
    setConnectionStatus('demo');
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
          content: 'Hey! Welcome to the real-time messaging platform demo. Try sending a message!',
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
          content: 'The WebSocket gateway and Redis pub/sub sync are operating with sub-millisecond latency! 🚀',
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

    setConversations([demoConv, groupConv]);
    setActiveConversationId(demoConv.id);
    setMessages(demoConv.messages || []);
    setOnlineUserIds(new Set(['usr-demo-other', 'usr-demo-charlie', user.id]));
  };

  // Connect WebSocket when token & user exist
  useEffect(() => {
    if (!token || !currentUser) {
      socketManager.disconnect();
      return;
    }

    setConnectionStatus('connecting');
    const socket = socketManager.connect(token);

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('ready', (data: { userId: string; onlineUsers: string[]; joinedConversations: string[] }) => {
      setOnlineUserIds(new Set(data.onlineUsers || []));
      setConnectionStatus('connected');
    });

    socket.on('user:online', (data: { userId: string }) => {
      setOnlineUserIds((prev) => new Set([...prev, data.userId]));
    });

    socket.on('user:offline', (data: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    socket.on('message:created', (message: Message) => {
      // Add message if in active conversation
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        if (message.conversationId === activeConversationId) {
          return [...prev, message];
        }
        return prev;
      });

      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === message.conversationId) {
            return {
              ...c,
              lastMessageId: message.id,
              lastMessageAt: message.createdAt,
              messages: [message],
            };
          }
          return c;
        }),
      );
    });

    socket.on('typing:started', (data: { conversationId: string; userId: string; username: string }) => {
      if (data.userId === currentUser.id) return;
      setTypingUsers((prev) => {
        const current = prev[data.conversationId] || [];
        if (!current.includes(data.username)) {
          return { ...prev, [data.conversationId]: [...current, data.username] };
        }
        return prev;
      });
    });

    socket.on('typing:stopped', (data: { conversationId: string; userId: string }) => {
      setTypingUsers((prev) => {
        const current = prev[data.conversationId] || [];
        return {
          ...prev,
          [data.conversationId]: current.filter((u) => u !== data.userId),
        };
      });
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    return () => {
      socket.off('connect');
      socket.off('ready');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('message:created');
      socket.off('typing:started');
      socket.off('typing:stopped');
      socket.off('disconnect');
    };
  }, [token, currentUser, activeConversationId]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId || !currentUser) return;
    if (connectionStatus === 'demo') {
      const conv = conversations.find((c) => c.id === activeConversationId);
      if (conv) setMessages(conv.messages || []);
      return;
    }

    const loadMessages = async () => {
      try {
        const res = await api.getMessages(activeConversationId, 50);
        setMessages(res.messages || []);
      } catch (err) {
        console.warn('Could not fetch messages from server:', err);
      }
    };
    loadMessages();
  }, [activeConversationId, currentUser, connectionStatus, conversations]);

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await api.login({ identifier, password: pass });
      setCurrentUser(res.user);
      setToken(res.accessToken);
    } catch {
      // Fallback demo mode login
      const demoUser: User = {
        id: `usr-${Date.now()}`,
        username: identifier.split('@')[0],
        email: identifier.includes('@') ? identifier : `${identifier}@chat.com`,
        fullName: identifier.charAt(0).toUpperCase() + identifier.slice(1),
        avatar: DEMO_USERS.alice.avatar,
      };
      setCurrentUser(demoUser);
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      seedDemoData(demoUser);
    }
  };

  const register = async (username: string, email: string, pass: string, fullName: string) => {
    try {
      const res = await api.register({ username, email, password: pass, fullName });
      setCurrentUser(res.user);
      setToken(res.accessToken);
    } catch {
      const demoUser: User = {
        id: `usr-${Date.now()}`,
        username,
        email,
        fullName,
        avatar: DEMO_USERS.alice.avatar,
      };
      setCurrentUser(demoUser);
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      seedDemoData(demoUser);
    }
  };

  const quickSwitchUser = async (preset: 'alice' | 'bob' | 'charlie') => {
    const p = DEMO_USERS[preset];
    try {
      // Try login or register with backend
      try {
        const res = await api.login({ identifier: p.email, password: 'password123' });
        setCurrentUser(res.user);
        setToken(res.accessToken);
      } catch {
        const res = await api.register({
          username: p.username,
          email: p.email,
          password: 'password123',
          fullName: p.fullName,
          avatar: p.avatar,
        });
        setCurrentUser(res.user);
        setToken(res.accessToken);
      }
    } catch {
      // Demo mode switch
      const demoUser: User = {
        id: `usr-${preset}`,
        username: p.username,
        email: p.email,
        fullName: p.fullName,
        avatar: p.avatar,
      };
      setCurrentUser(demoUser);
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      seedDemoData(demoUser);
    }
  };

  const logout = () => {
    api.setToken(null);
    socketManager.disconnect();
    setCurrentUser(null);
    setToken(null);
    setConversations([]);
    setMessages([]);
    localStorage.removeItem('demo_user');
    setConnectionStatus('disconnected');
  };

  const sendMessage = async (content: string, attachmentUrl?: string) => {
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

      setMessages((prev) => [...prev, newMsg]);

      // Simulate bot reply in demo mode
      setTimeout(() => {
        const botReply: Message = {
          id: `msg-reply-${Date.now()}`,
          conversationId: activeConversationId,
          senderId: 'usr-demo-other',
          content: `Real-time ack received for: "${content.length > 25 ? content.slice(0, 25) + '...' : content}". WebSocket event fanned out via Redis Pub/Sub! ⚡`,
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
        setMessages((prev) => [...prev, botReply]);
      }, 900);
      return;
    }

    // Live backend mode: try WebSocket first, fallback to REST
    socketManager.sendMessage(
      {
        conversationId: activeConversationId,
        content,
        attachmentUrl,
        type: 'TEXT',
      },
      (res) => {
        if (res.status === 'error') {
          // REST fallback
          api.sendMessage(activeConversationId, content, attachmentUrl);
        }
      },
    );
  };

  const sendTyping = (isTyping: boolean) => {
    if (!activeConversationId) return;
    if (isTyping) {
      socketManager.startTyping(activeConversationId);
    } else {
      socketManager.stopTyping(activeConversationId);
    }
  };

  const createPrivateChat = async (targetUserId: string): Promise<Conversation> => {
    const conv = await api.createConversation({
      type: 'PRIVATE',
      participantIds: [targetUserId],
    });
    await refreshConversations();
    setActiveConversationId(conv.id);
    return conv;
  };

  const createGroupChat = async (title: string, participantIds: string[], avatar?: string): Promise<Conversation> => {
    const conv = await api.createConversation({
      type: 'GROUP',
      title,
      participantIds,
      avatar,
    });
    await refreshConversations();
    setActiveConversationId(conv.id);
    return conv;
  };

  const deleteMessage = async (messageId: string) => {
    if (connectionStatus === 'demo') {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      return;
    }
    await api.deleteMessage(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: !!currentUser,
        isLoading,
        conversations,
        activeConversation,
        messages,
        onlineUserIds,
        typingUsers,
        connectionStatus,
        login,
        register,
        logout,
        quickSwitchUser,
        selectConversation,
        sendMessage,
        sendTyping,
        createPrivateChat,
        createGroupChat,
        deleteMessage,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
