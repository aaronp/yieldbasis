import './style.css';
import { BaseEffect, EffectConfig } from './effects/base';
import { FoxMeshEffect } from './effects/foxMesh';
import { LiquidMorphEffect } from './effects/liquidMorph';
import { NetworkMeshEffect } from './effects/networkMesh';
import { ParticleFieldEffect } from './effects/particleField';
import { FerretEffect } from './effects/ferret';

type EffectType = 'fox-mesh' | 'liquid' | 'network' | 'particles' | 'ferret';

interface EffectDescription {
  name: string;
  description: string;
  features: string[];
}

const effectDescriptions: Record<EffectType, EffectDescription> = {
  'fox-mesh': {
    name: 'MetaMask Fox Mesh',
    description: 'A wireframe mesh that morphs and follows your cursor, inspired by MetaMask\'s iconic fox logo.',
    features: [
      'Vertices react to mouse proximity',
      'Spring physics for organic movement',
      'Smooth wave animations',
      'Dynamic mesh deformation',
    ],
  },
  'liquid': {
    name: 'Liquid Morph',
    description: 'A mesmerizing liquid sphere with flowing colors and morphing surface, powered by custom shaders.',
    features: [
      'Multi-layer noise displacement',
      'Flowing color gradients',
      'Mouse-controlled rotation',
      'Fresnel lighting effects',
    ],
  },
  'network': {
    name: 'Network Mesh',
    description: 'An interactive network visualization where nodes and connections light up and respond to your cursor.',
    features: [
      '100 connected nodes',
      'Dynamic highlighting on hover',
      'Mouse repulsion physics',
      'Autonomous node movement',
    ],
  },
  'particles': {
    name: 'Particle Field',
    description: 'Thousands of particles arranged in a sphere, with attraction/repulsion forces and additive blending.',
    features: [
      '5000 interactive particles',
      'Attraction/repulsion dynamics',
      'Additive blending for glow',
      'Wave-based motion patterns',
    ],
  },
  'ferret': {
    name: 'Playful Ferret',
    description: 'A wire-mesh ferret that chases your cursor with sinuous, organic movement.',
    features: [
      'Procedural spine animation',
      'Mouse chase behavior',
      'Sinusoidal wave motion',
      'Dynamic color pulsing',
    ],
  },
};

class App {
  private canvas: HTMLCanvasElement;
  private currentEffect: BaseEffect | null = null;
  private currentEffectType: EffectType = 'fox-mesh';
  private config: EffectConfig = {
    intensity: 50,
    speed: 50,
    colorScheme: 'web3',
  };

  private effectSelect: HTMLSelectElement;
  private intensitySlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private colorSelect: HTMLSelectElement;
  private effectInfo: HTMLElement;
  private stats: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('effect-canvas') as HTMLCanvasElement;
    this.effectSelect = document.getElementById('effect-select') as HTMLSelectElement;
    this.intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.colorSelect = document.getElementById('color-select') as HTMLSelectElement;
    this.effectInfo = document.getElementById('effect-info')!;
    this.stats = document.getElementById('stats')!;

    this.setupEventListeners();
    this.loadEffect(this.currentEffectType);
    this.updateEffectInfo();
    this.startStatsUpdate();
  }

  private setupEventListeners(): void {
    this.effectSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.currentEffectType = target.value as EffectType;
      this.loadEffect(this.currentEffectType);
      this.updateEffectInfo();
    });

    this.intensitySlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.config.intensity = parseInt(target.value);
      this.currentEffect?.updateConfig({ intensity: this.config.intensity });
    });

    this.speedSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.config.speed = parseInt(target.value);
      this.currentEffect?.updateConfig({ speed: this.config.speed });
    });

    this.colorSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.config.colorScheme = target.value as EffectConfig['colorScheme'];
      this.currentEffect?.updateConfig({ colorScheme: this.config.colorScheme });
    });
  }

  private loadEffect(type: EffectType): void {
    // Destroy current effect
    if (this.currentEffect) {
      this.currentEffect.destroy();
      this.currentEffect = null;
    }

    // Create new effect
    switch (type) {
      case 'fox-mesh':
        this.currentEffect = new FoxMeshEffect(this.canvas, this.config);
        break;
      case 'liquid':
        this.currentEffect = new LiquidMorphEffect(this.canvas, this.config);
        break;
      case 'network':
        this.currentEffect = new NetworkMeshEffect(this.canvas, this.config);
        break;
      case 'particles':
        this.currentEffect = new ParticleFieldEffect(this.canvas, this.config);
        break;
      case 'ferret':
        this.currentEffect = new FerretEffect(this.canvas, this.config);
        break;
    }

    this.currentEffect?.start();
  }

  private updateEffectInfo(): void {
    const desc = effectDescriptions[this.currentEffectType];
    this.effectInfo.innerHTML = `
      <div class="font-medium text-white mb-2">${desc.name}</div>
      <div class="text-gray-400 mb-2">${desc.description}</div>
      <div class="text-xs text-gray-500">
        <div class="font-medium mb-1">Features:</div>
        <ul class="list-disc list-inside space-y-1">
          ${desc.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  private startStatsUpdate(): void {
    setInterval(() => {
      if (this.currentEffect) {
        const fps = this.currentEffect.getFPS();
        this.stats.textContent = `FPS: ${fps}`;
      }
    }, 100);
  }
}

// Initialize app
new App();
