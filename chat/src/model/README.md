# Model Layer Architecture

This directory contains all domain models and API services following the convention:
- `<domain>.model.ts` - Type definitions and interfaces
- `<domain>.api.ts` - Service classes and factory methods
- `storage.*` - Storage abstraction layer

## Storage Layer

### IStorage Interface

All APIs use the `IStorage` interface for persistence:

```typescript
interface IStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}
```

### Implementations

1. **InMemoryStorage** - Fast, temporary storage (for testing/demos)
2. **IndexedDBStorage** - Persistent browser storage

## Domain APIs

### 1. Graph API

Manage nodes and edges with graph traversal capabilities.

#### Factory Methods

```typescript
import { Graphs } from './model';

// In-memory (temporary)
const graphApi = await Graphs.createInMemory('my-graph');

// IndexedDB (persistent)
const graphApi = await Graphs.createPersistent('my-graph');

// Custom storage
const graphApi = await Graphs.create(customStorage, 'my-graph');
```

#### Usage Example

```typescript
// Create nodes
const alice = graphApi.createNode({
  label: 'Alice',
  data: { role: 'Developer', team: 'Backend' }
});

const bob = graphApi.createNode({
  label: 'Bob',
  data: { role: 'Designer', team: 'Frontend' }
});

// Create edge
graphApi.createEdge({
  fromNodeId: alice.id,
  toNodeId: bob.id,
  label: 'works with',
  data: { frequency: 'daily' }
});

// Query graph (BFS traversal)
const result = graphApi.queryByDepth({
  nodeId: alice.id,
  depth: 2,
  direction: 'both' // 'outbound' | 'inbound' | 'both'
});

console.log(result.nodes); // All nodes within 2 hops
console.log(result.edges); // All edges connecting those nodes

// Update node
graphApi.updateNode({
  id: alice.id,
  data: { status: 'online' }
});

// Export/Import
const data = graphApi.exportData();
graphApi.importData(data);
```

### 2. Chat API

Manage users, groups, messages, and layout settings.

#### Factory Methods

```typescript
import { Chat, Users, Groups, Messages, Layout } from './model';

// Complete chat service (recommended)
const chatService = await Chat.createPersistent();

// Or individual services
const userApi = await Users.createPersistent();
const groupApi = await Groups.createPersistent();
const messageApi = await Messages.createPersistent();
const layoutApi = await Layout.createPersistent();
```

#### Usage Example

```typescript
// Create chat service
const chat = await Chat.createPersistent();

// Create users
const alice = chat.users.create({
  name: 'Alice',
  avatar: 'https://example.com/alice.jpg',
  data: { status: 'online' }
});

const bob = chat.users.create({
  name: 'Bob',
  avatar: 'https://example.com/bob.jpg'
});

// Create group
const group = chat.groups.create({
  name: 'Team Chat',
  userIds: [alice.id, bob.id]
});

// Send messages
chat.messages.create({
  text: 'Hello team!',
  userId: alice.id,
  groupId: group.id
});

chat.messages.create({
  text: 'Hi Alice!',
  userId: bob.id,
  groupId: group.id,
  timestamp: Date.now()
});

// Query messages
const messages = chat.messages.query({
  groupId: group.id,
  sortOrder: 'asc',
  limit: 50
});

// Get messages with user info (aggregate)
const messagesWithUsers = chat.getMessagesWithUsers(group.id);

// Get groups with user info (aggregate)
const groupsWithUsers = chat.getGroupsWithUsers();

// Layout settings for ordering
const userLayout = chat.layout.create({
  type: 'user',
  ordering: [alice.id, bob.id] // Display order
});

// Update ordering
chat.layout.update({
  id: userLayout.id,
  ordering: [bob.id, alice.id] // Reorder
});

// Export all chat data
const chatData = chat.exportAll();

// Import all chat data
await chat.importAll(chatData);
```

### 3. Individual API Usage

If you only need specific functionality:

