# Path B: PixiJS + GSAP Ferret Animation

A polished 2D wire-mesh ferret with state machine and GSAP animations.

## Features

- **State Machine**: IDLE → ALERT → CHASE transitions
- **GSAP Timelines**: Smooth state transitions with custom easing
- **PixiJS Graphics**: Hardware-accelerated 2D rendering
- **Interaction Manager**: Built-in pointer event handling
- **Smooth Physics**: Follow-the-leader with wave motion
- **Visual Feedback**: Colors change based on state

## Installation

```bash
cd path-b-pixi
bun install
# or npm install
```

## Development

```bash
make dev
# or
bun run dev
```

Visit `http://localhost:3001`

## Build

```bash
make build
# or
bun run build
```

## State Machine

### IDLE (Blue)
- Distance > 150px from cursor
- Gentle bobbing animation
- Minimal movement

### ALERT (Yellow)
- Distance 50-150px
- Quick "look around" animation
- Increased responsiveness

### CHASE (Orange)
- Distance < 50px
- Maximum speed
- Aggressive pursuit
- Speed burst effect

## Technologies

- **PixiJS v8**: WebGL 2D rendering
- **GSAP v3**: Animation timelines and tweens
- **TypeScript**: Type safety
- **Vite**: Fast dev server and build

## Code Structure

```
src/
└── main.ts          # Main ferret class with state machine
```

### Key Classes

```typescript
class PixiFerret {
  private state: 'IDLE' | 'ALERT' | 'CHASE'
  private segments: Segment[]
  private stateTimeline: gsap.Timeline

  setState()           // Transition between states
  startIdleAnimation() // GSAP idle bob
  startAlertAnimation() // GSAP look-around
  startChaseAnimation() // GSAP speed burst
}
```

## Customization

Adjust constants in `main.ts`:

```typescript
SEGMENT_COUNT = 15      // Number of body segments
SEGMENT_LENGTH = 25     // Distance between segments
HEAD_SIZE = 12          // Head circle radius
SEGMENT_WIDTH = 6       // Body line width
```

## State Transition Logic

```typescript
distance < 50:   CHASE  // Close to cursor
50 < distance < 150: ALERT  // Medium distance
distance > 150:  IDLE   // Far from cursor
```

## GSAP Animations

### Idle
```typescript
gsap.to(head, {
  y: '+=10',
  yoyo: true,
  repeat: -1,
  ease: 'sine.inOut'
})
```

### Alert
```typescript
timeline.to(segments, {
  x: '+=15',
  stagger: 0.02,
  ease: 'power2.out'
})
```

### Chase
```typescript
timeline.to(segments, {
  alpha: 1,
  stagger: 0.01,
  ease: 'power2.out'
})
```
