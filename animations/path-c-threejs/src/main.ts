import * as THREE from 'three';
import gsap from 'gsap';

class ThreeJSFerret {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private plane: THREE.Plane;
  private ferretGroup: THREE.Group;
  private bones: THREE.Bone[] = [];
  private wireframeMesh: THREE.LineSegments;
  private headMesh: THREE.Mesh;
  private targetPosition: THREE.Vector3;
  private currentPosition: THREE.Vector3;
  private runAnimation: gsap.core.Timeline;

  private readonly BONE_COUNT = 10;
  private readonly BONE_LENGTH = 0.3;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1f2937);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.targetPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();

    this.ferretGroup = new THREE.Group();
    this.scene.add(this.ferretGroup);

    // Create ferret
    this.createFerret();

    // Add ground grid for reference
    this.createGround();

    // Add lights
    this.createLights();

    // Create run cycle animation
    this.createRunAnimation();

    // Set up event listeners
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));

    // Start animation loop
    this.animate();
  }

  private createFerret() {
    // Create bone chain for ferret body
    let parentBone: THREE.Bone | null = null;

    for (let i = 0; i < this.BONE_COUNT; i++) {
      const bone = new THREE.Bone();
      bone.position.set(this.BONE_LENGTH, 0, 0);

      if (parentBone) {
        parentBone.add(bone);
      } else {
        this.ferretGroup.add(bone);
      }

      this.bones.push(bone);
      parentBone = bone;
    }

    // Create wireframe body using line segments
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];

    // Create cylindrical wireframe along spine
    const radialSegments = 6;

    for (let i = 0; i < this.BONE_COUNT; i++) {
      const radius = 0.1 * (1 - (i / this.BONE_COUNT) * 0.5); // Taper toward tail

      for (let j = 0; j < radialSegments; j++) {
        const angle = (j / radialSegments) * Math.PI * 2;
        const x = i * this.BONE_LENGTH;
        const y = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        positions.push(x, y, z);

        // Connect to next bone
        if (i < this.BONE_COUNT - 1) {
          const currentIdx = i * radialSegments + j;
          const nextIdx = (i + 1) * radialSegments + j;
          indices.push(currentIdx, nextIdx);
        }

        // Connect around the ring
        if (j < radialSegments - 1) {
          const currentIdx = i * radialSegments + j;
          const nextIdx = i * radialSegments + j + 1;
          indices.push(currentIdx, nextIdx);
        } else {
          const currentIdx = i * radialSegments + j;
          const nextIdx = i * radialSegments;
          indices.push(currentIdx, nextIdx);
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    const material = new THREE.LineBasicMaterial({
      color: 0x037dd6,
      linewidth: 2,
    });

    this.wireframeMesh = new THREE.LineSegments(geometry, material);
    this.ferretGroup.add(this.wireframeMesh);

    // Create head
    const headGeometry = new THREE.IcosahedronGeometry(0.15, 1);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: 0xf6851b,
      wireframe: true,
    });
    this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
    this.headMesh.position.set(0, 0, 0);
    this.ferretGroup.add(this.headMesh);
  }

  private createGround() {
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);
  }

  private createLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);
  }

  private createRunAnimation() {
    this.runAnimation = gsap.timeline({ paused: true, repeat: -1 });

    // Animate bones in a wave pattern
    this.bones.forEach((bone, i) => {
      const delay = i * 0.05;

      this.runAnimation.to(
        bone.rotation,
        {
          z: `+=${Math.PI / 8}`,
          duration: 0.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: 1,
        },
        delay
      );
    });
  }

  private onMouseMove(event: MouseEvent) {
    // Convert mouse to normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Find intersection with ground plane
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, intersection);

    if (intersection) {
      this.targetPosition.copy(intersection);
    }
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    // Update ferret position - move toward target
    const distance = this.targetPosition.distanceTo(this.currentPosition);

    if (distance > 0.1) {
      const direction = new THREE.Vector3()
        .subVectors(this.targetPosition, this.currentPosition)
        .normalize();

      const speed = Math.min(distance * 0.02, 0.05);
      this.currentPosition.add(direction.multiplyScalar(speed));

      // Play run animation when moving
      if (this.runAnimation.paused()) {
        this.runAnimation.play();
      }

      // Rotate to face direction of movement
      const angle = Math.atan2(direction.x, direction.z);
      this.ferretGroup.rotation.y = angle;
    } else {
      // Pause run animation when idle
      if (!this.runAnimation.paused()) {
        this.runAnimation.pause();
      }
    }

    // Update ferret group position
    this.ferretGroup.position.copy(this.currentPosition);

    // Make head look at cursor
    const lookTarget = new THREE.Vector3(
      this.targetPosition.x,
      this.currentPosition.y,
      this.targetPosition.z
    );
    this.headMesh.lookAt(lookTarget);

    // Add subtle bobbing motion
    const time = Date.now() * 0.001;
    this.headMesh.position.y = Math.sin(time * 5) * 0.02;

    // Update wireframe colors based on movement
    const material = this.wireframeMesh.material as THREE.LineBasicMaterial;
    const movementFactor = Math.min(distance / 2, 1);
    material.color.setHSL(0.55 - movementFactor * 0.1, 1, 0.5);

    this.renderer.render(this.scene, this.camera);
  };
}

// Initialize
new ThreeJSFerret();