```typescript
import { Users, Groups, Messages, Layout, InMemoryStorage } from './model';

// Create storage instance (shared across APIs)
const storage = new InMemoryStorage();

// Create individual APIs
const users = await Users.create(storage);
const groups = await Groups.create(storage);
const messages = await Messages.create(storage);

// Use them independently
const user = users.create({ name: 'Alice' });
const group = groups.create({
  name: 'Developers',
  userIds: [user.id]
});
```

## React Component Integration

### Example: Using in React Components

```jsx
import { useState, useEffect } from 'react';
import { Chat } from './model';

function ChatApp() {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);

  // Initialize service
  useEffect(() => {
    const init = async () => {
      const service = await Chat.createPersistent();
      setChat(service);

      // Load messages
      const msgs = service.getMessagesWithUsers();
      setMessages(msgs);
    };
    init();
  }, []);

  const sendMessage = async (text, userId, groupId) => {
    if (!chat) return;

    chat.messages.create({ text, userId, groupId });

    // Refresh messages
    const msgs = chat.getMessagesWithUsers(groupId);
    setMessages(msgs);
  };

  if (!chat) return <div>Loading...</div>;

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>{msg.user.name}:</strong> {msg.text}
        </div>
      ))}
    </div>
  );
}
```

## Storage Options

### Switch Between Storage Types

```typescript
// Development/Testing - In-memory
const devChat = await Chat.createInMemory();

// Production - IndexedDB
const prodChat = await Chat.createPersistent();

// Custom storage implementation
import { CustomStorage } from './my-storage';
const customChat = await Chat.create(new CustomStorage());
```

### Multiple Storage Databases

```typescript
import { IndexedDBStorage, Graphs } from './model';

// Separate databases for different purposes
const graphStorage = new IndexedDBStorage({ dbName: 'graphs-db' });
const chatStorage = new IndexedDBStorage({ dbName: 'chat-db' });

const graphs = await Graphs.create(graphStorage, 'main-graph');
const chat = await Chat.create(chatStorage);
```

## Data Models

### Graph Models

- `GraphNode` - id, label, data (JSON), timestamps
- `GraphEdge` - id, fromNodeId, toNodeId, label, data, timestamps

### Chat Models

- `User` - id, name, avatar, data, timestamps
- `Group` - id, name, userIds[], data, timestamps
- `Message` - id, text, userId, groupId, timestamp, data, timestamps
- `LayoutSettings` - id, type, ordering[], data, timestamps

### Aggregate Models

- `MessageWithUser` - Message + User object
- `GroupWithUsers` - Group + User[] objects
- `GraphData` - nodes[] + edges[]
- `ChatData` - users[] + groups[] + messages[] + layoutSettings[]

## Best Practices

1. **Use factory methods** - They handle initialization automatically
2. **Choose the right storage** - InMemory for tests, IndexedDB for production
3. **Use aggregate services** - ChatService for related APIs
4. **Handle async initialization** - All factory methods are async
5. **Export/Import for backups** - Use exportData/importData methods
6. **Type safety** - All models are fully typed with TypeScript

## Testing

```typescript
import { Graphs, Chat, InMemoryStorage } from './model';

describe('Graph API', () => {
  it('should create and query nodes', async () => {
    const graph = await Graphs.createInMemory('test');

    const node = graph.createNode({ label: 'Test' });
    expect(graph.getNode(node.id)).toBeTruthy();
  });
});

describe('Chat API', () => {
  it('should create users and messages', async () => {
    const chat = await Chat.createInMemory();

    const user = chat.users.create({ name: 'Alice' });
    const group = chat.groups.create({ name: 'Test' });
    const msg = chat.messages.create({
      text: 'Hello',
      userId: user.id,
      groupId: group.id
    });

    expect(msg.text).toBe('Hello');
  });
});
```

## Migration from Old API

```typescript
// Old way (localStorage only)
import { GraphAPI } from '../lib/graph/GraphAPI';
const api = new GraphAPI('my-graph');

// New way (flexible storage)
import { Graphs } from './model';
const api = await Graphs.createPersistent('my-graph');
```

The new API is fully backward compatible, just needs async initialization.
