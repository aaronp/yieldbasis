import { Participant, Message, TimelineMessage, SimulationState, ParticipantShape } from './types';
import gsap from 'gsap';

export class TimelineSimulation {
  private state: SimulationState;
  private readonly RADIUS = 250;
  private readonly CENTER_X = 500;
  private readonly CENTER_Y = 350;

  constructor() {
    this.state = {
      participants: [],
      messages: [],
      activeMessages: [],
      currentTime: 0,
      running: false,
      speed: 1.0,
      totalMessages: 0,
    };
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

  public reset() {
    this.state.currentTime = 0;
    this.state.activeMessages = [];
    this.state.running = false;
  }

  public setSpeed(speed: number) {
    this.state.speed = speed;
  }

  public addParticipant(name: string, shape: ParticipantShape, color: string): string {
    const id = `p${Date.now()}`;

    // Calculate new positions for all participants
    const newCount = this.state.participants.length + 1;
    const angleStep = (Math.PI * 2) / newCount;

    // New participant starts at center with 0 opacity
    const newParticipant: Participant = {
      id,
      name,
      shape,
      color,
      x: this.CENTER_X,
      y: this.CENTER_Y,
      opacity: 0,
    };

    this.state.participants.push(newParticipant);

    // Recalculate positions for all participants
    this.repositionParticipants();

    return id;
  }

  public removeParticipant(id: string) {
    const index = this.state.participants.findIndex((p) => p.id === id);
    if (index === -1) return;

    // Fade out and remove
    const participant = this.state.participants[index];
    gsap.to(participant, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        this.state.participants.splice(index, 1);
        this.repositionParticipants();
      },
    });
  }

  private repositionParticipants() {
    const count = this.state.participants.length;
    if (count === 0) return;

    const angleStep = (Math.PI * 2) / count;

    this.state.participants.forEach((participant, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const targetX = this.CENTER_X + Math.cos(angle) * this.RADIUS;
      const targetY = this.CENTER_Y + Math.sin(angle) * this.RADIUS;

      // Animate to new position
      gsap.to(participant, {
        x: targetX,
        y: targetY,
        opacity: 1,
        duration: 0.8,
        ease: 'power2.inOut',
      });
    });
  }

  public addMessage(from: string, to: string, text: string, timestamp: number, duration: number, color?: string): string {
    const id = `m${Date.now()}`;

    const message: Message = {
      id,
      from,
      to,
      text,
      timestamp,
      duration,
      color,
    };

    this.state.messages.push(message);
    this.state.totalMessages++;

    // Sort messages by timestamp
    this.state.messages.sort((a, b) => a.timestamp - b.timestamp);

    return id;
  }

  public removeMessage(id: string) {
    const index = this.state.messages.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.state.messages.splice(index, 1);
    }
  }

  public getParticipants(): Participant[] {
    return this.state.participants;
  }

  public getMessages(): Message[] {
    return this.state.messages;
  }

  public update(deltaTime: number) {
    if (!this.state.running) return;

    const adjustedDelta = deltaTime * this.state.speed;
    this.state.currentTime += adjustedDelta;

    // Check for messages that should become active
    this.state.messages.forEach((msg) => {
      const isActive = this.state.activeMessages.some((am) => am.id === msg.id);
      const shouldBeActive = this.state.currentTime >= msg.timestamp;
      const hasCompleted = this.state.currentTime > msg.timestamp + msg.duration;

      if (shouldBeActive && !isActive && !hasCompleted) {
        // Activate message
        this.state.activeMessages.push({
          ...msg,
          progress: 0,
          startTime: msg.timestamp,
          endTime: msg.timestamp + msg.duration,
        });
      }
    });

    // Update active messages
    this.state.activeMessages = this.state.activeMessages.filter((msg) => {
      const elapsed = this.state.currentTime - msg.startTime;
      msg.progress = Math.min(1, elapsed / msg.duration);

      // Remove completed messages
      return msg.progress < 1;
    });

    // Stop if we've passed all messages
    if (this.state.messages.length > 0) {
      const lastMessage = this.state.messages[this.state.messages.length - 1];
      const lastMessageEnd = lastMessage.timestamp + lastMessage.duration;

      if (this.state.currentTime > lastMessageEnd && this.state.activeMessages.length === 0) {
        this.state.running = false;
      }
    }
  }

  public seekTo(time: number) {
    this.state.currentTime = time;
    this.state.activeMessages = [];

    // Activate all messages that should be visible at this time
    this.state.messages.forEach((msg) => {
      if (time >= msg.timestamp && time < msg.timestamp + msg.duration) {
        const elapsed = time - msg.timestamp;
        this.state.activeMessages.push({
          ...msg,
          progress: elapsed / msg.duration,
          startTime: msg.timestamp,
          endTime: msg.timestamp + msg.duration,
        });
      }
    });
  }

  public getMaxTime(): number {
    if (this.state.messages.length === 0) return 0;
    const lastMessage = this.state.messages[this.state.messages.length - 1];
    return lastMessage.timestamp + lastMessage.duration;
  }

  public exportData(): string {
    return JSON.stringify(
      {
        participants: this.state.participants.map((p) => ({
          id: p.id,
          name: p.name,
          shape: p.shape,
          color: p.color,
        })),
        messages: this.state.messages,
      },
      null,
      2
    );
  }

  public importData(jsonData: string) {
    try {
      const data = JSON.parse(jsonData);

      // Clear existing
      this.state.participants = [];
      this.state.messages = [];
      this.state.activeMessages = [];
      this.state.currentTime = 0;

      // Import participants
      if (data.participants) {
        data.participants.forEach((p: any) => {
          this.addParticipant(p.name, p.shape, p.color);
        });
      }

      // Import messages
      if (data.messages) {
        data.messages.forEach((m: any) => {
          this.addMessage(m.from, m.to, m.text, m.timestamp, m.duration, m.color);
        });
      }
    } catch (error) {
      console.error('Failed to import data:', error);
    }
  }
}
