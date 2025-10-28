import {
  GraphNode,
  GraphEdge,
  GraphData,
  CreateNodeInput,
  UpdateNodeInput,
  CreateEdgeInput,
  UpdateEdgeInput,
  QueryOptions,
  QueryResult,
} from './types';

/**
 * GraphAPI - Production-ready API for managing graph data
 */
export class GraphAPI {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private nodeEdges: Map<string, Set<string>> = new Map(); // nodeId -> edgeIds for fast lookups
  private storageKey: string;

  constructor(storageKey: string = 'graph-data') {
    this.storageKey = storageKey;
    this.loadFromStorage();
  }

  // ============================================================================
  // NODE OPERATIONS
  // ============================================================================

  /**
   * Create a new node
   */
  createNode(input: CreateNodeInput): GraphNode {
    const now = Date.now();
    const node: GraphNode = {
      id: input.id || this.generateId('node'),
      label: input.label,
      data: input.data || {},
      createdAt: now,
      updatedAt: now,
    };

    if (this.nodes.has(node.id)) {
      throw new Error(`Node with id ${node.id} already exists`);
    }

    this.nodes.set(node.id, node);
    this.nodeEdges.set(node.id, new Set());
    this.saveToStorage();
    return node;
  }

  /**
   * Get a node by id
   */
  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) || null;
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Update a node
   */
  updateNode(input: UpdateNodeInput): GraphNode {
    const node = this.nodes.get(input.id);
    if (!node) {
      throw new Error(`Node with id ${input.id} not found`);
    }

    const updated: GraphNode = {
      ...node,
      label: input.label !== undefined ? input.label : node.label,
      data: input.data !== undefined ? { ...node.data, ...input.data } : node.data,
      updatedAt: Date.now(),
    };

    this.nodes.set(input.id, updated);
    this.saveToStorage();
    return updated;
  }

  /**
   * Delete a node and all connected edges
   */
  deleteNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Delete all connected edges
    const edgeIds = this.nodeEdges.get(id);
    if (edgeIds) {
      edgeIds.forEach((edgeId) => {
        const edge = this.edges.get(edgeId);
        if (edge) {
          // Remove edge from other node's edge set
          const otherNodeId = edge.fromNodeId === id ? edge.toNodeId : edge.fromNodeId;
          this.nodeEdges.get(otherNodeId)?.delete(edgeId);
        }
        this.edges.delete(edgeId);
      });
    }

    this.nodes.delete(id);
    this.nodeEdges.delete(id);
    this.saveToStorage();
    return true;
  }

  // ============================================================================
  // EDGE OPERATIONS
  // ============================================================================

  /**
   * Create a new edge
   */
  createEdge(input: CreateEdgeInput): GraphEdge {
    // Validate nodes exist
    if (!this.nodes.has(input.fromNodeId)) {
      throw new Error(`Source node ${input.fromNodeId} not found`);
    }
    if (!this.nodes.has(input.toNodeId)) {
      throw new Error(`Target node ${input.toNodeId} not found`);
    }

    const now = Date.now();
    const edge: GraphEdge = {
      id: input.id || this.generateId('edge'),
      fromNodeId: input.fromNodeId,
      toNodeId: input.toNodeId,
      label: input.label,
      data: input.data || {},
      createdAt: now,
      updatedAt: now,
    };

    if (this.edges.has(edge.id)) {
      throw new Error(`Edge with id ${edge.id} already exists`);
    }

    this.edges.set(edge.id, edge);

    // Update node-edge index
    this.nodeEdges.get(input.fromNodeId)!.add(edge.id);
    this.nodeEdges.get(input.toNodeId)!.add(edge.id);

    this.saveToStorage();
    return edge;
  }

  /**
   * Get an edge by id
   */
  getEdge(id: string): GraphEdge | null {
    return this.edges.get(id) || null;
  }

  /**
   * Get all edges
   */
  getAllEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get edges connected to a node
   */
  getNodeEdges(nodeId: string): GraphEdge[] {
    const edgeIds = this.nodeEdges.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map((id) => this.edges.get(id)!).filter(Boolean);
  }

  /**
   * Update an edge
   */
  updateEdge(input: UpdateEdgeInput): GraphEdge {
    const edge = this.edges.get(input.id);
    if (!edge) {
      throw new Error(`Edge with id ${input.id} not found`);
    }

    // If changing nodes, validate they exist
    if (input.fromNodeId && !this.nodes.has(input.fromNodeId)) {
      throw new Error(`Source node ${input.fromNodeId} not found`);
    }
    if (input.toNodeId && !this.nodes.has(input.toNodeId)) {
      throw new Error(`Target node ${input.toNodeId} not found`);
    }

    // Update node-edge index if nodes changed
    const oldFromId = edge.fromNodeId;
    const oldToId = edge.toNodeId;
    const newFromId = input.fromNodeId || oldFromId;
    const newToId = input.toNodeId || oldToId;

    if (oldFromId !== newFromId) {
      this.nodeEdges.get(oldFromId)?.delete(input.id);
      this.nodeEdges.get(newFromId)?.add(input.id);
    }
    if (oldToId !== newToId) {
      this.nodeEdges.get(oldToId)?.delete(input.id);
      this.nodeEdges.get(newToId)?.add(input.id);
    }

    const updated: GraphEdge = {
      ...edge,
      fromNodeId: newFromId,
      toNodeId: newToId,
      label: input.label !== undefined ? input.label : edge.label,
      data: input.data !== undefined ? { ...edge.data, ...input.data } : edge.data,
      updatedAt: Date.now(),
    };

    this.edges.set(input.id, updated);
    this.saveToStorage();
    return updated;
  }

  /**
   * Delete an edge
   */
  deleteEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;

    // Remove from node-edge index
    this.nodeEdges.get(edge.fromNodeId)?.delete(id);
    this.nodeEdges.get(edge.toNodeId)?.delete(id);

    this.edges.delete(id);
    this.saveToStorage();
    return true;
  }

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  /**
   * Query nodes by depth from a starting node
   */
  queryByDepth(options: QueryOptions): QueryResult {
    const { nodeId, depth, direction = 'both' } = options;

    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node with id ${nodeId} not found`);
    }

    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();
    const nodeDepths = new Map<string, number>();

    // BFS to find nodes within depth
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
    nodeDepths.set(nodeId, 0);
    visitedNodes.add(nodeId);

    while (queue.length > 0) {
      const { id, depth: currentDepth } = queue.shift()!;

      if (currentDepth >= depth) continue;

      // Get connected edges
      const edgeIds = this.nodeEdges.get(id);
      if (!edgeIds) continue;

      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

        // Determine next node based on direction
        let nextNodeId: string | null = null;

        if (direction === 'outbound' && edge.fromNodeId === id) {
          nextNodeId = edge.toNodeId;
        } else if (direction === 'inbound' && edge.toNodeId === id) {
          nextNodeId = edge.fromNodeId;
        } else if (direction === 'both') {
          nextNodeId = edge.fromNodeId === id ? edge.toNodeId : edge.fromNodeId;
        }

        if (nextNodeId && !visitedNodes.has(nextNodeId)) {
          visitedNodes.add(nextNodeId);
          nodeDepths.set(nextNodeId, currentDepth + 1);
          queue.push({ id: nextNodeId, depth: currentDepth + 1 });
        }

        // Add edge if it connects visited nodes
        if (visitedNodes.has(edge.fromNodeId) && visitedNodes.has(edge.toNodeId)) {
          visitedEdges.add(edgeId);
        }
      }
    }

    return {
      nodes: Array.from(visitedNodes).map((id) => this.nodes.get(id)!),
      edges: Array.from(visitedEdges).map((id) => this.edges.get(id)!),
      rootNodeId: nodeId,
      maxDepth: depth,
    };
  }

  /**
   * Get all graph data
   */
  getAllData(): GraphData {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
    };
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.nodes.clear();
    this.edges.clear();
    this.nodeEdges.clear();
    this.saveToStorage();
  }

  /**
   * Import graph data
   */
  importData(data: GraphData): void {
    this.nodes.clear();
    this.edges.clear();
    this.nodeEdges.clear();

    // Import nodes
    data.nodes.forEach((node) => {
      this.nodes.set(node.id, node);
      this.nodeEdges.set(node.id, new Set());
    });

    // Import edges
    data.edges.forEach((edge) => {
      if (this.nodes.has(edge.fromNodeId) && this.nodes.has(edge.toNodeId)) {
        this.edges.set(edge.id, edge);
        this.nodeEdges.get(edge.fromNodeId)!.add(edge.id);
        this.nodeEdges.get(edge.toNodeId)!.add(edge.id);
      }
    });

    this.saveToStorage();
  }

  /**
   * Export graph data
   */
  exportData(): GraphData {
    return this.getAllData();
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private saveToStorage(): void {
    try {
      const data = this.exportData();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored) as GraphData;
        this.importData(data);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics about the graph
   */
  getStats() {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      avgDegree: this.nodes.size > 0 ? (this.edges.size * 2) / this.nodes.size : 0,
    };
  }
}
