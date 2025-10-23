import React, { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { GraphState } from "./GraphState";
import { LayoutManager } from "./LayoutManager";

// Sample graph data
const SAMPLE_DATA = {
  nodes: [
    { id: "a", label: "Alice", group: "team1" },
    { id: "b", label: "Bob", group: "team1" },
    { id: "c", label: "Carol", group: "team2" },
    { id: "d", label: "Dave", group: "team2" },
    { id: "e", label: "Eve", group: "team3" },
    { id: "f", label: "Frank", group: "team3" },
    { id: "g", label: "Grace", group: "team1" },
    { id: "h", label: "Henry", group: "team2" },
  ],
  edges: [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "b", target: "d" },
    { source: "c", target: "e" },
    { source: "d", target: "f" },
    { source: "e", target: "g" },
    { source: "f", target: "h" },
    { source: "g", target: "h" },
  ],
};

const COLORS = {
  team1: "#3b82f6",
  team2: "#10b981",
  team3: "#f59e0b",
};

export default function TweenGraph() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [graphState] = useState(() => new GraphState(SAMPLE_DATA));
  const [layoutManager, setLayoutManager] = useState(null);
  const [currentLayout, setCurrentLayout] = useState("force");
  const [nodePositions, setNodePositions] = useState(new Map());
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [focusNode, setFocusNode] = useState(null);
  const [maxDepth, setMaxDepth] = useState(3);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const animationRef = useRef(null);
  const nodeIdCounter = useRef(0);

  // Pan and zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Handle high DPI displays and resize
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      // Update layout manager size
      if (layoutManager) {
        layoutManager.updateSize(rect.width, rect.height);
      } else {
        const manager = new LayoutManager(rect.width, rect.height);
        setLayoutManager(manager);
        const positions = manager.calculate(graphState.getData(), "force");
        setNodePositions(positions);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [layoutManager]);

  // Add wheel event listener with passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = -e.deltaY * 0.001;
      const newScale = Math.max(0.1, Math.min(5, transform.scale * (1 + delta)));

      // Zoom towards mouse position
      const worldBefore = screenToWorld(mouseX, mouseY);

      setTransform(prev => {
        const newTransform = { ...prev, scale: newScale };
        const worldAfter = {
          x: (mouseX - newTransform.x) / newTransform.scale,
          y: (mouseY - newTransform.y) / newTransform.scale
        };

        return {
          x: prev.x + (worldAfter.x - worldBefore.x) * newScale,
          y: prev.y + (worldAfter.y - worldBefore.y) * newScale,
          scale: newScale
        };
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [transform]);

  // Calculate distances from focus node
  const getNodeDepths = () => {
    if (!focusNode) return new Map();

    const graphData = graphState.getData();
    const depths = new Map();
    const visited = new Set();
    const queue = [{ id: focusNode, depth: 0 }];

    depths.set(focusNode, 0);
    visited.add(focusNode);

    while (queue.length > 0) {
      const { id, depth } = queue.shift();

      // Find connected nodes
      graphData.edges.forEach(edge => {
        const nextId = edge.source === id ? edge.target : edge.target === id ? edge.source : null;
        if (nextId && !visited.has(nextId)) {
          visited.add(nextId);
          depths.set(nextId, depth + 1);
          queue.push({ id: nextId, depth: depth + 1 });
        }
      });
    }

    return depths;
  };

  // Get visible graph data based on focus and max depth
  const getVisibleGraph = () => {
    const fullData = graphState.getData();
    if (!focusNode) return fullData;

    const depths = getNodeDepths();
    const visibleNodes = fullData.nodes.filter(n => {
      const depth = depths.get(n.id);
      return depth !== undefined && depth <= maxDepth;
    });
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    const visibleEdges = fullData.edges.filter(e =>
      visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    return { nodes: visibleNodes, edges: visibleEdges };
  };

  // Smooth transition helper
  const transitionToNewLayout = (newGraphData, duration = 1) => {
    if (!layoutManager) return;

    setIsAnimating(true);
    const newPositions = layoutManager.calculate(newGraphData, currentLayout);

    // Create animation objects for GSAP
    const animationTargets = [];

    // Handle existing nodes
    nodePositions.forEach((oldPos, nodeId) => {
      const newPos = newPositions.get(nodeId);
      if (newPos) {
        const target = { x: oldPos.x, y: oldPos.y };
        animationTargets.push({ nodeId, target, newPos });
      }
    });

    // Handle new nodes - start from center or parent position
    newPositions.forEach((newPos, nodeId) => {
      if (!nodePositions.has(nodeId)) {
        const target = { x: newPos.x, y: newPos.y, opacity: 0 };
        animationTargets.push({ nodeId, target, newPos: { ...newPos, opacity: 1 }, isNew: true });
      }
    });

    // Animate with GSAP
    if (animationRef.current) {
      animationRef.current.kill();
    }

    // Build animation config
    const animConfig = {
      duration,
      ease: "power2.inOut",
      x: (i) => animationTargets[i].newPos.x,
      y: (i) => animationTargets[i].newPos.y,
      onUpdate: () => {
        const updatedPositions = new Map();
        animationTargets.forEach(({ nodeId, target }) => {
          updatedPositions.set(nodeId, { x: target.x, y: target.y, opacity: target.opacity });
        });
        setNodePositions(updatedPositions);
      },
      onComplete: () => {
        setIsAnimating(false);
      },
    };

    // Only add opacity if we have new nodes
    if (animationTargets.some(t => t.isNew)) {
      animConfig.opacity = (i) => animationTargets[i].isNew ? 1 : animationTargets[i].target.opacity || 1;
    }

    animationRef.current = gsap.to(
      animationTargets.map(t => t.target),
      animConfig
    );
  };

  // Handle layout change with GSAP tweening
  const changeLayout = (newLayoutType) => {
    if (!layoutManager || isAnimating) return;
    setCurrentLayout(newLayoutType);
    transitionToNewLayout(getVisibleGraph(), 1);
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const visibleGraph = getVisibleGraph();
    const nodeDepths = getNodeDepths();

    const render = () => {
      // Clear canvas
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Apply transform
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      // Draw edges
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 2 / transform.scale;
      visibleGraph.edges.forEach((edge) => {
        const sourcePos = nodePositions.get(edge.source);
        const targetPos = nodePositions.get(edge.target);
        if (sourcePos && targetPos) {
          ctx.beginPath();
          ctx.moveTo(sourcePos.x, sourcePos.y);
          ctx.lineTo(targetPos.x, targetPos.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      visibleGraph.nodes.forEach((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        const isSelected = selectedNode === node.id;
        const isFocus = focusNode === node.id;
        const isExpanded = expandedNodes.has(node.id);
        const opacity = pos.opacity !== undefined ? pos.opacity : 1;

        let radius = 20 / transform.scale;
        if (isFocus) radius = 30 / transform.scale;
        else if (isSelected) radius = 25 / transform.scale;

        // Node circle
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = COLORS[node.group] || "#666";
        ctx.fill();

        // Focus outline (purple)
        if (isFocus) {
          ctx.strokeStyle = "#a855f7";
          ctx.lineWidth = 4 / transform.scale;
          ctx.stroke();
        }
        // Selected outline (white)
        else if (isSelected) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3 / transform.scale;
          ctx.stroke();
        }

        // Expanded indicator (inner dot)
        if (isExpanded && !isFocus) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 5 / transform.scale, 0, 2 * Math.PI);
          ctx.fillStyle = "#fff";
          ctx.fill();
        }

        // Label
        ctx.fillStyle = "#fff";
        ctx.font = `${14 / transform.scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label, pos.x, pos.y);

        // Depth badge (if focus mode active)
        if (focusNode && nodeDepths.has(node.id)) {
          const depth = nodeDepths.get(node.id);
          ctx.font = `${10 / transform.scale}px monospace`;
          ctx.fillStyle = depth === maxDepth ? "#ef4444" : "#71717a";
          ctx.fillText(`d:${depth}`, pos.x, pos.y + radius + 12 / transform.scale);
        }

        ctx.globalAlpha = 1;
      });

      ctx.restore();
    };

    render();
  }, [nodePositions, selectedNode, focusNode, expandedNodes, graphState, transform, maxDepth]);

  // Transform screen coords to world coords
  const screenToWorld = (screenX, screenY) => {
    return {
      x: (screenX - transform.x) / transform.scale,
      y: (screenY - transform.y) / transform.scale
    };
  };

  // Expand node - create children and random connections
  const expandNode = (nodeId) => {
    if (expandedNodes.has(nodeId)) return; // Already expanded

    const graphData = graphState.getData();
    const parentNode = graphData.nodes.find(n => n.id === nodeId);
    if (!parentNode) return;

    // Generate 2-4 children
    const numChildren = 2 + Math.floor(Math.random() * 3);
    const newNodes = [];
    const newEdges = [];

    for (let i = 0; i < numChildren; i++) {
      const childId = `${nodeId}-child-${nodeIdCounter.current++}`;
      const childNode = {
        id: childId,
        label: `Node ${childId.slice(-3)}`,
        group: ["team1", "team2", "team3"][Math.floor(Math.random() * 3)],
      };
      newNodes.push(childNode);
      graphState.addNode(childNode);
      graphState.addEdge({ source: nodeId, target: childId });
      newEdges.push({ source: nodeId, target: childId });
    }

    // Add 0-2 random connections between new children and existing nearby nodes
    const nearbyNodes = graphData.nodes.slice(0, 5); // Just grab first 5 for demo
    for (let i = 0; i < Math.min(2, newNodes.length); i++) {
      if (Math.random() > 0.5 && nearbyNodes.length > 0) {
        const randomTarget = nearbyNodes[Math.floor(Math.random() * nearbyNodes.length)];
        graphState.addEdge({ source: newNodes[i].id, target: randomTarget.id });
      }
    }

    // Mark as expanded
    setExpandedNodes(prev => new Set([...prev, nodeId]));

    // Smooth transition
    transitionToNewLayout(getVisibleGraph(), 0.8);
  };

  // Handle mouse down
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld(screenX, screenY);

      // Check if clicked on a node
      const visibleGraph = getVisibleGraph();
      let clickedNodeId = null;

      for (const node of visibleGraph.nodes) {
        const pos = nodePositions.get(node.id);
        if (!pos) continue;

        const dx = world.x - pos.x;
        const dy = world.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 30 / transform.scale) {
          clickedNodeId = node.id;
          break;
        }
      }

      if (clickedNodeId) {
        setSelectedNode(clickedNodeId);
        setFocusNode(clickedNodeId);
        expandNode(clickedNodeId);
      } else {
        // Start panning
        setIsDragging(true);
        dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      }
    }
  };

  // Handle mouse move
  const handleMouseMove = (e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      }));
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset zoom
  const resetZoom = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // Add node
  const addNode = () => {
    const graphData = graphState.getData();
    const newId = `node-${Date.now()}`;
    const newNode = {
      id: newId,
      label: `Node ${graphData.nodes.length + 1}`,
      group: ["team1", "team2", "team3"][Math.floor(Math.random() * 3)],
    };

    graphState.addNode(newNode);

    // Connect to a random existing node
    if (graphData.nodes.length > 0) {
      const randomNode = graphData.nodes[Math.floor(Math.random() * graphData.nodes.length)];
      graphState.addEdge({ source: randomNode.id, target: newId });
    }

    // Smooth transition
    transitionToNewLayout(getVisibleGraph(), 0.8);
  };

  // Remove selected node
  const removeNode = () => {
    if (!selectedNode) return;
    graphState.removeNode(selectedNode);
    setSelectedNode(null);

    // Smooth transition
    transitionToNewLayout(getVisibleGraph(), 0.8);
  };

  // Clear focus mode
  const clearFocus = () => {
    setFocusNode(null);
    transitionToNewLayout(graphState.getData(), 0.8);
  };

  // Handle max depth change
  const handleMaxDepthChange = (newDepth) => {
    setMaxDepth(newDepth);
    if (focusNode) {
      transitionToNewLayout(getVisibleGraph(), 0.6);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col p-4 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Tween Graph</h1>
          <p className="text-sm text-zinc-400">
            Smooth layout transitions with GSAP
          </p>
        </div>

        {/* Layout Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Layout
          </label>
          <select
            value={currentLayout}
            onChange={(e) => changeLayout(e.target.value)}
            disabled={isAnimating}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="force">Force-Directed</option>
            <option value="hierarchy">Hierarchy</option>
            <option value="radial">Radial</option>
            <option value="circle">Circle</option>
            <option value="grid">Grid</option>
          </select>
        </div>

        {/* Focus Mode Controls */}
        {focusNode && (
          <div className="mb-6 p-4 bg-purple-900/30 border border-purple-700 rounded-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-purple-300">
                Focus Mode
              </h3>
              <button
                onClick={clearFocus}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Clear
              </button>
            </div>
            <div className="text-xs text-purple-200 mb-3">
              Focus: {graphState.getData().nodes.find((n) => n.id === focusNode)?.label}
            </div>
            <div>
              <label className="block text-xs text-purple-300 mb-2">
                Max Depth: {maxDepth}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={maxDepth}
                onChange={(e) => handleMaxDepthChange(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>1</span>
                <span>5</span>
              </div>
            </div>
          </div>
        )}

        {/* Node Actions */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Actions
          </label>
          <div className="space-y-2">
            <button
              onClick={addNode}
              disabled={isAnimating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              Add Random Node
            </button>
            <button
              onClick={removeNode}
              disabled={!selectedNode || isAnimating}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
            >
              Remove Selected
            </button>
            <button
              onClick={resetZoom}
              className="w-full px-4 py-2 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 transition"
            >
              Reset View
            </button>
          </div>
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="mb-6 p-4 bg-zinc-800 rounded-md border border-zinc-700">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">
              Selected Node
            </h3>
            <div className="text-sm text-zinc-400">
              {graphState.getData().nodes.find((n) => n.id === selectedNode)?.label}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-auto pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500">
            <div>Total Nodes: {graphState.getData().nodes.length}</div>
            <div>Total Edges: {graphState.getData().edges.length}</div>
            {focusNode && <div>Visible: {getVisibleGraph().nodes.length} nodes</div>}
            <div>Layout: {currentLayout}</div>
            <div>Status: {isAnimating ? "Animating..." : "Ready"}</div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative bg-zinc-950">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />

        {/* Zoom indicator */}
        <div className="absolute bottom-4 right-4 px-3 py-2 bg-zinc-800/90 border border-zinc-700 rounded-md text-xs text-zinc-400">
          Zoom: {(transform.scale * 100).toFixed(0)}%
        </div>

        {/* Instructions */}
        <div className="absolute top-4 right-4 px-3 py-2 bg-zinc-800/90 border border-zinc-700 rounded-md text-xs text-zinc-400">
          <div className="font-semibold mb-1">Explore Graph</div>
          <div>👆 Click node to expand</div>
          <div>🖱️ Drag to pan</div>
          <div>🔍 Scroll to zoom</div>
          {focusNode && (
            <div className="mt-2 pt-2 border-t border-zinc-700 text-purple-400">
              🎯 Focus mode active
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
