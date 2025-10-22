export interface EffectConfig {
  intensity: number;
  speed: number;
  colorScheme: 'web3' | 'cyber' | 'matrix' | 'neon';
}

export interface MousePosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
}

export abstract class BaseEffect {
  protected canvas: HTMLCanvasElement;
  protected config: EffectConfig;
  protected mouse: MousePosition;
  protected animationId: number | null = null;
  protected lastTime: number = 0;
  protected fps: number = 0;
  private resizeHandler?: () => void;
  private isInitialized: boolean = false;

  constructor(canvas: HTMLCanvasElement, config: EffectConfig) {
    this.canvas = canvas;
    this.config = config;
    this.mouse = { x: 0, y: 0, normalizedX: 0, normalizedY: 0 };

    this.setupMouseTracking();
  }

  protected init(): void {
    if (this.isInitialized) return;
    this.setupCanvas();
    this.isInitialized = true;
  }

  protected setupCanvas(): void {
    const updateSize = () => {
      const rect = this.canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Don't set canvas size here - let the renderer handle it in onResize
      this.onResize(width, height);
    };

    this.resizeHandler = updateSize;
    // Use setTimeout to ensure CSS is applied first
    setTimeout(updateSize, 0);
    window.addEventListener('resize', this.resizeHandler);
  }

  protected setupMouseTracking(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.normalizedX = (this.mouse.x / rect.width) * 2 - 1;
      this.mouse.normalizedY = -(this.mouse.y / rect.height) * 2 + 1;
      this.onMouseMove(this.mouse);
    });
  }

  protected getColorPalette(): { primary: string; secondary: string; accent: string } {
    switch (this.config.colorScheme) {
      case 'web3':
        return { primary: '#f6851b', secondary: '#037dd6', accent: '#ffffff' };
      case 'cyber':
        return { primary: '#ff00ff', secondary: '#00ffff', accent: '#ffff00' };
      case 'matrix':
        return { primary: '#00ff00', secondary: '#003300', accent: '#88ff88' };
      case 'neon':
        return { primary: '#bf00ff', secondary: '#7700ff', accent: '#ff00ff' };
    }
  }

  updateConfig(config: Partial<EffectConfig>): void {
    this.config = { ...this.config, ...config };
  }

  start(): void {
    if (this.animationId !== null) return;
    this.lastTime = performance.now();
    this.animate();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  protected cleanup(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  protected animate = (): void => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Calculate FPS
    this.fps = Math.round(1000 / deltaTime);

    this.render(deltaTime);
    this.animationId = requestAnimationFrame(this.animate);
  };

  getFPS(): number {
    return this.fps;
  }

  abstract onResize(width?: number, height?: number): void;
  abstract onMouseMove(mouse: MousePosition): void;
  abstract render(deltaTime: number): void;
  abstract destroy(): void;
}
