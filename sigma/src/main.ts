import './style.css'
import Graph from 'graphology'
import Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import circular from 'graphology-layout/circular'

interface GraphData {
  name: string
  description: string
  nodes: Array<{
    id: string
    label: string
    [key: string]: any
  }>
  edges: Array<{
    source: string
    target: string
    [key: string]: any
  }>
}

let sigma: Sigma
let graph: Graph
let layoutRunning = false
let currentLayout = 'forceatlas2'
let currentData: GraphData

// Physics parameters for ForceAtlas2
let physicsParams = {
  gravity: 1,
  scalingRatio: 2,
  slowDown: 1,
}

// Node dragging state
let draggedNode: string | null = null
let isDragging = false

const DATASETS: Record<string, string> = {
  'social-network': '/graph-data/social-network.json',
  'hierarchy': '/graph-data/hierarchy.json',
  'dependencies': '/graph-data/dependencies.json',
  'large-network': '/graph-data/large-network.json',
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
]

async function loadDataset(datasetName: string): Promise<GraphData> {
  const response = await fetch(DATASETS[datasetName])
  return response.json()
}

// Tree layout helper functions
interface TreeNode {
  id: string
  children: TreeNode[]
  x?: number
  y?: number
  depth?: number
}

function buildTree(data: GraphData): TreeNode | null {
  // Find nodes with no incoming edges
  const incomingEdges = new Map<string, number>()
  data.nodes.forEach(n => incomingEdges.set(n.id, 0))
  data.edges.forEach(e => {
    incomingEdges.set(e.target, (incomingEdges.get(e.target) || 0) + 1)
  })

  // Find root (node with level 1 or no incoming edges)
  let roots = data.nodes.filter(n =>
    incomingEdges.get(n.id) === 0 || n.level === 1
  )

  if (roots.length === 0) {
    roots = [data.nodes[0]]
  }

  // Build adjacency map
  const adjacency = new Map<string, string[]>()
  data.edges.forEach(e => {
    if (!adjacency.has(e.source)) {
      adjacency.set(e.source, [])
    }
    adjacency.get(e.source)!.push(e.target)
  })

  // Build tree recursively
  const buildNode = (id: string, visited = new Set<string>()): TreeNode => {
    if (visited.has(id)) {
      return { id, children: [] }
    }
    visited.add(id)

    const children = (adjacency.get(id) || [])
      .filter(childId => !visited.has(childId))
      .map(childId => buildNode(childId, visited))

    return { id, children }
  }

  return buildNode(roots[0].id)
}

function layoutTree(root: TreeNode, width: number, height: number): void {
  // Calculate tree dimensions
  const countLeaves = (node: TreeNode): number => {
    if (node.children.length === 0) return 1
    return node.children.reduce((sum, child) => sum + countLeaves(child), 0)
  }

  const maxDepth = (node: TreeNode, depth = 0): number => {
    if (node.children.length === 0) return depth
    return Math.max(...node.children.map(child => maxDepth(child, depth + 1)))
  }

  const leaves = countLeaves(root)
  const depth = maxDepth(root)

  // Layout nodes
  const layout = (node: TreeNode, x: number, y: number, availableWidth: number, currentDepth: number): void => {
    node.x = x + availableWidth / 2
    node.y = y
    node.depth = currentDepth

    if (node.children.length === 0) return

    const childLeaves = node.children.map(countLeaves)
    const totalLeaves = childLeaves.reduce((a, b) => a + b, 0)

    let currentX = x
    node.children.forEach((child, i) => {
      const childWidth = (childLeaves[i] / totalLeaves) * availableWidth
      layout(child, currentX, y + (height - 100) / depth, childWidth, currentDepth + 1)
      currentX += childWidth
    })
  }

  layout(root, 50, 50, width - 100, 0)
}

