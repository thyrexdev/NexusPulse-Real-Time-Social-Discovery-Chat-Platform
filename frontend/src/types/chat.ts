export enum ConversationType {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP',
}

export enum ParticipantRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Participant {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: string;
  lastReadMessageId?: string | null;
  user: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string | null;
  type: MessageType;
  isEdited: boolean;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  sender: User;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title?: string | null;
  avatar?: string | null;
  lastMessageId?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  messages?: Message[];
  unreadCount?: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor?: string | null;
  hasMore: boolean;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  username: string;
  timestamp?: string;
}

export enum MatchStatus {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  MATCHED = 'MATCHED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

export interface GeoLocation {
  ip: string;
  countryCode: string;
  country: string;
  flag: string;
  city?: string;
}

export interface MatchPeer {
  id: string;
  username: string;
  fullName: string;
  avatar?: string | null;
  country?: string;
  countryCode?: string;
  flag?: string;
  city?: string;
  ip?: string;
}

export interface MatchSession {
  id: string;
  conversationId: string;
  topic?: string | null;
  status: MatchStatus;
  peer: MatchPeer;
  startedAt: string;
  endedAt?: string | null;
  endReason?: string | null;
}

export interface MatchFoundPayload {
  sessionId: string;
  conversationId: string;
  topic?: string;
  peer: MatchPeer;
  startedAt: string;
}

