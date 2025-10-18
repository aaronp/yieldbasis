import './style.css'
import * as d3 from 'd3'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  [key: string]: any
}

interface GraphEdge {
  source: string | GraphNode
  target: string | GraphNode
  [key: string]: any
}

interface GraphData {
  name: string
  description: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const DATASETS: Record<string, string> = {
  'social-network': '../graph-data/social-network.json',
  'hierarchy': '../graph-data/hierarchy.json',
  'dependencies': '../graph-data/dependencies.json',
  'large-network': '../graph-data/large-network.json',
}

const COLORS = d3.schemeCategory10

let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>
let g: d3.Selection<SVGGElement, unknown, HTMLElement, any>
let simulation: d3.Simulation<GraphNode, GraphEdge>
let currentData: GraphData
let currentLayout = 'force'
let zoom: d3.ZoomBehavior<SVGSVGElement, unknown>

async function loadDataset(datasetName: string): Promise<GraphData> {
  const response = await fetch(DATASETS[datasetName])
  return response.json()
}

function initSVG() {
  svg = d3.select<SVGSVGElement, unknown>('#graph-svg')

  zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 10])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)

  g = svg.append('g')
}

function renderForceDirectedGraph(data: GraphData) {
  const width = (svg.node() as SVGSVGElement).clientWidth
  const height = (svg.node() as SVGSVGElement).clientHeight

  // Clear previous content
  g.selectAll('*').remove()

  // Create color scale
  const groups = [...new Set(data.nodes.map(n => n.group || n.type || n.department || 'default'))]
  const colorScale = d3.scaleOrdinal<string>()
    .domain(groups)
    .range(COLORS)

  // Create links
  const link = g.append('g')
    .selectAll('line')
    .data(data.edges)
    .join('line')
    .attr('class', 'link')
    .attr('stroke-width', 2)

  // Create nodes
  const node = g.append('g')
    .selectAll('circle')
    .data(data.nodes)
    .join('circle')
    .attr('class', 'node')
    .attr('r', 8)
    .attr('fill', d => colorScale(d.group || d.type || d.department || 'default'))
    .call(drag(simulation) as any)
    .on('click', (event, d) => {
      event.stopPropagation()
      displayNodeDetails(d)
      highlightNode(d.id)
    })

  // Create labels
  const label = g.append('g')
    .selectAll('text')
    .data(data.nodes)
    .join('text')
    .attr('class', 'node-label')
    .attr('text-anchor', 'middle')
    .attr('dy', -12)
    .text(d => d.label)

  // Create simulation
  simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink<GraphNode, GraphEdge>(data.edges)
      .id(d => d.id)
      .distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(20))

  simulation.on('tick', () => {
    link
      .attr('x1', d => (d.source as GraphNode).x!)
      .attr('y1', d => (d.source as GraphNode).y!)
      .attr('x2', d => (d.target as GraphNode).x!)
      .attr('y2', d => (d.target as GraphNode).y!)

    node
      .attr('cx', d => d.x!)
      .attr('cy', d => d.y!)

    label
      .attr('x', d => d.x!)
      .attr('y', d => d.y!)
  })

  // Click on background to clear selection
  svg.on('click', () => {
    clearHighlight()
    clearNodeDetails()
  })

  updateStats()
}

