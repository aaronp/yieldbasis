import * as THREE from 'three';
import { BaseEffect, EffectConfig, MousePosition } from './base';

export class LiquidMorphEffect extends BaseEffect {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sphere: THREE.Mesh;
  private time: number = 0;
  private targetRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private mouseInfluence: THREE.Vector3 = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, config: EffectConfig) {
    super(canvas, config);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    this.camera.position.z = 3;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setClearColor(0x1f2937, 1);

    this.createLiquidSphere();
    this.createLights();
    this.init();
  }

  private createLiquidSphere(): void {
    const geometry = new THREE.IcosahedronGeometry(1, 5);
    const colors = this.getColorPalette();

    // Custom shader for liquid effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mousePos: { value: new THREE.Vector3() },
        intensity: { value: this.config.intensity / 100 },
        color1: { value: new THREE.Color(colors.primary) },
        color2: { value: new THREE.Color(colors.secondary) },
        color3: { value: new THREE.Color(colors.accent) },
      },
      vertexShader: `
        uniform float time;
        uniform vec3 mousePos;
        uniform float intensity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;

        // Simplex noise function (simplified)
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vNormal = normal;
          vPosition = position;

          // Multiple layers of noise for liquid effect
          float noise1 = snoise(position * 2.0 + time * 0.5);
          float noise2 = snoise(position * 4.0 - time * 0.3);
          float noise3 = snoise(position * 1.0 + time * 0.2);

          // Mouse influence
          vec3 toMouse = mousePos - position;
          float mouseDist = length(toMouse);
          float mouseEffect = smoothstep(2.0, 0.0, mouseDist) * intensity;

          // Combine noises and mouse effect
          float displacement = (noise1 * 0.3 + noise2 * 0.2 + noise3 * 0.1) * intensity;
          displacement += mouseEffect * 0.5;

          vDisplacement = displacement;

          vec3 newPosition = position + normal * displacement * 0.3;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;

        void main() {
          // Create flowing color gradient based on displacement
          float colorMix1 = sin(vDisplacement * 10.0 + time) * 0.5 + 0.5;
          float colorMix2 = cos(vDisplacement * 8.0 - time * 0.7) * 0.5 + 0.5;

          vec3 color = mix(color1, color2, colorMix1);
          color = mix(color, color3, colorMix2 * 0.3);

          // Add some fresnel effect
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
          color += fresnel * color3 * 0.5;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      wireframe: false,
    });

    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);
  }

  private createLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 1);
    pointLight1.position.set(2, 2, 2);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5);
    pointLight2.position.set(-2, -2, -1);
    this.scene.add(pointLight2);
  }

  onResize(width?: number, height?: number): void {
    if (width && height) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  onMouseMove(mouse: MousePosition): void {
    this.targetRotation.y = mouse.normalizedX * Math.PI;
    this.targetRotation.x = mouse.normalizedY * Math.PI * 0.5;
    this.mouseInfluence.set(mouse.normalizedX * 2, mouse.normalizedY * 2, 0);
  }

  render(deltaTime: number): void {
    this.time += deltaTime * 0.001 * (this.config.speed / 50);

    // Update shader uniforms
    const material = this.sphere.material as THREE.ShaderMaterial;
    material.uniforms.time.value = this.time;
    material.uniforms.mousePos.value.copy(this.mouseInfluence);
    material.uniforms.intensity.value = this.config.intensity / 100;

    // Smooth rotation towards mouse
    this.sphere.rotation.x += (this.targetRotation.x - this.sphere.rotation.x) * 0.05;
    this.sphere.rotation.y += (this.targetRotation.y - this.sphere.rotation.y) * 0.05;

    // Auto rotation
    this.sphere.rotation.z += 0.001 * (this.config.speed / 50);

    this.renderer.render(this.scene, this.camera);
  }

  updateConfig(config: Partial<EffectConfig>): void {
    super.updateConfig(config);
    if (config.colorScheme) {
      const colors = this.getColorPalette();
      const material = this.sphere.material as THREE.ShaderMaterial;
      material.uniforms.color1.value.set(colors.primary);
      material.uniforms.color2.value.set(colors.secondary);
      material.uniforms.color3.value.set(colors.accent);
    }
  }

  destroy(): void {
    this.stop();
    this.cleanup();
    this.sphere.geometry.dispose();
    (this.sphere.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
