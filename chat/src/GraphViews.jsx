import React, { useRef, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import * as d3 from "d3";

// Helper to get Tailwind color
const __twBgCache = new Map();
function getTailwindBgColor(twBgClass) {
  if (!twBgClass) return null;
  if (__twBgCache.has(twBgClass)) return __twBgCache.get(twBgClass);
  if (typeof document === "undefined") return null;
  const probe = document.createElement("div");
  probe.className = twBgClass;
  probe.style.position = "absolute";
  probe.style.left = "-99999px";
  probe.style.top = "-99999px";
  probe.style.width = "1px";
  probe.style.height = "1px";
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).backgroundColor;
  document.body.removeChild(probe);
  if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
    __twBgCache.set(twBgClass, color);
    return color;
  }
  return null;
}

// Common node drawing function
function drawNode(ctx, node, isFocus, isExpanded, showDistanceBadge = true, maxDepth = 3) {
  const nodeSize = isFocus ? 13 : isExpanded ? 9 : 7;

  ctx.beginPath();
  ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
  ctx.fillStyle = getTailwindBgColor(node.color) || "#71717a";
  ctx.fill();

  if (isFocus) {
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  if (isExpanded && !isFocus) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 2.5, 0, 2 * Math.PI, false);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  // Label
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = isFocus ? "#e0e7ff" : "#e5e7eb";
  ctx.fillText(node.label, node.x, node.y + nodeSize + 2);

  // Distance badge
  if (showDistanceBadge && node.distance !== undefined && node.distance > 0) {
    ctx.font = "8px monospace";
    ctx.fillStyle = node.distance > maxDepth * 0.8 ? "#ef4444" : "#71717a";
    ctx.fillText(`d:${node.distance}`, node.x, node.y + nodeSize + 14);
  }
}

// --- ForceGraphView Component (Motion mode) ----------------------------------
export function ForceGraphView({
  graphData,
  width,
  height,
  focusNode,
  expandedNodes,
  maxDepth,
  graphSettings,
  onNodeClick,
  graphRef,
  enablePhysics = true,
}) {
  return (
    <ForceGraph2D
      ref={graphRef}
      width={width}
      height={height}
      graphData={graphData}
      nodeLabel={(n) => {
        const isFocus = n.id === focusNode;
        const isExpanded = expandedNodes.has(n.id);
        const dist = n.distance || 0;
        return `${n.label} (${n.kind}) | Distance: ${dist}${isFocus ? " [FOCUS]" : ""}${
          isExpanded ? " [Expanded]" : " [Click to expand]"
        }`;
      }}
      nodeRelSize={8}
      cooldownTicks={enablePhysics ? graphSettings.cooldownTicks : 1}
      warmupTicks={enablePhysics ? graphSettings.warmupTicks : 0}
      d3VelocityDecay={enablePhysics ? graphSettings.velocityDecay : 0.9}
      linkColor={() => "#555"}
      linkWidth={1.5}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const fontSize = 11 / Math.sqrt(globalScale);
        const isFocus = node.id === focusNode;
        const isExpanded = expandedNodes.has(node.id);

        drawNode(ctx, node, isFocus, isExpanded, true, maxDepth);
      }}
      onNodeClick={onNodeClick}
    />
  );
}

// --- HierarchyGraphView Component --------------------------------------------
export function HierarchyGraphView({
  graphData,
  width,
  height,
  focusNode,
  expandedNodes,
  maxDepth,
  onNodeClick,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!graphData.nodes.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodeMap = new Map(graphData.nodes.map((n) => [n.id, { ...n }]));

    // Build hierarchical structure recursively
    function buildHierarchy(nodeId, visited = new Set()) {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) return null;

      const children = graphData.links
        .filter((l) => {
          const sourceId = typeof l.source === "object" ? l.source.id : l.source;
          return sourceId === nodeId;
        })
        .map((l) => {
          const targetId = typeof l.target === "object" ? l.target.id : l.target;
          return buildHierarchy(targetId, visited);
        })
        .filter(Boolean);

      return {
        ...node,
        children: children.length > 0 ? children : undefined,
      };
    }

    try {
      const rootData = buildHierarchy(focusNode);
      if (!rootData) return;

      const hierarchyRoot = d3.hierarchy(rootData);

      // Apply tree layout
      const treeLayout = d3
        .tree()
        .size([width - 100, height - 100])
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

      const tree = treeLayout(hierarchyRoot);

      // Create main group with offset
      const g = svg.append("g").attr("transform", "translate(50,50)");

      // Link generator
      const linkGenerator = d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x);

      // Draw links
      g.append("g")
        .selectAll("path")
        .data(tree.links())
        .join("path")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-width", 1.5)
        .attr("d", linkGenerator);

      // Draw node groups
      const nodeGroups = g
        .append("g")
        .selectAll("g")
        .data(tree.descendants())
        .join("g")
        .attr("transform", (d) => `translate(${d.y},${d.x})`)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          event.stopPropagation();
          if (onNodeClick) onNodeClick(d.data);
        });

      // Background circles
      nodeGroups
        .append("circle")
        .attr("r", (d) => {
          const isFocus = d.data.id === focusNode;
          return isFocus ? 13 : expandedNodes.has(d.data.id) ? 9 : 7;
        })
        .attr("fill", (d) => getTailwindBgColor(d.data.color) || "#71717a")
        .attr("stroke", (d) => (d.data.id === focusNode ? "#6366f1" : "none"))
        .attr("stroke-width", 3);

      // Inner dot for expanded nodes
      nodeGroups
        .filter((d) => expandedNodes.has(d.data.id) && d.data.id !== focusNode)
        .append("circle")
        .attr("r", 2.5)
        .attr("fill", "#fff");

      // Labels
      nodeGroups
        .append("text")
        .attr("dy", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", (d) => (d.data.id === focusNode ? "#e0e7ff" : "#e5e7eb"))
        .text((d) => d.data.label);
    } catch (error) {
      console.warn("Hierarchy layout error:", error);
    }
  }, [graphData, focusNode, expandedNodes, width, height, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ backgroundColor: "transparent" }}
    />
  );
}

