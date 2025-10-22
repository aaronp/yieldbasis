import { RaftNode, SimulationState, NodeState } from '../core/types';

export class RaftRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private readonly NODE_RADIUS = 40;
  private readonly LOG_WIDTH = 250;
  private readonly LOG_HEIGHT = 200;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }

  public render(state: SimulationState) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw messages first (behind nodes)
    this.drawMessages(state);

    // Draw nodes
    state.nodes.forEach((node) => {
      this.drawNode(node, state);
    });

    // Draw logs
    this.drawLogs(state);
  }

  private drawNode(node: RaftNode, state: SimulationState) {
    const isLeader = node.id === state.leaderId;

    // Node circle
    this.ctx.beginPath();
    this.ctx.arc(node.x, node.y, this.NODE_RADIUS, 0, Math.PI * 2);

    const color = this.getNodeColor(node.state);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    // Border
    this.ctx.strokeStyle = isLeader ? '#FFD700' : '#333';
    this.ctx.lineWidth = isLeader ? 4 : 2;
    this.ctx.stroke();

    // Node ID
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`S${node.id}`, node.x, node.y - 5);

    // State label
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText(node.state.toUpperCase(), node.x, node.y + 10);

    // Term
    this.ctx.font = '10px sans-serif';
    this.ctx.fillStyle = '#ddd';
    this.ctx.fillText(`T${node.currentTerm}`, node.x, node.y + 25);

    // Election timer indicator (for followers/candidates)
    if (node.state === 'follower' || node.state === 'candidate') {
      const progress = Math.min(1, node.electionTimer / node.electionTimeout);
      this.drawProgressRing(node.x, node.y, this.NODE_RADIUS + 5, progress);
    }
  }

  private drawProgressRing(x: number, y: number, radius: number, progress: number) {
    this.ctx.beginPath();
    this.ctx.arc(
      x,
      y,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + progress * Math.PI * 2
    );
    this.ctx.strokeStyle = progress > 0.7 ? '#ff4757' : '#00d4ff';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  private getNodeColor(state: NodeState): string {
    switch (state) {
      case 'leader':
        return '#4CAF50';
      case 'candidate':
        return '#FFC107';
      case 'follower':
        return '#2196F3';
      case 'stopped':
        return '#757575';
    }
  }

  private drawMessages(state: SimulationState) {
    state.messages.forEach((msg) => {
      const from = state.nodes[msg.from];
      const to = state.nodes[msg.to];

      if (!from || !to) return;

      const startX = from.x;
      const startY = from.y;
      const endX = to.x;
      const endY = to.y;

      // Interpolate position
      const x = startX + (endX - startX) * msg.progress;
      const y = startY + (endY - startY) * msg.progress;

      // Draw line
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(x, y);
      this.ctx.strokeStyle = this.getMessageColor(msg.type);
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Draw message packet
      this.ctx.beginPath();
      this.ctx.arc(x, y, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = this.getMessageColor(msg.type);
      this.ctx.fill();
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Message type label
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '8px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.getMessageLabel(msg.type), x, y - 12);
    });
  }

  private getMessageColor(type: string): string {
    switch (type) {
      case 'requestVote':
        return '#FFC107';
      case 'voteResponse':
        return '#FFD700';
      case 'appendEntries':
        return '#4CAF50';
      case 'appendResponse':
        return '#8BC34A';
      default:
        return '#9E9E9E';
    }
  }

  private getMessageLabel(type: string): string {
    switch (type) {
      case 'requestVote':
        return 'VOTE?';
      case 'voteResponse':
        return 'VOTE';
      case 'appendEntries':
        return 'APPEND';
      case 'appendResponse':
        return 'ACK';
      default:
        return 'MSG';
    }
  }

  private drawLogs(state: SimulationState) {
    const startX = this.canvas.width - this.LOG_WIDTH - 20;
    const startY = this.canvas.height - this.LOG_HEIGHT - 120;

    state.nodes.forEach((node, i) => {
      const y = startY + i * 35;

      // Node label
      this.ctx.fillStyle = this.getNodeColor(node.state);
      this.ctx.fillRect(startX, y, 30, 25);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`S${node.id}`, startX + 15, y + 12);

      // Log entries
      const logX = startX + 40;
      node.log.forEach((entry, idx) => {
        const entryX = logX + idx * 30;
        this.ctx.fillStyle = entry.committed ? '#4CAF50' : '#757575';
        this.ctx.fillRect(entryX, y, 25, 25);

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(entryX, y, 25, 25);

        // Entry index
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${idx}`, entryX + 12, y + 12);
      });
    });
  }
}
