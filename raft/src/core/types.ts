export type NodeState = 'follower' | 'candidate' | 'leader' | 'stopped';

export type MessageType = 'requestVote' | 'voteResponse' | 'appendEntries' | 'appendResponse';

export interface LogEntry {
  term: number;
  index: number;
  command: string;
  committed: boolean;
}

export interface Message {
  type: MessageType;
  from: number;
  to: number;
  term: number;
  voteGranted?: boolean;
  entries?: LogEntry[];
  success?: boolean;
  prevLogIndex?: number;
  prevLogTerm?: number;
  leaderCommit?: number;
}

export interface RaftNode {
  id: number;
  state: NodeState;
  currentTerm: number;
  votedFor: number | null;
  log: LogEntry[];
  commitIndex: number;
  lastApplied: number;

  // Leader state
  nextIndex?: Map<number, number>;
  matchIndex?: Map<number, number>;

  // Timing
  electionTimeout: number;
  electionTimer: number;
  heartbeatTimer: number;

  // Visual position
  x: number;
  y: number;
}

export interface SimulationState {
  nodes: RaftNode[];
  messages: Array<Message & { progress: number }>;
  currentTerm: number;
  leaderId: number | null;
  totalElections: number;
  totalMessages: number;
  time: number;
  running: boolean;
  speed: number;
}
