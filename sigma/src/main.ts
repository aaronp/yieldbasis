import './style.css'
import Graph from 'graphology'
import Sigma from 'sigma'
import forceAtlas2 from 'graphology-layout-forceatlas2'

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

function initGraph(data: GraphData) {
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

  if (layoutRunning) {
    layoutRunning = false
    btn.textContent = 'Apply ForceAtlas2'
    btn.classList.remove('bg-red-600', 'hover:bg-red-700')
    btn.classList.add('bg-blue-600', 'hover:bg-blue-700')
    return
  }

  layoutRunning = true
  btn.textContent = 'Stop Layout'
  btn.classList.remove('bg-blue-600', 'hover:bg-blue-700')
  btn.classList.add('bg-red-600', 'hover:bg-red-700')

  const settings = forceAtlas2.inferSettings(graph)
  let iterations = 0
  const maxIterations = 500

  const iterate = () => {
    if (!layoutRunning || iterations >= maxIterations) {
      layoutRunning = false
      btn.textContent = 'Apply ForceAtlas2'
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

document.getElementById('layout-btn')!.addEventListener('click', applyLayout)

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
