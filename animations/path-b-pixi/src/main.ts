import { Application, Graphics, Point } from 'pixi.js';
import gsap from 'gsap';

// Ferret state machine
type FerretState = 'IDLE' | 'ALERT' | 'CHASE';

interface Segment {
  position: Point;
  targetPosition: Point;
  velocity: Point;
  graphic: Graphics;
  tailGraphic?: Graphics;
}

class PixiFerret {
  private app: Application;
  private segments: Segment[] = [];
  private state: FerretState = 'IDLE';
  private target: Point = new Point(0, 0);
  private stateTimeline?: gsap.core.Timeline;
  private idleAnimation?: gsap.core.Tween;

  private readonly SEGMENT_COUNT = 15;
  private readonly SEGMENT_LENGTH = 25;
  private readonly HEAD_SIZE = 12;
  private readonly SEGMENT_WIDTH = 6;

  constructor() {
    this.app = new Application();
    this.init();
  }

  private async init() {
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1f2937,
      antialias: true,
    });

    document.getElementById('app')!.appendChild(this.app.canvas);

    // Create ferret segments
    this.createFerret();

    // Set up mouse interaction
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointermove', this.onPointerMove.bind(this));

    // Start animation loop
    this.app.ticker.add(this.update.bind(this));

    // Start in idle state
    this.setState('IDLE');

    // Handle window resize
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createFerret() {
    const centerX = this.app.screen.width / 2;
    const centerY = this.app.screen.height / 2;

    for (let i = 0; i < this.SEGMENT_COUNT; i++) {
      const x = centerX - i * this.SEGMENT_LENGTH;
      const y = centerY;

      const graphic = new Graphics();
      this.app.stage.addChild(graphic);

      // Tail segments (last few)
      let tailGraphic: Graphics | undefined;
      if (i > this.SEGMENT_COUNT - 5) {
        tailGraphic = new Graphics();
        this.app.stage.addChild(tailGraphic);
      }

      this.segments.push({
        position: new Point(x, y),
        targetPosition: new Point(x, y),
        velocity: new Point(0, 0),
        graphic,
        tailGraphic,
      });
    }

    this.target.set(centerX, centerY);
  }

  private setState(newState: FerretState) {
    if (this.state === newState) return;

    this.state = newState;
    document.getElementById('state')!.textContent = newState;

    // Kill existing state animations
    this.stateTimeline?.kill();
    this.idleAnimation?.kill();

    // Create state-specific animations
    switch (newState) {
      case 'IDLE':
        this.startIdleAnimation();
        break;
      case 'ALERT':
        this.startAlertAnimation();
        break;
      case 'CHASE':
        this.startChaseAnimation();
        break;
    }
  }

  private startIdleAnimation() {
    // Gentle bobbing motion
    this.idleAnimation = gsap.to(this.segments[0].position, {
      y: `+=${10}`,
      duration: 2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  private startAlertAnimation() {
    this.stateTimeline = gsap.timeline();

    // Quick "look around" animation
    this.segments.forEach((segment, i) => {
      this.stateTimeline!.to(segment.position, {
        x: `+=${Math.sin(i) * 15}`,
        duration: 0.2,
        ease: 'power2.out',
      }, i * 0.02);
    });

    this.stateTimeline.to(this.segments[0].position, {
      x: `+=${0}`,
      duration: 0.3,
      ease: 'elastic.out(1, 0.3)',
    });
  }

  private startChaseAnimation() {
    this.stateTimeline = gsap.timeline();

    // Speed burst effect
    this.segments.forEach((segment, i) => {
      this.stateTimeline!.to(segment.graphic, {
        alpha: 1,
        duration: 0.1,
        ease: 'power2.out',
      }, i * 0.01);
    });
  }

  private onPointerMove(event: any) {
    const point = event.data.global;
    this.target.set(point.x, point.y);

    const headPos = this.segments[0].position;
    const distance = Math.hypot(this.target.x - headPos.x, this.target.y - headPos.y);

    // State transitions based on distance
    if (distance < 50) {
      this.setState('IDLE');
    } else if (distance < 150) {
      this.setState('ALERT');
    } else {
      this.setState('CHASE');
    }
  }

  private update(ticker: any) {
    const deltaTime = ticker.deltaTime;
    this.updateSegments(deltaTime);
    this.drawFerret();
  }

  private updateSegments(deltaTime: number) {
    const speedMultiplier = this.state === 'CHASE' ? 0.2 : this.state === 'ALERT' ? 0.1 : 0.05;

    // Head follows mouse
    const head = this.segments[0];
    head.targetPosition.set(this.target.x, this.target.y);

    // Update head position
    head.velocity.x = (head.targetPosition.x - head.position.x) * speedMultiplier;
    head.velocity.y = (head.targetPosition.y - head.position.y) * speedMultiplier;
    head.position.x += head.velocity.x;
    head.position.y += head.velocity.y;

    // Body segments follow with wave motion
    for (let i = 1; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const prev = this.segments[i - 1];

      // Follow previous segment
      const dx = prev.position.x - segment.position.x;
      const dy = prev.position.y - segment.position.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 0) {
        const angle = Math.atan2(dy, dx);
        segment.targetPosition.x = prev.position.x - Math.cos(angle) * this.SEGMENT_LENGTH;
        segment.targetPosition.y = prev.position.y - Math.sin(angle) * this.SEGMENT_LENGTH;

        // Add wave motion
        const time = Date.now() * 0.003;
        const wave = Math.sin(time + i * 0.5) * 8;
        const perpAngle = angle + Math.PI / 2;
        segment.targetPosition.x += Math.cos(perpAngle) * wave;
        segment.targetPosition.y += Math.sin(perpAngle) * wave;
      }

      // Ease toward target
      const ease = 0.25;
      segment.velocity.x = (segment.targetPosition.x - segment.position.x) * ease;
      segment.velocity.y = (segment.targetPosition.y - segment.position.y) * ease;
      segment.position.x += segment.velocity.x;
      segment.position.y += segment.velocity.y;
    }
  }

  private drawFerret() {
    const headColor = this.state === 'CHASE' ? 0xf6851b : this.state === 'ALERT' ? 0xffaa00 : 0x037dd6;
    const bodyColor = 0x037dd6;
    const tailColor = 0x88ccff;

    // Draw body segments
    for (let i = 0; i < this.segments.length - 1; i++) {
      const segment = this.segments[i];
      const next = this.segments[i + 1];
      const graphic = segment.graphic;

      graphic.clear();

      // Taper the width toward the tail
      const widthFactor = 1 - (i / this.segments.length) * 0.7;
      const lineWidth = this.SEGMENT_WIDTH * widthFactor;

      graphic.moveTo(segment.position.x, segment.position.y);
      graphic.lineTo(next.position.x, next.position.y);
      graphic.stroke({ width: lineWidth, color: i === 0 ? headColor : bodyColor });

      // Draw tail segments
      if (segment.tailGraphic) {
        const tailG = segment.tailGraphic;
        tailG.clear();
        tailG.circle(segment.position.x, segment.position.y, 3);
        tailG.fill(tailColor);
      }
    }

    // Draw head
    const head = this.segments[0];
    head.graphic.clear();
    head.graphic.circle(head.position.x, head.position.y, this.HEAD_SIZE);
    head.graphic.fill(headColor);

    // Draw eyes looking at cursor
    const eyeOffset = 5;
    const angle = Math.atan2(this.target.y - head.position.y, this.target.x - head.position.x);
    head.graphic.circle(
      head.position.x + Math.cos(angle + 0.3) * eyeOffset,
      head.position.y + Math.sin(angle + 0.3) * eyeOffset,
      2
    );
    head.graphic.circle(
      head.position.x + Math.cos(angle - 0.3) * eyeOffset,
      head.position.y + Math.sin(angle - 0.3) * eyeOffset,
      2
    );
    head.graphic.fill(0x1f2937);
  }

  private onResize() {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
  }
}

// Initialize
new PixiFerret();
