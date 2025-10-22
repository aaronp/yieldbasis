# Path C: Three.js Wireframe Ferret Animation

A true 3D wireframe ferret with bone-based animation in Three.js.

## Features

- **3D Wireframe Mesh**: Cylindrical segments with tapering
- **Bone Chain**: 10 bones for spine articulation
- **Raycaster**: Maps mouse to 3D world coordinates
- **GSAP Animation**: Smooth run cycle with wave motion
- **Look-at Behavior**: Head tracks cursor position
- **Dynamic Coloring**: Color shifts from blue to cyan based on speed
- **Ground Plane**: Grid reference for spatial awareness

## Installation

```bash
cd path-c-threejs
bun install
# or npm install
```

## Development

```bash
make dev
# or
bun run dev
```

Visit `http://localhost:3002`

## Build

```bash
make build
# or
bun run build
```

## Technologies

- **Three.js**: WebGL 3D rendering
- **GSAP**: Bone rotation animations
- **TypeScript**: Type-safe development
- **Vite**: Fast build tooling

## 3D Structure

### Bone Chain
```
Bone 0 (Head) → Bone 1 → Bone 2 → ... → Bone 9 (Tail)
```

Each bone is offset by 0.3 units along X-axis.

### Wireframe Mesh
- 6 radial segments per bone
- Cylindrical shape with tapering
- LineSegments geometry for true wireframe

### Components
```typescript
- ferretGroup: THREE.Group        // Container
- bones[]: THREE.Bone[]           // Spine skeleton
- wireframeMesh: THREE.LineSegments // Body
- headMesh: THREE.Mesh            // Head (icosahedron)
```

## Animation System

### Run Cycle (GSAP)
```typescript
bones.forEach((bone, i) => {
  timeline.to(bone.rotation, {
    z: '+=π/8',
    duration: 0.4,
    yoyo: true,
    repeat: 1,
    delay: i * 0.05  // Stagger for wave
  })
})
```

### Look-at Head
```typescript
headMesh.lookAt(targetPosition)
```

### Movement
- Easing toward cursor: `position += direction * 0.02`
- Rotation to face movement direction
- Smooth interpolation

## Raycaster Setup

```typescript
raycaster.setFromCamera(mouse, camera)
raycaster.ray.intersectPlane(groundPlane, intersection)
```

Maps 2D mouse to 3D world coordinates on XZ plane.

## Customization

Adjust constants in `main.ts`:

```typescript
BONE_COUNT = 10       // Number of spine bones
BONE_LENGTH = 0.3     // Distance between bones
```

### Wireframe Density
```typescript
const radialSegments = 6  // Segments around body
```

### Animation Speed
```typescript
const speed = 0.05        // Max movement speed
duration: 0.4             // Run cycle duration
```

## Camera

- Position: `(0, 2, 5)`
- FOV: 75°
- Looks at origin

## Lighting

- **Ambient**: 0.5 intensity
- **Directional**: From `(5, 10, 5)`

## Color Scheme

- **Body**: Blue (#037dd6) → Cyan (when moving)
- **Head**: Orange (#f6851b)
- **Ground**: Dark gray grid

## Performance

- LineSegments: ~60 vertices
- Bone updates: O(n) per frame
- GSAP timeline: Paused when idle
- 60 FPS on modern hardware
