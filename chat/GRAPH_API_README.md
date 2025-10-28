# Graph API & Editor

Production-ready graph data model and visualization system.

## Architecture

```
GraphAPI (data layer)
    ↓
GraphEditor (CRUD interface)
    ↓
TweenGraphVisualization (D3 + GSAP rendering)
```

## Core Components

### 1. GraphAPI (`src/lib/graph/GraphAPI.ts`)

Production graph database with CRUD operations and localStorage persistence.

**Node Operations:**
- `createNode({ label, data })` - Create node with JSON data
- `getNode(id)` - Get node by ID
- `updateNode({ id, label, data })` - Update node
- `deleteNode(id)` - Delete node and connected edges
- `getAllNodes()` - Get all nodes

**Edge Operations:**
- `createEdge({ fromNodeId, toNodeId, label, data })` - Create edge
- `getEdge(id)` - Get edge by ID
- `updateEdge({ id, fromNodeId, toNodeId, label, data })` - Update edge
- `deleteEdge(id)` - Delete edge
- `getAllEdges()` - Get all edges
- `getNodeEdges(nodeId)` - Get edges for a node

**Query Operations:**
- `queryByDepth({ nodeId, depth, direction })` - BFS graph traversal
  - `direction`: 'outbound' | 'inbound' | 'both'
  - Returns: `{ nodes, edges, rootNodeId, maxDepth }`

**Data Management:**
- `importData(data)` - Import graph from JSON
- `exportData()` - Export graph to JSON
- `clearAll()` - Clear all data
- `getStats()` - Get graph statistics

### 2. Data Model (`src/lib/graph/types.ts`)

```typescript
interface GraphNode {
  id: string;
  label: string;
  data: Record<string, any>;  // Arbitrary JSON
  createdAt: number;
  updatedAt: number;
}

interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  data: Record<string, any>;  // Arbitrary JSON
  createdAt: number;
  updatedAt: number;
}
```

### 3. GraphEditor (`src/components/GraphEditor/`)

Interactive editor with:
- Create/update/delete nodes with JSON metadata
- Create/update/delete edges with labels
- Query interface (depth-based graph traversal)
- Import/export JSON
- Sample data loader
- Real-time statistics

### 4. TweenGraphVisualization (`src/components/TweenGraphVisualization/`)

Graph renderer with:
- **5 Layout Algorithms** (D3.js):
  - Force-directed (physics simulation)
  - Hierarchy (tree layout)
  - Radial (radial tree)
  - Circle (circular arrangement)
  - Grid (grid layout)
- **GSAP Animations**: Smooth transitions between layouts
- **Focus Mode**: Click nodes to focus with depth filtering
- **Pan/Zoom**: Mouse drag and scroll
- Real-time sync with GraphAPI

### 5. GraphEditorPage (`src/pages/GraphEditorPage.jsx`)

Integrated page with:
- Split view (editor + visualization)
- View mode toggle (editor/split/graph)
- Bidirectional sync

## Usage

### Initialize API

```javascript
import { GraphAPI } from './lib/graph/GraphAPI';

const api = new GraphAPI('my-graph-data'); // localStorage key
```

### Create Graph Data

```javascript
// Create nodes
const alice = api.createNode({
  label: 'Alice',
  data: { role: 'Developer', team: 'backend' }
});

const bob = api.createNode({
  label: 'Bob',
  data: { role: 'Designer', team: 'frontend' }
});

// Create edge
api.createEdge({
  fromNodeId: alice.id,
  toNodeId: bob.id,
  label: 'works with',
  data: { frequency: 'daily' }
});
```

### Query Graph

```javascript
// Get nodes within 2 hops of Alice (both directions)
const result = api.queryByDepth({
  nodeId: alice.id,
  depth: 2,
  direction: 'both'
});

console.log(result.nodes); // All nodes within 2 hops
console.log(result.edges); // All edges connecting those nodes
```

### Export/Import

```javascript
// Export
const data = api.exportData();
const json = JSON.stringify(data, null, 2);

// Import
api.importData(JSON.parse(json));
```

## Access

Visit `/editor` to use the interactive graph editor and visualizer.

## Features

- ✅ Type-safe data model
- ✅ Production-ready CRUD API
- ✅ Persistent storage (localStorage)
- ✅ BFS graph traversal with depth control
- ✅ Bidirectional/directional edge queries
- ✅ Rich metadata support (arbitrary JSON)
- ✅ 5 D3 layout algorithms
- ✅ Smooth GSAP animations
- ✅ Interactive visualization
- ✅ Import/export JSON

## Libraries Used

- **Data**: TypeScript, localStorage
- **Layout**: D3.js (d3-force, d3-hierarchy, d3-tree)
- **Animation**: GSAP (GreenSock)
- **Rendering**: Canvas 2D API
- **UI**: React, Tailwind CSS
