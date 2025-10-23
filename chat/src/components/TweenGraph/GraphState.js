/**
 * GraphState - Manages graph data (nodes, edges) and tracks changes
 */
export class GraphState {
  constructor(initialData = { nodes: [], edges: [] }) {
    this.nodes = new Map(initialData.nodes.map(n => [n.id, { ...n }]));
    this.edges = initialData.edges.map(e => ({ ...e }));
    this.listeners = new Set();
  }

  // Subscribe to changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  notify(change) {
    this.listeners.forEach(listener => listener(change));
  }

  // Get current graph data
  getData() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges]
    };
  }

  // Add node
  addNode(node) {
    if (!node.id) throw new Error("Node must have an id");
    this.nodes.set(node.id, { ...node });
    this.notify({ type: 'node-added', node: { ...node } });
  }

  // Remove node
  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    this.nodes.delete(nodeId);
    this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    this.notify({ type: 'node-removed', nodeId, node });
  }

  // Add edge
  addEdge(edge) {
    if (!edge.source || !edge.target) throw new Error("Edge must have source and target");
    this.edges.push({ ...edge });
    this.notify({ type: 'edge-added', edge: { ...edge } });
  }

  // Remove edge
  removeEdge(sourceId, targetId) {
    const index = this.edges.findIndex(e => e.source === sourceId && e.target === targetId);
    if (index === -1) return;

    const edge = this.edges[index];
    this.edges.splice(index, 1);
    this.notify({ type: 'edge-removed', edge });
  }

  // Update node
  updateNode(nodeId, updates) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    Object.assign(node, updates);
    this.notify({ type: 'node-updated', nodeId, updates });
  }

  // Load new data
  loadData(data) {
    this.nodes = new Map(data.nodes.map(n => [n.id, { ...n }]));
    this.edges = data.edges.map(e => ({ ...e }));
    this.notify({ type: 'data-loaded', data: this.getData() });
  }
}
