import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ForceGraph2D from "react-force-graph-2d";
import {
  Search, Users, MessageSquare, ChevronLeft, ChevronRight, X,
  Menu, User, Settings, ArrowDownRight, ArrowUpRight, GripHorizontal, GripVertical
} from "lucide-react";

// --- Mock chat data ----------------------------------------------------------
const CONTACTS = [
  { id: "alice", name: "Alice", color: "bg-rose-500" },
  { id: "bob", name: "Bob", color: "bg-sky-500" },
  { id: "carol", name: "Carol", color: "bg-emerald-500" },
  { id: "dave", name: "Dave", color: "bg-amber-500" },
];

const GROUPS = [
  { id: "family", name: "Family", color: "bg-indigo-500" },
  { id: "product", name: "Product", color: "bg-fuchsia-500" },
  { id: "friends", name: "Friends", color: "bg-teal-500" },
  { id: "band", name: "Band", color: "bg-cyan-500" },
];

// Extended relationship data for graph expansion
const RELATIONSHIPS = {
  // Contacts to groups
  alice: ["family", "product", "friends"],
  bob: ["product", "friends", "band"],
  carol: ["family", "friends"],
  dave: ["band", "friends"],

  // Groups to contacts (reverse relationships)
  family: ["alice", "carol"],
  product: ["alice", "bob"],
  friends: ["alice", "bob", "carol", "dave"],
  band: ["bob", "dave"],
};

const MESSAGES = {
  alice: [
    { id: "m1", from: "Alice", text: "Hey! Did you see the new design?", dt: "10:02" },
    { id: "m2", from: "Me", text: "Looks slick. Let's ship it.", dt: "10:05" },
    { id: "m9", from: "Me", text: "Paid £18.50 for lunch", dt: "12:45" },
    { id: "m10", from: "Me", text: "Received £250 for freelance", dt: "13:20" },
  ],
  bob: [
    { id: "m3", from: "Bob", text: "Lunch today?", dt: "12:11" },
    { id: "m4", from: "Me", text: "Down for 1pm.", dt: "12:14" },
  ],
  carol: [
    { id: "m5", from: "Carol", text: "PTA notes attached.", dt: "08:41" },
    { id: "m6", from: "Me", text: "Got them, thanks!", dt: "08:55" },
  ],
  dave: [
    { id: "m7", from: "Dave", text: "Gig tonight 🥁", dt: "17:20" },
    { id: "m8", from: "Me", text: "Soundcheck 6pm.", dt: "17:22" },
  ],
};

const INITIAL_ACCOUNTS = [
  { id: "cash", name: "Cash", color: "bg-amber-500" },
  { id: "family", name: "Family Budget", color: "bg-indigo-500" },
  { id: "savings", name: "Savings", color: "bg-emerald-500" },
];

// --- Helpers ----------------------------------------------------------------
function clsx(...xs) { return xs.filter(Boolean).join(" "); }

function parseGBP(text) {
  const m = text.replace(/,/g, "").match(/£\s*(\d+(?:\.\d{1,2})?)/i);
  return m ? Number(m[1]) : null;
}
function formatGBP(n) { return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" }); }

const __twBgCache = new Map();
function getTailwindBgColor(twBgClass) {
  if (!twBgClass) return null;
  if (__twBgCache.has(twBgClass)) return __twBgCache.get(twBgClass);
  if (typeof document === "undefined") return null;
  const probe = document.createElement("div");
  probe.className = twBgClass;
  probe.style.position = "absolute"; probe.style.left = "-99999px"; probe.style.top = "-99999px";
  probe.style.width = "1px"; probe.style.height = "1px";
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).backgroundColor;
  document.body.removeChild(probe);
  if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
    __twBgCache.set(twBgClass, color);
    return color;
  }
  return null;
}

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// Graph building helpers
function getNodeInfo(nodeId) {
  const [kind, id] = nodeId.split(":");
  if (kind === "contact") {
    const contact = CONTACTS.find((c) => c.id === id);
    return { id: nodeId, label: contact.name, kind: "contact", color: contact.color, rawId: id };
  } else if (kind === "group") {
    const group = GROUPS.find((g) => g.id === id);
    return { id: nodeId, label: group.name, kind: "group", color: group.color, rawId: id };
  }
  return null;
}

