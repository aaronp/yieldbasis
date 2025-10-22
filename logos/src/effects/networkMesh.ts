import * as THREE from 'three';
import { BaseEffect, EffectConfig, MousePosition } from './base';

interface NetworkNode {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  connections: number[];
  highlighted: boolean;
}

export class NetworkMeshEffect extends BaseEffect {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private nodes: NetworkNode[] = [];
  private nodesMesh: THREE.Points;
  private linesMesh: THREE.LineSegments;
  private time: number = 0;
  private raycaster: THREE.Raycaster;
  private mouseVector: THREE.Vector2 = new THREE.Vector2();

  constructor(canvas: HTMLCanvasElement, config: EffectConfig) {
    super(canvas, config);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    this.camera.position.z = 15;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x1f2937, 1);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points!.threshold = 0.3;

    const { nodesMesh, linesMesh } = this.createNetwork();
    this.nodesMesh = nodesMesh;
    this.linesMesh = linesMesh;

    this.init();
  }

  private createNetwork(): { nodesMesh: THREE.Points; linesMesh: THREE.LineSegments } {
    const nodeCount = 100;
    const positions: number[] = [];
    const colors: number[] = [];
    const linePositions: number[] = [];
    const lineColors: number[] = [];

    const colorPalette = this.getColorPalette();
    const primaryColor = new THREE.Color(colorPalette.primary);
    const secondaryColor = new THREE.Color(colorPalette.secondary);

    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10;

      positions.push(x, y, z);
      colors.push(primaryColor.r, primaryColor.g, primaryColor.b);

      this.nodes.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.01
        ),
        connections: [],
        highlighted: false,
      });
    }

    // Create connections between nearby nodes
    const maxDistance = 4;
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const distance = this.nodes[i].position.distanceTo(this.nodes[j].position);
        if (distance < maxDistance) {
          this.nodes[i].connections.push(j);
          this.nodes[j].connections.push(i);

          linePositions.push(
            this.nodes[i].position.x,
            this.nodes[i].position.y,
            this.nodes[i].position.z,
            this.nodes[j].position.x,
            this.nodes[j].position.y,
            this.nodes[j].position.z
          );

          const alpha = 1 - distance / maxDistance;
          lineColors.push(
            secondaryColor.r * alpha,
            secondaryColor.g * alpha,
            secondaryColor.b * alpha,
            secondaryColor.r * alpha,
            secondaryColor.g * alpha,
            secondaryColor.b * alpha
          );
        }
      }
    }

    // Create nodes mesh
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    nodeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const nodeMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const nodesMesh = new THREE.Points(nodeGeometry, nodeMaterial);
    this.scene.add(nodesMesh);

    // Create lines mesh
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
    });

    const linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    this.scene.add(linesMesh);

    return { nodesMesh, linesMesh };
  }

  onResize(width?: number, height?: number): void {
    if (width && height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  onMouseMove(mouse: MousePosition): void {
    this.mouseVector.x = mouse.normalizedX;
    this.mouseVector.y = mouse.normalizedY;

    // Raycast to find intersected nodes
    this.raycaster.setFromCamera(this.mouseVector, this.camera);
    const intersects = this.raycaster.intersectObject(this.nodesMesh);

    // Reset all highlights
    this.nodes.forEach(node => node.highlighted = false);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      const index = intersects[0].index;
      this.highlightNode(index);
    }
  }

  private highlightNode(index: number): void {
    const node = this.nodes[index];
    node.highlighted = true;

    // Highlight connected nodes
    node.connections.forEach(connectedIndex => {
      this.nodes[connectedIndex].highlighted = true;
    });

    // Apply repulsion force from mouse
    const mousePos3D = new THREE.Vector3(
      this.mouseVector.x * 10,
      this.mouseVector.y * 10,
      0
    );

    this.nodes.forEach((n, i) => {
      if (i === index || node.connections.includes(i)) {
        const toMouse = new THREE.Vector3().subVectors(n.position, mousePos3D);
        const distance = toMouse.length();
        if (distance < 5) {
          const force = (1 - distance / 5) * 0.1 * (this.config.intensity / 100);
          n.velocity.add(toMouse.normalize().multiplyScalar(force));
        }
      }
    });
  }

  render(deltaTime: number): void {
    this.time += deltaTime * 0.001 * (this.config.speed / 50);

    const positions = this.nodesMesh.geometry.attributes.position;
    const colors = this.nodesMesh.geometry.attributes.color;
    const linePositions = this.linesMesh.geometry.attributes.position;
    const lineColors = this.linesMesh.geometry.attributes.color;

    const colorPalette = this.getColorPalette();
    const primaryColor = new THREE.Color(colorPalette.primary);
    const accentColor = new THREE.Color(colorPalette.accent);
    const secondaryColor = new THREE.Color(colorPalette.secondary);

    // Update nodes
    this.nodes.forEach((node, i) => {
      // Apply velocity
      node.position.add(node.velocity);

      // Boundary check with smooth bounce
      ['x', 'y', 'z'].forEach((axis) => {
        const limit = axis === 'z' ? 5 : 10;
        if (Math.abs(node.position[axis as 'x' | 'y' | 'z']) > limit) {
          node.velocity[axis as 'x' | 'y' | 'z'] *= -0.8;
          node.position[axis as 'x' | 'y' | 'z'] = Math.sign(node.position[axis as 'x' | 'y' | 'z']) * limit;
        }
      });

      // Damping
      node.velocity.multiplyScalar(0.99);

      // Add some drift
      node.velocity.x += (Math.random() - 0.5) * 0.001 * (this.config.speed / 50);
      node.velocity.y += (Math.random() - 0.5) * 0.001 * (this.config.speed / 50);

      // Update position buffer
      positions.setXYZ(i, node.position.x, node.position.y, node.position.z);

      // Update color based on highlight
      const color = node.highlighted ? accentColor : primaryColor;
      const pulse = node.highlighted ? Math.sin(this.time * 10) * 0.3 + 0.7 : 1;
      colors.setXYZ(i, color.r * pulse, color.g * pulse, color.b * pulse);
    });

    // Update line positions and colors
    let lineIndex = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      for (const connectedIndex of node.connections) {
        if (connectedIndex > i) {
          const connectedNode = this.nodes[connectedIndex];

          linePositions.setXYZ(lineIndex, node.position.x, node.position.y, node.position.z);
          linePositions.setXYZ(
            lineIndex + 1,
            connectedNode.position.x,
            connectedNode.position.y,
            connectedNode.position.z
          );

          const highlighted = node.highlighted && connectedNode.highlighted;
          const color = highlighted ? accentColor : secondaryColor;
          const alpha = highlighted ? 0.8 : 0.3;

          lineColors.setXYZ(lineIndex, color.r * alpha, color.g * alpha, color.b * alpha);
          lineColors.setXYZ(lineIndex + 1, color.r * alpha, color.g * alpha, color.b * alpha);

          lineIndex += 2;
        }
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    linePositions.needsUpdate = true;
    lineColors.needsUpdate = true;

    // Rotate camera slightly
    this.camera.position.x = Math.sin(this.time * 0.1) * 2;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  updateConfig(config: Partial<EffectConfig>): void {
    super.updateConfig(config);
  }

  destroy(): void {
    this.stop();
    this.cleanup();
    this.nodesMesh.geometry.dispose();
    (this.nodesMesh.material as THREE.Material).dispose();
    this.linesMesh.geometry.dispose();
    (this.linesMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
