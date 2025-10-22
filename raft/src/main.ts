import { RaftSimulation } from './core/raft';
import { RaftRenderer } from './components/renderer';

class RaftApp {
  private simulation: RaftSimulation;
  private renderer: RaftRenderer;
  private lastTime: number = 0;
  private animationId: number | null = null;
  private commandCounter: number = 1;

  constructor() {
    const canvas = document.getElementById('raft-canvas') as HTMLCanvasElement;
    this.renderer = new RaftRenderer(canvas);
    this.simulation = new RaftSimulation(5);

    this.setupControls();
    this.startAnimationLoop();
  }

  private setupControls() {
    // Start/Stop
    document.getElementById('btn-start')!.addEventListener('click', () => {
      this.simulation.start();
      this.updateButtonStates();
    });

    document.getElementById('btn-stop')!.addEventListener('click', () => {
      this.simulation.stop();
      this.updateButtonStates();
    });

    document.getElementById('btn-reset')!.addEventListener('click', () => {
      const nodeCount = parseInt(
        (document.getElementById('node-count-slider') as HTMLInputElement).value
      );
      this.simulation.reset(nodeCount);
      this.commandCounter = 1;
      this.updateStats();
    });

    // Actions
    document.getElementById('btn-add-entry')!.addEventListener('click', () => {
      this.simulation.addLogEntry(`cmd${this.commandCounter++}`);
    });

    document.getElementById('btn-stop-leader')!.addEventListener('click', () => {
      const state = this.simulation.getState();
      if (state.leaderId !== null) {
        this.simulation.stopNode(state.leaderId);
      }
    });

    document.getElementById('btn-stop-random')!.addEventListener('click', () => {
      const state = this.simulation.getState();
      const activeNodes = state.nodes.filter((n) => n.state !== 'stopped');
      if (activeNodes.length > 0) {
        const randomNode = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        this.simulation.stopNode(randomNode.id);
      }
    });

    document.getElementById('btn-restart-node')!.addEventListener('click', () => {
      this.simulation.restartNode();
    });

    document.getElementById('btn-partition')!.addEventListener('click', () => {
      alert('Network partition simulation coming soon!');
    });

    // Settings
    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    speedSlider.addEventListener('input', (e) => {
      const speed = parseFloat((e.target as HTMLInputElement).value);
      this.simulation.setSpeed(speed);
      document.getElementById('speed-value')!.textContent = `${speed.toFixed(1)}x`;
    });

    const nodeCountSlider = document.getElementById('node-count-slider') as HTMLInputElement;
    nodeCountSlider.addEventListener('input', (e) => {
      const count = parseInt((e.target as HTMLInputElement).value);
      document.getElementById('node-count-value')!.textContent = count.toString();
    });
  }

  private updateButtonStates() {
    const running = this.simulation.getState().running;
    (document.getElementById('btn-start') as HTMLButtonElement).disabled = running;
    (document.getElementById('btn-stop') as HTMLButtonElement).disabled = !running;
    document.getElementById('status-sim')!.textContent = running ? 'RUNNING' : 'STOPPED';
    (document.getElementById('status-sim') as HTMLElement).style.color = running
      ? '#4CAF50'
      : '#ff4757';
  }

  private startAnimationLoop() {
    const animate = (currentTime: number) => {
      const deltaTime = this.lastTime ? currentTime - this.lastTime : 0;
      this.lastTime = currentTime;

      // Update simulation
      this.simulation.update(deltaTime);

      // Render
      const state = this.simulation.getState();
      this.renderer.render(state);

      // Update UI
      this.updateStats();

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  private updateStats() {
    const state = this.simulation.getState();

    // Stats panel
    document.getElementById('stat-term')!.textContent = state.currentTerm.toString();
    document.getElementById('stat-leader')!.textContent =
      state.leaderId !== null ? `S${state.leaderId}` : 'None';
    document.getElementById('stat-elections')!.textContent = state.totalElections.toString();

    // Count total log entries
    const totalEntries = state.nodes.reduce((sum, node) => sum + node.log.length, 0);
    document.getElementById('stat-entries')!.textContent = totalEntries.toString();

    // Status bar
    document.getElementById('status-messages')!.textContent = state.totalMessages.toString();
    document.getElementById('status-time')!.textContent = `${(state.time / 1000).toFixed(1)}s`;
  }
}

// Initialize
new RaftApp();