// --- RadialGraphView Component -----------------------------------------------
export function RadialGraphView({
  graphData,
  width,
  height,
  focusNode,
  expandedNodes,
  maxDepth,
  onNodeClick,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!graphData.nodes.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodeMap = new Map(graphData.nodes.map((n) => [n.id, { ...n }]));

    // Build hierarchical structure recursively
    function buildHierarchy(nodeId, visited = new Set()) {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) return null;

      const children = graphData.links
        .filter((l) => {
          const sourceId = typeof l.source === "object" ? l.source.id : l.source;
          return sourceId === nodeId;
        })
        .map((l) => {
          const targetId = typeof l.target === "object" ? l.target.id : l.target;
          return buildHierarchy(targetId, visited);
        })
        .filter(Boolean);

      return {
        ...node,
        children: children.length > 0 ? children : undefined,
      };
    }

    try {
      const rootData = buildHierarchy(focusNode);
      if (!rootData) return;

      const hierarchyRoot = d3.hierarchy(rootData);

      // Apply radial tree layout
      const radius = Math.min(width, height) / 2 - 100;
      const tree = d3
        .tree()
        .size([2 * Math.PI, radius])
        .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

      const radialTree = tree(hierarchyRoot);

      const centerX = width / 2;
      const centerY = height / 2;

      // Create main group with offset to center
      const g = svg.append("g").attr("transform", `translate(${centerX},${centerY})`);

      // Link generator for radial layout
      const linkGenerator = d3
        .linkRadial()
        .angle((d) => d.x)
        .radius((d) => d.y);

      // Draw links
      g.append("g")
        .selectAll("path")
        .data(radialTree.links())
        .join("path")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-width", 1.5)
        .attr("d", linkGenerator);

      // Draw node groups
      const nodeGroups = g
        .append("g")
        .selectAll("g")
        .data(radialTree.descendants())
        .join("g")
        .attr("transform", (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          event.stopPropagation();
          if (onNodeClick) onNodeClick(d.data);
        });

      // Background circles
      nodeGroups
        .append("circle")
        .attr("r", (d) => {
          const isFocus = d.data.id === focusNode;
          return isFocus ? 13 : expandedNodes.has(d.data.id) ? 9 : 7;
        })
        .attr("fill", (d) => getTailwindBgColor(d.data.color) || "#71717a")
        .attr("stroke", (d) => (d.data.id === focusNode ? "#6366f1" : "none"))
        .attr("stroke-width", 3);

      // Inner dot for expanded nodes
      nodeGroups
        .filter((d) => expandedNodes.has(d.data.id) && d.data.id !== focusNode)
        .append("circle")
        .attr("r", 2.5)
        .attr("fill", "#fff");

      // Labels with proper rotation
      nodeGroups
        .append("text")
        .attr("transform", (d) => `rotate(${d.x >= Math.PI ? 180 : 0})`)
        .attr("dy", "0.31em")
        .attr("dx", (d) => (d.x >= Math.PI ? -20 : 20))
        .attr("text-anchor", (d) => (d.x >= Math.PI ? "end" : "start"))
        .attr("font-size", "11px")
        .attr("fill", (d) => (d.data.id === focusNode ? "#e0e7ff" : "#e5e7eb"))
        .text((d) => d.data.label);
    } catch (error) {
      console.warn("Radial layout error:", error);
    }
  }, [graphData, focusNode, expandedNodes, width, height, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ backgroundColor: "transparent" }}
    />
  );
}
