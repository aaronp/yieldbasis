import * as THREE from 'three';
import { BaseEffect, EffectConfig, MousePosition } from './base';

interface FerretSegment {
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  velocity: THREE.Vector3;
}

export class FerretEffect extends BaseEffect {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ferretLine: THREE.Line;
  private segments: FerretSegment[] = [];
  private time: number = 0;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private isChasing: boolean = false;

  // Ferret properties
  private segmentCount: number = 12;
  private segmentSpacing: number = 0.3;
  private moveSpeed: number = 0.05;
  private animationSpeed: number = 3;
  private waveAmplitude: number = 0.4;

  constructor(canvas: HTMLCanvasElement, config: EffectConfig) {
    super(canvas, config);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    this.camera.position.z = 8;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x1f2937, 1);

    this.createFerret();
    this.init();
  }

  private createFerret(): void {
    const colors = this.getColorPalette();

    // Create ferret body as connected line segments
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    // Initialize segments along the ferret's spine
    for (let i = 0; i < this.segmentCount; i++) {
      const x = (i - this.segmentCount / 2) * this.segmentSpacing;
      const y = 0;
      const z = 0;

      positions.push(x, y, z);

      this.segments.push({
        position: new THREE.Vector3(x, y, z),
        targetPosition: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(0, 0, 0),
      });
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: colors.primary,
      linewidth: 2,
    });

    this.ferretLine = new THREE.Line(geometry, material);
    this.scene.add(this.ferretLine);

    // Start in center
    this.currentPosition.set(0, 0, 0);
  }

  onResize(width?: number, height?: number): void {
    if (width && height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  onMouseMove(mouse: MousePosition): void {
    // Convert normalized mouse to 3D world space
    this.targetPosition.set(
      mouse.normalizedX * 6,
      mouse.normalizedY * 4,
      0
    );

    // Check if we should start chasing
    const distance = this.targetPosition.distanceTo(this.currentPosition);
    this.isChasing = distance > 0.5;
  }

  render(deltaTime: number): void {
    this.time += deltaTime * 0.001 * (this.config.speed / 50);

    const positions = this.ferretLine.geometry.attributes.position;
    const intensity = this.config.intensity / 100;

    // Chase behavior: move toward mouse
    if (this.isChasing) {
      const direction = new THREE.Vector3()
        .subVectors(this.targetPosition, this.currentPosition)
        .normalize();

      const speed = this.moveSpeed * (this.config.speed / 50);
      this.currentPosition.add(direction.multiplyScalar(speed));
    }

    // Update ferret segments with wave motion
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];

      // Follow behavior - each segment follows the one in front
      if (i === 0) {
        // Head follows current position
        segment.targetPosition.copy(this.currentPosition);
      } else {
        // Body segments follow previous segment
        const prevSegment = this.segments[i - 1];
        const direction = new THREE.Vector3()
          .subVectors(prevSegment.position, segment.position)
          .normalize();

        segment.targetPosition
          .copy(prevSegment.position)
          .sub(direction.multiplyScalar(this.segmentSpacing));
      }

      // Add sinusoidal wave motion for running animation
      const waveOffset = this.time * this.animationSpeed + i * 0.5;
      const waveY = Math.sin(waveOffset) * this.waveAmplitude * intensity;
      const waveX = Math.cos(waveOffset * 0.5) * this.waveAmplitude * 0.5 * intensity;

      // Only apply wave when moving
      const movementFactor = this.isChasing ? 1 : 0.2;
      segment.targetPosition.y += waveY * movementFactor;
      segment.targetPosition.x += waveX * movementFactor * (i / this.segmentCount);

      // Smooth movement toward target
      segment.velocity
        .subVectors(segment.targetPosition, segment.position)
        .multiplyScalar(0.3);

      segment.position.add(segment.velocity);

      // Update buffer
      positions.setXYZ(i, segment.position.x, segment.position.y, segment.position.z);
    }

    positions.needsUpdate = true;

    // Update color based on movement
    const material = this.ferretLine.material as THREE.LineBasicMaterial;
    const colors = this.getColorPalette();
    const baseColor = new THREE.Color(colors.primary);
    const accentColor = new THREE.Color(colors.accent);

    if (this.isChasing) {
      // Pulse between base and accent when chasing
      const pulse = Math.sin(this.time * 5) * 0.5 + 0.5;
      material.color.lerpColors(baseColor, accentColor, pulse);
    } else {
      material.color.copy(baseColor);
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateConfig(config: Partial<EffectConfig>): void {
    super.updateConfig(config);
    if (config.colorScheme) {
      const colors = this.getColorPalette();
      (this.ferretLine.material as THREE.LineBasicMaterial).color.set(colors.primary);
    }
  }

  destroy(): void {
    this.stop();
    this.cleanup();
    this.ferretLine.geometry.dispose();
    (this.ferretLine.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
