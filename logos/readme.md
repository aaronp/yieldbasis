# Web3 Logo Effects

Interactive logo effects with Web3-style animations powered by WebGL and Three.js.

## Effects

### 1. MetaMask Fox Mesh
A wireframe mesh effect inspired by MetaMask's iconic fox logo. The mesh vertices react to your cursor with spring physics, creating organic, flowing movements.

**Features:**
- Vertex-based mouse interaction
- Spring physics simulation
- Wave-based animations
- Dynamic mesh deformation

### 2. Liquid Morph
A mesmerizing liquid sphere with morphing surfaces and flowing colors. Uses custom GLSL shaders for realistic liquid effects.

**Features:**
- Multi-layer Simplex noise displacement
- Flowing color gradients
- Mouse-controlled rotation
- Fresnel lighting effects
- Real-time shader animations

### 3. Network Mesh
An interactive 3D network visualization with 100 nodes and dynamic connections that light up and respond to cursor movements.

**Features:**
- 100 interconnected nodes
- Dynamic highlighting on hover
- Mouse repulsion physics
- Autonomous node movement
- Distance-based connections

### 4. Particle Field
A stunning particle system with 5000 particles arranged in a sphere formation, featuring attraction/repulsion dynamics.

**Features:**
- 5000 interactive particles
- Attraction/repulsion forces based on mouse proximity
- Additive blending for glowing effects
- Wave-based motion patterns
- Custom particle shaders

## Technology

- **Three.js** - WebGL 3D graphics library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **Custom GLSL Shaders** - Advanced visual effects
- **TailwindCSS** - UI styling

## Controls

- **Effect Selector** - Switch between different effects
- **Intensity** - Control the strength of mouse interactions
- **Speed** - Adjust animation speed
- **Color Scheme** - Choose from Web3, Cyberpunk, Matrix, or Neon palettes

## Installation

```bash
cd logos
bun install
```

## Development

```bash
make dev
# or
bun run dev
```

The app will be available at `http://localhost:3000`

## Build

```bash
make build
# or
bun run build
```

## Performance

All effects are GPU-accelerated using WebGL and optimized for smooth 60 FPS performance. Real-time FPS counter displayed in the stats panel.

## Architecture

```
src/
├── effects/
│   ├── base.ts          # Base effect class with common functionality
│   ├── foxMesh.ts       # MetaMask-style fox mesh effect
│   ├── liquidMorph.ts   # Liquid sphere with shaders
│   ├── networkMesh.ts   # Interactive network visualization
│   └── particleField.ts # Particle system with physics
├── main.ts              # App initialization and UI controls
└── style.css            # Global styles
```

Each effect extends the `BaseEffect` class which provides:
- Canvas setup and resize handling
- Mouse tracking (normalized coordinates)
- Animation loop with FPS calculation
- Configuration management
- Lifecycle methods (start/stop/destroy)
