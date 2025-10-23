import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ForceGraph2D from "react-force-graph-2d";
import { Search, Users, MessageSquare, ChevronLeft, ChevronRight, X, Plus, Wallet, PiggyBank, ArrowDownRight, ArrowUpRight } from "lucide-react";

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

// --- Budget/Accounts mock data ---------------------------------------------
const INITIAL_ACCOUNTS = [
  { id: "cash", name: "Cash", color: "bg-amber-500", icon: "wallet" },
  { id: "family", name: "Family Budget", color: "bg-indigo-500", icon: "family" },
  { id: "savings", name: "Savings", color: "bg-emerald-500", icon: "piggy" },
];

// --- Helpers ----------------------------------------------------------------
function clsx(...xs) { return xs.filter(Boolean).join(" "); }

// Currency utils
function parseGBP(text) {
  const m = text.replace(/,/g, "").match(/£\s*(\d+(?:\.\d{1,2})?)/i);
  return m ? Number(m[1]) : null;
}
function formatGBP(n) { return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" }); }

// Tailwind bg class -> computed color (cached)
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

// Geometry helpers for coin animations
function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// --- Component ---------------------------------------------------------------
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeContactId, setActiveContactId] = useState(CONTACTS[0].id);
  const [focusContactId, setFocusContactId] = useState(null);
  const [pinnedGroupId, setPinnedGroupId] = useState(null);

  // Budget panel + data
  const [budgetOpen, setBudgetOpen] = useState(true);
  const [accounts, setAccounts] = useState({ cash: 500, family: 1200, savings: 3000 });
  const [txs, setTxs] = useState([]);

  // Refs to message bubbles & account chips for animation
  const msgRefs = useRef({});
  const acctRefs = useRef({ cash: null, family: null, savings: null });

  // Floating tokens (coin animations)
  const [coins, setCoins] = useState([]);

  // Active chat data
  const activeMessages = useMemo(() => MESSAGES[activeContactId] ?? [], [activeContactId]);
  const activeContact = useMemo(() => CONTACTS.find((c) => c.id === activeContactId), [activeContactId]);

  // Shared groups for focus overlay
  const sharedGroups = GROUPS;

  // --- Relationship Graph (focus overlay) -----------------------------------
  const graphContainerRef = useRef(null);
  const [graphDims, setGraphDims] = useState({ w: 640, h: 360 });
  useEffect(() => {
    const el = graphContainerRef.current; if (!el) return;
    const resize = () => { const rect = el.getBoundingClientRect(); setGraphDims({ w: Math.max(320, rect.width), h: Math.max(240, rect.height) }); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(el); return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    if (!focusContactId) return { nodes: [], links: [] };
    const focus = CONTACTS.find((c) => c.id === focusContactId);
    const nodes = [
      { id: `contact:${focus.id}`, label: focus.name, kind: "contact", color: focus.color },
      ...sharedGroups.map((g) => ({ id: `group:${g.id}`, label: g.name, kind: "group", color: g.color })),
    ];
    const links = sharedGroups.map((g) => ({ source: `contact:${focus.id}`, target: `group:${g.id}` }));
    return { nodes, links };
  }, [focusContactId, sharedGroups]);

  // --- Dev assertions --------------------------------------------------------
  useEffect(() => {
    try {
      console.assert(parseGBP("paid £12.30 for lunch") === 12.30, "parseGBP basic");
      console.assert(parseGBP("£1,234.56") === 1234.56, "parseGBP commas");
      console.assert(parseGBP("no money here") === null, "parseGBP none");
      const rose = getTailwindBgColor("bg-rose-500");
      console.assert(!!rose, "tailwind color computes");
    } catch (e) { console.warn("dev assertions failed:", e); }
  }, []);

  // --- Budget actions --------------------------------------------------------
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
    const dstEl = acctRefs.current[tx.typ === "income" ? tx.to : tx.to];
    if (srcEl && dstEl) {
      const s = centerOf(srcEl); const d = centerOf(dstEl);
      const id = tx.id;
      setCoins((cs) => [...cs, { id, x: s.x, y: s.y, amount: tx.amount }]);
      setTimeout(() => {
        setAccounts((a) => {
          const next = { ...a };
          if (tx.typ === "income") { next[tx.to] += tx.amount; next[tx.from] -= 0; }
          else if (tx.typ === "expense") { next[tx.from] -= tx.amount; next[tx.to] += 0; }
          else { next[tx.from] -= tx.amount; next[tx.to] += tx.amount; }
          return next;
        });
        setCoins((cs) => cs.filter((c) => c.id !== id));
      }, 650);
    } else {
      commitBalances(tx);
    }
    setTxs((xs) => [tx, ...xs]);
  }

  function commitBalances(tx) {
    setAccounts((a) => {
      const next = { ...a };
      if (tx.typ === "income") { next[tx.to] += tx.amount; }
      else if (tx.typ === "expense") { next[tx.from] -= tx.amount; }
      else { next[tx.from] -= tx.amount; next[tx.to] += tx.amount; }
      return next;
    });
  }

  // --- Layout vars -----------------------------------------------------------
  const [viewport, setViewport] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    const onScroll = () => setViewport({ x: window.scrollX, y: window.scrollY });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="w-full h-full min-h-[700px] bg-zinc-950 text-zinc-100 overflow-hidden relative">
      {/* Top bar */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-3 gap-2">
        <button className="p-2 rounded-xl hover:bg-zinc-800 transition" onClick={() => setSidebarOpen((s) => !s)} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="flex items-center gap-2 text-sm opacity-80">
          <MessageSquare size={16} />
          <span>Immersive Chat + Budget (prototype)</span>
        </div>
        <div className="ml-auto relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input className="pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40" placeholder="Search" />
        </div>
      </div>

      {/* Main layout */}
      <div className="grid h-[calc(100%-3rem)]" style={{ gridTemplateColumns: sidebarOpen ? "280px 1fr 340px" : "0px 1fr 340px" }}>
        {/* Sidebar */}
        <aside className={clsx("h-full border-r border-zinc-800 overflow-hidden", sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none")}>
          <div className="h-full flex flex-col">
            <div className="p-3 text-xs uppercase tracking-wide text-zinc-400">Contacts</div>
            <div className="px-2 space-y-1 overflow-y-auto">
              {CONTACTS.map((c) => (
                <motion.button key={c.id} layoutId={`contact-${c.id}`} onClick={() => setActiveContactId(c.id)} onDoubleClick={() => setFocusContactId(c.id)}
                  className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-2xl transition border", activeContactId === c.id ? "bg-zinc-800 border-zinc-700" : "bg-zinc-900/40 hover:bg-zinc-800/60 border-zinc-800")}>
                  <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold", c.color)}>{c.name.at(0)}</div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-zinc-400 truncate">Double‑click to focus graph</div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="p-3 mt-2 text-xs uppercase tracking-wide text-zinc-400 border-t border-zinc-800">Pinned group</div>
            <div className="px-2 pb-3">
              <AnimatePresence>
                {pinnedGroupId && (
                  <motion.div key={pinnedGroupId} layoutId={`group-${pinnedGroupId}`} className="px-3 py-2 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2">
                    <Users size={16} className="opacity-70" />
                    <span className="text-sm">{GROUPS.find((g) => g.id === pinnedGroupId)?.name}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* Content area: chat + focus overlay */}
        <section className="relative h-full overflow-hidden">
          <div className="h-full grid grid-rows-[auto_1fr_auto]">
            {/* Chat header */}
            <div className="h-14 border-b border-zinc-800 flex items-center gap-3 px-4">
              <motion.div layoutId={`contact-${activeContact.id}`} className="flex items-center gap-3">
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold", activeContact.color)}>{activeContact.name.at(0)}</div>
                <div>
                  <div className="text-sm font-semibold">{activeContact.name}</div>
                  <div className="text-xs text-zinc-400">Messages are DOM → copy/paste works</div>
                </div>
              </motion.div>
              <div className="ml-auto text-xs text-zinc-400">Tip: Hover a message to add to budget</div>
            </div>

            {/* Message list */}
            <div className="overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-zinc-950 to-zinc-900/30 relative">
              {activeMessages.map((m) => (
                <div key={m.id} ref={(el) => (msgRefs.current[m.id] = el)}
                  className={clsx("group max-w-[70%] rounded-2xl px-3 py-2 border relative", m.from === "Me" ? "ml-auto bg-zinc-800 border-zinc-700" : "bg-zinc-900 border-zinc-800")}>
                  <div className="text-xs opacity-60 mb-1 flex items-center gap-2">
                    <span>{m.from} • {m.dt}</span>
                    <button onClick={() => addTxFromMessage(m.id)} className="opacity-0 group-hover:opacity-100 transition px-2 py-0.5 text-[11px] rounded-lg bg-emerald-600/80 hover:bg-emerald-500">
                      💸 Add to budget
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed select-text">{m.text}</p>
                </div>
              ))}

              {/* Floating coins layer */}
              <div className="pointer-events-none absolute inset-0 z-10">
                {coins.map((c) => (
                  <Coin key={c.id} id={c.id} amount={c.amount} fromEl={msgRefs.current[txs.find(t=>t.id===c.id)?.srcMessageId ?? ""]} toEl={acctRefs.current[(txs.find(t=>t.id===c.id)?.typ === 'income' ? (txs.find(t=>t.id===c.id)?.to) : (txs.find(t=>t.id===c.id)?.from)) || 'cash']} viewport={viewport} />
                ))}
              </div>
            </div>

            {/* Composer */}
            <div className="border-t border-zinc-800 p-3 flex items-center gap-2">
              <input className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40" placeholder={`Message ${activeContact.name}`} />
              <button className="px-3 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 transition">Send</button>
            </div>
          </div>

          {/* Focus overlay for relationships */}
          <AnimatePresence>
            {focusContactId && (
              <motion.div key="overlay" className="absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <button onClick={() => setFocusContactId(null)} className="absolute top-3 right-3 z-30 p-2 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:bg-zinc-800"><X size={16} /></button>
                <motion.div layout className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,92vw)] p-5">
                  <motion.div layoutId={`contact-${focusContactId}`} className="rounded-3xl border border-zinc-700/70 bg-zinc-900/70 shadow-2xl overflow-hidden">
                    <div className="p-5 flex items-center gap-3 border-b border-zinc-800/70">
                      {(() => { const c = CONTACTS.find((x) => x.id === focusContactId); return (<>
                        <div className={clsx("w-11 h-11 rounded-xl flex items-center justify-center font-semibold", c.color)}>{c.name.at(0)}</div>
                        <div><div className="font-semibold">{c.name}</div><div className="text-xs text-zinc-400">Shared groups & contacts</div></div>
                      </>); })()}
                    </div>
                    <div className="p-0">
                      <div className="text-xs uppercase tracking-wider text-zinc-400 px-5 pt-5">Shared Graph</div>
                      <div ref={graphContainerRef} className="px-5 pb-5">
                        <ForceGraph2D width={graphDims.w} height={graphDims.h} graphData={graphData} nodeLabel={(n) => n.label} nodeRelSize={6} cooldownTicks={40}
                          onEngineStop={() => {}}
                          linkColor={() => "#666"}
                          nodeCanvasObject={(node, ctx, globalScale) => {
                            const label = node.label; const fontSize = 12 / Math.sqrt(globalScale);
                            ctx.beginPath(); ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI, false);
                            ctx.fillStyle = getTailwindBgColor(node.color) || "#71717a"; ctx.fill();
                            ctx.font = `${fontSize}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = "#e5e7eb"; ctx.fillText(label, node.x, node.y + 12);
                          }}
                          onNodeClick={(n) => { if (n.kind === "group") { const id = String(n.id).replace("group:", ""); setPinnedGroupId(id); setFocusContactId(null); } }} />
                      </div>
                      <div className="px-5 pb-5 text-xs text-zinc-500">Tip: WebGL graph for relationships; budget lives in the right panel.</div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right budget panel */}
        <aside className={"h-full border-l border-zinc-800 bg-zinc-950/60 backdrop-blur-sm"}>
          <div className="h-full grid grid-rows-[auto_auto_1fr]">
            <div className="h-14 border-b border-zinc-800 flex items-center px-3 gap-2">
              <button className="px-2 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700" onClick={() => setBudgetOpen((o) => !o)}>{budgetOpen ? "Hide" : "Show"} Budget</button>
              <div className="ml-auto text-xs text-zinc-400">Convert chat → budget</div>
            </div>

            {/* Accounts summary */}
            <div className="p-3 border-b border-zinc-800">
              <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Accounts</div>
              <div className="space-y-2">
                {INITIAL_ACCOUNTS.map((a) => (
                  <div key={a.id} ref={(el) => (acctRefs.current[a.id] = el)} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={clsx("w-6 h-6 rounded-lg", a.color)} />
                      <span className="text-sm">{a.name}</span>
                    </div>
                    <div className="text-sm tabular-nums">{formatGBP(accounts[a.id])}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions list */}
            <div className="overflow-y-auto p-3">
              <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Recent activity</div>
              <div className="space-y-2">
                {txs.length === 0 && (
                  <div className="text-xs text-zinc-500">No transactions yet. Hover a message and click "Add to budget".</div>
                )}
                {txs.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      {t.typ === "expense" ? <ArrowDownRight size={14} className="text-rose-400"/> : t.typ === "income" ? <ArrowUpRight size={14} className="text-emerald-400"/> : <ArrowRightIcon/>}
                      <span className="font-medium">{t.typ.toUpperCase()}</span>
                      <span className="ml-auto tabular-nums">{formatGBP(t.amount)}</span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 truncate">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer note */}
      <div className="h-8 border-t border-zinc-800 text-[11px] flex items-center px-3 text-zinc-400">
        DOM chat + Budget panel • Convert messages to transactions • Coins animate from messages to accounts
      </div>
    </div>
  );
}

// --- Coin animation component -----------------------------------------------
function Coin({ id, amount, fromEl, toEl, viewport }) {
  const [start, setStart] = useState({x:0,y:0});
  const [end, setEnd] = useState({x:0,y:0});
  useLayoutEffect(() => {
    if (fromEl && toEl) { setStart(centerOf(fromEl)); setEnd(centerOf(toEl)); }
  }, [fromEl, toEl]);
  const dx = end.x - start.x, dy = end.y - start.y;
  return (
    <motion.div initial={{ x: start.x + viewport.x, y: start.y + viewport.y, opacity: 0.9, scale: 0.9 }} animate={{ x: end.x + viewport.x, y: end.y + viewport.y, opacity: 0, scale: 0.7 }} transition={{ duration: 0.6, ease: "easeInOut" }} className="fixed pointer-events-none z-50">
      <div className="px-2 py-1 rounded-full bg-emerald-500 text-black text-xs font-semibold shadow-lg border border-emerald-400">{formatGBP(amount)}</div>
    </motion.div>
  );
}

function ArrowRightIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-70"><path fill="currentColor" d="M10 17l5-5l-5-5v10Z"/></svg>; }
