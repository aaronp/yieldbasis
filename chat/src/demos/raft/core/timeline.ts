import { Participant, Message, SimulationState, ParticipantShape } from './types';
import gsap from 'gsap';

export class TimelineSimulation {
  private state: SimulationState;
  private RADIUS = 250;
  private CENTER_X = 500;
  private CENTER_Y = 350;
  private participantCounter = 0;
  private messageCounter = 0;

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

    // Reset all participants to invisible
    this.state.participants.forEach((p) => {
      p.visible = false;
      p.opacity = 0;
      p.x = this.CENTER_X;
      p.y = this.CENTER_Y;
    });
  }

  public setSpeed(speed: number) {
    this.state.speed = speed;
  }

  public addParticipant(name: string, shape: ParticipantShape, color: string): string {
    const id = `p${this.participantCounter++}`;

    // New participant starts at center with 0 opacity, initially not visible
    const newParticipant: Participant = {
      id,
      name,
      shape,
      color,
      x: this.CENTER_X,
      y: this.CENTER_Y,
      opacity: 0,
      visible: false,
    };

    this.state.participants.push(newParticipant);

    // When manually adding (not during playback), show them immediately
    this.repositionVisibleParticipants();

    return id;
  }

  private repositionVisibleParticipants() {
    // Only reposition participants when not in playback mode
    // This gives the nice slide-in effect when manually adding participants
    if (this.state.running) return;

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
    const id = `m${this.messageCounter++}`;

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

    // Update participant visibility based on their message activity
    this.updateParticipantVisibility();

    // Stop if we've passed all messages
    if (this.state.messages.length > 0) {
      const lastMessage = this.state.messages[this.state.messages.length - 1];
      const lastMessageEnd = lastMessage.timestamp + lastMessage.duration;

      if (this.state.currentTime > lastMessageEnd && this.state.activeMessages.length === 0) {
        this.state.running = false;
      }
    }
  }

  private updateParticipantVisibility() {
    const APPEAR_BEFORE = 500; // Appear 500ms before first message
    const DISAPPEAR_AFTER = 500; // Disappear 500ms after last message

    // Calculate time window for each participant
    this.state.participants.forEach((participant) => {
      const participantMessages = this.state.messages.filter(
        (m) => m.from === participant.id || m.to === participant.id
      );

      if (participantMessages.length === 0) {
        participant.visible = false;
        return;
      }

      // Find first and last times this participant is involved
      let firstTime = Infinity;
      let lastTime = -Infinity;

      participantMessages.forEach((msg) => {
        const msgStart = msg.timestamp;
        const msgEnd = msg.timestamp + msg.duration;

        if (msgStart < firstTime) firstTime = msgStart;
        if (msgEnd > lastTime) lastTime = msgEnd;
      });

      // Participant should be visible from APPEAR_BEFORE first message to DISAPPEAR_AFTER last message
      const shouldBeVisible =
        this.state.currentTime >= firstTime - APPEAR_BEFORE &&
        this.state.currentTime <= lastTime + DISAPPEAR_AFTER;

      const wasVisible = participant.visible;

      if (shouldBeVisible && !wasVisible) {
        // Participant should appear
        participant.visible = true;
        this.onParticipantVisibilityChanged();
      } else if (!shouldBeVisible && wasVisible) {
        // Participant should disappear
        participant.visible = false;
        this.onParticipantVisibilityChanged();
      }
    });
  }

  private onParticipantVisibilityChanged() {
    // Reposition only visible participants
    const visibleParticipants = this.state.participants.filter((p) => p.visible);
    const count = visibleParticipants.length;

    if (count === 0) return;

    const angleStep = (Math.PI * 2) / count;

    visibleParticipants.forEach((participant, i) => {
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

    // Animate invisible participants to center
    this.state.participants
      .filter((p) => !p.visible)
      .forEach((participant) => {
        gsap.to(participant, {
          x: this.CENTER_X,
          y: this.CENTER_Y,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.inOut',
        });
      });
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

    // Update participant visibility for the seeked time
    this.updateParticipantVisibility();
  }

  public getMaxTime(): number {
    if (this.state.messages.length === 0) return 0;
    const lastMessage = this.state.messages[this.state.messages.length - 1];
    return lastMessage.timestamp + lastMessage.duration;
  }

  public setRadius(radius: number) {
    this.RADIUS = radius;
    // Reposition all participants with new radius
    this.onParticipantVisibilityChanged();
  }

  public getRadius(): number {
    return this.RADIUS;
  }

  public setCenter(x: number, y: number) {
    this.CENTER_X = x;
    this.CENTER_Y = y;
    // Reposition all participants with new center
    this.onParticipantVisibilityChanged();
  }

  public getCenter(): { x: number; y: number } {
    return { x: this.CENTER_X, y: this.CENTER_Y };
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