function getRelationships(nodeId) {
  const [kind, id] = nodeId.split(":");
  const related = RELATIONSHIPS[id] || [];
  if (kind === "contact") {
    return related.map((gId) => `group:${gId}`);
  } else if (kind === "group") {
    return related.map((cId) => `contact:${cId}`);
  }
  return [];
}

function buildGraphWithDepth(focusNodeId, expandedNodeIds, maxDepth) {
  const nodes = new Map();
  const links = new Set();
  const distances = new Map();

  // First pass: BFS from focus node to calculate distances
  const queue = [[focusNodeId, 0]];
  const visited = new Set([focusNodeId]);
  distances.set(focusNodeId, 0);

  while (queue.length > 0) {
    const [nodeId, dist] = queue.shift();

    // Add all relationships for expanded nodes (to build complete graph)
    if (expandedNodeIds.has(nodeId)) {
      const related = getRelationships(nodeId);

      for (const relatedId of related) {
        // Add link
        const linkKey = [nodeId, relatedId].sort().join(":");
        links.add(linkKey);

        // Calculate distance for related node if not visited
        if (!visited.has(relatedId)) {
          visited.add(relatedId);
          const relatedDist = dist + 1;

          // Store minimum distance
          if (!distances.has(relatedId) || relatedDist < distances.get(relatedId)) {
            distances.set(relatedId, relatedDist);
          }

          queue.push([relatedId, relatedDist]);
        }
      }
    }
  }

  // Second pass: build nodes and links, filtering by maxDepth from focus
  for (const [nodeId, dist] of distances.entries()) {
    if (dist <= maxDepth) {
      const nodeInfo = getNodeInfo(nodeId);
      if (nodeInfo) {
        nodes.set(nodeId, { ...nodeInfo, distance: dist });
      }
    }
  }

  // Filter links to only include nodes within maxDepth
  const filteredLinks = [];
  for (const linkKey of links) {
    const [source, target] = linkKey.split(":");
    const fullSource = source + ":" + linkKey.split(":")[1];
    const fullTarget = linkKey.split(":").slice(2).join(":");

    // Reconstruct original node IDs
    const parts = linkKey.split(":");
    let sourceId = parts[0] + ":" + parts[1];
    let targetId = parts[2] + ":" + parts[3];

    if (nodes.has(sourceId) && nodes.has(targetId)) {
      filteredLinks.push({ source: sourceId, target: targetId });
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    links: filteredLinks
  };
}

// --- Main App Component ------------------------------------------------------
export default function App() {
  // Navigation state
  const [navOpen, setNavOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [activeContactId, setActiveContactId] = useState(CONTACTS[0].id);
  const [selectedNode, setSelectedNode] = useState(null);

  // Graph state
  const [expandedNodes, setExpandedNodes] = useState(new Set([`contact:${CONTACTS[0].id}`]));
  const [focusNode, setFocusNode] = useState(`contact:${CONTACTS[0].id}`); // Node to measure depth from
  const [maxDepth, setMaxDepth] = useState(3);

  // Graph physics settings
  const [graphSettings, setGraphSettings] = useState({
    chargeStrength: -300,
    linkDistance: 80,
    centerStrength: 0.3,
    cooldownTicks: 0, // 0 = continuous
    warmupTicks: 100,
    velocityDecay: 0.4,
  });

  // Details panel state
  const [detailsSplit, setDetailsSplit] = useState(50); // percentage for graph row
  const [detailsWidth, setDetailsWidth] = useState(400); // width in pixels

  // Budget data
  const [accounts, setAccounts] = useState({ cash: 500, family: 1200, savings: 3000 });
  const [txs, setTxs] = useState([]);
  const [coins, setCoins] = useState([]);

  // Status message
  const [status, setStatus] = useState("Ready");

  // Refs
  const msgRefs = useRef({});
  const acctRefs = useRef({ cash: null, family: null, savings: null });
  const [viewport, setViewport] = useState({ x: 0, y: 0 });

  const activeMessages = useMemo(() => MESSAGES[activeContactId] ?? [], [activeContactId]);
  const activeContact = useMemo(() => CONTACTS.find((c) => c.id === activeContactId), [activeContactId]);

  // Reset graph when active contact changes
  useEffect(() => {
    const contactNodeId = `contact:${activeContactId}`;
    setFocusNode(contactNodeId);
    setExpandedNodes(new Set([contactNodeId]));
    setSelectedNode(null);
  }, [activeContactId]);

  useLayoutEffect(() => {
    const onScroll = () => setViewport({ x: window.scrollX, y: window.scrollY });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Budget actions
  function addTxFromMessage(msgId) {
    const msg = activeMessages.find((m) => m.id === msgId);
    if (!msg) return;
    const amt = parseGBP(msg.text);
    const lower = msg.text.toLowerCase();
    const isExpense = /(paid|bought|spent)/.test(lower);
    const isIncome = /(received|got paid|salary|income)/.test(lower);
    const amount = amt ?? 20;

    const tx = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      typ: isIncome ? "income" : isExpense ? "expense" : "expense",
      amount,
      desc: msg.text,
      from: isIncome ? "family" : "cash",
      to: isIncome ? "cash" : "family",
      dt: new Date().toISOString(),
      srcMessageId: msg.id,
    };

    const srcEl = msgRefs.current[msg.id];
    const dstEl = acctRefs.current[tx.typ === "income" ? tx.to : tx.from];
    if (srcEl && dstEl) {
      const s = centerOf(srcEl); const d = centerOf(dstEl);
      const id = tx.id;
      setCoins((cs) => [...cs, { id, x: s.x, y: s.y, amount: tx.amount }]);
      setTimeout(() => {
        setAccounts((a) => {
          const next = { ...a };
          if (tx.typ === "income") { next[tx.to] += tx.amount; }
          else if (tx.typ === "expense") { next[tx.from] -= tx.amount; }
          return next;
        });
        setCoins((cs) => cs.filter((c) => c.id !== id));
      }, 650);
    } else {
      setAccounts((a) => {
        const next = { ...a };
        if (tx.typ === "income") { next[tx.to] += tx.amount; }
        else if (tx.typ === "expense") { next[tx.from] -= tx.amount; }
        return next;
      });
    }
    setTxs((xs) => [tx, ...xs]);
    setStatus(`Added ${tx.typ} transaction: ${formatGBP(tx.amount)}`);
  }

  // Calculate column widths
  const navWidth = navOpen ? 280 : 0;

  return (
    <div className="w-full h-full bg-zinc-950 text-zinc-100 flex flex-col">
      {/* AppBar */}
      <AppBar
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
      />

      {/* Main content row */}
      <div className="flex-1 flex overflow-hidden">
        {/* Nav Column */}
        <NavColumn
          navOpen={navOpen}
          activeContactId={activeContactId}
          setActiveContactId={setActiveContactId}
          setStatus={setStatus}
        />

        {/* Chat Column */}
        <ChatColumn
          chatOpen={chatOpen}
          activeContact={activeContact}
          activeMessages={activeMessages}
          msgRefs={msgRefs}
          addTxFromMessage={addTxFromMessage}
          coins={coins}
          txs={txs}
          acctRefs={acctRefs}
          viewport={viewport}
        />

        {/* Vertical Resize Handle */}
        <VerticalResizeHandle
          detailsWidth={detailsWidth}
          setDetailsWidth={setDetailsWidth}
          navOpen={navOpen}
        />

        {/* Details Column */}
        <DetailsColumn
          activeContact={activeContact}
          detailsSplit={detailsSplit}
          setDetailsSplit={setDetailsSplit}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          accounts={accounts}
          acctRefs={acctRefs}
          txs={txs}
          detailsWidth={detailsWidth}
          expandedNodes={expandedNodes}
          setExpandedNodes={setExpandedNodes}
          focusNode={focusNode}
          setFocusNode={setFocusNode}
          maxDepth={maxDepth}
          setMaxDepth={setMaxDepth}
          graphSettings={graphSettings}
          setGraphSettings={setGraphSettings}
          setStatus={setStatus}
        />
      </div>

      {/* Footer */}
      <Footer status={status} />
    </div>
  );
}

// --- AppBar Component --------------------------------------------------------
function AppBar({ navOpen, setNavOpen, chatOpen, setChatOpen }) {
  return (
    <div className="h-14 border-b border-zinc-800 flex items-center px-4 gap-3 bg-zinc-900/50 backdrop-blur-sm">
      <button
        onClick={() => setNavOpen(!navOpen)}
        className="p-2 rounded-lg hover:bg-zinc-800 transition"
        aria-label="Toggle navigation"
      >
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-indigo-400" />
        <span className="font-semibold">Immersive Chat</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            className="pl-9 pr-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 w-64"
            placeholder="Search messages..."
          />
        </div>

        <button className="p-2 rounded-lg hover:bg-zinc-800 transition">
          <Settings size={18} />
        </button>

        <button className="p-2 rounded-lg hover:bg-zinc-800 transition">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-semibold">
            U
          </div>
        </button>
      </div>
    </div>
  );
}

// --- NavColumn Component -----------------------------------------------------
function NavColumn({ navOpen, activeContactId, setActiveContactId, setStatus }) {
  return (
    <motion.aside
      className="h-full border-r border-zinc-800 bg-zinc-900/30 overflow-hidden flex-shrink-0"
      animate={{ opacity: navOpen ? 1 : 0, width: navOpen ? 280 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <div className="text-xs uppercase tracking-wide text-zinc-400 mb-3">Contacts</div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {CONTACTS.map((c) => (
            <motion.button
              key={c.id}
              onClick={() => {
                setActiveContactId(c.id);
                setStatus(`Switched to ${c.name}`);
              }}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition border",
                activeContactId === c.id
                  ? "bg-zinc-800 border-zinc-700 shadow-lg"
                  : "bg-zinc-900/40 hover:bg-zinc-800/60 border-transparent"
              )}
            >
              <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold", c.color)}>
                {c.name.at(0)}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-zinc-400">Active now</div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="text-xs uppercase tracking-wide text-zinc-400 mb-3">Groups</div>
          <div className="space-y-1">
            {GROUPS.slice(0, 2).map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/40 border border-zinc-800 text-xs"
              >
                <Users size={14} className="opacity-70" />
                <span>{g.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

// --- ChatColumn Component ----------------------------------------------------
function ChatColumn({
  chatOpen, activeContact, activeMessages, msgRefs,
  addTxFromMessage, coins, txs, acctRefs, viewport
}) {
  return (
    <section className="h-full overflow-hidden relative flex-1 min-w-0">
      {/* Added flex-1 and min-w-0 for proper flex behavior */}
      <div className="h-full grid grid-rows-[auto_1fr_auto]">
        {/* Chat header */}
        <div className="h-14 border-b border-zinc-800 flex items-center gap-3 px-4 bg-zinc-900/20">
          <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold", activeContact.color)}>
            {activeContact.name.at(0)}
          </div>
          <div>
            <div className="text-sm font-semibold">{activeContact.name}</div>
            <div className="text-xs text-zinc-500">Online</div>
          </div>
        </div>

        {/* Message list */}
        <div className="overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-zinc-950 to-zinc-900/30 relative">
          {activeMessages.map((m) => (
            <div
              key={m.id}
              ref={(el) => (msgRefs.current[m.id] = el)}
              className={clsx(
                "group max-w-[70%] rounded-2xl px-4 py-2 border relative",
                m.from === "Me"
                  ? "ml-auto bg-indigo-600/20 border-indigo-500/30"
                  : "bg-zinc-800/50 border-zinc-700/50"
              )}
            >
              <div className="text-xs opacity-60 mb-1 flex items-center gap-2">
                <span>{m.from} • {m.dt}</span>
                <button
                  onClick={() => addTxFromMessage(m.id)}
                  className="opacity-0 group-hover:opacity-100 transition px-2 py-0.5 text-[10px] rounded-md bg-emerald-600/80 hover:bg-emerald-500"
                >
                  💰 Budget
                </button>
              </div>
              <p className="text-sm leading-relaxed select-text">{m.text}</p>
            </div>
          ))}

          {/* Floating coins */}
          <div className="pointer-events-none absolute inset-0 z-10">
            {coins.map((c) => (
              <Coin
                key={c.id}
                id={c.id}
                amount={c.amount}
                fromEl={msgRefs.current[txs.find(t=>t.id===c.id)?.srcMessageId ?? ""]}
                toEl={acctRefs.current[(txs.find(t=>t.id===c.id)?.typ === 'income' ? (txs.find(t=>t.id===c.id)?.to) : (txs.find(t=>t.id===c.id)?.from)) || 'cash']}
                viewport={viewport}
              />
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-zinc-800 p-3 flex items-center gap-2 bg-zinc-900/30">
          <input
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
            placeholder={`Message ${activeContact.name}...`}
          />
          <button className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 transition font-medium">
            Send
          </button>
        </div>
      </div>
    </section>
  );
}

// --- VerticalResizeHandle Component -----------------------------------------
function VerticalResizeHandle({ detailsWidth, setDetailsWidth, navOpen }) {
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      // Calculate available width (accounting for nav column)
      const navWidth = navOpen ? 280 : 0; // width of nav when open
      const minChatWidth = 200; // minimum chat width
      const minDetailsWidth = 300; // minimum details width

      const newWidth = window.innerWidth - e.clientX;
      const maxDetailsWidth = window.innerWidth - navWidth - minChatWidth;

      setDetailsWidth(Math.max(minDetailsWidth, Math.min(maxDetailsWidth, newWidth)));
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setDetailsWidth]);

  return (
    <div
      ref={containerRef}
      className="w-1 bg-zinc-800 hover:bg-indigo-600 cursor-col-resize transition flex items-center justify-center group flex-shrink-0"
      onMouseDown={() => setIsResizing(true)}
    >
      <GripVertical size={14} className="opacity-0 group-hover:opacity-50 transition" />
    </div>
  );
}

// --- DetailsColumn Component -------------------------------------------------
function DetailsColumn({
  activeContact, detailsSplit, setDetailsSplit, selectedNode,
  setSelectedNode, accounts, acctRefs, txs, detailsWidth,
  expandedNodes, setExpandedNodes, focusNode, setFocusNode,
  maxDepth, setMaxDepth, graphSettings, setGraphSettings, setStatus
}) {
  const graphContainerRef = useRef(null);
  const graphRef = useRef(null);
  const [graphDims, setGraphDims] = useState({ w: 380, h: 300 });
  const resizeRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prevGraphData, setPrevGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const resize = () => {
      const rect = el.getBoundingClientRect();
      setGraphDims({ w: Math.max(300, rect.width - 32), h: Math.max(200, rect.height - 80) });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [detailsSplit]);

  // Resizing logic
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const container = resizeRef.current?.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const percent = (y / rect.height) * 100;
      setDetailsSplit(Math.max(20, Math.min(80, percent)));
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const graphData = useMemo(() => {
    const newData = buildGraphWithDepth(focusNode, expandedNodes, maxDepth);

    // Position new nodes at their parent's location for smooth expansion
    if (graphRef.current && prevGraphData.nodes.length > 0) {
      const prevNodeMap = new Map(prevGraphData.nodes.map(n => [n.id, n]));

      newData.nodes.forEach(node => {
        const prevNode = prevNodeMap.get(node.id);
        if (prevNode) {
          // Preserve position for existing nodes
          node.x = prevNode.x;
          node.y = prevNode.y;
          node.vx = prevNode.vx || 0;
          node.vy = prevNode.vy || 0;
        } else {
          // New node - find parent and position it there
          const parentLink = newData.links.find(l =>
            (l.target === node.id || l.target.id === node.id) &&
            prevNodeMap.has(typeof l.source === 'object' ? l.source.id : l.source)
          );

          if (parentLink) {
            const parentId = typeof parentLink.source === 'object' ? parentLink.source.id : parentLink.source;
            const parent = prevNodeMap.get(parentId);
            if (parent) {
              node.x = parent.x;
              node.y = parent.y;
              node.vx = 0;
              node.vy = 0;
            }
          }
        }
      });
    }

    setPrevGraphData(newData);
    return newData;
  }, [focusNode, expandedNodes, maxDepth]);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setFocusNode(node.id); // Change focus to clicked node

    // Expand this node if not already expanded
    if (!expandedNodes.has(node.id)) {
      setExpandedNodes(new Set([...expandedNodes, node.id]));
      setStatus(`Expanded ${node.label} - now focused, showing relationships within depth ${maxDepth}`);
    } else {
      setStatus(`Focused on ${node.label} - depth ${maxDepth}`);
    }
  };

  const handleRefocus = () => {
    if (!selectedNode) return;

    // Refocus: center on selected node and expand its immediate connections
    setFocusNode(selectedNode.id);
    const related = getRelationships(selectedNode.id);
    const newExpanded = new Set([selectedNode.id, ...related]);
    setExpandedNodes(newExpanded);
    setStatus(`Refocused on ${selectedNode.label} - expanded immediate connections`);
  };

  return (
    <aside className="h-full bg-zinc-900/20 flex flex-col flex-shrink-0" style={{ width: `${detailsWidth}px` }}>
      {/* Graph row */}
      <div
        ref={graphContainerRef}
        className="border-b border-zinc-800 overflow-hidden flex flex-col"
        style={{ height: `${detailsSplit}%` }}
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-400">Relationship Graph</div>
            <div className="text-xs text-zinc-500 mt-1">
              {selectedNode ? `Focused on ${selectedNode.label}` : `${activeContact.name}'s network`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 transition border border-zinc-700"
            >
              {settingsOpen ? 'Hide' : 'Show'} Settings
            </button>
            {selectedNode && (
              <button
                onClick={handleRefocus}
                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 transition font-medium"
              >
                Refocus
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 relative">
          <ForceGraph2D
            ref={graphRef}
            width={graphDims.w}
            height={graphDims.h}
            graphData={graphData}
            nodeLabel={(n) => {
              const isFocus = n.id === focusNode;
              const isExpanded = expandedNodes.has(n.id);
              const dist = n.distance || 0;
              return `${n.label} (${n.kind}) | Distance: ${dist}${isFocus ? ' [FOCUS]' : ''}${isExpanded ? ' [Expanded]' : ' [Click to expand]'}`;
            }}
            nodeRelSize={8}
            cooldownTicks={graphSettings.cooldownTicks}
            warmupTicks={graphSettings.warmupTicks}
            d3Force={{
              charge: { strength: graphSettings.chargeStrength },
              link: { distance: graphSettings.linkDistance },
              center: { strength: graphSettings.centerStrength },
            }}
            d3VelocityDecay={graphSettings.velocityDecay}
            linkColor={() => "#555"}
            linkWidth={1.5}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.label;
              const fontSize = 11 / Math.sqrt(globalScale);
              const isFocus = node.id === focusNode;
              const isExpanded = expandedNodes.has(node.id);
              const nodeSize = isFocus ? 13 : isExpanded ? 9 : 7;

              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
              ctx.fillStyle = getTailwindBgColor(node.color) || "#71717a";
              ctx.fill();

              // Draw border for focus node (thicker, more prominent)
              if (isFocus) {
                ctx.strokeStyle = "#6366f1";
                ctx.lineWidth = 3;
                ctx.stroke();
              }

              // Draw dot indicator for expanded nodes
              if (isExpanded && !isFocus) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, 2.5, 0, 2 * Math.PI, false);
                ctx.fillStyle = "#fff";
                ctx.fill();
              }

              // Draw label
              ctx.font = `${fontSize}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = isFocus ? "#e0e7ff" : "#e5e7eb";
              ctx.fillText(label, node.x, node.y + nodeSize + 2);

              // Draw distance badge (only if not focus)
              if (node.distance !== undefined && node.distance > 0) {
                ctx.font = `${fontSize * 0.75}px monospace`;
                ctx.fillStyle = node.distance > maxDepth * 0.8 ? "#ef4444" : "#71717a";
                ctx.fillText(`d:${node.distance}`, node.x, node.y + nodeSize + fontSize + 3);
              }
            }}
            onNodeClick={handleNodeClick}
          />

          {/* Controls Panel */}
          <div className="absolute bottom-2 left-2 flex flex-col gap-2">
            {/* Max Depth Control */}
            <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
              <label className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400">Max Depth:</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxDepth}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setMaxDepth(Math.max(1, Math.min(10, val)));
                    setStatus(`Max depth set to ${val}`);
                  }}
                  className="w-14 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-center outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
            </div>

            {/* Physics Settings Panel */}
            {settingsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg px-3 py-3 shadow-xl max-w-xs"
              >
                <div className="text-xs font-semibold text-zinc-300 mb-3">Physics Settings</div>
                <div className="space-y-3">
                  {/* Charge Strength */}
                  <div>
                    <label className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Charge Strength</span>
                      <span className="tabular-nums">{graphSettings.chargeStrength}</span>
                    </label>
                    <input
                      type="range"
                      min="-1000"
                      max="-50"
                      step="10"
                      value={graphSettings.chargeStrength}
                      onChange={(e) => setGraphSettings({ ...graphSettings, chargeStrength: parseInt(e.target.value) })}
                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Link Distance */}
                  <div>
                    <label className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Link Distance</span>
                      <span className="tabular-nums">{graphSettings.linkDistance}</span>
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="200"
                      step="5"
                      value={graphSettings.linkDistance}
                      onChange={(e) => setGraphSettings({ ...graphSettings, linkDistance: parseInt(e.target.value) })}
                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Center Strength */}
                  <div>
                    <label className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Center Strength</span>
                      <span className="tabular-nums">{graphSettings.centerStrength.toFixed(2)}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={graphSettings.centerStrength}
                      onChange={(e) => setGraphSettings({ ...graphSettings, centerStrength: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Velocity Decay */}
                  <div>
                    <label className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Velocity Decay</span>
                      <span className="tabular-nums">{graphSettings.velocityDecay.toFixed(2)}</span>
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={graphSettings.velocityDecay}
                      onChange={(e) => setGraphSettings({ ...graphSettings, velocityDecay: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Warmup Ticks */}
                  <div>
                    <label className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                      <span>Warmup Ticks</span>
                      <span className="tabular-nums">{graphSettings.warmupTicks}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="10"
                      value={graphSettings.warmupTicks}
                      onChange={(e) => setGraphSettings({ ...graphSettings, warmupTicks: parseInt(e.target.value) })}
                      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={() => {
                      setGraphSettings({
                        chargeStrength: -300,
                        linkDistance: 80,
                        centerStrength: 0.3,
                        cooldownTicks: 0,
                        warmupTicks: 100,
                        velocityDecay: 0.4,
                      });
                      setStatus('Reset physics to defaults');
                    }}
                    className="w-full mt-2 px-2 py-1.5 text-[10px] rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Resize handle */}
      <div
        ref={resizeRef}
        className="h-1 bg-zinc-800 hover:bg-indigo-600 cursor-row-resize transition flex items-center justify-center group"
        onMouseDown={() => setIsResizing(true)}
      >
        <GripHorizontal size={14} className="opacity-0 group-hover:opacity-50 transition" />
      </div>

      {/* Details row */}
      <div
        className="overflow-y-auto flex flex-col"
        style={{ height: `${100 - detailsSplit}%` }}
      >
        <div className="p-4 border-b border-zinc-800">
          <div className="text-xs uppercase tracking-wide text-zinc-400">
            {selectedNode ? "Node Details" : "Accounts"}
          </div>
        </div>

        {selectedNode ? (
          <div className="p-4 space-y-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className={clsx("w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center text-lg font-bold", selectedNode.color)}>
                {selectedNode.label.at(0)}
              </div>
              <div className="text-center">
                <div className="font-semibold">{selectedNode.label}</div>
                <div className="text-xs text-zinc-400 mt-1 capitalize">{selectedNode.kind}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
            >
              Clear Selection
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              {INITIAL_ACCOUNTS.map((a) => (
                <div
                  key={a.id}
                  ref={(el) => (acctRefs.current[a.id] = el)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx("w-6 h-6 rounded-md", a.color)} />
                    <span className="text-sm">{a.name}</span>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{formatGBP(accounts[a.id])}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-800 pt-3 mt-4">
              <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Recent Transactions</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {txs.length === 0 && (
                  <div className="text-xs text-zinc-500 text-center py-4">
                    No transactions yet
                  </div>
                )}
                {txs.slice(0, 5).map((t) => (
                  <div key={t.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs">
                      {t.typ === "expense" ? (
                        <ArrowDownRight size={12} className="text-rose-400" />
                      ) : (
                        <ArrowUpRight size={12} className="text-emerald-400" />
                      )}
                      <span className="font-medium capitalize">{t.typ}</span>
                      <span className="ml-auto tabular-nums font-semibold">{formatGBP(t.amount)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 truncate">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// --- Footer Component --------------------------------------------------------
function Footer({ status }) {
  return (
    <div className="h-8 border-t border-zinc-800 bg-zinc-900/50 flex items-center px-4 text-[11px] text-zinc-500">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>{status}</span>
      </div>
      <div className="ml-auto">
        Responsive layout • Collapsible panels • Resizable details
      </div>
    </div>
  );
}

// --- Coin Animation Component ------------------------------------------------
function Coin({ id, amount, fromEl, toEl, viewport }) {
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [end, setEnd] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (fromEl && toEl) {
      setStart(centerOf(fromEl));
      setEnd(centerOf(toEl));
    }
  }, [fromEl, toEl]);

  return (
    <motion.div
      initial={{ x: start.x + viewport.x, y: start.y + viewport.y, opacity: 0.9, scale: 0.9 }}
      animate={{ x: end.x + viewport.x, y: end.y + viewport.y, opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed pointer-events-none z-50"
    >
      <div className="px-2 py-1 rounded-full bg-emerald-500 text-black text-xs font-semibold shadow-lg border border-emerald-400">
        {formatGBP(amount)}
      </div>
    </motion.div>
  );
}
