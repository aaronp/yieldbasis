import { IStorage } from './storage.types';
import { InMemoryStorage } from './storage.memory';
import { IndexedDBStorage } from './storage.indexeddb';
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
} from './graph.model';

/**
 * GraphAPI - Production-ready API for managing graph data
 */
export class GraphAPI {
  private storage: IStorage;
  private storageKey: string;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private nodeEdges: Map<string, Set<string>> = new Map();

  constructor(storage: IStorage, storageKey: string = 'graph-data') {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  async initialize(): Promise<void> {
    await this.loadFromStorage();
  }

  // ============================================================================
  // NODE OPERATIONS
  // ============================================================================

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

  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) || null;
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

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

  deleteNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    const edgeIds = this.nodeEdges.get(id);
    if (edgeIds) {
      edgeIds.forEach((edgeId) => {
        const edge = this.edges.get(edgeId);
        if (edge) {
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

  createEdge(input: CreateEdgeInput): GraphEdge {
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
    this.nodeEdges.get(input.fromNodeId)!.add(edge.id);
    this.nodeEdges.get(input.toNodeId)!.add(edge.id);

    this.saveToStorage();
    return edge;
  }

  getEdge(id: string): GraphEdge | null {
    return this.edges.get(id) || null;
  }

  getAllEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  getNodeEdges(nodeId: string): GraphEdge[] {
    const edgeIds = this.nodeEdges.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map((id) => this.edges.get(id)!).filter(Boolean);
  }

  updateEdge(input: UpdateEdgeInput): GraphEdge {
    const edge = this.edges.get(input.id);
    if (!edge) {
      throw new Error(`Edge with id ${input.id} not found`);
    }

    if (input.fromNodeId && !this.nodes.has(input.fromNodeId)) {
      throw new Error(`Source node ${input.fromNodeId} not found`);
    }
    if (input.toNodeId && !this.nodes.has(input.toNodeId)) {
      throw new Error(`Target node ${input.toNodeId} not found`);
    }

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

  deleteEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;

    this.nodeEdges.get(edge.fromNodeId)?.delete(id);
    this.nodeEdges.get(edge.toNodeId)?.delete(id);

    this.edges.delete(id);
    this.saveToStorage();
    return true;
  }

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  queryByDepth(options: QueryOptions): QueryResult {
    const { nodeId, depth, direction = 'both' } = options;

    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node with id ${nodeId} not found`);
    }

    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();
    const nodeDepths = new Map<string, number>();

    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
    nodeDepths.set(nodeId, 0);
    visitedNodes.add(nodeId);

    while (queue.length > 0) {
      const { id, depth: currentDepth } = queue.shift()!;

      if (currentDepth >= depth) continue;

      const edgeIds = this.nodeEdges.get(id);
      if (!edgeIds) continue;

      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

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

  getAllData(): GraphData {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
    };
  }

  clearAll(): void {
    this.nodes.clear();
    this.edges.clear();
    this.nodeEdges.clear();
    this.saveToStorage();
  }

  importData(data: GraphData): void {
    this.nodes.clear();
    this.edges.clear();
    this.nodeEdges.clear();

    data.nodes.forEach((node) => {
      this.nodes.set(node.id, node);
      this.nodeEdges.set(node.id, new Set());
    });

    data.edges.forEach((edge) => {
      if (this.nodes.has(edge.fromNodeId) && this.nodes.has(edge.toNodeId)) {
        this.edges.set(edge.id, edge);
        this.nodeEdges.get(edge.fromNodeId)!.add(edge.id);
        this.nodeEdges.get(edge.toNodeId)!.add(edge.id);
      }
    });

    this.saveToStorage();
  }

  exportData(): GraphData {
    return this.getAllData();
  }

  getStats() {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      avgDegree: this.nodes.size > 0 ? (this.edges.size * 2) / this.nodes.size : 0,
    };
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async saveToStorage(): Promise<void> {
    try {
      const data = this.exportData();
      await this.storage.set(this.storageKey, data);
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = await this.storage.get<GraphData>(this.storageKey);
      if (data) {
        this.importData(data);
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// FACTORY NAMESPACE
// ============================================================================

export namespace Graphs {
  export async function create(
    storage: IStorage,
    storageKey?: string
  ): Promise<GraphAPI> {
    const api = new GraphAPI(storage, storageKey);
    await api.initialize();
    return api;
  }

  export async function createInMemory(storageKey?: string): Promise<GraphAPI> {
    return create(new InMemoryStorage(), storageKey);
  }

  export async function createPersistent(storageKey?: string): Promise<GraphAPI> {
    return create(new IndexedDBStorage({ dbName: 'graphs-db' }), storageKey);
  }
}
