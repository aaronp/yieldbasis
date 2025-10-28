/**
 * Core data model types for production graph system
 */

export interface GraphNode {
  id: string;
  label: string;
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface QueryOptions {
  nodeId: string;
  depth: number;
  direction?: 'outbound' | 'inbound' | 'both'; // Default: 'both'
}

export interface QueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootNodeId: string;
  maxDepth: number;
}

export interface CreateNodeInput {
  label: string;
  data?: Record<string, any>;
  id?: string; // Optional - will be generated if not provided
}

export interface UpdateNodeInput {
  id: string;
  label?: string;
  data?: Record<string, any>;
}

export interface CreateEdgeInput {
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  data?: Record<string, any>;
  id?: string; // Optional - will be generated if not provided
}

export interface UpdateEdgeInput {
  id: string;
  fromNodeId?: string;
  toNodeId?: string;
  label?: string;
  data?: Record<string, any>;
}
