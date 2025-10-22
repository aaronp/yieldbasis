# Ferret Animation Approaches

Three different approaches to creating an interactive wire-mesh ferret that chases the mouse cursor, exploring different libraries and complexity levels.

## Overview

| Path | Libraries | Build | Complexity | Best For |
|------|-----------|-------|------------|----------|
| **A - p5.js** | p5.js, GSAP | None | Low | Quick prototypes, learning |
| **B - PixiJS** | PixiJS, GSAP | Vite | Medium | 2D games, polished UIs |
| **C - Three.js** | Three.js, GSAP | Vite | High | 3D experiences, realism |

## Path A: Minimal 2D (p5.js)

**Directory**: `path-a-p5js/`

### Features
- ✓ No build step required
- ✓ 12 line segments
- ✓ Easing on pointermove
- ✓ GSAP burst animation
- ✓ Speed-based coloring

### Run
```bash
cd path-a-p5js
open index.html
```

### When to Use
- Rapid prototyping
- Creative coding
- Educational projects
- No build step needed

---

## Path B: PixiJS + GSAP

**Directory**: `path-b-pixi/`

### Features
- ✓ State machine (IDLE/ALERT/CHASE)
- ✓ GSAP timelines for transitions
- ✓ Hardware-accelerated 2D rendering
- ✓ Smooth animations
- ✓ 15 segments with tail graphics

### Run
```bash
cd path-b-pixi
bun install && bun run dev
# or
make dev
```

### When to Use
- 2D games
- Interactive web experiences
- When performance matters
- Need state management

---

## Path C: Three.js Wireframe

**Directory**: `path-c-threejs/`

### Features
- ✓ True 3D mesh with bones
- ✓ Raycaster for cursor tracking
- ✓ AnimationMixer + GSAP
- ✓ Look-at behavior
- ✓ Cylindrical wireframe body

### Run
```bash
cd path-c-threejs
bun install && bun run dev
# or
make dev
```

### When to Use
- 3D experiences
- Need realistic perspective
- Want bone-based animation
- Complex spatial interactions

---

## Comparison

### Animation Approach

**Path A**: Direct vertex manipulation with easing
```javascript
position += (target - position) * 0.15
```

**Path B**: State machine with GSAP timelines
```javascript
gsap.timeline()
  .to(segment, { x: '+=15', stagger: 0.02 })
```

**Path C**: Bone rotations with raycaster
```javascript
bone.rotation.z += Math.PI / 8
raycaster.intersectPlane(groundPlane)
```

### Physics

| Path | Type | Segments | Coloring |
|------|------|----------|----------|
| A | Follow-the-leader | 12 | Speed-based |
| B | State-driven | 15 | State-based |
| C | Bone-based | 10 bones | Movement-based |

### Performance

| Path | FPS | Memory | GPU |
|------|-----|--------|-----|
| A | ~60 | Low | Canvas2D |
| B | ~60 | Medium | WebGL |
| C | ~60 | Medium | WebGL |

---

## Technology Stack

### Core Libraries

**p5.js**
- Creative coding framework
- Simple drawing API
- Built-in animation loop
- Canvas2D rendering

**PixiJS**
- 2D WebGL renderer
- Sprite system
- Interaction manager
- Production-ready

**Three.js**
- 3D WebGL library
- Scene graph
- Raycaster
- Bone system

**GSAP** (All paths)
- Animation timelines
- Easing functions
- Timeline control
- Widely used

### Build Tools

**Vite** (Paths B & C)
- Fast HMR
- TypeScript support
- Production builds

---

## Choosing a Path

### Start with Path A if:
- You want to learn basics
- No build complexity
- Quick experimentation
- Teaching/learning focus

### Use Path B if:
- Building a 2D game
- Need state management
- Want polished animations
- Performance is important

### Use Path C if:
- Creating 3D experience
- Need spatial depth
- Want bone animation
- Complex interactions

---

## Next Steps

### Enhancements (All Paths)
1. Add sound effects
2. Multiple ferrets
3. Obstacles/terrain
4. Personality variations

### Path-Specific
**A**: Add matter.js for physics
**B**: Add verlet constraints for floppy bits
**C**: Add THREE.IK for procedural legs

---

## Learning Resources

**p5.js**
- [p5js.org](https://p5js.org)
- [Coding Train](https://thecodingtrain.com)

**PixiJS**
- [pixijs.com](https://pixijs.com)
- [PixiJS Examples](https://pixijs.com/examples)

**Three.js**
- [threejs.org](https://threejs.org)
- [Discover three.js](https://discoverthreejs.com)

**GSAP**
- [gsap.com](https://gsap.com)
- [GSAP Docs](https://gsap.com/docs/v3/)

---

## Architecture Notes

### Path A: Functional + Arrays
Simple data structures, direct manipulation

### Path B: Class + State Machine
Clean separation, scalable architecture

### Path C: Scene Graph + Bones
Three.js patterns, hierarchical structure

---

## Common Patterns

All three paths share:
- Follow-the-leader physics
- Mouse tracking
- Wave motion
- Easing functions
- State/animation control

The difference is in **how** they're implemented and **what level** of abstraction/power you need.