function renderTreeLayout(data: GraphData, radial = false) {
  const width = (svg.node() as SVGSVGElement).clientWidth
  const height = (svg.node() as SVGSVGElement).clientHeight

  g.selectAll('*').remove()

  // Build hierarchy from edges
  const root = buildHierarchy(data)

  if (!root) {
    // Fallback to force layout if no clear hierarchy
    renderForceDirectedGraph(data)
    return
  }

  const treeLayout = radial
    ? d3.tree<GraphNode>().size([2 * Math.PI, Math.min(width, height) / 2 - 100])
    : d3.tree<GraphNode>().size([width - 100, height - 100])

  const treeData = treeLayout(root as any)

  const groups = [...new Set(data.nodes.map(n => n.group || n.type || n.department || 'default'))]
  const colorScale = d3.scaleOrdinal<string>()
    .domain(groups)
    .range(COLORS)

  // Links
  const linkGenerator = radial
    ? d3.linkRadial<any, any>()
        .angle(d => d.x)
        .radius(d => d.y)
    : d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x)

  g.append('g')
    .selectAll('path')
    .data(treeData.links())
    .join('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('d', linkGenerator as any)
    .attr('transform', radial ? `translate(${width / 2},${height / 2})` : 'translate(50,50)')

  // Nodes
  const nodes = g.append('g')
    .attr('transform', radial ? `translate(${width / 2},${height / 2})` : 'translate(50,50)')
    .selectAll('circle')
    .data(treeData.descendants())
    .join('circle')
    .attr('class', 'node')
    .attr('r', 8)
    .attr('fill', d => colorScale((d.data as GraphNode).group || (d.data as GraphNode).type || (d.data as GraphNode).department || 'default'))
    .attr('transform', d => radial
      ? `rotate(${(d.x as number) * 180 / Math.PI - 90}) translate(${d.y},0)`
      : `translate(${d.y},${d.x})`)
    .on('click', (event, d) => {
      event.stopPropagation()
      displayNodeDetails(d.data as GraphNode)
      highlightNode((d.data as GraphNode).id)
    })

  // Labels
  g.append('g')
    .attr('transform', radial ? `translate(${width / 2},${height / 2})` : 'translate(50,50)')
    .selectAll('text')
    .data(treeData.descendants())
    .join('text')
    .attr('class', 'node-label')
    .attr('transform', d => radial
      ? `rotate(${(d.x as number) * 180 / Math.PI - 90}) translate(${d.y},0) rotate(${(d.x as number) >= Math.PI ? 180 : 0})`
      : `translate(${d.y},${d.x})`)
    .attr('text-anchor', d => radial ? ((d.x as number) >= Math.PI ? 'end' : 'start') : 'middle')
    .attr('dy', radial ? '0.31em' : -12)
    .attr('dx', radial ? ((d.x as number) >= Math.PI ? -12 : 12) : 0)
    .text(d => (d.data as GraphNode).label)

  svg.on('click', () => {
    clearHighlight()
    clearNodeDetails()
  })

  updateStats()
}

function buildHierarchy(data: GraphData): d3.HierarchyNode<GraphNode> | null {
  // Find root nodes (nodes with no incoming edges or level 1)
  const incomingEdges = new Map<string, number>()
  data.nodes.forEach(n => incomingEdges.set(n.id, 0))
  data.edges.forEach(e => {
    const targetId = typeof e.target === 'string' ? e.target : e.target.id
    incomingEdges.set(targetId, (incomingEdges.get(targetId) || 0) + 1)
  })

  // Find potential roots
  let roots = data.nodes.filter(n =>
    incomingEdges.get(n.id) === 0 || n.level === 1
  )

  if (roots.length === 0) {
    // No clear root, pick first node
    roots = [data.nodes[0]]
  }

  // Build tree from first root
  const nodeMap = new Map(data.nodes.map(n => [n.id, { ...n, children: [] as any[] }]))

  data.edges.forEach(e => {
    const sourceId = typeof e.source === 'string' ? e.source : e.source.id
    const targetId = typeof e.target === 'string' ? e.target : e.target.id
    const parent = nodeMap.get(sourceId)
    const child = nodeMap.get(targetId)
    if (parent && child) {
      parent.children.push(child)
    }
  })

  const root = nodeMap.get(roots[0].id)
  return root ? d3.hierarchy(root as any) : null
}

function drag(simulation: d3.Simulation<GraphNode, GraphEdge>) {
  function dragstarted(event: any) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
  }

  function dragged(event: any) {
    event.subject.fx = event.x
    event.subject.fy = event.y
  }

  function dragended(event: any) {
    if (!event.active) simulation.alphaTarget(0)
    event.subject.fx = null
    event.subject.fy = null
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended)
}

