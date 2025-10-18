# Sigma.js Graph Visualization

A high-performance graph visualization using Sigma.js with WebGL rendering.

## Technology

**Sigma.js** is a JavaScript library dedicated to graph drawing, utilizing WebGL for rendering. It's optimized for large networks and provides smooth interactions even with thousands of nodes.

## Features

- **WebGL Rendering**: Hardware-accelerated graphics for superior performance
- **ForceAtlas2 Layout**: Physics-based layout algorithm for natural node positioning
- **Interactive Controls**: Click nodes to see details, drag to reposition
- **Search**: Real-time node search with highlighting
- **Zoom/Pan**: Smooth camera controls for navigation
- **Dataset Switching**: Load different graph datasets on the fly

## Running

```bash
make dev
```

This will install dependencies and start the development server on http://localhost:3000

## Tech Stack

- **Sigma.js** v3 - Graph rendering engine
- **Graphology** - Graph data structure library
- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling

## Implementation Details

### Graph Data Structure

Uses Graphology for the underlying graph data structure, which provides:
- Efficient node/edge operations
- Flexible attribute system
- Built-in graph algorithms

### Layout Algorithm

ForceAtlas2 is a force-directed layout algorithm that:
- Simulates physical forces between nodes
- Creates visually pleasing, organic layouts
- Reveals community structures in networks
- Can be stopped/started interactively

### Performance

Sigma.js uses WebGL, making it capable of handling:
- 1000+ nodes smoothly
- 10000+ edges with good performance
- Real-time layout calculations
- Smooth zoom/pan at 60fps

## Customization

Node colors are automatically assigned based on node groups (determined by `group`, `type`, or `department` attributes). Edge thickness and colors can be customized in the graph initialization.
