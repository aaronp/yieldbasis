import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Graphs } from "../model";
import GraphEditor from "../components/GraphEditor";
import TweenGraphVisualization from "../components/TweenGraphVisualization";

export default function GraphEditorPage() {
  const [api, setApi] = useState(null);
  const [viewMode, setViewMode] = useState("split"); // 'editor', 'graph', 'split'
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize API with persistent storage
  useEffect(() => {
    const initApi = async () => {
      const graphApi = await Graphs.createPersistent("graph-editor-data");
      setApi(graphApi);
    };
    initApi();
  }, []);

  const handleDataChange = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!api) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm hover:bg-zinc-700"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-white">Graph Editor & Visualizer</h1>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400 mr-2">View:</span>
          <button
            onClick={() => setViewMode("editor")}
            className={`px-3 py-1.5 rounded-md text-sm transition ${
              viewMode === "editor"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`px-3 py-1.5 rounded-md text-sm transition ${
              viewMode === "split"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode("graph")}
            className={`px-3 py-1.5 rounded-md text-sm transition ${
              viewMode === "graph"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Graph
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        {(viewMode === "editor" || viewMode === "split") && (
          <div className={viewMode === "split" ? "w-1/2 border-r border-zinc-800" : "w-full"}>
            <GraphEditor api={api} onDataChange={handleDataChange} />
          </div>
        )}

        {/* Graph Visualization Panel */}
        {(viewMode === "graph" || viewMode === "split") && (
          <div className={viewMode === "split" ? "w-1/2" : "w-full"}>
            <TweenGraphVisualization api={api} key={refreshKey} />
          </div>
        )}
      </div>
    </div>
  );
}
