import { IStorage } from './storage.types';
import { InMemoryStorage } from './storage.memory';
import { IndexedDBStorage } from './storage.indexeddb';
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  Group,
  CreateGroupInput,
  UpdateGroupInput,
  Message,
  CreateMessageInput,
  UpdateMessageInput,
  QueryMessagesOptions,
  LayoutSettings,
  CreateLayoutSettingsInput,
  UpdateLayoutSettingsInput,
  ChatData,
  MessageWithUser,
  GroupWithUsers,
} from './chat.model';

/**
 * UserAPI - Manage users
 */
export class UserAPI {
  private storage: IStorage;
  private storageKey: string;
  private users: Map<string, User> = new Map();

  constructor(storage: IStorage, storageKey: string = 'users') {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  async initialize(): Promise<void> {
    await this.loadFromStorage();
  }

  create(input: CreateUserInput): User {
    const now = Date.now();
    const user: User = {
      id: input.id || this.generateId('user'),
      name: input.name,
      avatar: input.avatar,
      data: input.data || {},
      createdAt: now,
      updatedAt: now,
    };

    if (this.users.has(user.id)) {
      throw new Error(`User with id ${user.id} already exists`);
    }

    this.users.set(user.id, user);
    this.saveToStorage();
    return user;
  }

  get(id: string): User | null {
    return this.users.get(id) || null;
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  update(input: UpdateUserInput): User {
    const user = this.users.get(input.id);
    if (!user) {
      throw new Error(`User with id ${input.id} not found`);
    }

    const updated: User = {
      ...user,
      name: input.name !== undefined ? input.name : user.name,
      avatar: input.avatar !== undefined ? input.avatar : user.avatar,
      data: input.data !== undefined ? { ...user.data, ...input.data } : user.data,
      updatedAt: Date.now(),
    };

    this.users.set(input.id, updated);
    this.saveToStorage();
    return updated;
  }

  delete(id: string): boolean {
    const deleted = this.users.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = Array.from(this.users.values());
      await this.storage.set(this.storageKey, data);
    } catch (error) {
      console.error('Failed to save users:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = await this.storage.get<User[]>(this.storageKey);
      if (data) {
        data.forEach((user) => this.users.set(user.id, user));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * GroupAPI - Manage groups
 */
export class GroupAPI {
  private storage: IStorage;
  private storageKey: string;
  private groups: Map<string, Group> = new Map();

  constructor(storage: IStorage, storageKey: string = 'groups') {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  async initialize(): Promise<void> {
    await this.loadFromStorage();
  }

  create(input: CreateGroupInput): Group {
    const now = Date.now();
    const group: Group = {
      id: input.id || this.generateId('group'),
      name: input.name,
      userIds: input.userIds || [],
      data: input.data || {},
      createdAt: now,
      updatedAt: now,
    };

    if (this.groups.has(group.id)) {
      throw new Error(`Group with id ${group.id} already exists`);
    }

    this.groups.set(group.id, group);
    this.saveToStorage();
    return group;
  }

  get(id: string): Group | null {
    return this.groups.get(id) || null;
  }

  getAll(): Group[] {
    return Array.from(this.groups.values());
  }

  update(input: UpdateGroupInput): Group {
    const group = this.groups.get(input.id);
    if (!group) {
      throw new Error(`Group with id ${input.id} not found`);
    }

    const updated: Group = {
      ...group,
      name: input.name !== undefined ? input.name : group.name,
      userIds: input.userIds !== undefined ? input.userIds : group.userIds,
      data: input.data !== undefined ? { ...group.data, ...input.data } : group.data,
      updatedAt: Date.now(),
    };

    this.groups.set(input.id, updated);
    this.saveToStorage();
    return updated;
  }

  delete(id: string): boolean {
    const deleted = this.groups.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  addUser(groupId: string, userId: string): Group {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group with id ${groupId} not found`);
    }

    if (!group.userIds.includes(userId)) {
      group.userIds.push(userId);
      group.updatedAt = Date.now();
      this.groups.set(groupId, group);
      this.saveToStorage();
    }

    return group;
  }

  removeUser(groupId: string, userId: string): Group {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group with id ${groupId} not found`);
    }

    const index = group.userIds.indexOf(userId);
    if (index > -1) {
      group.userIds.splice(index, 1);
      group.updatedAt = Date.now();
      this.groups.set(groupId, group);
      this.saveToStorage();
    }

    return group;
  }

  getGroupsByUser(userId: string): Group[] {
    return Array.from(this.groups.values()).filter((group) =>
      group.userIds.includes(userId)
    );
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = Array.from(this.groups.values());
      await this.storage.set(this.storageKey, data);
    } catch (error) {
      console.error('Failed to save groups:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = await this.storage.get<Group[]>(this.storageKey);
      if (data) {
        data.forEach((group) => this.groups.set(group.id, group));
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * MessageAPI - Manage messages
 */
export class MessageAPI {
  private storage: IStorage;
  private storageKey: string;
  private messages: Map<string, Message> = new Map();

  constructor(storage: IStorage, storageKey: string = 'messages') {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  async initialize(): Promise<void> {
    await this.loadFromStorage();
  }

  create(input: CreateMessageInput): Message {
    const now = Date.now();
    const message: Message = {
      id: input.id || this.generateId('msg'),
      text: input.text,
      userId: input.userId,
      groupId: input.groupId,
      timestamp: input.timestamp !== undefined ? input.timestamp : now,
      data: input.data || {},
      createdAt: now,
      updatedAt: now,
    };

    if (this.messages.has(message.id)) {
      throw new Error(`Message with id ${message.id} already exists`);
    }

    this.messages.set(message.id, message);
    this.saveToStorage();
    return message;
  }

  get(id: string): Message | null {
    return this.messages.get(id) || null;
  }

  getAll(): Message[] {
    return Array.from(this.messages.values());
  }

  query(options: QueryMessagesOptions = {}): Message[] {
    let messages = Array.from(this.messages.values());

    // Filter by group
    if (options.groupId) {
      messages = messages.filter((msg) => msg.groupId === options.groupId);
    }

    // Filter by user
    if (options.userId) {
      messages = messages.filter((msg) => msg.userId === options.userId);
    }

    // Sort
    const sortOrder = options.sortOrder || 'asc';
    messages.sort((a, b) => {
      return sortOrder === 'asc'
        ? a.timestamp - b.timestamp
        : b.timestamp - a.timestamp;
    });

    // Pagination
    if (options.offset !== undefined) {
      messages = messages.slice(options.offset);
    }
    if (options.limit !== undefined) {
      messages = messages.slice(0, options.limit);
    }

    return messages;
  }

  update(input: UpdateMessageInput): Message {
    const message = this.messages.get(input.id);
    if (!message) {
      throw new Error(`Message with id ${input.id} not found`);
    }

    const updated: Message = {
      ...message,
      text: input.text !== undefined ? input.text : message.text,
      timestamp: input.timestamp !== undefined ? input.timestamp : message.timestamp,
      data: input.data !== undefined ? { ...message.data, ...input.data } : message.data,
      updatedAt: Date.now(),
    };

    this.messages.set(input.id, updated);
    this.saveToStorage();
    return updated;
  }

  delete(id: string): boolean {
    const deleted = this.messages.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = Array.from(this.messages.values());
      await this.storage.set(this.storageKey, data);
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = await this.storage.get<Message[]>(this.storageKey);
      if (data) {
        data.forEach((message) => this.messages.set(message.id, message));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * LayoutAPI - Manage layout settings
 */
export class LayoutAPI {
  private storage: IStorage;
  private storageKey: string;
  private settings: Map<string, LayoutSettings> = new Map();

  constructor(storage: IStorage, storageKey: string = 'layout-settings') {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  async initialize(): Promise<void> {
    await this.loadFromStorage();
  }

  create(input: CreateLayoutSettingsInput): LayoutSettings {
    const now = Date.now();
    const settings: LayoutSettings = {
      id: input.id || this.generateId('layout'),
      type: input.type,
      ordering: input.ordering || [],
      data: input.data || {},
      createdAt: now,
      updatedAt: now,
    };

    if (this.settings.has(settings.id)) {
      throw new Error(`Layout settings with id ${settings.id} already exist`);
    }

    this.settings.set(settings.id, settings);
    this.saveToStorage();
    return settings;
  }

  get(id: string): LayoutSettings | null {
    return this.settings.get(id) || null;
  }

  getByType(type: 'user' | 'group' | 'message'): LayoutSettings[] {
    return Array.from(this.settings.values()).filter((s) => s.type === type);
  }

  getAll(): LayoutSettings[] {
    return Array.from(this.settings.values());
  }

  update(input: UpdateLayoutSettingsInput): LayoutSettings {
    const settings = this.settings.get(input.id);
    if (!settings) {
      throw new Error(`Layout settings with id ${input.id} not found`);
    }

    const updated: LayoutSettings = {
      ...settings,
      ordering: input.ordering !== undefined ? input.ordering : settings.ordering,
      data: input.data !== undefined ? { ...settings.data, ...input.data } : settings.data,
      updatedAt: Date.now(),
    };

    this.settings.set(input.id, updated);
    this.saveToStorage();
    return updated;
  }

  delete(id: string): boolean {
    const deleted = this.settings.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = Array.from(this.settings.values());
      await this.storage.set(this.storageKey, data);
    } catch (error) {
      console.error('Failed to save layout settings:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = await this.storage.get<LayoutSettings[]>(this.storageKey);
      if (data) {
        data.forEach((setting) => this.settings.set(setting.id, setting));
      }
    } catch (error) {
      console.error('Failed to load layout settings:', error);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * ChatService - Aggregate service for all chat operations
 */
export class ChatService {
  public users: UserAPI;
  public groups: GroupAPI;
  public messages: MessageAPI;
  public layout: LayoutAPI;

  constructor(storage: IStorage) {
    this.users = new UserAPI(storage);
    this.groups = new GroupAPI(storage);
    this.messages = new MessageAPI(storage);
    this.layout = new LayoutAPI(storage);
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.users.initialize(),
      this.groups.initialize(),
      this.messages.initialize(),
      this.layout.initialize(),
    ]);
  }

  // Helper methods for aggregate operations
  getMessagesWithUsers(groupId?: string): MessageWithUser[] {
    const messages = groupId
      ? this.messages.query({ groupId })
      : this.messages.getAll();

    return messages.map((msg) => ({
      ...msg,
      user: this.users.get(msg.userId)!,
    })).filter((msg) => msg.user); // Filter out messages with deleted users
  }

  getGroupsWithUsers(): GroupWithUsers[] {
    return this.groups.getAll().map((group) => ({
      ...group,
      users: group.userIds
        .map((id) => this.users.get(id))
        .filter((u): u is User => u !== null),
    }));
  }

  exportAll(): ChatData {
    return {
      users: this.users.getAll(),
      groups: this.groups.getAll(),
      messages: this.messages.getAll(),
      layoutSettings: this.layout.getAll(),
    };
  }

  async importAll(data: ChatData): Promise<void> {
    // Clear existing data
    this.users.getAll().forEach((u) => this.users.delete(u.id));
    this.groups.getAll().forEach((g) => this.groups.delete(g.id));
    this.messages.getAll().forEach((m) => this.messages.delete(m.id));
    this.layout.getAll().forEach((l) => this.layout.delete(l.id));

    // Import new data
    data.users.forEach((u) => this.users.create(u));
    data.groups.forEach((g) => this.groups.create(g));
    data.messages.forEach((m) => this.messages.create(m));
    data.layoutSettings.forEach((l) => this.layout.create(l));
  }
}

// ============================================================================
// FACTORY NAMESPACES
// ============================================================================

export namespace Users {
  export async function create(storage: IStorage, storageKey?: string): Promise<UserAPI> {
    const api = new UserAPI(storage, storageKey);
    await api.initialize();
    return api;
  }

  export async function createInMemory(storageKey?: string): Promise<UserAPI> {
    return create(new InMemoryStorage(), storageKey);
  }

  export async function createPersistent(storageKey?: string): Promise<UserAPI> {
    return create(new IndexedDBStorage({ dbName: 'chat-db' }), storageKey);
  }
}

export namespace Groups {
  export async function create(storage: IStorage, storageKey?: string): Promise<GroupAPI> {
    const api = new GroupAPI(storage, storageKey);
    await api.initialize();
    return api;
  }

  export async function createInMemory(storageKey?: string): Promise<GroupAPI> {
    return create(new InMemoryStorage(), storageKey);
  }

  export async function createPersistent(storageKey?: string): Promise<GroupAPI> {
    return create(new IndexedDBStorage({ dbName: 'chat-db' }), storageKey);
  }
}

export namespace Messages {
  export async function create(storage: IStorage, storageKey?: string): Promise<MessageAPI> {
    const api = new MessageAPI(storage, storageKey);
    await api.initialize();
    return api;
  }

  export async function createInMemory(storageKey?: string): Promise<MessageAPI> {
    return create(new InMemoryStorage(), storageKey);
  }

  export async function createPersistent(storageKey?: string): Promise<MessageAPI> {
    return create(new IndexedDBStorage({ dbName: 'chat-db' }), storageKey);
  }
}

export namespace Layout {
  export async function create(storage: IStorage, storageKey?: string): Promise<LayoutAPI> {
    const api = new LayoutAPI(storage, storageKey);
    await api.initialize();
    return api;
  }

  export async function createInMemory(storageKey?: string): Promise<LayoutAPI> {
    return create(new InMemoryStorage(), storageKey);
  }

  export async function createPersistent(storageKey?: string): Promise<LayoutAPI> {
    return create(new IndexedDBStorage({ dbName: 'chat-db' }), storageKey);
  }
}

export namespace Chat {
  export async function create(storage: IStorage): Promise<ChatService> {
    const service = new ChatService(storage);
    await service.initialize();
    return service;
  }

  export async function createInMemory(): Promise<ChatService> {
    return create(new InMemoryStorage());
  }

  export async function createPersistent(): Promise<ChatService> {
    return create(new IndexedDBStorage({ dbName: 'chat-db' }));
  }
}
