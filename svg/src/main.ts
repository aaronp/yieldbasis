import './style.css'

interface Node {
  id: string
  label: string
  x: number
  y: number
  [key: string]: any
}

interface Edge {
  source: string
  target: string
  [key: string]: any
}

interface GraphData {
  name: string
  description: string
  nodes: Array<{
    id: string
    label: string
    [key: string]: any
  }>
  edges: Edge[]
}

const DATASETS: Record<string, string> = {
  'social-network': '/graph-data/social-network.json',
  'hierarchy': '/graph-data/hierarchy.json',
  'dependencies': '/graph-data/dependencies.json',
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
]

let svg: SVGSVGElement
let nodes: Node[] = []
let edges: Edge[] = []
let currentData: GraphData
let selectedNode: string | null = null
let draggedNode: Node | null = null
let dragOffset = { x: 0, y: 0 }
let physicsEnabled = true

const SVG_NS = 'http://www.w3.org/2000/svg'

// Physics parameters
const SPRING_STRENGTH = 0.15
const DAMPING = 0.85

async function loadDataset(datasetName: string): Promise<GraphData> {
  const response = await fetch(DATASETS[datasetName])
  return response.json()
}

function initSVG() {
  svg = document.getElementById('graph-svg') as SVGSVGElement
}

function getGroupColor(node: any): string {
  const groupKey = node.group || node.type || node.department || 'default'
  const groups = [...new Set(nodes.map(n => n.group || n.type || n.department || 'default'))]
  const index = groups.indexOf(groupKey)
  return COLORS[index % COLORS.length]
}

function createCircularLayout(nodeCount: number, width: number, height: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.35

  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * 2 * Math.PI - Math.PI / 2
    positions.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    })
  }

  return positions
}

function createGridLayout(nodeCount: number, width: number, height: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  const cols = Math.ceil(Math.sqrt(nodeCount))
  const rows = Math.ceil(nodeCount / cols)
  const cellWidth = (width - 100) / cols
  const cellHeight = (height - 100) / rows

  for (let i = 0; i < nodeCount; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    positions.push({
      x: 50 + col * cellWidth + cellWidth / 2,
      y: 50 + row * cellHeight + cellHeight / 2,
    })
  }

  return positions
}

function createRandomLayout(nodeCount: number, width: number, height: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  const margin = 50

  for (let i = 0; i < nodeCount; i++) {
    positions.push({
      x: margin + Math.random() * (width - 2 * margin),
      y: margin + Math.random() * (height - 2 * margin),
    })
  }

  return positions
}

function applyLayout(layout: string) {
  const width = svg.clientWidth
  const height = svg.clientHeight

  let positions: { x: number; y: number }[]

  switch (layout) {
    case 'circular':
      positions = createCircularLayout(nodes.length, width, height)
      break
    case 'grid':
      positions = createGridLayout(nodes.length, width, height)
      break
    case 'random':
      positions = createRandomLayout(nodes.length, width, height)
      break
    default:
      positions = createCircularLayout(nodes.length, width, height)
  }

  nodes.forEach((node, i) => {
    node.x = positions[i].x
    node.y = positions[i].y
  })

  renderGraph()
}

function renderGraph() {
  // Clear SVG
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild)
  }

  // Create edges group
  const edgesGroup = document.createElementNS(SVG_NS, 'g')
  edgesGroup.setAttribute('class', 'edges')

  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)

    if (sourceNode && targetNode) {
      const line = document.createElementNS(SVG_NS, 'line')
      line.setAttribute('class', 'graph-edge')
      line.setAttribute('x1', sourceNode.x.toString())
      line.setAttribute('y1', sourceNode.y.toString())
      line.setAttribute('x2', targetNode.x.toString())
      line.setAttribute('y2', targetNode.y.toString())
      line.setAttribute('data-source', edge.source)
      line.setAttribute('data-target', edge.target)
      edgesGroup.appendChild(line)
    }
  })

  svg.appendChild(edgesGroup)

  // Create nodes group
  const nodesGroup = document.createElementNS(SVG_NS, 'g')
  nodesGroup.setAttribute('class', 'nodes')

  nodes.forEach(node => {
    // Node circle
    const circle = document.createElementNS(SVG_NS, 'circle')
    circle.setAttribute('class', 'graph-node')
    circle.setAttribute('cx', node.x.toString())
    circle.setAttribute('cy', node.y.toString())
    circle.setAttribute('r', '10')
    circle.setAttribute('fill', getGroupColor(node))
    circle.setAttribute('data-id', node.id)

    // Event listeners for dragging
    circle.addEventListener('mousedown', (e) => handleMouseDown(e, node))
    circle.addEventListener('click', (e) => {
      e.stopPropagation()
      handleNodeClick(node)
    })

    nodesGroup.appendChild(circle)

    // Node label
    const label = document.createElementNS(SVG_NS, 'text')
    label.setAttribute('class', 'graph-label')
    label.setAttribute('x', node.x.toString())
    label.setAttribute('y', (node.y - 15).toString())
    label.textContent = node.label
    label.setAttribute('data-id', node.id)

    nodesGroup.appendChild(label)
  })

  svg.appendChild(nodesGroup)

  // Add SVG event listeners
  svg.addEventListener('mousemove', handleMouseMove)
  svg.addEventListener('mouseup', handleMouseUp)
  svg.addEventListener('click', () => {
    clearHighlight()
    clearNodeDetails()
  })

  updateStats()
}

