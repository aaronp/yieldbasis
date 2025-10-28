import React, { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import { LayoutManager } from "../TweenGraph/LayoutManager";

export default function TweenGraphVisualization({ api }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [layoutManager, setLayoutManager] = useState(null);
  const [currentLayout, setCurrentLayout] = useState("force");
  const [nodePositions, setNodePositions] = useState(new Map());
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [focusNode, setFocusNode] = useState(null);
  const [maxDepth, setMaxDepth] = useState(3);
  const animationRef = useRef(null);

  // Pan and zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Convert GraphAPI format to TweenGraph format
  const convertGraphData = (graphData) => {
    return {
      nodes: graphData.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        group: node.data.group || "default",
      })),
      edges: graphData.edges.map((edge) => ({
        source: edge.fromNodeId,
        target: edge.toNodeId,
      })),
    };
  };

  // Get visible graph data based on focus and max depth
  const getVisibleGraph = () => {
    const fullData = convertGraphData(api.getAllData());
    if (!focusNode) return fullData;

    const result = api.queryByDepth({
      nodeId: focusNode,
      depth: maxDepth,
      direction: "both",
    });

    return convertGraphData(result);
  };

  // Helper function to convert screen coordinates to world coordinates
  const screenToWorld = (screenX, screenY) => {
    return {
      x: (screenX - transform.x) / transform.scale,
      y: (screenY - transform.y) / transform.scale,
    };
  };

  // Smooth transition helper
  const transitionToNewLayout = useCallback((newGraphData, duration = 1) => {
    if (!layoutManager) return;

    setIsAnimating(true);
    const newPositions = layoutManager.calculate(newGraphData, currentLayout);

    const animationTargets = [];

    // Handle existing nodes
    nodePositions.forEach((oldPos, nodeId) => {
      const newPos = newPositions.get(nodeId);
      if (newPos) {
        const target = {
          x: oldPos.x,
          y: oldPos.y,
          opacity: oldPos.opacity !== undefined ? oldPos.opacity : 1,
        };
        animationTargets.push({ nodeId, target, newPos: { ...newPos, opacity: 1 } });
      }
    });

    // Handle new nodes - fade them in
    newPositions.forEach((newPos, nodeId) => {
      if (!nodePositions.has(nodeId)) {
        const target = { x: newPos.x, y: newPos.y, opacity: 0 };
        animationTargets.push({
          nodeId,
          target,
          newPos: { ...newPos, opacity: 1 },
          isNew: true,
        });
      }
    });

    // Animate with GSAP
    if (animationRef.current) {
      animationRef.current.kill();
    }

    const animConfig = {
      duration,
      ease: "power2.inOut",
      x: (i) => animationTargets[i].newPos.x,
      y: (i) => animationTargets[i].newPos.y,
      onUpdate: () => {
        const updatedPositions = new Map();
        animationTargets.forEach(({ nodeId, target }) => {
          updatedPositions.set(nodeId, {
            x: target.x,
            y: target.y,
            opacity: target.opacity,
          });
        });
        setNodePositions(updatedPositions);
      },
      onComplete: () => {
        setIsAnimating(false);
      },
    };

    if (animationTargets.some((t) => t.isNew)) {
      animConfig.opacity = (i) =>
        animationTargets[i].isNew ? 1 : animationTargets[i].target.opacity || 1;
    }

    animationRef.current = gsap.to(
      animationTargets.map((t) => t.target),
      animConfig
    );
  }, [layoutManager, currentLayout, nodePositions]);

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

      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);

      // Initialize or update layout manager size
      if (!layoutManager) {
        const manager = new LayoutManager(rect.width, rect.height);
        setLayoutManager(manager);
      } else {
        layoutManager.updateSize(rect.width, rect.height);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [layoutManager]);

  // Initial layout calculation when layout manager is ready
  useEffect(() => {
    if (layoutManager && nodePositions.size === 0) {
      const positions = layoutManager.calculate(getVisibleGraph(), currentLayout);
      setNodePositions(positions);
    }
  }, [layoutManager, currentLayout]);

  // Handle layout type changes
  useEffect(() => {
    if (layoutManager && nodePositions.size > 0) {
      transitionToNewLayout(getVisibleGraph(), 1);
    }
  }, [currentLayout, layoutManager, transitionToNewLayout]);

  // Handle focus/depth changes
  useEffect(() => {
    if (layoutManager && nodePositions.size > 0) {
      transitionToNewLayout(getVisibleGraph(), 0.6);
    }
  }, [focusNode, maxDepth, transitionToNewLayout]);

  // Add wheel event listener
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

      const worldBefore = screenToWorld(mouseX, mouseY);

      setTransform((prev) => {
        const newTransform = { ...prev, scale: newScale };
        const worldAfter = {
          x: (mouseX - newTransform.x) / newTransform.scale,
          y: (mouseY - newTransform.y) / newTransform.scale,
        };

        return {
          x: prev.x + (worldAfter.x - worldBefore.x) * newScale,
          y: prev.y + (worldAfter.y - worldBefore.y) * newScale,
          scale: newScale,
        };
      });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [transform]);

  // Handle layout change
  const changeLayout = (newLayoutType) => {
    if (!layoutManager || isAnimating) return;
    setCurrentLayout(newLayoutType);
    // Effect will handle transition
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const visibleGraph = getVisibleGraph();

    const render = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

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
        const opacity = pos.opacity !== undefined ? pos.opacity : 1;

        let radius = 20 / transform.scale;
        if (isFocus) radius = 30 / transform.scale;
        else if (isSelected) radius = 25 / transform.scale;

        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = getNodeColor(node.group);
        ctx.fill();

        if (isFocus) {
          ctx.strokeStyle = "#a855f7";
          ctx.lineWidth = 4 / transform.scale;
          ctx.stroke();
        } else if (isSelected) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3 / transform.scale;
          ctx.stroke();
        }

        ctx.fillStyle = "#fff";
        ctx.font = `${14 / transform.scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label, pos.x, pos.y);

        ctx.globalAlpha = 1;
      });

      ctx.restore();
    };

    render();
  }, [nodePositions, selectedNode, focusNode, transform]);

  const getNodeColor = (group) => {
    const colors = {
      default: "#3b82f6",
      team1: "#3b82f6",
      team2: "#10b981",
      team3: "#f59e0b",
    };
    return colors[group] || colors.default;
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld(screenX, screenY);

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
      } else {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  const clearFocus = () => {
    setFocusNode(null);
    // Effect will handle transition
  };

  const handleMaxDepthChange = (newDepth) => {
    setMaxDepth(newDepth);
    // Effect will handle transition
  };

  const graphData = api.getAllData();
  const visibleGraph = getVisibleGraph();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col p-4 overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white mb-1">Visualization</h2>
          <p className="text-xs text-zinc-400">GSAP + D3 layouts</p>
        </div>

        {/* Layout Selection */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-zinc-300 mb-2">
            Layout
          </label>
          <select
            value={currentLayout}
            onChange={(e) => changeLayout(e.target.value)}
            disabled={isAnimating}
            className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="mb-4 p-3 bg-purple-900/30 border border-purple-700 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-purple-300">Focus Mode</h3>
              <button
                onClick={clearFocus}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Clear
              </button>
            </div>
            <div className="text-xs text-purple-200 mb-2">
              Focus:{" "}
              {graphData.nodes.find((n) => n.id === focusNode)?.label}
            </div>
            <div>
              <label className="block text-xs text-purple-300 mb-1">
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
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mb-4">
          <button
            onClick={resetZoom}
            className="w-full px-3 py-1.5 bg-zinc-700 text-white rounded-md hover:bg-zinc-600 transition text-sm"
          >
            Reset View
          </button>
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="mb-4 p-3 bg-zinc-800 rounded-md border border-zinc-700">
            <h3 className="text-xs font-medium text-zinc-300 mb-1">
              Selected Node
            </h3>
            <div className="text-sm text-zinc-400">
              {graphData.nodes.find((n) => n.id === selectedNode)?.label}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-auto pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500">
            <div>Total: {graphData.nodes.length} nodes</div>
            <div>Visible: {visibleGraph.nodes.length} nodes</div>
            <div>Edges: {graphData.edges.length}</div>
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
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        />

        {/* Zoom indicator */}
        <div className="absolute bottom-4 right-4 px-3 py-2 bg-zinc-800/90 border border-zinc-700 rounded-md text-xs text-zinc-400">
          Zoom: {(transform.scale * 100).toFixed(0)}%
        </div>

        {/* Instructions */}
        <div className="absolute top-4 right-4 px-3 py-2 bg-zinc-800/90 border border-zinc-700 rounded-md text-xs text-zinc-400">
          <div className="font-semibold mb-1">Controls</div>
          <div>👆 Click node to focus</div>
          <div>🖱️ Drag to pan</div>
          <div>🔍 Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
}
