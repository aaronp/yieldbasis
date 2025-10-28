# Model Architecture Summary

## Overview

Created a production-ready model layer architecture with:
- ✅ Storage abstraction (in-memory and IndexedDB)
- ✅ Domain-driven design (separate models and APIs)
- ✅ TypeScript factory namespaces for clean instantiation
- ✅ Separation of concerns (UI → Services → Storage)

## Structure

```
src/model/
├── storage.types.ts          # IStorage interface
├── storage.memory.ts          # In-memory implementation
├── storage.indexeddb.ts       # IndexedDB implementation
├── graph.model.ts             # Graph domain types
├── graph.api.ts               # Graph service + Graphs namespace
├── chat.model.ts              # Chat domain types (User, Group, Message, Layout)
├── chat.api.ts                # Chat services + factory namespaces
├── index.ts                   # Barrel exports
└── README.md                  # Comprehensive documentation
```

## Architecture Principles

### 1. Storage Abstraction Layer

All data persistence goes through the `IStorage` interface:

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

**Implementations:**
- `InMemoryStorage` - Fast, temporary (testing/demos)
- `IndexedDBStorage` - Persistent browser storage

### 2. Domain Models

Each domain has a `.model.ts` file with:
- Data types (interfaces)
- Input types for CRUD operations
- Aggregate types for complex queries

**Domains:**
- **Graph** - Nodes and edges with traversal
- **Chat** - Users, groups, messages, layout settings

### 3. API Services

Each domain has an `.api.ts` file with:
- Service class with CRUD methods
- Factory namespace with static creation methods
- Type-safe operations

**Pattern:**
```typescript
export class UserAPI {
  constructor(storage: IStorage, storageKey?: string) { }
  async initialize(): Promise<void> { }
  create(input: CreateUserInput): User { }
  get(id: string): User | null { }
  // ... more methods
}

export namespace Users {
  export async function create(storage: IStorage): Promise<UserAPI>
  export async function createInMemory(): Promise<UserAPI>
  export async function createPersistent(): Promise<UserAPI>
}
```

### 4. Factory Methods

Clean instantiation with TypeScript namespaces:

```typescript
// Graph API
import { Graphs } from './model';
const api = await Graphs.createPersistent('my-graph');

// Chat API (aggregate service)
import { Chat } from './model';
const chat = await Chat.createPersistent();

// Individual chat APIs
import { Users, Groups, Messages } from './model';
const users = await Users.createPersistent();
```

## Domain Details

### Graph Domain

**Models:**
- `GraphNode` - id, label, data, timestamps
- `GraphEdge` - id, fromNodeId, toNodeId, label, data, timestamps

**API Features:**
- CRUD for nodes and edges
- BFS graph traversal (`queryByDepth`)
- Direction control (outbound/inbound/both)
- Import/Export
- Statistics

**Factory:**
```typescript
namespace Graphs {
  create(storage, key?)
  createInMemory(key?)
  createPersistent(key?)
}
```

### Chat Domain

**Models:**
- `User` - id, name, avatar, data, timestamps
- `Group` - id, name, userIds[], data, timestamps
- `Message` - id, text, userId, groupId, timestamp, data, timestamps
- `LayoutSettings` - id, type, ordering[], data, timestamps

**API Services:**
- `UserAPI` - Manage users
- `GroupAPI` - Manage groups and memberships
- `MessageAPI` - Manage messages with querying
- `LayoutAPI` - Manage UI ordering/layout
- `ChatService` - Aggregate service for all chat operations

**Aggregate Methods:**
- `getMessagesWithUsers()` - Messages with user objects
- `getGroupsWithUsers()` - Groups with user arrays
- `exportAll()` / `importAll()` - Full data export/import

**Factory Namespaces:**
```typescript
namespace Users { create, createInMemory, createPersistent }
namespace Groups { create, createInMemory, createPersistent }
namespace Messages { create, createInMemory, createPersistent }
namespace Layout { create, createInMemory, createPersistent }
namespace Chat { create, createInMemory, createPersistent }
```

## Usage Patterns

### UI Component Pattern

```jsx
function MyComponent() {
  const [api, setApi] = useState(null);
  const [data, setData] = useState([]);

  useEffect(() => {
    const init = async () => {
      // Use factory method
      const service = await Chat.createPersistent();
      setApi(service);

      // Load data
      setData(service.users.getAll());
    };
    init();
  }, []);

  if (!api) return <div>Loading...</div>;

  return <div>{/* Use api.users, api.groups, etc */}</div>;
}
```

### Testing Pattern

```typescript
describe('Chat', () => {
  it('should create users', async () => {
    // Use in-memory for tests
    const chat = await Chat.createInMemory();

    const user = chat.users.create({ name: 'Test' });
    expect(user.name).toBe('Test');
  });
});
```

### Custom Storage Pattern

```typescript
import { CustomStorage } from './my-storage';
import { Graphs, Chat } from './model';

const storage = new CustomStorage();
const graphs = await Graphs.create(storage);
const chat = await Chat.create(storage);
```

## Migration Guide

### Old Graph API (localStorage only)

```typescript
// Before
import { GraphAPI } from '../lib/graph/GraphAPI';
const api = new GraphAPI('my-key');

// After
import { Graphs } from '../model';
const api = await Graphs.createPersistent('my-key');
```

### Adding Chat to Existing App

```typescript
import { Chat } from './model';

// Initialize
const chat = await Chat.createPersistent();

// Create data
const user = chat.users.create({ name: 'Alice' });
const group = chat.groups.create({ name: 'Team' });
chat.messages.create({
  text: 'Hello',
  userId: user.id,
  groupId: group.id
});

// Query with joins
const messages = chat.getMessagesWithUsers(group.id);
```

## Key Benefits

1. **Flexible Storage** - Swap between in-memory and IndexedDB
2. **Type Safety** - Full TypeScript support
3. **Clean APIs** - Intuitive factory methods
4. **Separation of Concerns** - UI uses services, not storage directly
5. **Testable** - Easy to use in-memory storage for tests
6. **Extensible** - Easy to add new storage implementations
7. **Production Ready** - Async initialization, error handling
8. **Import/Export** - Built-in data portability

## File Organization

```
src/
├── model/                     # NEW: All models and services
│   ├── storage.*.ts          # Storage layer
│   ├── graph.model.ts        # Graph types
│   ├── graph.api.ts          # Graph service
│   ├── chat.model.ts         # Chat types
│   ├── chat.api.ts           # Chat services
│   ├── index.ts              # Exports
│   └── README.md             # Documentation
├── lib/graph/                # OLD: Deprecated (keep for compatibility)
│   ├── GraphAPI.ts           # Old API (uses localStorage directly)
│   └── types.ts              # Moved to model/graph.model.ts
├── components/
│   ├── GraphEditor/          # Updated to use new API
│   └── TweenGraph/
└── examples/
    └── ChatAPIExample.jsx    # Full working example
```

## Next Steps

1. ✅ Update existing components to use new API
2. ✅ Create example components
3. 🔲 Add more storage implementations (e.g., remote API)
4. 🔲 Add optimistic updates
5. 🔲 Add real-time sync capabilities
6. 🔲 Add data validation/schemas
7. 🔲 Add migration utilities

## Examples

See:
- `src/model/README.md` - Complete API documentation
- `src/examples/ChatAPIExample.jsx` - Working React example
- `src/pages/GraphEditorPage.jsx` - Updated graph editor
