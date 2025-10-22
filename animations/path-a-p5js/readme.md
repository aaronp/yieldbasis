# Path A: Minimal 2D Ferret Animation (p5.js)

A wire-mesh ferret animation with no build step required - just open the HTML file!

## Features

- **No Build Step**: Pure HTML + CDN libraries
- **12 Line Segments**: Simple wire-frame ferret
- **Smooth Easing**: Follow-the-leader physics with easing
- **Wave Motion**: Sinusoidal waves for organic movement
- **Burst Animation**: GSAP timeline triggers on fast mouse movement
- **Speed-based Coloring**: Blue when idle, orange when chasing

## How to Run

Simply open `index.html` in your browser. No installation needed!

```bash
make dev
# or
open index.html
# or
python -m http.server 8000  # then visit http://localhost:8000
```

## Technologies

- **p5.js**: Drawing and animation framework
- **GSAP**: Burst animation timelines
- **Vanilla JS**: Simple segment physics

## Controls

- **Move Mouse**: Ferret chases cursor
- **Fast Movement**: Triggers burst animation with scaling effect

## Implementation Details

### Segment Physics
Each segment follows the previous one using:
- Easing: `position += (target - position) * 0.15`
- Fixed segment length maintained
- Perpendicular wave motion for organic feel

### Burst Detection
- Mouse speed calculated per frame
- Threshold: 15 pixels/frame
- GSAP timeline scales segments with elastic easing

## Code Structure

```javascript
// State
segments[]        // 12 segments with x, y, vx, vy, scale
target           // Mouse position
mouseSpeed       // Speed detection for bursts

// Main Loop
setup()          // Initialize segments
draw()           // Update & render each frame
updateSegments() // Follow-the-leader physics
drawFerret()     // Render lines + head
triggerBurst()   // GSAP animation
```

## Customization

Adjust these constants at the top of the script:

```javascript
const SEGMENT_COUNT = 12;      // Number of body segments
const SEGMENT_LENGTH = 20;     // Distance between segments
const EASING = 0.15;           // Follow speed (0-1)
const BURST_THRESHOLD = 15;    // Speed to trigger burst
```
