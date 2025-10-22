import * as THREE from 'three';
import { BaseEffect, EffectConfig, MousePosition } from './base';

interface Vertex {
  position: THREE.Vector3;
  originalPosition: THREE.Vector3;
  velocity: THREE.Vector3;
}

export class FoxMeshEffect extends BaseEffect {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private mesh: THREE.Mesh | null = null;
  private vertices: Vertex[] = [];
  private mouseVector: THREE.Vector3 = new THREE.Vector3();
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement, config: EffectConfig) {
    super(canvas, config);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x1f2937, 1);

    this.createFoxMesh();
    this.init();
  }

  private createFoxMesh(): void {
    // Create a fox-like shape using vertices
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];

    // Create mesh grid with proper index tracking
    const gridSize = 30;
    const indexMap: Map<string, number> = new Map();

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i / (gridSize - 1)) * 4 - 2;
        const y = (j / (gridSize - 1)) * 4 - 2;
        const z = 0;

        // Create vertices in a mesh pattern
        const key = `${i},${j}`;
        const idx = positions.length / 3;
        positions.push(x, y, z);
        indexMap.set(key, idx);

        const vertex: Vertex = {
          position: new THREE.Vector3(x, y, z),
          originalPosition: new THREE.Vector3(x, y, z),
          velocity: new THREE.Vector3(0, 0, 0),
        };
        this.vertices.push(vertex);

        // Create connections to adjacent points
        if (i > 0) {
          const prevKey = `${i - 1},${j}`;
          const prevIdx = indexMap.get(prevKey);
          if (prevIdx !== undefined) {
            indices.push(idx, prevIdx);
          }
        }
        if (j > 0) {
          const prevKey = `${i},${j - 1}`;
          const prevIdx = indexMap.get(prevKey);
          if (prevIdx !== undefined) {
            indices.push(idx, prevIdx);
          }
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    const colors = this.getColorPalette();
    const material = new THREE.LineBasicMaterial({
      color: colors.primary,
      transparent: true,
      opacity: 0.6,
    });

    this.mesh = new THREE.LineSegments(geometry, material);
    this.scene.add(this.mesh);
  }

  private isInsideFoxShape(x: number, y: number, shape: number[][]): boolean {
    // Simple distance check to major points
    for (let i = 0; i < shape.length; i++) {
      const dx = x - shape[i][0];
      const dy = y - shape[i][1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.8) return true;
    }
    return false;
  }

  onResize(width?: number, height?: number): void {
    if (width && height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  onMouseMove(mouse: MousePosition): void {
    this.mouseVector.x = mouse.normalizedX * 3;
    this.mouseVector.y = mouse.normalizedY * 3;
    this.mouseVector.z = 0;
  }

  render(deltaTime: number): void {
    this.time += deltaTime * 0.001 * (this.config.speed / 50);

    // Update vertices based on mouse proximity
    const intensity = this.config.intensity / 100;
    const positions = this.mesh?.geometry.attributes.position;

    this.vertices.forEach((vertex, i) => {
      const toMouse = new THREE.Vector3().subVectors(this.mouseVector, vertex.position);
      const distance = toMouse.length();
      const maxDistance = 2;

      if (distance < maxDistance) {
        const force = (1 - distance / maxDistance) * intensity * 0.1;
        vertex.velocity.add(toMouse.normalize().multiplyScalar(force));
      }

      // Spring back to original position
      const toOriginal = new THREE.Vector3().subVectors(
        vertex.originalPosition,
        vertex.position
      );
      vertex.velocity.add(toOriginal.multiplyScalar(0.02));

      // Damping
      vertex.velocity.multiplyScalar(0.95);

      // Add some wave motion
      vertex.velocity.y += Math.sin(this.time + vertex.originalPosition.x * 2) * 0.005;

      // Update position
      vertex.position.add(vertex.velocity);

      // Update buffer
      if (positions) {
        positions.setXYZ(i, vertex.position.x, vertex.position.y, vertex.position.z);
      }
    });

    if (positions) {
      positions.needsUpdate = true;
    }

    // Rotate slowly
    if (this.mesh) {
      this.mesh.rotation.z = Math.sin(this.time * 0.2) * 0.1;
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateConfig(config: Partial<EffectConfig>): void {
    super.updateConfig(config);
    if (config.colorScheme && this.mesh) {
      const colors = this.getColorPalette();
      (this.mesh.material as THREE.LineBasicMaterial).color.set(colors.primary);
    }
  }

  destroy(): void {
    this.stop();
    this.cleanup();
    this.mesh?.geometry.dispose();
    (this.mesh?.material as THREE.Material)?.dispose();
    this.renderer.dispose();
  }
}
