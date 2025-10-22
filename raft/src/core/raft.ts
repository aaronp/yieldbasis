import { RaftNode, NodeState, Message, LogEntry, SimulationState } from './types';

export class RaftSimulation {
  private state: SimulationState;
  private readonly HEARTBEAT_INTERVAL = 500; // ms
  private readonly ELECTION_TIMEOUT_MIN = 1500; // ms
  private readonly ELECTION_TIMEOUT_MAX = 3000; // ms

  constructor(nodeCount: number = 5) {
    this.state = {
      nodes: [],
      messages: [],
      currentTerm: 0,
      leaderId: null,
      totalElections: 0,
      totalMessages: 0,
      time: 0,
      running: false,
      speed: 1.0,
    };

    this.initializeNodes(nodeCount);
  }

  private initializeNodes(count: number) {
    this.state.nodes = [];
    const radius = 200;
    const centerX = 400;
    const centerY = 300;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.state.nodes.push({
        id: i,
        state: 'follower',
        currentTerm: 0,
        votedFor: null,
        log: [],
        commitIndex: -1,
        lastApplied: -1,
        electionTimeout: this.randomElectionTimeout(),
        electionTimer: 0,
        heartbeatTimer: 0,
        x,
        y,
      });
    }
  }

  private randomElectionTimeout(): number {
    return (
      this.ELECTION_TIMEOUT_MIN +
      Math.random() * (this.ELECTION_TIMEOUT_MAX - this.ELECTION_TIMEOUT_MIN)
    );
  }

  public getState(): SimulationState {
    return this.state;
  }

  public start() {
    this.state.running = true;
  }

  public stop() {
    this.state.running = false;
  }

  public reset(nodeCount?: number) {
    const count = nodeCount || this.state.nodes.length;
    this.state = {
      nodes: [],
      messages: [],
      currentTerm: 0,
      leaderId: null,
      totalElections: 0,
      totalMessages: 0,
      time: 0,
      running: false,
      speed: this.state.speed,
    };
    this.initializeNodes(count);
  }

  public setSpeed(speed: number) {
    this.state.speed = speed;
  }

  public addLogEntry(command: string) {
    const leader = this.state.nodes.find((n) => n.state === 'leader');
    if (!leader) {
      console.warn('No leader to add entry');
      return;
    }

    const entry: LogEntry = {
      term: leader.currentTerm,
      index: leader.log.length,
      command,
      committed: false,
    };

    leader.log.push(entry);
    console.log(`Leader ${leader.id} added entry: ${command}`);

    // Immediately start replicating to followers
    this.sendAppendEntries(leader);
  }

  public stopNode(nodeId: number) {
    const node = this.state.nodes[nodeId];
    if (node && node.state !== 'stopped') {
      node.state = 'stopped';
      if (nodeId === this.state.leaderId) {
        this.state.leaderId = null;
      }
    }
  }

  public restartNode() {
    const stoppedNode = this.state.nodes.find((n) => n.state === 'stopped');
    if (stoppedNode) {
      stoppedNode.state = 'follower';
      stoppedNode.electionTimeout = this.randomElectionTimeout();
      stoppedNode.electionTimer = 0;
    }
  }

  public update(deltaTime: number) {
    if (!this.state.running) return;

    const adjustedDelta = deltaTime * this.state.speed;
    this.state.time += adjustedDelta;

    // Update messages
    this.updateMessages(adjustedDelta);

    // Update each node
    this.state.nodes.forEach((node) => {
      if (node.state === 'stopped') return;

      this.updateNode(node, adjustedDelta);
    });
  }

  private updateMessages(deltaTime: number) {
    this.state.messages = this.state.messages.filter((msg) => {
      msg.progress += deltaTime / 1000; // 1 second for message to travel
      if (msg.progress >= 1.0) {
        this.deliverMessage(msg);
        return false;
      }
      return true;
    });
  }

  private updateNode(node: RaftNode, deltaTime: number) {
    switch (node.state) {
      case 'follower':
        this.updateFollower(node, deltaTime);
        break;
      case 'candidate':
        this.updateCandidate(node, deltaTime);
        break;
      case 'leader':
        this.updateLeader(node, deltaTime);
        break;
    }
  }

  private updateFollower(node: RaftNode, deltaTime: number) {
    node.electionTimer += deltaTime;

    // Election timeout - become candidate
    if (node.electionTimer >= node.electionTimeout) {
      this.becomeCandidate(node);
    }
  }

  private updateCandidate(node: RaftNode, deltaTime: number) {
    node.electionTimer += deltaTime;

    // Election timeout - start new election
    if (node.electionTimer >= node.electionTimeout) {
      this.startElection(node);
    }
  }

  private updateLeader(node: RaftNode, deltaTime: number) {
    node.heartbeatTimer += deltaTime;

    // Send heartbeats
    if (node.heartbeatTimer >= this.HEARTBEAT_INTERVAL) {
      node.heartbeatTimer = 0;
      this.sendAppendEntries(node);
    }
  }

  private becomeCandidate(node: RaftNode) {
    node.state = 'candidate';
    this.startElection(node);
  }

  private startElection(node: RaftNode) {
    node.currentTerm++;
    node.votedFor = node.id;
    node.electionTimer = 0;
    node.electionTimeout = this.randomElectionTimeout();

    this.state.totalElections++;
    this.state.currentTerm = Math.max(this.state.currentTerm, node.currentTerm);

    console.log(`Node ${node.id} starting election for term ${node.currentTerm}`);

    let votesReceived = 1; // Vote for self

    // Request votes from all other nodes
    this.state.nodes.forEach((other) => {
      if (other.id !== node.id && other.state !== 'stopped') {
        this.sendMessage({
          type: 'requestVote',
          from: node.id,
          to: other.id,
          term: node.currentTerm,
        });
      }
    });
  }

  private becomeLeader(node: RaftNode) {
    node.state = 'leader';
    node.heartbeatTimer = 0;
    this.state.leaderId = node.id;

    // Initialize leader state
    node.nextIndex = new Map();
    node.matchIndex = new Map();
    this.state.nodes.forEach((other) => {
      if (other.id !== node.id) {
        node.nextIndex!.set(other.id, node.log.length);
        node.matchIndex!.set(other.id, -1);
      }
    });

    console.log(`Node ${node.id} became leader for term ${node.currentTerm}`);

    // Send immediate heartbeat
    this.sendAppendEntries(node);
  }

  private stepDown(node: RaftNode, newTerm: number) {
    node.state = 'follower';
    node.currentTerm = newTerm;
    node.votedFor = null;
    node.electionTimer = 0;
    node.electionTimeout = this.randomElectionTimeout();

    if (this.state.leaderId === node.id) {
      this.state.leaderId = null;
    }
  }

  private sendAppendEntries(leader: RaftNode) {
    this.state.nodes.forEach((follower) => {
      if (follower.id !== leader.id && follower.state !== 'stopped') {
        const nextIndex = leader.nextIndex!.get(follower.id) || 0;
        const entries = leader.log.slice(nextIndex);

        this.sendMessage({
          type: 'appendEntries',
          from: leader.id,
          to: follower.id,
          term: leader.currentTerm,
          entries: entries.length > 0 ? entries : undefined,
          prevLogIndex: nextIndex - 1,
          prevLogTerm: nextIndex > 0 ? leader.log[nextIndex - 1].term : -1,
          leaderCommit: leader.commitIndex,
        });
      }
    });
  }

  private sendMessage(message: Message) {
    this.state.messages.push({ ...message, progress: 0 });
    this.state.totalMessages++;
  }

  private deliverMessage(message: Message) {
    const recipient = this.state.nodes[message.to];
    if (!recipient || recipient.state === 'stopped') return;

    // Update term if necessary
    if (message.term > recipient.currentTerm) {
      this.stepDown(recipient, message.term);
    }

    switch (message.type) {
      case 'requestVote':
        this.handleRequestVote(recipient, message);
        break;
      case 'voteResponse':
        this.handleVoteResponse(recipient, message);
        break;
      case 'appendEntries':
        this.handleAppendEntries(recipient, message);
        break;
      case 'appendResponse':
        this.handleAppendResponse(recipient, message);
        break;
    }
  }

  private handleRequestVote(node: RaftNode, message: Message) {
    let voteGranted = false;

    if (
      message.term >= node.currentTerm &&
      (node.votedFor === null || node.votedFor === message.from)
    ) {
      voteGranted = true;
      node.votedFor = message.from;
      node.electionTimer = 0; // Reset election timer
    }

    this.sendMessage({
      type: 'voteResponse',
      from: node.id,
      to: message.from,
      term: node.currentTerm,
      voteGranted,
    });
  }

  private handleVoteResponse(node: RaftNode, message: Message) {
    if (node.state !== 'candidate' || message.term !== node.currentTerm) return;

    if (message.voteGranted) {
      // Count votes
      let votes = 1; // Self vote
      this.state.nodes.forEach((other) => {
        if (other.votedFor === node.id && other.currentTerm === node.currentTerm) {
          votes++;
        }
      });

      const majority = Math.floor(this.state.nodes.filter((n) => n.state !== 'stopped').length / 2) + 1;

      if (votes >= majority) {
        this.becomeLeader(node);
      }
    }
  }

  private handleAppendEntries(node: RaftNode, message: Message) {
    // Reset election timer - we heard from leader
    node.electionTimer = 0;

    if (message.term < node.currentTerm) {
      this.sendMessage({
        type: 'appendResponse',
        from: node.id,
        to: message.from,
        term: node.currentTerm,
        success: false,
      });
      return;
    }

    // Step down if we were candidate/leader
    if (node.state !== 'follower') {
      this.stepDown(node, message.term);
    }

    // Append entries if provided
    if (message.entries && message.entries.length > 0) {
      // Simple append (in real Raft, we'd check consistency)
      message.entries.forEach((entry) => {
        if (node.log.length <= entry.index) {
          node.log.push({ ...entry });
        }
      });
    }

    // Update commit index
    if (message.leaderCommit !== undefined && message.leaderCommit > node.commitIndex) {
      node.commitIndex = Math.min(message.leaderCommit, node.log.length - 1);
      // Mark entries as committed
      for (let i = 0; i <= node.commitIndex; i++) {
        if (node.log[i]) node.log[i].committed = true;
      }
    }

    this.sendMessage({
      type: 'appendResponse',
      from: node.id,
      to: message.from,
      term: node.currentTerm,
      success: true,
    });
  }

  private handleAppendResponse(node: RaftNode, message: Message) {
    if (node.state !== 'leader' || message.term !== node.currentTerm) return;

    if (message.success) {
      // Update match index
      const matchIndex = node.log.length - 1;
      node.matchIndex!.set(message.from, matchIndex);
      node.nextIndex!.set(message.from, matchIndex + 1);

      // Check if we can commit
      this.updateCommitIndex(node);
    } else {
      // Decrement next index and retry
      const nextIndex = node.nextIndex!.get(message.from) || 0;
      node.nextIndex!.set(message.from, Math.max(0, nextIndex - 1));
    }
  }

  private updateCommitIndex(leader: RaftNode) {
    // Find highest index replicated on majority
    for (let i = leader.log.length - 1; i > leader.commitIndex; i--) {
      if (leader.log[i].term !== leader.currentTerm) continue;

      let replicationCount = 1; // Leader has it
      this.state.nodes.forEach((node) => {
        if (node.id !== leader.id && node.state !== 'stopped') {
          const matchIndex = leader.matchIndex!.get(node.id) || -1;
          if (matchIndex >= i) {
            replicationCount++;
          }
        }
      });

      const majority = Math.floor(this.state.nodes.filter((n) => n.state !== 'stopped').length / 2) + 1;
      if (replicationCount >= majority) {
        leader.commitIndex = i;
        leader.log[i].committed = true;
        break;
      }
    }
  }
}
