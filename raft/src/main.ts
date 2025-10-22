import { TimelineSimulation } from './core/timeline';
import { TimelineRenderer } from './components/renderer';
import { ParticipantShape } from './core/types';

class TimelineApp {
  private simulation: TimelineSimulation;
  private renderer: TimelineRenderer;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  // Form elements
  private participantNameInput: HTMLInputElement;
  private participantShapeSelect: HTMLSelectElement;
  private participantColorInput: HTMLInputElement;
  private btnAddParticipant: HTMLButtonElement;
  private participantList: HTMLElement;

  private messageFromSelect: HTMLSelectElement;
  private messageToSelect: HTMLSelectElement;
  private messageTextInput: HTMLInputElement;
  private messageTimestampInput: HTMLInputElement;
  private messageDurationInput: HTMLInputElement;
  private messageColorInput: HTMLInputElement;
  private btnAddMessage: HTMLButtonElement;
  private messageList: HTMLElement;
  private messageCount: HTMLElement;

  // Timeline controls
  private btnPlay: HTMLButtonElement;
  private btnPause: HTMLButtonElement;
  private btnReset: HTMLButtonElement;
  private timelineScrubber: HTMLInputElement;
  private currentTimeDisplay: HTMLElement;
  private totalTimeDisplay: HTMLElement;

  // Speed control
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;

  // Data controls
  private btnExport: HTMLButtonElement;
  private btnImport: HTMLButtonElement;
  private btnClear: HTMLButtonElement;
  private btnLucky: HTMLButtonElement;

  constructor() {
    const canvas = document.getElementById('timeline-canvas') as HTMLCanvasElement;
    this.simulation = new TimelineSimulation();
    this.renderer = new TimelineRenderer(canvas);

    // Get form elements
    this.participantNameInput = document.getElementById('participant-name') as HTMLInputElement;
    this.participantShapeSelect = document.getElementById('participant-shape') as HTMLSelectElement;
    this.participantColorInput = document.getElementById('participant-color') as HTMLInputElement;
    this.btnAddParticipant = document.getElementById('btn-add-participant') as HTMLButtonElement;
    this.participantList = document.getElementById('participant-list')!;

    this.messageFromSelect = document.getElementById('message-from') as HTMLSelectElement;
    this.messageToSelect = document.getElementById('message-to') as HTMLSelectElement;
    this.messageTextInput = document.getElementById('message-text') as HTMLInputElement;
    this.messageTimestampInput = document.getElementById('message-timestamp') as HTMLInputElement;
    this.messageDurationInput = document.getElementById('message-duration') as HTMLInputElement;
    this.messageColorInput = document.getElementById('message-color') as HTMLInputElement;
    this.btnAddMessage = document.getElementById('btn-add-message') as HTMLButtonElement;
    this.messageList = document.getElementById('message-list')!;
    this.messageCount = document.getElementById('message-count')!;

    this.btnPlay = document.getElementById('btn-play') as HTMLButtonElement;
    this.btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
    this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this.timelineScrubber = document.getElementById('timeline-scrubber') as HTMLInputElement;
    this.currentTimeDisplay = document.getElementById('current-time')!;
    this.totalTimeDisplay = document.getElementById('total-time')!;

    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value')!;

    this.btnExport = document.getElementById('btn-export') as HTMLButtonElement;
    this.btnImport = document.getElementById('btn-import') as HTMLButtonElement;
    this.btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
    this.btnLucky = document.getElementById('btn-lucky') as HTMLButtonElement;

    this.setupEventListeners();
    this.startAnimationLoop();
  }