function handleMouseDown(e: MouseEvent, node: Node) {
  e.preventDefault()
  draggedNode = node
  const point = getSVGCoordinates(e)
  dragOffset.x = point.x - node.x
  dragOffset.y = point.y - node.y
}

function handleMouseMove(e: MouseEvent) {
  if (!draggedNode) return

  const point = getSVGCoordinates(e)
  const newX = point.x - dragOffset.x
  const newY = point.y - dragOffset.y

  const deltaX = newX - draggedNode.x
  const deltaY = newY - draggedNode.y

  draggedNode.x = newX
  draggedNode.y = newY

  // Apply physics to connected nodes if enabled
  if (physicsEnabled) {
    applySpringPhysics(draggedNode.id, deltaX, deltaY)
  }

  // Update node position
  const circle = svg.querySelector(`circle[data-id="${draggedNode.id}"]`)
  const label = svg.querySelector(`text[data-id="${draggedNode.id}"]`)

  if (circle) {
    circle.setAttribute('cx', draggedNode.x.toString())
    circle.setAttribute('cy', draggedNode.y.toString())
  }

  if (label) {
    label.setAttribute('x', draggedNode.x.toString())
    label.setAttribute('y', (draggedNode.y - 15).toString())
  }

  // Update connected edges
  updateEdges(draggedNode.id)
}

function handleMouseUp() {
  draggedNode = null
}

function getSVGCoordinates(e: MouseEvent): { x: number; y: number } {
  const rect = svg.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function applySpringPhysics(draggedNodeId: string, deltaX: number, deltaY: number) {
  // Find connected nodes
  const connectedNodeIds = new Set<string>()
  edges.forEach(edge => {
    if (edge.source === draggedNodeId) {
      connectedNodeIds.add(edge.target)
    } else if (edge.target === draggedNodeId) {
      connectedNodeIds.add(edge.source)
    }
  })

  // Apply spring force to connected nodes
  connectedNodeIds.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    // Apply damped spring force
    const springForceX = deltaX * SPRING_STRENGTH
    const springForceY = deltaY * SPRING_STRENGTH

    node.x += springForceX
    node.y += springForceY

    // Update visual position
    const circle = svg.querySelector(`circle[data-id="${nodeId}"]`)
    const label = svg.querySelector(`text[data-id="${nodeId}"]`)

    if (circle) {
      circle.setAttribute('cx', node.x.toString())
      circle.setAttribute('cy', node.y.toString())
    }

    if (label) {
      label.setAttribute('x', node.x.toString())
      label.setAttribute('y', (node.y - 15).toString())
    }

    // Update edges connected to this node
    updateEdges(nodeId)
  })
}

function updateEdges(nodeId: string) {
  edges.forEach(edge => {
    if (edge.source === nodeId || edge.target === nodeId) {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)

      if (sourceNode && targetNode) {
        const line = svg.querySelector(`line[data-source="${edge.source}"][data-target="${edge.target}"]`)
        if (line) {
          line.setAttribute('x1', sourceNode.x.toString())
          line.setAttribute('y1', sourceNode.y.toString())
          line.setAttribute('x2', targetNode.x.toString())
          line.setAttribute('y2', targetNode.y.toString())
        }
      }
    }
  })
}

function handleNodeClick(node: Node) {
  selectedNode = node.id
  displayNodeDetails(node)
  highlightNode(node.id)
}

