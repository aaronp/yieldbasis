import { Participant, SimulationState, ParticipantShape, TimelineMessage } from '../core/types';

export class TimelineRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private readonly NODE_SIZE = 50;
  private hoveredMessageId: string | null = null;
  private clickedMessageId: string | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Add mouse event listeners
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  private handleClick(e: MouseEvent): void {
    // Toggle clicked message
    if (this.hoveredMessageId) {
      this.clickedMessageId = this.clickedMessageId === this.hoveredMessageId ? null : this.hoveredMessageId;
    }
  }

  private resizeCanvas() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }

  public render(state: SimulationState) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Reset hover state
    this.hoveredMessageId = null;

    // Draw messages first (behind participants)
    this.drawMessages(state);

    // Draw participants
    state.participants.forEach((participant) => {
      this.drawParticipant(participant);
    });

    // Draw tooltip for hovered message
    if (this.hoveredMessageId && !this.clickedMessageId) {
      const msg = state.activeMessages.find((m) => m.id === this.hoveredMessageId);
      if (msg) {
        this.drawMessageTooltip(msg, state);
      }
    }

    // Draw modal for clicked message
    if (this.clickedMessageId) {
      const msg = state.activeMessages.find((m) => m.id === this.clickedMessageId);
      if (msg) {
        this.drawMessageModal(msg, state);
      } else {
        // Message no longer active, clear click
        this.clickedMessageId = null;
      }
    }

    // Update cursor
    this.canvas.style.cursor = this.hoveredMessageId ? 'pointer' : 'default';
  }

  private drawParticipant(participant: Participant) {
    this.ctx.save();
    this.ctx.globalAlpha = participant.opacity;

    // Draw shape
    this.ctx.fillStyle = participant.color;
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 3;

    switch (participant.shape) {
      case 'circle':
        this.drawCircle(participant.x, participant.y);
        break;
      case 'square':
        this.drawSquare(participant.x, participant.y);
        break;
      case 'triangle':
        this.drawTriangle(participant.x, participant.y);
        break;
      case 'hexagon':
        this.drawHexagon(participant.x, participant.y);
        break;
    }

    // Draw name
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(participant.name, participant.x, participant.y + this.NODE_SIZE + 20);

    this.ctx.restore();
  }

  private drawCircle(x: number, y: number) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.NODE_SIZE / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
  }

  private drawSquare(x: number, y: number) {
    const size = this.NODE_SIZE;
    this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
    this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  }

  private drawTriangle(x: number, y: number) {
    const size = this.NODE_SIZE / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size);
    this.ctx.lineTo(x + size, y + size);
    this.ctx.lineTo(x - size, y + size);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  private drawHexagon(x: number, y: number) {
    const size = this.NODE_SIZE / 2;
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  private drawMessages(state: SimulationState) {
    state.activeMessages.forEach((msg) => {
      const fromParticipant = state.participants.find((p) => p.id === msg.from);
      const toParticipant = state.participants.find((p) => p.id === msg.to);

      if (!fromParticipant || !toParticipant) return;

      const startX = fromParticipant.x;
      const startY = fromParticipant.y;
      const endX = toParticipant.x;
      const endY = toParticipant.y;

      // Calculate current position
      const currentX = startX + (endX - startX) * msg.progress;
      const currentY = startY + (endY - startY) * msg.progress;

      // Check if mouse is hovering over this message
      const dist = Math.sqrt(Math.pow(this.mouseX - currentX, 2) + Math.pow(this.mouseY - currentY, 2));
      const isHovered = dist < 15;
      if (isHovered) {
        this.hoveredMessageId = msg.id;
      }

      const isClicked = this.clickedMessageId === msg.id;

      // Draw full path line (faded)
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Draw progress line
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(currentX, currentY);
      this.ctx.strokeStyle = msg.color || '#00d4ff';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([8, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Draw message packet
      const packetSize = isHovered || isClicked ? 15 : 12;
      this.ctx.beginPath();
      this.ctx.arc(currentX, currentY, packetSize, 0, Math.PI * 2);
      this.ctx.fillStyle = msg.color || '#00d4ff';
      this.ctx.fill();
      this.ctx.strokeStyle = isHovered || isClicked ? '#fff' : 'rgba(255, 255, 255, 0.7)';
      this.ctx.lineWidth = isHovered || isClicked ? 3 : 2;
      this.ctx.stroke();

      // Draw message label (short version)
      if (!isClicked) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Truncate long messages
        const displayText = msg.text.length > 15 ? msg.text.substring(0, 12) + '...' : msg.text;

        // Draw text with background
        const textWidth = this.ctx.measureText(displayText).width;
        const padding = 6;
        const bgX = currentX - textWidth / 2 - padding;
        const bgY = currentY - 25;
        const bgWidth = textWidth + padding * 2;
        const bgHeight = 16;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(displayText, currentX, currentY - 17);
      }
    });
  }

  private drawMessageTooltip(msg: TimelineMessage, state: SimulationState): void {
    const fromParticipant = state.participants.find((p) => p.id === msg.from);
    const toParticipant = state.participants.find((p) => p.id === msg.to);
    if (!fromParticipant || !toParticipant) return;

    const lines = [
      `From: ${fromParticipant.name}`,
      `To: ${toParticipant.name}`,
      `Message: ${msg.text}`,
      `Time: ${msg.timestamp}ms → ${msg.timestamp + msg.duration}ms`,
    ];

    const padding = 12;
    const lineHeight = 18;
    const fontSize = 12;

    this.ctx.font = `${fontSize}px sans-serif`;
    const maxWidth = Math.max(...lines.map((l) => this.ctx.measureText(l).width));

    const boxWidth = maxWidth + padding * 2;
    const boxHeight = lines.length * lineHeight + padding * 2;

    let x = this.mouseX + 15;
    let y = this.mouseY + 15;

    // Keep tooltip on screen
    if (x + boxWidth > this.canvas.width) x = this.mouseX - boxWidth - 15;
    if (y + boxHeight > this.canvas.height) y = this.mouseY - boxHeight - 15;

    // Draw background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    this.ctx.fillRect(x, y, boxWidth, boxHeight);

    // Draw border
    this.ctx.strokeStyle = msg.color || '#00d4ff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, boxWidth, boxHeight);

    // Draw text
    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      this.ctx.fillText(line, x + padding, y + padding + i * lineHeight);
    });
  }

  private drawMessageModal(msg: TimelineMessage, state: SimulationState): void {
    const fromParticipant = state.participants.find((p) => p.id === msg.from);
    const toParticipant = state.participants.find((p) => p.id === msg.to);
    if (!fromParticipant || !toParticipant) return;

    // Draw semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate modal dimensions
    const modalWidth = 400;
    const modalHeight = 250;
    const modalX = (this.canvas.width - modalWidth) / 2;
    const modalY = (this.canvas.height - modalHeight) / 2;

    // Draw modal background
    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.fillRect(modalX, modalY, modalWidth, modalHeight);

    // Draw modal border
    this.ctx.strokeStyle = msg.color || '#00d4ff';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(modalX, modalY, modalWidth, modalHeight);

    // Draw title bar
    this.ctx.fillStyle = msg.color || '#00d4ff';
    this.ctx.fillRect(modalX, modalY, modalWidth, 40);

    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Message Details', modalX + 15, modalY + 20);

    // Draw close hint
    this.ctx.fillStyle = '#000';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText('Click to close', modalX + modalWidth - 15, modalY + 20);

    // Draw content
    const contentY = modalY + 60;
    const contentX = modalX + 20;

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    const fields = [
      { label: 'From:', value: fromParticipant.name },
      { label: 'To:', value: toParticipant.name },
      { label: 'Timestamp:', value: `${msg.timestamp}ms` },
      { label: 'Duration:', value: `${msg.duration}ms` },
      { label: 'Progress:', value: `${(msg.progress * 100).toFixed(1)}%` },
      { label: 'Message:', value: msg.text },
    ];

    let yOffset = 0;
    fields.forEach((field) => {
      this.ctx.fillStyle = '#999';
      this.ctx.fillText(field.label, contentX, contentY + yOffset);

      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(field.value, contentX + 100, contentY + yOffset);

      yOffset += 25;
    });
  }
}
