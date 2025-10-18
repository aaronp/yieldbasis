# D3.js Graph Visualization

A flexible graph visualization using D3.js with multiple layout algorithms.

## Technology

**D3.js** (Data-Driven Documents) is a JavaScript library for manipulating documents based on data. It provides powerful tools for creating any kind of data visualization with complete control over the final result.

## Features

- **Multiple Layout Algorithms**:
  - Force-Directed: Physics-based simulation for general graphs
  - Tree Layout: Hierarchical layout for tree structures
  - Radial Tree: Circular hierarchical layout
- **Interactive Nodes**: Drag nodes, click for details
- **Search**: Real-time node search with highlighting
- **Zoom/Pan**: Smooth navigation controls
- **Dataset Switching**: Load different graph datasets dynamically

## Running

```bash
make dev
```

This will install dependencies and start the development server on http://localhost:3001

## Tech Stack

- **D3.js** v7 - Data visualization library
- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling

## Implementation Details

### Layout Algorithms

**Force-Directed Layout**
- Uses D3's force simulation with:
  - Link force: Maintains edge lengths
  - Charge force: Nodes repel each other
  - Center force: Keeps graph centered
  - Collision force: Prevents node overlap
- Best for general network visualization
- Interactive: drag nodes to reposition

**Tree Layout**
- Hierarchical arrangement
- Attempts to find root nodes (no incoming edges or level 1)
- Best for organizational charts or dependency trees
- Falls back to force layout if no hierarchy detected

**Radial Tree Layout**
- Circular hierarchical layout
- Root at center, children radiate outward
- Visually appealing for hierarchies
- Good for showing levels/depths

### Interactivity

- **Node Dragging**: In force layout, drag nodes to fix positions
- **Highlighting**: Click nodes to highlight connections
- **Zoom/Pan**: Mouse wheel to zoom, drag background to pan
- **Search**: Filter nodes by any attribute

### Performance

D3 renders to SVG, which has different performance characteristics:
- Good performance up to ~500 nodes
- May slow down with 1000+ nodes
- Fine control over every visual element
- Easy to inspect/debug in browser DevTools

## Customization

Colors are assigned based on node groups using D3's built-in color schemes. Layout parameters (forces, spacing, etc.) can be adjusted in the simulation configuration.