function layoutRadialTree(root: TreeNode, width: number, height: number): void {
  const centerX = width / 2
  const centerY = height / 2
  const maxRadius = Math.min(width, height) / 2 - 50

  const maxDepth = (node: TreeNode, depth = 0): number => {
    if (node.children.length === 0) return depth
    return Math.max(...node.children.map(child => maxDepth(child, depth + 1)))
  }

  const depth = maxDepth(root)

  const layout = (node: TreeNode, angle: number, angleSpan: number, currentDepth: number): void => {
    const radius = currentDepth === 0 ? 0 : (currentDepth / depth) * maxRadius
    node.x = centerX + radius * Math.cos(angle)
    node.y = centerY + radius * Math.sin(angle)
    node.depth = currentDepth

    if (node.children.length === 0) return

    const childAngleSpan = angleSpan / node.children.length
    let currentAngle = angle - angleSpan / 2

    node.children.forEach(child => {
      layout(child, currentAngle + childAngleSpan / 2, childAngleSpan, currentDepth + 1)
      currentAngle += childAngleSpan
    })
  }

  layout(root, -Math.PI / 2, 2 * Math.PI, 0)
}

function applyTreeToGraph(root: TreeNode): void {
  const apply = (node: TreeNode): void => {
    graph.setNodeAttribute(node.id, 'x', node.x!)
    graph.setNodeAttribute(node.id, 'y', node.y!)
    node.children.forEach(apply)
  }
  apply(root)
}

function initGraph(data: GraphData) {
  currentData = data

  // Clear existing graph
  if (graph) {
    graph.clear()
  } else {
    graph = new Graph()
  }

  // Add nodes with visual attributes
  const groups = new Set<string>()
  data.nodes.forEach(node => {
    const groupKey = node.group || node.type || node.department || 'default'
    groups.add(groupKey)
  })

  const groupColors = Array.from(groups).reduce((acc, group, idx) => {
    acc[group] = COLORS[idx % COLORS.length]
    return acc
  }, {} as Record<string, string>)

  data.nodes.forEach(node => {
    const groupKey = node.group || node.type || node.department || 'default'
    graph.addNode(node.id, {
      ...node,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 10,
      color: groupColors[groupKey],
    })
  })

  // Add edges
  data.edges.forEach((edge, idx) => {
    try {
      // Don't pass the 'type' attribute to sigma, it expects specific edge renderer types
      const { type, ...edgeAttrs } = edge
      graph.addEdge(edge.source, edge.target, {
        ...edgeAttrs,
        size: 2,
        color: '#cbd5e1',
      })
    } catch (e) {
      console.warn(`Skipping edge ${idx}:`, e)
    }
  })

  // Initialize or refresh sigma
  if (!sigma) {
    const container = document.getElementById('sigma-container')!
    sigma = new Sigma(graph, container, {
      renderEdgeLabels: false,
    })

    // Event listeners
    sigma.on('clickNode', ({ node }) => {
      const nodeData = graph.getNodeAttributes(node)
      displayNodeDetails(node, nodeData)
      highlightNode(node)
    })

    sigma.on('clickStage', () => {
      clearHighlight()
      clearNodeDetails()
    })

    // Enable node dragging
    sigma.on('downNode', (e) => {
      isDragging = true
      draggedNode = e.node
      graph.setNodeAttribute(e.node, 'highlighted', true)
    })

    sigma.getMouseCaptor().on('mousemovebody', (e) => {
      if (!isDragging || !draggedNode) return

      // Get new position
      const pos = sigma.viewportToGraph(e)

      // Update node position
      graph.setNodeAttribute(draggedNode, 'x', pos.x)
      graph.setNodeAttribute(draggedNode, 'y', pos.y)

      // Prevent sigma from moving the graph
      e.preventSigmaDefault()
      e.original.preventDefault()
      e.original.stopPropagation()
    })

    sigma.getMouseCaptor().on('mouseup', () => {
      if (draggedNode) {
        graph.removeNodeAttribute(draggedNode, 'highlighted')
      }
      isDragging = false
      draggedNode = null
    })

    sigma.getMouseCaptor().on('mousedown', () => {
      if (!sigma.getCustomBBox()) sigma.setCustomBBox(sigma.getBBox())
    })
  } else {
    sigma.refresh()
  }

  updateStats()
}