function displayNodeDetails(node: GraphNode) {
  const detailsEl = document.getElementById('node-details')!
  const entries = Object.entries(node)
    .filter(([key]) => !['x', 'y', 'vx', 'vy', 'index', 'fx', 'fy', 'children'].includes(key))
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
}

function highlightNode(nodeId: string) {
  g.selectAll<SVGCircleElement, GraphNode>('circle.node')
    .attr('opacity', d => d.id === nodeId ? 1 : 0.2)
    .attr('r', d => d.id === nodeId ? 12 : 8)

  g.selectAll<SVGLineElement, GraphEdge>('line.link')
    .attr('opacity', d => {
      const sourceId = typeof d.source === 'string' ? d.source : d.source.id
      const targetId = typeof d.target === 'string' ? d.target : d.target.id
      return (sourceId === nodeId || targetId === nodeId) ? 1 : 0.1
    })
    .attr('stroke-width', d => {
      const sourceId = typeof d.source === 'string' ? d.source : d.source.id
      const targetId = typeof d.target === 'string' ? d.target : d.target.id
      return (sourceId === nodeId || targetId === nodeId) ? 4 : 2
    })

  g.selectAll<SVGPathElement, any>('path.link')
    .attr('opacity', d => {
      const sourceId = d.source.data.id
      const targetId = d.target.data.id
      return (sourceId === nodeId || targetId === nodeId) ? 1 : 0.1
    })
    .attr('stroke-width', d => {
      const sourceId = d.source.data.id
      const targetId = d.target.data.id
      return (sourceId === nodeId || targetId === nodeId) ? 4 : 2
    })
}

function clearHighlight() {
  g.selectAll('circle.node')
    .attr('opacity', 1)
    .attr('r', 8)

  g.selectAll('line.link, path.link')
    .attr('opacity', 1)
    .attr('stroke-width', 2)
}

function updateStats() {
  const statsEl = document.getElementById('stats')!
  statsEl.innerHTML = `
    <div>Nodes: ${currentData.nodes.length}</div>
    <div>Edges: ${currentData.edges.length}</div>
    <div>Layout: ${currentLayout}</div>
  `
}

function searchNodes(query: string) {
  if (!query.trim()) {
    clearHighlight()
    return
  }

  const lowerQuery = query.toLowerCase()
  const matchingNode = currentData.nodes.find(node =>
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

function renderGraph() {
  if (currentLayout === 'force') {
    renderForceDirectedGraph(currentData)
  } else if (currentLayout === 'tree') {
    renderTreeLayout(currentData, false)
  } else if (currentLayout === 'radial') {
    renderTreeLayout(currentData, true)
  }
}

// Event listeners
document.getElementById('dataset-select')!.addEventListener('change', async (e) => {
  const dataset = (e.target as HTMLSelectElement).value
  currentData = await loadDataset(dataset)
  renderGraph()
})

document.getElementById('search-input')!.addEventListener('input', (e) => {
  searchNodes((e.target as HTMLInputElement).value)
})

document.getElementById('layout-select')!.addEventListener('change', (e) => {
  currentLayout = (e.target as HTMLSelectElement).value
  renderGraph()
})

document.getElementById('restart-simulation')!.addEventListener('click', () => {
  if (simulation) {
    simulation.alpha(1).restart()
  } else {
    renderGraph()
  }
})

document.getElementById('zoom-in')!.addEventListener('click', () => {
  svg.transition().call(zoom.scaleBy as any, 1.3)
})

document.getElementById('zoom-out')!.addEventListener('click', () => {
  svg.transition().call(zoom.scaleBy as any, 0.7)
})

document.getElementById('reset-view')!.addEventListener('click', () => {
  svg.transition().call(zoom.transform as any, d3.zoomIdentity)
})

// Initialize
initSVG()
loadDataset('social-network').then(data => {
  currentData = data
  renderGraph()
})
