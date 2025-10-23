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
  const animationRef = useRef(null);

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

  // Handle layout change with GSAP tweening
  const changeLayout = (newLayoutType) => {
    if (!layoutManager || isAnimating) return;

    setIsAnimating(true);
    const graphData = graphState.getData();
    const newPositions = layoutManager.calculate(graphData, newLayoutType);

    // Create animation objects for GSAP
    const animationTargets = [];
    nodePositions.forEach((oldPos, nodeId) => {
      const newPos = newPositions.get(nodeId);
      if (newPos) {
        const target = { x: oldPos.x, y: oldPos.y };
        animationTargets.push({ nodeId, target, newPos });
      }
    });

    // Animate with GSAP
    if (animationRef.current) {
      animationRef.current.kill();
    }

    animationRef.current = gsap.to(
      animationTargets.map(t => t.target),
      {
        duration: 1,
        ease: "power2.inOut",
        x: (i) => animationTargets[i].newPos.x,
        y: (i) => animationTargets[i].newPos.y,
        onUpdate: () => {
          // Update positions during animation
          const updatedPositions = new Map();
          animationTargets.forEach(({ nodeId, target }) => {
            updatedPositions.set(nodeId, { x: target.x, y: target.y });
          });
          setNodePositions(updatedPositions);
        },
        onComplete: () => {
          setIsAnimating(false);
          setCurrentLayout(newLayoutType);
        },
      }
    );
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const graphData = graphState.getData();
    const rect = canvas.getBoundingClientRect();

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
      graphData.edges.forEach((edge) => {
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
      graphData.nodes.forEach((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        const isSelected = selectedNode === node.id;
        const radius = (isSelected ? 25 : 20) / transform.scale;

        // Node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = COLORS[node.group] || "#666";
        ctx.fill();

        // Selected outline
        if (isSelected) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3 / transform.scale;
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = "#fff";
        ctx.font = `${14 / transform.scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label, pos.x, pos.y);
      });

      ctx.restore();
    };

    render();
  }, [nodePositions, selectedNode, graphState, transform]);

  // Transform screen coords to world coords
  const screenToWorld = (screenX, screenY) => {
    return {
      x: (screenX - transform.x) / transform.scale,
      y: (screenY - transform.y) / transform.scale
    };
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
      const graphData = graphState.getData();
      let clickedNode = null;

      for (const node of graphData.nodes) {
        const pos = nodePositions.get(node.id);
        if (!pos) continue;

        const dx = world.x - pos.x;
        const dy = world.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20 / transform.scale) {
          clickedNode = node.id;
          break;
        }
      }

      if (clickedNode) {
        setSelectedNode(clickedNode);
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

  // Handle wheel for zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
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

    // Recalculate layout
    if (layoutManager) {
      const newPositions = layoutManager.calculate(graphState.getData(), currentLayout);
      setNodePositions(newPositions);
    }
  };

  // Remove selected node
  const removeNode = () => {
    if (!selectedNode) return;
    graphState.removeNode(selectedNode);
    setSelectedNode(null);

    // Recalculate layout
    if (layoutManager) {
      const newPositions = layoutManager.calculate(graphState.getData(), currentLayout);
      setNodePositions(newPositions);
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
              Add Node
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
            <div>Nodes: {graphState.getData().nodes.length}</div>
            <div>Edges: {graphState.getData().edges.length}</div>
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
          onWheel={handleWheel}
          className="w-full h-full"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />

        {/* Zoom indicator */}
        <div className="absolute bottom-4 right-4 px-3 py-2 bg-zinc-800/90 border border-zinc-700 rounded-md text-xs text-zinc-400">
          Zoom: {(transform.scale * 100).toFixed(0)}%
        </div>

        {/* Instructions */}
        <div className="absolute top-4 right-4 px-3 py-2 bg-zinc-800/90 border border-zinc-700 rounded-md text-xs text-zinc-400">
          <div>🖱️ Drag to pan</div>
          <div>🔍 Scroll to zoom</div>
          <div>👆 Click node to select</div>
        </div>
      </div>
    </div>
  );
}
