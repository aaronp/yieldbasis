import * as THREE from 'three';
import { BaseEffect, EffectConfig, MousePosition } from './base';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  originalPosition: THREE.Vector3;
  size: number;
  phase: number;
}

export class ParticleFieldEffect extends BaseEffect {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: Particle[] = [];
  private particleSystem: THREE.Points;
  private time: number = 0;
  private mousePosition3D: THREE.Vector3 = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, config: EffectConfig) {
    super(canvas, config);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    this.camera.position.z = 20;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setClearColor(0x1f2937, 1);

    this.particleSystem = this.createParticleField();
    this.init();
  }

  private createParticleField(): THREE.Points {
    const particleCount = 5000;
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    const colorPalette = this.getColorPalette();
    const color1 = new THREE.Color(colorPalette.primary);
    const color2 = new THREE.Color(colorPalette.secondary);
    const color3 = new THREE.Color(colorPalette.accent);

    // Create particles in a sphere formation
    for (let i = 0; i < particleCount; i++) {
      const radius = 5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions.push(x, y, z);

      const particle: Particle = {
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(0, 0, 0),
        originalPosition: new THREE.Vector3(x, y, z),
        size: Math.random() * 0.5 + 0.1,
        phase: Math.random() * Math.PI * 2,
      };
      this.particles.push(particle);
      sizes.push(particle.size);

      // Mix colors
      const colorMix = Math.random();
      let color: THREE.Color;
      if (colorMix < 0.33) {
        color = color1;
      } else if (colorMix < 0.66) {
        color = color2;
      } else {
        color = color3;
      }

      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: window.devicePixelRatio },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Pulsing effect
          float pulse = sin(time * 2.0 + position.x * 0.1) * 0.5 + 0.5;
          gl_PointSize = size * (100.0 / -mvPosition.z) * (0.5 + pulse * 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          // Create circular particles
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          if (dist > 0.5) {
            discard;
          }

          // Soft edges
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

          // Bright center
          float brightness = 1.0 - smoothstep(0.0, 0.3, dist);
          vec3 finalColor = vColor * (1.0 + brightness * 0.5);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(geometry, material);
    this.scene.add(particleSystem);

    return particleSystem;
  }

  onResize(width?: number, height?: number): void {
    if (width && height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  onMouseMove(mouse: MousePosition): void {
    this.mousePosition3D.set(
      mouse.normalizedX * 15,
      mouse.normalizedY * 15,
      0
    );
  }

  render(deltaTime: number): void {
    this.time += deltaTime * 0.001 * (this.config.speed / 50);

    const positions = this.particleSystem.geometry.attributes.position;
    const sizes = this.particleSystem.geometry.attributes.size;
    const intensity = this.config.intensity / 100;

    this.particles.forEach((particle, i) => {
      // Mouse attraction/repulsion
      const toMouse = new THREE.Vector3().subVectors(
        this.mousePosition3D,
        particle.position
      );
      const distance = toMouse.length();
      const maxDistance = 8;

      if (distance < maxDistance) {
        const force = (1 - distance / maxDistance) * intensity * 0.15;

        // Attraction or repulsion based on distance
        if (distance < 3) {
          // Repulsion when very close
          particle.velocity.sub(toMouse.normalize().multiplyScalar(force * 2));
        } else {
          // Attraction when further
          particle.velocity.add(toMouse.normalize().multiplyScalar(force));
        }
      }

      // Return to original position
      const toOriginal = new THREE.Vector3().subVectors(
        particle.originalPosition,
        particle.position
      );
      particle.velocity.add(toOriginal.multiplyScalar(0.01));

      // Wave motion
      const wave = Math.sin(this.time + particle.phase);
      particle.velocity.y += wave * 0.002 * intensity;
      particle.velocity.x += Math.cos(this.time * 0.7 + particle.phase) * 0.002 * intensity;

      // Apply velocity
      particle.position.add(particle.velocity);

      // Damping
      particle.velocity.multiplyScalar(0.95);

      // Update buffer
      positions.setXYZ(i, particle.position.x, particle.position.y, particle.position.z);

      // Pulsing size based on distance to mouse
      const sizeMod = distance < maxDistance ? (1 - distance / maxDistance) * 0.5 + 1 : 1;
      sizes.setX(i, particle.size * sizeMod);
    });

    positions.needsUpdate = true;
    sizes.needsUpdate = true;

    // Update shader time
    (this.particleSystem.material as THREE.ShaderMaterial).uniforms.time.value = this.time;

    // Rotate particle system
    this.particleSystem.rotation.y = this.time * 0.05;
    this.particleSystem.rotation.x = Math.sin(this.time * 0.1) * 0.2;

    this.renderer.render(this.scene, this.camera);
  }

  updateConfig(config: Partial<EffectConfig>): void {
    super.updateConfig(config);
    if (config.colorScheme) {
      // Recreate particle system with new colors
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
      this.particles = [];
      this.particleSystem = this.createParticleField();
    }
  }

  destroy(): void {
    this.stop();
    this.cleanup();
    this.particleSystem.geometry.dispose();
    (this.particleSystem.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
