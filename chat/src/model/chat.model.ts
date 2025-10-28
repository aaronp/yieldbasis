/**
 * Chat domain models
 */

// ============================================================================
// USER MODEL
// ============================================================================

export interface User {
  id: string;
  name: string;
  avatar?: string;
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface CreateUserInput {
  id?: string;
  name: string;
  avatar?: string;
  data?: Record<string, any>;
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  avatar?: string;
  data?: Record<string, any>;
}

// ============================================================================
// GROUP MODEL
// ============================================================================

export interface Group {
  id: string;
  name: string;
  userIds: string[];
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface CreateGroupInput {
  id?: string;
  name: string;
  userIds?: string[];
  data?: Record<string, any>;
}

export interface UpdateGroupInput {
  id: string;
  name?: string;
  userIds?: string[];
  data?: Record<string, any>;
}

// ============================================================================
// MESSAGE MODEL
// ============================================================================

export interface Message {
  id: string;
  text: string;
  userId: string;
  groupId: string;
  timestamp: number;
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface CreateMessageInput {
  id?: string;
  text: string;
  userId: string;
  groupId: string;
  timestamp?: number;
  data?: Record<string, any>;
}

export interface UpdateMessageInput {
  id: string;
  text?: string;
  timestamp?: number;
  data?: Record<string, any>;
}

export interface QueryMessagesOptions {
  groupId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// LAYOUT SETTINGS MODEL
// ============================================================================

export interface LayoutSettings {
  id: string;
  type: 'user' | 'group' | 'message';
  ordering: string[]; // Array of IDs in display order
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface CreateLayoutSettingsInput {
  id?: string;
  type: 'user' | 'group' | 'message';
  ordering?: string[];
  data?: Record<string, any>;
}

export interface UpdateLayoutSettingsInput {
  id: string;
  ordering?: string[];
  data?: Record<string, any>;
}

// ============================================================================
// AGGREGATE MODELS
// ============================================================================

export interface ChatData {
  users: User[];
  groups: Group[];
  messages: Message[];
  layoutSettings: LayoutSettings[];
}

export interface MessageWithUser extends Message {
  user: User;
}

export interface GroupWithUsers extends Group {
  users: User[];
}
