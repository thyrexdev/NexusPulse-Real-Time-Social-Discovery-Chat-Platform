import { AuthResponse, Conversation, Message, MessagesResponse, User } from '@/types/chat';

const getApiBaseUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return raw.replace(/\/+$/, '');
};

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('chat_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('chat_token', token);
      } else {
        localStorage.removeItem('chat_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('chat_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorMessage = `HTTP Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // ignore non-json error responses
        }
        throw new Error(errorMessage);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      throw err;
    }
  }

  // Authentication
  async register(data: { username: string; email: string; password: string; fullName: string; avatar?: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.accessToken);
    return res;
  }

  async createStranger(): Promise<AuthResponse & { geo?: any }> {
    const res = await this.request<AuthResponse & { geo?: any }>('/auth/stranger', {
      method: 'POST',
    });
    this.setToken(res.accessToken);
    return res;
  }

  async getGeo(): Promise<any> {
    return this.request<any>('/auth/geo');
  }

  async login(data: { identifier: string; password: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.accessToken);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateProfile(data: { username: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (res.accessToken) {
      this.setToken(res.accessToken);
    }
    return res;
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/conversations');
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.request<Conversation>(`/conversations/${id}`);
  }

  async createConversation(data: { type: 'PRIVATE' | 'GROUP'; participantIds: string[]; title?: string; avatar?: string }): Promise<Conversation> {
    return this.request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Messages
  async getMessages(conversationId: string, limit = 50, cursor?: string): Promise<MessagesResponse> {
    let url = `/conversations/${conversationId}/messages?limit=${limit}`;
    if (cursor) {
      url += `&cursor=${cursor}`;
    }
    return this.request<MessagesResponse>(url);
  }

  async sendMessage(conversationId: string, content: string, attachmentUrl?: string, type = 'TEXT'): Promise<Message> {
    return this.request<Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, attachmentUrl, type }),
    });
  }

  async editMessage(messageId: string, content: string): Promise<Message> {
    return this.request<Message>(`/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