  private setupEventListeners(): void {
    // Participant controls
    this.btnAddParticipant.addEventListener('click', () => this.handleAddParticipant());
    this.participantNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddParticipant();
    });

    // Message controls
    this.btnAddMessage.addEventListener('click', () => this.handleAddMessage());
    this.messageTextInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleAddMessage();
    });

    // Timeline controls
    this.btnPlay.addEventListener('click', () => this.simulation.start());
    this.btnPause.addEventListener('click', () => this.simulation.stop());
    this.btnReset.addEventListener('click', () => {
      this.simulation.reset();
      this.timelineScrubber.value = '0';
    });

    this.timelineScrubber.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const time = parseInt(target.value);
      this.simulation.seekTo(time);
    });

    // Speed control
    this.speedSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const speed = parseFloat(target.value);
      this.simulation.setSpeed(speed);
      this.speedValue.textContent = `${speed.toFixed(2)}x`;
    });

    // Data controls
    this.btnExport.addEventListener('click', () => this.handleExport());
    this.btnImport.addEventListener('click', () => this.handleImport());
    this.btnClear.addEventListener('click', () => this.handleClear());
    this.btnLucky.addEventListener('click', () => this.handleLucky());
  }

  private handleAddParticipant(): void {
    const name = this.participantNameInput.value.trim();
    const shape = this.participantShapeSelect.value as ParticipantShape;
    const color = this.participantColorInput.value;

    if (!name) {
      alert('Please enter a participant name');
      return;
    }

    this.simulation.addParticipant(name, shape, color);
    this.participantNameInput.value = '';
    this.updateParticipantList();
    this.updateParticipantDropdowns();
  }

  private handleAddMessage(): void {
    const from = this.messageFromSelect.value;
    const to = this.messageToSelect.value;
    const text = this.messageTextInput.value.trim();
    const timestamp = parseInt(this.messageTimestampInput.value);
    const duration = parseInt(this.messageDurationInput.value);
    const color = this.messageColorInput.value;

    if (!from || !to) {
      alert('Please select sender and receiver');
      return;
    }

    if (!text) {
      alert('Please enter message text');
      return;
    }

    if (from === to) {
      alert('Sender and receiver must be different');
      return;
    }

    this.simulation.addMessage(from, to, text, timestamp, duration, color);
    this.messageTextInput.value = '';

    // Auto-increment timestamp by duration for next message
    this.messageTimestampInput.value = (timestamp + duration).toString();

    this.updateMessageList();
    this.updateTotalTime();
  }

  private updateParticipantList(): void {
    const state = this.simulation.getState();

    if (state.participants.length === 0) {
      this.participantList.innerHTML = '<div style="text-align: center; color: #777;">No participants yet</div>';
      return;
    }

    this.participantList.innerHTML = state.participants
      .map(
        (p) => `
        <div class="participant-item">
          <div>
            <span class="participant-color" style="background: ${p.color};"></span>
            ${p.name}
          </div>
          <button class="btn-remove" data-id="${p.id}">Remove</button>
        </div>
      `
      )
      .join('');

    // Add remove listeners
    this.participantList.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).getAttribute('data-id')!;
        this.simulation.removeParticipant(id);
        this.updateParticipantList();
        this.updateParticipantDropdowns();
      });
    });
  }

  private updateParticipantDropdowns(): void {
    const state = this.simulation.getState();
    const options =
      state.participants.length === 0
        ? '<option value="">Select...</option>'
        : '<option value="">Select...</option>' +
          state.participants.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');

    this.messageFromSelect.innerHTML = options;
    this.messageToSelect.innerHTML = options;
  }

  private updateMessageList(): void {
    const state = this.simulation.getState();
    this.messageCount.textContent = state.messages.length.toString();

    if (state.messages.length === 0) {
      this.messageList.innerHTML = '<div style="text-align: center; color: #777;">No messages yet</div>';
      return;
    }

    this.messageList.innerHTML = state.messages
      .map((m) => {
        const fromName = state.participants.find((p) => p.id === m.from)?.name || 'Unknown';
        const toName = state.participants.find((p) => p.id === m.to)?.name || 'Unknown';
        return `
        <div class="message-item">
          <div style="flex: 1;">
            <div style="font-weight: 600;">${fromName} → ${toName}</div>
            <div style="color: #999; margin-top: 2px;">${m.text}</div>
            <div style="color: #666; font-size: 11px; margin-top: 2px;">
              t=${m.timestamp}ms, d=${m.duration}ms
            </div>
          </div>
          <button class="btn-remove" data-id="${m.id}">Remove</button>
        </div>
      `;
      })
      .join('');

    // Add remove listeners
    this.messageList.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).getAttribute('data-id')!;
        this.simulation.removeMessage(id);
        this.updateMessageList();
        this.updateTotalTime();
      });
    });
  }

  private updateTotalTime(): void {
    const state = this.simulation.getState();
    let maxTime = 0;

    state.messages.forEach((msg) => {
      const endTime = msg.timestamp + msg.duration;
      if (endTime > maxTime) {
        maxTime = endTime;
      }
    });

    this.totalTimeDisplay.textContent = `${(maxTime / 1000).toFixed(1)}s`;
    this.timelineScrubber.max = maxTime.toString();
  }

  private handleExport(): void {
    const data = this.simulation.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private handleImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          this.simulation.importData(data);
          this.updateParticipantList();
          this.updateParticipantDropdowns();
          this.updateMessageList();
          this.updateTotalTime();
        } catch (error) {
          alert('Failed to import data: ' + error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private handleClear(): void {
    if (!confirm('Clear all participants and messages?')) return;

    const state = this.simulation.getState();
    state.participants = [];
    state.messages = [];
    state.activeMessages = [];
    state.currentTime = 0;

    this.updateParticipantList();
    this.updateParticipantDropdowns();
    this.updateMessageList();
    this.updateTotalTime();
    this.simulation.reset();
  }

  private handleLucky(): void {
    // Clear existing data
    const state = this.simulation.getState();
    state.participants = [];
    state.messages = [];
    state.activeMessages = [];
    state.currentTime = 0;
    this.simulation.reset();

    // Participant names and properties
    const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Theta', 'Lambda'];
    const shapes: ParticipantShape[] = ['circle', 'square', 'triangle', 'hexagon'];
    const colors = ['#4CAF50', '#2196F3', '#FF5722', '#9C27B0', '#FF9800', '#00BCD4', '#E91E63', '#FFC107'];

    // Message templates
    const messageTemplates = [
      'PING',
      'PONG',
      'ACK',
      'SYN',
      'REQUEST',
      'RESPONSE',
      'HEARTBEAT',
      'VOTE',
      'COMMIT',
      'PREPARE',
      'READY',
      'DATA',
      'UPDATE',
      'CONFIRM',
      'QUERY',
    ];

    // Create 6-8 participants
    const participantCount = 6 + Math.floor(Math.random() * 3);
    const participantIds: string[] = [];

    for (let i = 0; i < participantCount; i++) {
      const name = names[i % names.length];
      const shape = shapes[i % shapes.length];
      const color = colors[i % colors.length];
      const id = this.simulation.addParticipant(name, shape, color);
      participantIds.push(id);
    }

    // Generate messages over 30 seconds (30000ms)
    const totalDuration = 30000;
    const messageCount = 40 + Math.floor(Math.random() * 30); // 40-70 messages

    for (let i = 0; i < messageCount; i++) {
      // Pick random sender and receiver
      const fromIdx = Math.floor(Math.random() * participantIds.length);
      let toIdx;

      // 10% chance of self-message, otherwise different participant
      if (Math.random() < 0.1) {
        toIdx = fromIdx;
      } else {
        toIdx = Math.floor(Math.random() * participantIds.length);
        // Ensure sender and receiver are different
        while (toIdx === fromIdx) {
          toIdx = Math.floor(Math.random() * participantIds.length);
        }
      }

      const from = participantIds[fromIdx];
      const to = participantIds[toIdx];

      // Random message
      const text = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

      // Random timestamp within the total duration (allows concurrency)
      const timestamp = Math.floor(Math.random() * totalDuration);

      // Duration between 800-2000ms
      const duration = 800 + Math.floor(Math.random() * 1200);

      // Random color (occasionally)
      const color = Math.random() > 0.7 ? colors[Math.floor(Math.random() * colors.length)] : undefined;

      this.simulation.addMessage(from, to, text, timestamp, duration, color);
    }

    // Update UI
    this.updateParticipantList();
    this.updateParticipantDropdowns();
    this.updateMessageList();
    this.updateTotalTime();

    // Show success message
    alert(`Generated ${participantCount} participants and ${messageCount} messages over ${(totalDuration / 1000).toFixed(1)}s!`);
  }

  private startAnimationLoop(): void {
    const animate = (currentTime: number) => {
      // Calculate delta time in milliseconds
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
      }
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      this.simulation.update(deltaTime);
      const state = this.simulation.getState();

      this.renderer.render(state);

      // Update time displays
      this.currentTimeDisplay.textContent = `${(state.currentTime / 1000).toFixed(1)}s`;

      // Update scrubber (only if not being manually dragged)
      if (!this.timelineScrubber.matches(':active')) {
        this.timelineScrubber.value = state.currentTime.toString();
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

// Initialize app
new TimelineApp();
