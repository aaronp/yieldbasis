# FAQ

## Project Structure

**Q: How are the examples organized?**
A: Each example is a standalone project in its own directory (e.g., `sigma/`, `d3/`, `svg/`). Each has its own `Makefile` with a `dev` target for installation and running.

**Q: How do I run an example?**
A: Navigate to any example directory and run `make dev`. This will install dependencies and start the development server.

**Q: What build tool is used?**
A: Vite is used for all examples, providing fast development with hot reload.

## Technology Stack

**Q: What language/runtime is used?**
A: TypeScript with Bun as the package manager and runtime.

**Q: What styling approach is used?**
A: Tailwind CSS for styling, with shadcn/ui components where appropriate. Each example uses the simplest approach that makes sense.

**Q: What framework is used?**
A: Each example is standalone. Some may use vanilla TypeScript, others may use lightweight frameworks as appropriate for the visualization library.

## Data Format

**Q: Where is the test data stored?**
A: Shared test data is in the `graph-data/` directory at the project root.

**Q: What format is the data in?**
A: JSON format with nodes and edges/relationships arrays. Each example may transform this data as needed for its specific library.

**Q: What types of graph data are provided?**
A: Multiple datasets including:
- Social graphs
- Bi-directional graphs
- Acyclic hierarchy graphs
- Large graphs with detailed node data
- Graphs with rich edge data

## Features

**Q: What interactivity features are included?**
A: Each example (where feasible) includes:
- Node selection to show details
- Node dragging/repositioning
- Text-based filtering
- Zoom and pan controls
- Node search
- Layout algorithm switching

**Q: Are these production-ready applications?**
A: No, each example is an MVP demonstrating the capabilities of its respective library. They can be expanded as needed.

## Visualization Libraries

**Q: Which libraries are included?**
A: Examples using:
- Sigma.js
- D3.js
- Raw SVG manipulation
- (Additional libraries can be added as needed)

**Q: How do I compare the different libraries?**
A: See `comparison.md` at the root for pros/cons of each approach.
