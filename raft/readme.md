# Raft Consensus Algorithm Visualization

An interactive visualization of the Raft distributed consensus algorithm, demonstrating leader election and log replication in real-time.

## Features

### Core Raft Mechanics
- ✅ **Leader Election** - Watch nodes elect a leader through RequestVote RPCs
- ✅ **Log Replication** - Observe how leaders replicate log entries to followers
- ✅ **Heartbeats** - See periodic AppendEntries messages maintaining leadership
- ✅ **Term Management** - Track election terms and transitions
- ✅ **Commit Index** - Visual indication of committed vs uncommitted entries

### Interactive Controls
- **Start/Stop Simulation** - Control the simulation flow
- **Add Log Entry** - Add entries to the leader's log
- **Stop Leader** - Trigger leader failure and observe re-election
- **Stop Random Node** - Simulate arbitrary node failures
- **Restart Node** - Bring failed nodes back online
- **Adjust Speed** - Control simulation speed (0.5x to 3x)
- **Node Count** - Configure cluster size (3-9 nodes)

### Visual Elements
- **Node States** - Color-coded: Leader (green), Candidate (yellow), Follower (blue), Stopped (gray)
- **Message Flow** - Animated messages showing RPC communication
- **Election Timer** - Progress ring showing time until next election
- **Log Visualization** - Per-node log entries with commit status
- **Real-time Stats** - Current term, leader ID, election count, log entries

## Installation

```bash
cd raft
bun install
# or npm install
```

## Development

```bash
make dev
# or
bun run dev
```

Visit `http://localhost:3003`

## Build

```bash
make build
# or
bun run build
```

## How It Works

### Raft Basics

Raft is a consensus algorithm designed for understandability. It ensures that a cluster of servers agrees on a shared state even in the presence of failures.

**Key Concepts:**
- **Leader**: Handles all client requests and log replication
- **Follower**: Passive nodes that respond to leader/candidate requests
- **Candidate**: Nodes seeking to become the leader

### State Transitions

```
Follower → (timeout) → Candidate → (majority votes) → Leader
   ↓                        ↓
   ← (higher term) ← ← ← ← ←
```

### Election Process

1. **Timeout**: Follower election timer expires
2. **Become Candidate**: Increment term, vote for self
3. **Request Votes**: Send RequestVote RPCs to all peers
4. **Count Votes**: Wait for majority
5. **Become Leader**: If majority granted, become leader and send heartbeats
6. **Retry**: If election timeout or split vote, start new election

### Log Replication

1. **Client Request**: Leader receives command
2. **Append to Log**: Leader adds entry to local log
3. **Replicate**: Leader sends AppendEntries RPCs with new entries
4. **Wait for Majority**: Leader waits for acknowledgments
5. **Commit**: Once majority replicated, entry is committed
6. **Apply**: Committed entries are applied to state machine

## Message Types

### RequestVote RPC
- **Purpose**: Candidate requests votes during election
- **Contains**: Candidate's term, candidate ID, log info
- **Response**: Vote granted/denied

### AppendEntries RPC
- **Purpose**: Leader replicates log entries and sends heartbeats
- **Contains**: Leader's term, log entries, commit index
- **Response**: Success/failure

## Architecture

```
src/
├── core/
│   ├── types.ts          # Type definitions
│   └── raft.ts           # Raft simulation engine
├── components/
│   └── renderer.ts       # Canvas visualization
└── main.ts               # Application entry point
```

### Key Classes

**RaftSimulation**
- Manages cluster of Raft nodes
- Handles message delivery
- Implements election and replication logic
- Simulates network delays

**RaftRenderer**
- Canvas-based visualization
- Draws nodes, messages, and logs
- Animates state transitions

**RaftNode**
- Individual server state
- Election timers
- Log storage
- Role-specific behavior

## Implementation Details

### Election Timeouts
- **Range**: 1.5s - 3.0s (randomized per node)
- **Purpose**: Prevents split votes
- **Reset**: On hearing from leader or granting vote

### Heartbeat Interval
- **Interval**: 500ms
- **Purpose**: Maintain leadership, prevent elections
- **Contains**: Empty AppendEntries or log entries

### Message Delivery
- **Delay**: 1 second simulated network latency
- **Visualization**: Animated packet movement
- **Reliability**: Guaranteed delivery (no network partition yet)

### Commit Rules
- Entry committed when replicated on majority
- Only entries from current term can be committed directly
- Older entries committed implicitly

## Raft Properties

### Safety Properties
- **Election Safety**: At most one leader per term
- **Leader Append-Only**: Leader never overwrites its log
- **Log Matching**: Logs are consistent across nodes
- **Leader Completeness**: Committed entries are in future leaders
- **State Machine Safety**: Applied entries are identical

### Liveness
Raft guarantees progress (leader election) as long as:
- Majority of servers available
- Network eventually stable
- Randomized timeouts prevent perpetual split votes

## Limitations

This is an educational visualization with simplifications:
- No persistent storage
- No log compaction/snapshotting
- Simplified conflict resolution
- No network partitions (yet)
- No client session management

## Controls Quick Reference

| Button | Action |
|--------|--------|
| Start Simulation | Begin Raft cluster |
| Stop Simulation | Pause all activity |
| Reset | Clear and restart |
| Add Log Entry | Append to leader's log |
| Stop Leader | Kill current leader |
| Stop Random | Kill random node |
| Restart Node | Recover one stopped node |
| Speed Slider | Adjust simulation speed |
| Node Count | Set cluster size (requires reset) |

## Observing Behavior

### Normal Operation
1. Start simulation
2. Watch follower timeout → candidate → leader election
3. Add log entries
4. Observe replication to followers
5. See entries commit when majority acknowledges

### Leader Failure
1. Start simulation and wait for stable leader
2. Click "Stop Leader"
3. Watch remaining nodes timeout
4. Observe new election
5. See new leader emerge

### Network Delays
- Adjust speed slider to see timing effects
- Slow speed (0.5x): See detailed message flow
- Fast speed (3x): Observe convergence quickly

## Learning Resources

**Raft Paper**: [In Search of an Understandable Consensus Algorithm](https://raft.github.io/raft.pdf)

**Interactive Visualizations**:
- [The Secret Lives of Data](https://thesecretlivesofdata.com/raft/)
- [Raft Scope](https://raft.github.io/)

**Raft in Production**:
- etcd (Kubernetes)
- Consul (HashiCorp)
- CockroachDB
- TiKV

## Future Enhancements

- [ ] Network partition simulation
- [ ] Log compaction/snapshots
- [ ] Membership changes
- [ ] Persistent storage visualization
- [ ] Performance metrics (latency, throughput)
- [ ] Step-by-step mode
- [ ] Guided tutorial mode

## Technical Stack

- **TypeScript**: Type-safe implementation
- **Canvas API**: High-performance rendering
- **GSAP**: Smooth animations (ready for future use)
- **Vite**: Fast build tooling

## Contributing

This is an educational tool. To add features:
1. Core logic: `src/core/raft.ts`
2. Visualization: `src/components/renderer.ts`
3. UI controls: `src/main.ts`

## License

Educational use - based on the Raft consensus algorithm by Diego Ongaro and John Ousterhout.