function displayNodeDetails(nodeId: string, data: any) {
  const detailsEl = document.getElementById('node-details')!
  const entries = Object.entries(data)
    .filter(([key]) => !['x', 'y', 'size', 'color'].includes(key))
    .map(([key, value]) => `<div class="mb-1"><span class="font-medium">${key}:</span> ${value}</div>`)
    .join('')

  detailsEl.innerHTML = `
    <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
      <div class="font-bold text-blue-900 mb-2">${nodeId}</div>
      ${entries}
    </div>
  `
}

function clearNodeDetails() {
  const detailsEl = document.getElementById('node-details')!
  detailsEl.innerHTML = '<div class="text-gray-500 italic">Click on a node to see details</div>'
}

function highlightNode(nodeId: string) {
  const nodeColor = graph.getNodeAttribute(nodeId, 'color')

  graph.forEachNode((node) => {
    if (node === nodeId) {
      graph.setNodeAttribute(node, 'highlighted', true)
      graph.setNodeAttribute(node, 'size', 15)
    } else {
      graph.setNodeAttribute(node, 'highlighted', false)
      graph.setNodeAttribute(node, 'color', '#e5e7eb')
      graph.setNodeAttribute(node, 'size', 7)
    }
  })

  graph.forEachEdge((edge) => {
    const source = graph.source(edge)
    const target = graph.target(edge)
    if (source === nodeId || target === nodeId) {
      graph.setEdgeAttribute(edge, 'color', nodeColor)
      graph.setEdgeAttribute(edge, 'size', 3)
    } else {
      graph.setEdgeAttribute(edge, 'color', '#f3f4f6')
      graph.setEdgeAttribute(edge, 'size', 1)
    }
  })

  sigma.refresh()
}

function clearHighlight() {
  graph.forEachNode((node) => {
    graph.removeNodeAttribute(node, 'highlighted')
    graph.setNodeAttribute(node, 'size', 10)
    // Restore original color
    const originalColor = graph.getNodeAttribute(node, 'color')
    if (originalColor === '#e5e7eb') {
      // Restore from dimmed state - need to recalculate
      const groupKey = graph.getNodeAttribute(node, 'group') ||
                      graph.getNodeAttribute(node, 'type') ||
                      graph.getNodeAttribute(node, 'department') ||
                      'default'
      const idx = Array.from(new Set(
        graph.mapNodes((n) => graph.getNodeAttribute(n, 'group') ||
                              graph.getNodeAttribute(n, 'type') ||
                              graph.getNodeAttribute(n, 'department') ||
                              'default')
      )).indexOf(groupKey)
      graph.setNodeAttribute(node, 'color', COLORS[idx % COLORS.length])
    }
  })

  graph.forEachEdge((edge) => {
    graph.setEdgeAttribute(edge, 'color', '#cbd5e1')
    graph.setEdgeAttribute(edge, 'size', 2)
  })

  sigma.refresh()
}

