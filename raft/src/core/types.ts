export type ParticipantShape = 'circle' | 'square' | 'triangle' | 'hexagon';

export interface Participant {
  id: string;
  name: string;
  shape: ParticipantShape;
  color: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  opacity: number;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  duration: number; // How long message takes to travel (ms)
  color?: string;
}

export interface TimelineMessage extends Message {
  progress: number; // 0-1 for animation
  startTime: number;
  endTime: number;
}

export interface SimulationState {
  participants: Participant[];
  messages: Message[];
  activeMessages: TimelineMessage[];
  currentTime: number;
  running: boolean;
  speed: number;
  totalMessages: number;
}
