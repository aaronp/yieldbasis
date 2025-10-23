import * as d3 from 'd3';

/**
 * LayoutManager - Calculates node positions for different layout types
 */
export class LayoutManager {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  updateSize(width, height) {
    this.width = width;
    this.height = height;
  }

  /**
   * Calculate layout positions for a graph
   * @param {Object} graphData - { nodes, edges }
   * @param {string} layoutType - 'force', 'hierarchy', 'radial', 'circle', 'grid'
   * @param {Object} options - Layout-specific options
   * @returns {Map<string, {x, y}>} - Map of node IDs to positions
   */
  calculate(graphData, layoutType, options = {}) {
    switch (layoutType) {
      case 'force':
        return this.forceLayout(graphData, options);
      case 'hierarchy':
        return this.hierarchyLayout(graphData, options);
      case 'radial':
        return this.radialLayout(graphData, options);
      case 'circle':
        return this.circleLayout(graphData, options);
      case 'grid':
        return this.gridLayout(graphData, options);
      default:
        return this.forceLayout(graphData, options);
    }
  }

  /**
   * Force-directed layout using D3
   */
  forceLayout(graphData, options = {}) {
    const { nodes, edges } = graphData;
    const positions = new Map();

    // Create a copy of nodes with x, y if they don't exist
    const simNodes = nodes.map(n => ({
      ...n,
      x: n.x ?? this.width / 2 + (Math.random() - 0.5) * 100,
      y: n.y ?? this.height / 2 + (Math.random() - 0.5) * 100
    }));

    // Run simulation synchronously
    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(edges)
        .id(d => d.id)
        .distance(options.linkDistance ?? 80))
      .force('charge', d3.forceManyBody()
        .strength(options.chargeStrength ?? -300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide()
        .radius(options.collisionRadius ?? 30))
      .stop();

    // Run simulation iterations
    const iterations = options.iterations ?? 300;
    for (let i = 0; i < iterations; i++) {
      simulation.tick();
    }

    // Extract positions
    simNodes.forEach(node => {
      positions.set(node.id, { x: node.x, y: node.y });
    });

    return positions;
  }

  /**
   * Hierarchical tree layout
   */
  hierarchyLayout(graphData, options = {}) {
    const positions = new Map();
    const { nodes, edges } = graphData;

    // Build hierarchy from edges
    const root = this.buildHierarchy(graphData);
    if (!root) return this.circleLayout(graphData); // Fallback

    const treeLayout = d3.tree()
      .size([this.width - 100, this.height - 100])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

    const tree = treeLayout(root);

    tree.descendants().forEach(d => {
      positions.set(d.data.id, {
        x: d.y + 50, // Horizontal tree
        y: d.x + 50
      });
    });

    return positions;
  }

  /**
   * Radial tree layout
   */
  radialLayout(graphData, options = {}) {
    const positions = new Map();
    const root = this.buildHierarchy(graphData);
    if (!root) return this.circleLayout(graphData); // Fallback

    const radius = Math.min(this.width, this.height) / 2 - 100;
    const tree = d3.tree()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    const radialTree = tree(root);

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    radialTree.descendants().forEach(d => {
      const angle = d.x;
      const r = d.y;
      positions.set(d.data.id, {
        x: centerX + r * Math.cos(angle - Math.PI / 2),
        y: centerY + r * Math.sin(angle - Math.PI / 2)
      });
    });

    return positions;
  }

  /**
   * Circle layout - nodes arranged in a circle
   */
  circleLayout(graphData, options = {}) {
    const positions = new Map();
    const { nodes } = graphData;
    const radius = Math.min(this.width, this.height) / 2 - 100;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    });

    return positions;
  }

  /**
   * Grid layout - nodes arranged in a grid
   */
  gridLayout(graphData, options = {}) {
    const positions = new Map();
    const { nodes } = graphData;
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / cols);
    const cellWidth = (this.width - 100) / cols;
    const cellHeight = (this.height - 100) / rows;

    nodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.set(node.id, {
        x: 50 + col * cellWidth + cellWidth / 2,
        y: 50 + row * cellHeight + cellHeight / 2
      });
    });

    return positions;
  }

  /**
   * Build hierarchy from graph data (helper)
   */
  buildHierarchy(graphData) {
    const { nodes, edges } = graphData;

    // Find root nodes (nodes with no incoming edges)
    const incomingEdges = new Map();
    nodes.forEach(n => incomingEdges.set(n.id, 0));
    edges.forEach(e => {
      const targetId = typeof e.target === 'string' ? e.target : e.target.id;
      incomingEdges.set(targetId, (incomingEdges.get(targetId) || 0) + 1);
    });

    // Find root (node with 0 incoming edges)
    let rootId = null;
    for (const [id, count] of incomingEdges) {
      if (count === 0) {
        rootId = id;
        break;
      }
    }

    if (!rootId && nodes.length > 0) {
      rootId = nodes[0].id; // Fallback to first node
    }

    if (!rootId) return null;

    // Build tree recursively
    const visited = new Set();
    const buildNode = (nodeId) => {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (!node) return null;

      const children = edges
        .filter(e => {
          const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
          return sourceId === nodeId;
        })
        .map(e => {
          const targetId = typeof e.target === 'string' ? e.target : e.target.id;
          return buildNode(targetId);
        })
        .filter(Boolean);

      return {
        ...node,
        children: children.length > 0 ? children : undefined
      };
    };

    const rootData = buildNode(rootId);
    return rootData ? d3.hierarchy(rootData) : null;
  }
}
