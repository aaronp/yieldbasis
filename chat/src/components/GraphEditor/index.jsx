import React, { useState, useEffect } from "react";
import { GraphAPI } from "../../lib/graph/GraphAPI";

export default function GraphEditor({ api, onDataChange }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  // Node form state
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeData, setNodeData] = useState("{}");

  // Edge form state
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [edgeData, setEdgeData] = useState("{}");

  // Query state
  const [queryNodeId, setQueryNodeId] = useState("");
  const [queryDepth, setQueryDepth] = useState(2);
  const [queryDirection, setQueryDirection] = useState("both");

  const refreshData = () => {
    setNodes(api.getAllNodes());
    setEdges(api.getAllEdges());
    if (onDataChange) onDataChange();
  };

  useEffect(() => {
    refreshData();
  }, []);

  // ============================================================================
  // NODE OPERATIONS
  // ============================================================================

  const handleCreateNode = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(nodeData);
      api.createNode({ label: nodeLabel, data });
      setNodeLabel("");
      setNodeData("{}");
      refreshData();
    } catch (error) {
      alert(`Error creating node: ${error.message}`);
    }
  };

  const handleUpdateNode = () => {
    if (!selectedNodeId) return;
    try {
      const data = JSON.parse(nodeData);
      api.updateNode({ id: selectedNodeId, label: nodeLabel, data });
      setSelectedNodeId(null);
      setNodeLabel("");
      setNodeData("{}");
      refreshData();
    } catch (error) {
      alert(`Error updating node: ${error.message}`);
    }
  };

  const handleDeleteNode = (nodeId) => {
    if (!confirm(`Delete node ${nodeId}?`)) return;
    api.deleteNode(nodeId);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setNodeLabel("");
      setNodeData("{}");
    }
    refreshData();
  };

  const handleSelectNode = (node) => {
    setSelectedNodeId(node.id);
    setNodeLabel(node.label);
    setNodeData(JSON.stringify(node.data, null, 2));
  };

  const handleCancelNodeEdit = () => {
    setSelectedNodeId(null);
    setNodeLabel("");
    setNodeData("{}");
  };

  // ============================================================================
  // EDGE OPERATIONS
  // ============================================================================

  const handleCreateEdge = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(edgeData);
      api.createEdge({
        fromNodeId: edgeFrom,
        toNodeId: edgeTo,
        label: edgeLabel || undefined,
        data,
      });
      setEdgeFrom("");
      setEdgeTo("");
      setEdgeLabel("");
      setEdgeData("{}");
      refreshData();
    } catch (error) {
      alert(`Error creating edge: ${error.message}`);
    }
  };

  const handleDeleteEdge = (edgeId) => {
    if (!confirm(`Delete edge ${edgeId}?`)) return;
    api.deleteEdge(edgeId);
    refreshData();
  };

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  const handleQuery = () => {
    try {
      const result = api.queryByDepth({
        nodeId: queryNodeId,
        depth: queryDepth,
        direction: queryDirection,
      });
      alert(
        `Query Result:\n` +
        `Nodes: ${result.nodes.length}\n` +
        `Edges: ${result.edges.length}\n` +
        `Root: ${result.rootNodeId}\n` +
        `Max Depth: ${result.maxDepth}\n\n` +
        `Node IDs: ${result.nodes.map((n) => n.label).join(", ")}`
      );
    } catch (error) {
      alert(`Error querying: ${error.message}`);
    }
  };

  // ============================================================================
  // DATA OPERATIONS
  // ============================================================================

  const handleExport = () => {
    const data = api.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `graph-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          api.importData(data);
          refreshData();
          alert("Data imported successfully!");
        } catch (error) {
          alert(`Failed to import: ${error.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClear = () => {
    if (!confirm("Clear all data?")) return;
    api.clearAll();
    refreshData();
  };

  const handleLoadSample = () => {
    api.clearAll();

    // Create sample nodes
    const nodeA = api.createNode({ label: "Alice", data: { role: "Developer" } });
    const nodeB = api.createNode({ label: "Bob", data: { role: "Designer" } });
    const nodeC = api.createNode({ label: "Carol", data: { role: "Manager" } });
    const nodeD = api.createNode({ label: "Dave", data: { role: "Developer" } });
    const nodeE = api.createNode({ label: "Eve", data: { role: "QA" } });

    // Create sample edges
    api.createEdge({ fromNodeId: nodeA.id, toNodeId: nodeB.id, label: "works with" });
    api.createEdge({ fromNodeId: nodeA.id, toNodeId: nodeC.id, label: "reports to" });
    api.createEdge({ fromNodeId: nodeB.id, toNodeId: nodeC.id, label: "reports to" });
    api.createEdge({ fromNodeId: nodeC.id, toNodeId: nodeD.id, label: "manages" });
    api.createEdge({ fromNodeId: nodeD.id, toNodeId: nodeE.id, label: "works with" });

    refreshData();
  };

  const stats = api.getStats();

  return (
    <div className="flex h-full">
      {/* Left Panel - Forms */}
      <div className="w-96 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-y-auto">
        <div className="p-4">
          <h2 className="text-xl font-bold text-white mb-4">Graph Editor</h2>

          {/* Stats */}
          <div className="mb-6 p-3 bg-zinc-800 rounded-md text-sm text-zinc-300">
            <div className="flex justify-between">
              <span>Nodes:</span>
              <span className="text-white font-semibold">{stats.nodeCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Edges:</span>
              <span className="text-white font-semibold">{stats.edgeCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Degree:</span>
              <span className="text-white font-semibold">{stats.avgDegree.toFixed(2)}</span>
            </div>
          </div>

          {/* Create/Update Node */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">
              {selectedNodeId ? "Update Node" : "Create Node"}
            </h3>
            <form onSubmit={handleCreateNode} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Label</label>
                <input
                  type="text"
                  value={nodeLabel}
                  onChange={(e) => setNodeLabel(e.target.value)}
                  placeholder="Node label"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Data (JSON)</label>
                <textarea
                  value={nodeData}
                  onChange={(e) => setNodeData(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                {selectedNodeId ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUpdateNode}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition text-sm"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelNodeEdit}
                      className="px-4 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 transition text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                  >
                    Create Node
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Create Edge */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Create Edge</h3>
            <form onSubmit={handleCreateEdge} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">From Node</label>
                  <select
                    value={edgeFrom}
                    onChange={(e) => setEdgeFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select...</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">To Node</label>
                  <select
                    value={edgeTo}
                    onChange={(e) => setEdgeTo(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select...</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={edgeLabel}
                  onChange={(e) => setEdgeLabel(e.target.value)}
                  placeholder="Edge label"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Data (JSON)</label>
                <textarea
                  value={edgeData}
                  onChange={(e) => setEdgeData(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
              >
                Create Edge
              </button>
            </form>
          </div>

          {/* Query */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Query Graph</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Node</label>
                <select
                  value={queryNodeId}
                  onChange={(e) => setQueryNodeId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Depth</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={queryDepth}
                    onChange={(e) => setQueryDepth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Direction</label>
                  <select
                    value={queryDirection}
                    onChange={(e) => setQueryDirection(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="both">Both</option>
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleQuery}
                disabled={!queryNodeId}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition text-sm disabled:opacity-50"
              >
                Run Query
              </button>
            </div>
          </div>

          {/* Data Management */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Data</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleLoadSample}
                className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition text-sm"
              >
                Load Sample
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 transition text-sm"
              >
                Export
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 transition text-sm"
              >
                Import
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Lists */}
      <div className="flex-1 bg-zinc-950 overflow-y-auto">
        <div className="p-4">
          {/* Nodes List */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Nodes ({nodes.length})
            </h3>
            <div className="space-y-2">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className={`p-3 rounded-md border ${
                    selectedNodeId === node.id
                      ? "bg-blue-900/30 border-blue-700"
                      : "bg-zinc-800 border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-white">{node.label}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-1">
                        {node.id}
                      </div>
                      {Object.keys(node.data).length > 0 && (
                        <div className="text-xs text-zinc-400 mt-2 font-mono">
                          {JSON.stringify(node.data)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => handleSelectNode(node)}
                        className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {nodes.length === 0 && (
                <div className="text-center text-zinc-500 py-8">No nodes yet</div>
              )}
            </div>
          </div>

          {/* Edges List */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Edges ({edges.length})
            </h3>
            <div className="space-y-2">
              {edges.map((edge) => {
                const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
                const toNode = nodes.find((n) => n.id === edge.toNodeId);
                return (
                  <div
                    key={edge.id}
                    className="p-3 bg-zinc-800 border border-zinc-700 rounded-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm text-white">
                          <span className="font-semibold">{fromNode?.label || "?"}</span>
                          <span className="text-zinc-500 mx-2">→</span>
                          <span className="font-semibold">{toNode?.label || "?"}</span>
                          {edge.label && (
                            <span className="text-zinc-400 ml-2">({edge.label})</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono mt-1">
                          {edge.id}
                        </div>
                        {Object.keys(edge.data).length > 0 && (
                          <div className="text-xs text-zinc-400 mt-2 font-mono">
                            {JSON.stringify(edge.data)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEdge(edge.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 ml-3"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              {edges.length === 0 && (
                <div className="text-center text-zinc-500 py-8">No edges yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
