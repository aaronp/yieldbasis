# Vanilla SVG Graph Visualization

A lightweight graph visualization using pure SVG and TypeScript with no external graph libraries.

## Technology

**Vanilla SVG** - Direct manipulation of SVG elements using browser APIs. This approach has zero dependencies beyond the build tooling, giving you complete control and minimal bundle size.

## Features

- **Multiple Layout Algorithms**:
  - Circular: Nodes arranged in a circle
  - Grid: Nodes arranged in a grid pattern
  - Random: Nodes placed randomly
- **Interactive Nodes**: Drag nodes to reposition, click for details
- **Search**: Real-time node search with highlighting
- **No External Dependencies**: Pure TypeScript and SVG

## Running

```bash
make dev
```

This will install dependencies and start the development server on http://localhost:3002

## Tech Stack

- **Vanilla SVG** - Direct SVG manipulation
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling

## Implementation Details

### SVG Rendering

This implementation directly creates and manipulates SVG elements:
- Uses `document.createElementNS()` to create SVG elements
- Direct attribute manipulation for positioning and styling
- Event listeners on SVG elements for interactivity

### Layout Algorithms

**Circular Layout**
- Distributes nodes evenly around a circle
- Simple trigonometry for positioning
- Good for showing all nodes equally

**Grid Layout**
- Arranges nodes in a grid pattern
- Calculates optimal rows/columns based on node count
- Clean, organized appearance

**Random Layout**
- Randomly positions nodes within bounds
- Simple but can be chaotic
- Useful for initial positioning before manual adjustment

### Interactivity

- **Drag and Drop**: Implemented with mousedown/mousemove/mouseup events
- **Real-time Updates**: Edge positions update as nodes are dragged
- **Click Handlers**: Show node details and highlight connections
- **Search**: Linear search through node attributes

### Performance Characteristics

- **Optimal Range**: 10-50 nodes
- **Maximum Recommended**: 100 nodes
- **Render Method**: Direct DOM manipulation
- **No Physics**: All layouts are static (no force simulation)

### Advantages

1. **Zero Dependencies**: No library code in bundle
2. **Full Control**: Complete control over every aspect
3. **Simple Debugging**: Inspect SVG directly in DevTools
4. **Learning Tool**: Great for understanding graph visualization basics
5. **Predictable**: No complex library behaviors

### Limitations

1. **Manual Implementation**: Must implement all features yourself
2. **No Advanced Layouts**: No force-directed or hierarchical algorithms
3. **Performance**: Pure DOM manipulation slower than WebGL for large graphs
4. **More Code**: More code to maintain compared to using a library

## Code Structure

- Layout functions create position arrays
- Render function creates SVG elements from data
- Event handlers manage interactivity
- All code is self-contained and straightforward

This example demonstrates that you don't always need a heavy library - for simple use cases, vanilla SVG can be perfectly adequate.