function applyLayout() {
  const btn = document.getElementById('layout-btn') as HTMLButtonElement
  const container = document.getElementById('sigma-container')!
  const width = container.clientWidth
  const height = container.clientHeight

  if (currentLayout === 'circular') {
    // Apply circular layout instantly
    circular.assign(graph)
    sigma.refresh()
    return
  }

  if (currentLayout === 'tree' || currentLayout === 'radial') {
    // Build and apply tree layout
    const tree = buildTree(currentData)
    if (tree) {
      if (currentLayout === 'tree') {
        layoutTree(tree, width, height)
      } else {
        layoutRadialTree(tree, width, height)
      }
      applyTreeToGraph(tree)
      sigma.refresh()
    }
    return
  }

  // ForceAtlas2 layout
  if (layoutRunning) {
    layoutRunning = false
    btn.textContent = 'Apply Layout'
    btn.classList.remove('bg-red-600', 'hover:bg-red-700')
    btn.classList.add('bg-blue-600', 'hover:bg-blue-700')
    return
  }

  layoutRunning = true
  btn.textContent = 'Stop Layout'
  btn.classList.remove('bg-blue-600', 'hover:bg-blue-700')
  btn.classList.add('bg-red-600', 'hover:bg-red-700')

  const settings = {
    ...forceAtlas2.inferSettings(graph),
    gravity: physicsParams.gravity,
    scalingRatio: physicsParams.scalingRatio,
    slowDown: physicsParams.slowDown,
  }
  let iterations = 0
  const maxIterations = 500

  const iterate = () => {
    if (!layoutRunning || iterations >= maxIterations) {
      layoutRunning = false
      btn.textContent = 'Apply Layout'
      btn.classList.remove('bg-red-600', 'hover:bg-red-700')
      btn.classList.add('bg-blue-600', 'hover:bg-blue-700')
      return
    }

    forceAtlas2.assign(graph, { iterations: 1, settings })
    sigma.refresh()
    iterations++

    requestAnimationFrame(iterate)
  }

  iterate()
}

function updatePhysicsControlsVisibility() {
  const physicsControls = document.getElementById('physics-controls')!
  if (currentLayout === 'forceatlas2') {
    physicsControls.style.display = 'block'
  } else {
    physicsControls.style.display = 'none'
  }
}

function updatePhysicsSettings() {
  // Only applies to running ForceAtlas2 simulations
  // Settings will be picked up on next layout run
}

function updateStats() {
  const statsEl = document.getElementById('stats')!
  const nodeCount = graph.order
  const edgeCount = graph.size

  statsEl.innerHTML = `
    <div>Nodes: ${nodeCount}</div>
    <div>Edges: ${edgeCount}</div>
  `
}

function searchNodes(query: string) {
  if (!query.trim()) {
    clearHighlight()
    return
  }

  const lowerQuery = query.toLowerCase()
  const matchingNodes = graph.filterNodes((node) => {
    const attrs = graph.getNodeAttributes(node)
    return Object.values(attrs).some(val =>
      String(val).toLowerCase().includes(lowerQuery)
    )
  })

  if (matchingNodes.length > 0) {
    highlightNode(matchingNodes[0])
    displayNodeDetails(matchingNodes[0], graph.getNodeAttributes(matchingNodes[0]))
  } else {
    clearHighlight()
    clearNodeDetails()
  }
}

// Event listeners
document.getElementById('dataset-select')!.addEventListener('change', async (e) => {
  const dataset = (e.target as HTMLSelectElement).value
  const data = await loadDataset(dataset)
  initGraph(data)
})

document.getElementById('search-input')!.addEventListener('input', (e) => {
  searchNodes((e.target as HTMLInputElement).value)
})

document.getElementById('layout-select')!.addEventListener('change', (e) => {
  currentLayout = (e.target as HTMLSelectElement).value
  updatePhysicsControlsVisibility()
})

document.getElementById('layout-btn')!.addEventListener('click', applyLayout)

// Physics control event listeners
document.getElementById('gravity')!.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  physicsParams.gravity = value
  document.getElementById('gravity-value')!.textContent = value.toFixed(1)
})

document.getElementById('scaling-ratio')!.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  physicsParams.scalingRatio = value
  document.getElementById('scaling-value')!.textContent = value.toFixed(1)
})

document.getElementById('slow-down')!.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  physicsParams.slowDown = value
  document.getElementById('slowdown-value')!.textContent = value.toFixed(1)
})

document.getElementById('zoom-in')!.addEventListener('click', () => {
  const camera = sigma.getCamera()
  camera.animatedZoom({ duration: 200 })
})

document.getElementById('zoom-out')!.addEventListener('click', () => {
  const camera = sigma.getCamera()
  camera.animatedUnzoom({ duration: 200 })
})

document.getElementById('reset-view')!.addEventListener('click', () => {
  const camera = sigma.getCamera()
  camera.animatedReset({ duration: 200 })
})

// Initialize with default dataset
loadDataset('social-network').then(initGraph)