function displayNodeDetails(node: Node) {
  const detailsEl = document.getElementById('node-details')!
  const entries = Object.entries(node)
    .filter(([key]) => !['x', 'y'].includes(key))
    .map(([key, value]) => `<div class="mb-1"><span class="font-medium">${key}:</span> ${value}</div>`)
    .join('')

  detailsEl.innerHTML = `
    <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
      <div class="font-bold text-blue-900 mb-2">${node.id}</div>
      ${entries}
    </div>
  `
}

function clearNodeDetails() {
  const detailsEl = document.getElementById('node-details')!
  detailsEl.innerHTML = '<div class="text-gray-500 italic">Click on a node to see details</div>'
  selectedNode = null
}

function highlightNode(nodeId: string) {
  // Reset all nodes
  svg.querySelectorAll('.graph-node').forEach(circle => {
    circle.setAttribute('opacity', '0.2')
    circle.setAttribute('r', '8')
  })

  // Highlight selected node
  const selectedCircle = svg.querySelector(`circle[data-id="${nodeId}"]`)
  if (selectedCircle) {
    selectedCircle.setAttribute('opacity', '1')
    selectedCircle.setAttribute('r', '14')
  }

  // Highlight connected edges
  svg.querySelectorAll('.graph-edge').forEach(line => {
    const source = line.getAttribute('data-source')
    const target = line.getAttribute('data-target')

    if (source === nodeId || target === nodeId) {
      line.setAttribute('stroke', '#3b82f6')
      line.setAttribute('stroke-width', '4')
      line.setAttribute('opacity', '1')

      // Highlight connected nodes
      const connectedId = source === nodeId ? target : source
      const connectedCircle = svg.querySelector(`circle[data-id="${connectedId}"]`)
      if (connectedCircle) {
        connectedCircle.setAttribute('opacity', '0.6')
      }
    } else {
      line.setAttribute('opacity', '0.1')
    }
  })
}

function clearHighlight() {
  svg.querySelectorAll('.graph-node').forEach(circle => {
    circle.setAttribute('opacity', '1')
    circle.setAttribute('r', '10')
  })

  svg.querySelectorAll('.graph-edge').forEach(line => {
    line.setAttribute('stroke', '#cbd5e1')
    line.setAttribute('stroke-width', '2')
    line.setAttribute('opacity', '1')
  })
}

function updateStats() {
  const statsEl = document.getElementById('stats')!
  statsEl.innerHTML = `
    <div>Nodes: ${nodes.length}</div>
    <div>Edges: ${edges.length}</div>
  `
}

function searchNodes(query: string) {
  if (!query.trim()) {
    clearHighlight()
    return
  }

  const lowerQuery = query.toLowerCase()
  const matchingNode = nodes.find(node =>
    Object.values(node).some(val =>
      String(val).toLowerCase().includes(lowerQuery)
    )
  )

  if (matchingNode) {
    highlightNode(matchingNode.id)
    displayNodeDetails(matchingNode)
  } else {
    clearHighlight()
    clearNodeDetails()
  }
}

async function loadAndRender(datasetName: string) {
  currentData = await loadDataset(datasetName)

  // Initialize nodes with positions
  const width = svg.clientWidth
  const height = svg.clientHeight
  const positions = createCircularLayout(currentData.nodes.length, width, height)

  nodes = currentData.nodes.map((node, i) => ({
    ...node,
    x: positions[i].x,
    y: positions[i].y,
  }))

  edges = currentData.edges

  renderGraph()
}

// Event listeners
document.getElementById('dataset-select')!.addEventListener('change', async (e) => {
  const dataset = (e.target as HTMLSelectElement).value
  await loadAndRender(dataset)
})

document.getElementById('search-input')!.addEventListener('input', (e) => {
  searchNodes((e.target as HTMLInputElement).value)
})

document.getElementById('layout-select')!.addEventListener('change', (e) => {
  const layout = (e.target as HTMLSelectElement).value
  applyLayout(layout)
})

document.getElementById('apply-layout')!.addEventListener('click', () => {
  const layout = (document.getElementById('layout-select') as HTMLSelectElement).value
  applyLayout(layout)
})

document.getElementById('physics-toggle')!.addEventListener('change', (e) => {
  physicsEnabled = (e.target as HTMLInputElement).checked
})

// Initialize
initSVG()
loadAndRender('social-network')
